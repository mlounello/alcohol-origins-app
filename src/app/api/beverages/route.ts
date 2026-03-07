import { NextRequest, NextResponse } from 'next/server';
import { createDbClient } from '@/lib/supabase/server';
import { Beverage, BeverageGroup } from '@/types/database';

export async function GET(request: NextRequest) {
  const { db, schema } = await createDbClient();
  const { searchParams } = new URL(request.url);
  const debugData = process.env.DEBUG_DATA === 'true';
  const tableName = 'beverages';

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
    if (debugData) {
      console.log(`[DEBUG_DATA] schema=${schema}`);
      console.log(`[DEBUG_DATA] table=${tableName}`);
    }

    let query = db.from('beverages').select('*');

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%,type.ilike.%${search}%`);
    }

    if (groups && groups.length > 0) {
      query = query.in('group', groups);
    }

    if (types && types.length > 0) {
      query = query.in('type', types);
    }

    if (country) {
      query = query.eq('origin_country', country);
    }

    if (minYear) {
      query = query.gte('date_year', Number(minYear));
    }

    if (maxYear) {
      query = query.lte('date_year', Number(maxYear));
    }

    if (parentId) {
      query = query.eq('parent_id', parentId);
    }

    if (nodeId) {
      query = query.eq('node_id', nodeId);
    }

    // Only return approved beverages for public queries
    query = query.eq('approval_status', 'approved');

    query = query.order('date_year', { ascending: true });

    // Add limit if specified
    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;
    if (debugData) {
      console.log(`[DEBUG_DATA] error_code=${error?.code ?? 'none'}`);
      console.log(`[DEBUG_DATA] error_message=${error?.message ?? 'none'}`);
      console.log(`[DEBUG_DATA] data_length=${data?.length ?? 0}`);
    }

    if (error) {
      console.error('Supabase fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch beverages' },
        { status: 500 }
      );
    }

    return NextResponse.json((data || []) as Beverage[]);
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
  const { supabase, db } = await createDbClient();

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

    const { data: existing } = await db
      .from('beverages')
      .select('node_id')
      .eq('node_id', nodeId)
      .limit(1);

    if (existing && existing.length > 0) {
      nodeId = `${nodeId}-${Date.now().toString(36)}`;
    }

    const { data: profile } = await db
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
      image_url: body.image_url || null,
      parent_id: body.parent_id || null,
      approval_status: shouldAutoApprove ? 'approved' : 'pending',
      approved_by: shouldAutoApprove ? user.id : null,
      approved_at: shouldAutoApprove ? new Date().toISOString() : null,
      created_by: user.id,
      updated_by: user.id,
    };

    // Use Supabase JS client which carries the user's auth session for RLS
    const { data: newBeverage, error: insertError } = await db
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
    const { error: revisionError } = await db
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
    await db
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
