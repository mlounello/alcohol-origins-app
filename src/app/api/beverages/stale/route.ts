import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const days = Math.max(1, parseInt(searchParams.get('days') || '30', 10));

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_banned')
    .eq('id', user.id)
    .single();

  if (profile?.is_banned) {
    return NextResponse.json(
      { error: 'Your account is banned' },
      { status: 403 }
    );
  }

  const userRole = profile?.role || 'viewer';
  if (!['editor', 'moderator', 'admin'].includes(userRole)) {
    return NextResponse.json(
      { error: 'Only editors, moderators, and admins can view stale submissions' },
      { status: 403 }
    );
  }

  const cutoff = new Date(Date.now() - days * 86400000).toISOString();

  const { data: stale, error } = await supabase
    .from('beverages')
    .select('*, creator:created_by(display_name,email)')
    .in('approval_status', ['pending', 'rejected'])
    .lte('updated_at', cutoff)
    .order('updated_at', { ascending: true });

  if (error) {
    console.error('Error fetching stale submissions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stale submissions' },
      { status: 500 }
    );
  }

  return NextResponse.json({ data: stale || [], days });
}
