import { NextResponse } from 'next/server';
import { createDbClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { supabase, db } = await createDbClient();
  const debugData = process.env.DEBUG_DATA === 'true';
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

  const { data: profile } = await db
    .from('profiles')
    .select('is_banned')
    .eq('id', user.id)
    .single();

  if (profile?.is_banned) {
    if (debugData) {
      console.log('[DEBUG_DATA] pending_queue deny', {
        resolvedRole: null,
        denyReason: 'user_banned',
      });
    }
    return NextResponse.json(
      { error: 'Your account is banned' },
      { status: 403 }
    );
  }

  const { data: roleResult, error: roleErr } = await db.rpc('get_user_role');
  const resolvedRole =
    (typeof roleResult === 'string'
      ? roleResult
      : (roleResult as { get_user_role?: string } | null)?.get_user_role) || 'viewer';

  if (debugData) {
    console.log('[DEBUG_DATA] pending_queue role', {
      resolvedRole,
      roleErrorCode: roleErr?.code ?? null,
      roleErrorMessage: roleErr?.message ?? null,
    });
  }

  if (!['editor', 'moderator', 'admin'].includes(resolvedRole)) {
    if (debugData) {
      console.log('[DEBUG_DATA] pending_queue deny', {
        resolvedRole,
        denyReason: 'insufficient_role',
      });
    }
    return NextResponse.json(
      { error: 'Only editors, moderators, and admins can view the approval queue' },
      { status: 403 }
    );
  }

  const statusFilter = includeRejected ? ['pending', 'rejected'] : ['pending'];

  const { data: pending, error, count } = await db
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
