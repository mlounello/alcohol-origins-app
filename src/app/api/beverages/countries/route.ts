import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Get distinct countries from beverages
    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/beverages?select=origin_country&origin_country=not.is.null&approval_status=eq.approved&order=origin_country.asc`;

    const response = await fetch(url, {
      headers: {
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch countries' },
        { status: response.status }
      );
    }

    const data = await response.json();

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
