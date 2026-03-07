import { NextResponse } from 'next/server';
import { createDbClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { supabase, db } = await createDbClient();
  const debugData = process.env.DEBUG_DATA === 'true';
  const { searchParams } = new URL(request.url);
  const days = Math.max(1, parseInt(searchParams.get('days') || '30', 10));

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
      console.log('[DEBUG_DATA] stale_submissions deny', {
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
    console.log('[DEBUG_DATA] stale_submissions role', {
      resolvedRole,
      roleErrorCode: roleErr?.code ?? null,
      roleErrorMessage: roleErr?.message ?? null,
    });
  }

  if (!['editor', 'moderator', 'admin'].includes(resolvedRole)) {
    if (debugData) {
      console.log('[DEBUG_DATA] stale_submissions deny', {
        resolvedRole,
        denyReason: 'insufficient_role',
      });
    }
    return NextResponse.json(
      { error: 'Only editors, moderators, and admins can view stale submissions' },
      { status: 403 }
    );
  }

  const cutoff = new Date(Date.now() - days * 86400000).toISOString();

  const { data: stale, error } = await db
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
