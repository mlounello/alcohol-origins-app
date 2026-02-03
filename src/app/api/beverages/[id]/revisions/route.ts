import { NextRequest, NextResponse } from 'next/server';
import { BeverageRevision } from '@/types/database';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  try {
    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/beverage_revisions?beverage_id=eq.${id}&select=*&order=revision_number.desc`;

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
        { error: 'Failed to fetch revisions' },
        { status: response.status }
      );
    }

    const revisions: BeverageRevision[] = await response.json();

    return NextResponse.json(revisions);
  } catch (error) {
    console.error('Error fetching revisions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
