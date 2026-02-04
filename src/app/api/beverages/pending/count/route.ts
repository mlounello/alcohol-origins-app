import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ count: 0 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_banned')
    .eq('id', user.id)
    .single();

  if (profile?.is_banned) {
    return NextResponse.json({ count: 0 });
  }

  const userRole = profile?.role || 'viewer';
  if (!['editor', 'moderator', 'admin'].includes(userRole)) {
    return NextResponse.json({ count: 0 });
  }

  const { count, error } = await supabase
    .from('beverages')
    .select('id', { count: 'exact', head: true })
    .eq('approval_status', 'pending');

  if (error) {
    console.error('Error fetching pending count:', error);
    return NextResponse.json({ count: 0 });
  }

  return NextResponse.json({ count: count || 0 });
}
