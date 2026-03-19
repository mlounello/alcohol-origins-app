import { NextResponse } from 'next/server';
import { createDbClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const { db } = await createDbClient();
    const { data, error } = await db
      .from('beverages')
      .select('origin_country')
      .not('origin_country', 'is', null)
      .eq('approval_status', 'approved')
      .order('origin_country', { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch countries' },
        { status: 500 }
      );
    }

    // Extract unique countries
    const countries = [...new Set(data.map((item: { origin_country: string }) => item.origin_country))];

    return NextResponse.json(countries);
  } catch (error) {
    console.error('Error fetching countries:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
