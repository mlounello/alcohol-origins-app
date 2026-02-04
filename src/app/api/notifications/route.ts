import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json([]);
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_banned')
    .eq('id', user.id)
    .single();

  if (profile?.is_banned) {
    return NextResponse.json([]);
  }

  const { data: myBeverages, error: beveragesError } = await supabase
    .from('beverages')
    .select('id, name')
    .eq('created_by', user.id);

  if (beveragesError || !myBeverages || myBeverages.length === 0) {
    return NextResponse.json([]);
  }

  const beverageIds = myBeverages.map((b) => b.id);
  const { data: logs, error } = await supabase
    .from('activity_log')
    .select('id, action, beverage_id, beverage_name, created_at, details')
    .in('beverage_id', beverageIds)
    .in('action', ['approve', 'reject'])
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json([]);
  }

  return NextResponse.json(logs || []);
}
