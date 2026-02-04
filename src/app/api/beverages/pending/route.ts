import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const pageSize = Math.max(1, Math.min(50, parseInt(searchParams.get('pageSize') || '20', 10)));
  const sortOrder = searchParams.get('sort') === 'oldest' ? 'oldest' : 'newest';
  const includeRejected = searchParams.get('includeRejected') === 'true';
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

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
      { error: 'Only editors, moderators, and admins can view the approval queue' },
      { status: 403 }
    );
  }

  const statusFilter = includeRejected ? ['pending', 'rejected'] : ['pending'];

  const { data: pending, error, count } = await supabase
    .from('beverages')
    .select('*, creator:created_by(display_name,email)', { count: 'exact' })
    .in('approval_status', statusFilter)
    .range(from, to)
    .order('created_at', { ascending: sortOrder === 'oldest' });

  if (error) {
    console.error('Error fetching pending beverages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pending beverages' },
      { status: 500 }
    );
  }

  return NextResponse.json({ data: pending || [], page, pageSize, total: count || 0 });
}
