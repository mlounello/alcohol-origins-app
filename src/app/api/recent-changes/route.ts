import { NextRequest, NextResponse } from 'next/server';
import { createDbClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { db } = await createDbClient();
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');

    // Fetch recently updated beverages as a proxy for activity
    // This gets beverages ordered by updated_at, which shows recent changes
    const { data: beverages, error: beveragesError } = await db
      .from('beverages')
      .select(`
        id,
        node_id,
        name,
        type,
        group,
        origin_region,
        origin_country,
        created_at,
        updated_at,
        created_by,
        updated_by
      `)
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (beveragesError) {
      console.error('Error fetching recent changes:', beveragesError);
      return NextResponse.json(
        { error: 'Failed to fetch recent changes' },
        { status: 500 }
      );
    }

    // Transform into activity feed format
    const activities = beverages?.map((beverage) => {
      const isNew = beverage.created_at === beverage.updated_at;
      return {
        id: `${beverage.id}-${beverage.updated_at}`,
        action: isNew ? 'create' : 'edit',
        beverage_id: beverage.id,
        beverage_name: beverage.name,
        beverage_type: beverage.type,
        beverage_group: beverage.group,
        origin_region: beverage.origin_region,
        origin_country: beverage.origin_country,
        user_id: isNew ? beverage.created_by : beverage.updated_by,
        created_at: beverage.updated_at,
      };
    }) || [];

    return NextResponse.json(activities);
  } catch (error) {
    console.error('Error in recent-changes API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
