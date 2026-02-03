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

    // Validate required fields
    const required = ['name', 'type', 'group', 'latitude', 'longitude'];
    for (const field of required) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Create beverage using REST API
    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/beverages`;

    const beverageData = {
      name: body.name,
      type: body.type,
      group: body.group,
      latitude: body.latitude,
      longitude: body.longitude,
      origin_region: body.origin_region || null,
      origin_country: body.origin_country || null,
      date_year: body.date_year || null,
      date_text: body.date_text || null,
      description: body.description || null,
      citation: body.citation || null,
      parent_id: body.parent_id || null,
      created_by: user.id,
      updated_by: user.id,
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(beverageData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Supabase create error:', errorText);
      return NextResponse.json(
        { error: 'Failed to create beverage' },
        { status: response.status }
      );
    }

    const [newBeverage] = await response.json();

    // Create initial revision
    const revisionUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/beverage_revisions`;
    await fetch(revisionUrl, {
      method: 'POST',
      headers: {
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        beverage_id: newBeverage.id,
        user_id: user.id,
        revision_number: 1,
        data: beverageData,
        change_summary: 'Initial creation',
      }),
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
