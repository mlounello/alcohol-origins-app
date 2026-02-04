import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { Beverage, BeverageGroup } from '@/types/database';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);

  // Parse query parameters
  const search = searchParams.get('search') || '';
  const groups = searchParams.get('groups')?.split(',').filter(Boolean) as BeverageGroup[] | undefined;
  const types = searchParams.get('types')?.split(',').filter(Boolean);
  const country = searchParams.get('country') || '';
  const minYear = searchParams.get('minYear');
  const maxYear = searchParams.get('maxYear');
  const parentId = searchParams.get('parent_id') || '';
  const nodeId = searchParams.get('node_id') || '';
  const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;

  try {
    // Build query using direct REST API call
    let url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/beverages?select=*`;
    const filters: string[] = [];

    // Add filters
    if (search) {
      filters.push(`or=(name.ilike.*${encodeURIComponent(search)}*,description.ilike.*${encodeURIComponent(search)}*,type.ilike.*${encodeURIComponent(search)}*)`);
    }

    if (groups && groups.length > 0) {
      filters.push(`group=in.(${groups.map(g => `"${g}"`).join(',')})`);
    }

    if (types && types.length > 0) {
      filters.push(`type=in.(${types.map(t => `"${t}"`).join(',')})`);
    }

    if (country) {
      filters.push(`origin_country=eq.${encodeURIComponent(country)}`);
    }

    if (minYear) {
      filters.push(`date_year=gte.${minYear}`);
    }

    if (maxYear) {
      filters.push(`date_year=lte.${maxYear}`);
    }

    if (parentId) {
      filters.push(`parent_id=eq.${parentId}`);
    }

    if (nodeId) {
      filters.push(`node_id=eq.${encodeURIComponent(nodeId)}`);
    }

    // Only return approved beverages for public queries
    filters.push('approval_status=eq.approved');

    // Append filters to URL
    if (filters.length > 0) {
      url += '&' + filters.join('&');
    }

    // Add ordering
    url += '&order=date_year.asc';

    // Add limit if specified
    if (limit) {
      url += `&limit=${limit}`;
    }

    const response = await fetch(url, {
      headers: {
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Supabase fetch error:', errorText);
      return NextResponse.json(
        { error: 'Failed to fetch beverages' },
        { status: response.status }
      );
    }

    const beverages: Beverage[] = await response.json();

    return NextResponse.json(beverages);
  } catch (error) {
    console.error('Error fetching beverages:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Generate a URL-friendly node_id from the beverage name
function generateNodeId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();

    // Validate required fields (use explicit checks to allow 0 for lat/lng)
    if (!body.name) {
      return NextResponse.json({ error: 'Missing required field: name' }, { status: 400 });
    }
    if (!body.type) {
      return NextResponse.json({ error: 'Missing required field: type' }, { status: 400 });
    }
    if (!body.group) {
      return NextResponse.json({ error: 'Missing required field: group' }, { status: 400 });
    }
    if (body.latitude === undefined || body.latitude === null || body.latitude === '') {
      return NextResponse.json({ error: 'Missing required field: latitude' }, { status: 400 });
    }
    if (body.longitude === undefined || body.longitude === null || body.longitude === '') {
      return NextResponse.json({ error: 'Missing required field: longitude' }, { status: 400 });
    }

    // Generate node_id from name, ensure uniqueness
    let nodeId = generateNodeId(body.name);
    if (!nodeId) {
      nodeId = `beverage-${Date.now().toString(36)}`;
    }

    const { data: existing } = await supabase
      .from('beverages')
      .select('node_id')
      .eq('node_id', nodeId)
      .limit(1);

    if (existing && existing.length > 0) {
      nodeId = `${nodeId}-${Date.now().toString(36)}`;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_banned')
      .eq('id', user.id)
      .single();

    const userRole = profile?.role || 'viewer';
    if (profile?.is_banned) {
      return NextResponse.json(
        { error: 'Your account is banned' },
        { status: 403 }
      );
    }
    const shouldAutoApprove = ['editor', 'moderator', 'admin'].includes(userRole);

    const beverageData = {
      node_id: nodeId,
      name: body.name,
      type: body.type,
      group: body.group,
      latitude: body.latitude,
      longitude: body.longitude,
      origin_region: body.origin_region || null,
      origin_country: body.origin_country || null,
      date_year: body.date_year || null,
      date_text: body.date_text || body.name, // date_text is NOT NULL in DB, fallback to name
      description: body.description || null,
      citation: body.citation || null,
      parent_id: body.parent_id || null,
      approval_status: shouldAutoApprove ? 'approved' : 'pending',
      approved_by: shouldAutoApprove ? user.id : null,
      approved_at: shouldAutoApprove ? new Date().toISOString() : null,
      created_by: user.id,
      updated_by: user.id,
    };

    // Use Supabase JS client which carries the user's auth session for RLS
    const { data: newBeverage, error: insertError } = await supabase
      .from('beverages')
      .insert(beverageData)
      .select()
      .single();

    if (insertError) {
      console.error('Supabase create error:', insertError);
      return NextResponse.json(
        { error: insertError.message || 'Failed to create beverage' },
        { status: 500 }
      );
    }

    // Create initial revision (column names match DB schema: edited_by, edit_summary)
    const { error: revisionError } = await supabase
      .from('beverage_revisions')
      .insert({
        beverage_id: newBeverage.id,
        edited_by: user.id,
        revision_number: 1,
        data: beverageData,
        edit_summary: 'Initial creation',
      });

    if (revisionError) {
      console.error('Revision creation error:', revisionError);
      // Don't fail the whole request for a revision error
    }

    // Log activity
    await supabase
      .from('activity_log')
      .insert({
        user_id: user.id,
        action: shouldAutoApprove ? 'approve' : 'create',
        beverage_id: newBeverage.id,
        beverage_name: newBeverage.name,
        details: {
          node_id: nodeId,
          approval_status: newBeverage.approval_status,
        },
      });

    return NextResponse.json(newBeverage, { status: 201 });
  } catch (error) {
    console.error('Error creating beverage:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
