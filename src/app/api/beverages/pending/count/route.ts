import { NextResponse } from 'next/server';
import { createDbClient } from '@/lib/supabase/server';

export async function GET() {
  const { supabase, db } = await createDbClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ count: 0 });
  }

  const { data: profile } = await db
    .from('profiles')
    .select('is_banned')
    .eq('id', user.id)
    .single();

  if (profile?.is_banned) {
    return NextResponse.json({ count: 0 });
  }

  const { data: roleResult } = await db.rpc('get_user_role');
  const userRole =
    (typeof roleResult === 'string'
      ? roleResult
      : (roleResult as { get_user_role?: string } | null)?.get_user_role) || 'viewer';

  if (!['editor', 'moderator', 'admin'].includes(userRole)) {
    return NextResponse.json({ count: 0 });
  }

  const { count, error } = await db
    .from('beverages')
    .select('id', { count: 'exact', head: true })
    .eq('approval_status', 'pending');

  if (error) {
    console.error('Error fetching pending count:', error);
    return NextResponse.json({ count: 0 });
  }

  return NextResponse.json({ count: count || 0 });
}
