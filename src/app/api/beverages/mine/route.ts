import { NextResponse } from 'next/server';
import { createDbClient } from '@/lib/supabase/server';

export async function GET() {
  const { supabase, db } = await createDbClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  const { data: profile } = await db
    .from('profiles')
    .select('is_banned')
    .eq('id', user.id)
    .single();

  if (profile?.is_banned) {
    return NextResponse.json(
      { error: 'Your account is banned' },
      { status: 403 }
    );
  }

  const { data: beverages, error } = await db
    .from('beverages')
    .select('*')
    .eq('created_by', user.id)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching user submissions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch submissions' },
      { status: 500 }
    );
  }

  return NextResponse.json(beverages || []);
}
