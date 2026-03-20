import { NextRequest, NextResponse } from 'next/server';
import { createDbClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { supabase, db } = await createDbClient();
  const debugData = process.env.DEBUG_DATA === 'true';
  const respond = (body: unknown, status: number) => {
    if (debugData) {
      console.log('[DEBUG_DATA] admin_users response_status', { status });
    }
    return NextResponse.json(body, { status });
  };

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (debugData) {
    console.log('[DEBUG_DATA] admin_users getUser_result', {
      userIdOrNull: user?.id ?? null,
    });
    console.log('[DEBUG_DATA] admin_users auth_user', {
      userId: user?.id ?? null,
      email: user?.email ?? null,
    });
  }
  if (!user) {
    return respond({ error: 'Authentication required' }, 401);
  }

  const { data: currentProfile } = await db
    .from('profiles')
    .select('is_banned')
    .eq('id', user.id)
    .single();

  if (currentProfile?.is_banned) {
    if (debugData) {
      console.log('[DEBUG_DATA] admin_users deny_reason', { reason: 'user_banned' });
    }
    return respond({ error: 'Your account is banned' }, 403);
  }

  const { data: roleResult, error: roleErr } = await db.rpc('get_user_role');
  const role =
    (typeof roleResult === 'string'
      ? roleResult
      : (roleResult as { get_user_role?: string } | null)?.get_user_role) || 'viewer';
  if (debugData) {
    console.log('[DEBUG_DATA] admin_users resolved_role', {
      role,
      roleErrorCode: roleErr?.code ?? null,
      roleErrorMessage: roleErr?.message ?? null,
    });
  }
  if (!['admin', 'moderator'].includes(role)) {
    if (debugData) {
      console.log('[DEBUG_DATA] admin_users deny_reason', { reason: 'insufficient_role' });
    }
    return respond({ error: 'Admin or moderator access required' }, 403);
  }

  try {
    const { data: adminUsers, error } = await db
      .from('v_admin_users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching profiles:', error);
      return respond({ error: 'Failed to fetch users' }, 500);
    }

    const users = (adminUsers || []).map((row: Record<string, unknown>) => ({
      ...row,
      role: row.effective_role ?? 'viewer',
    }));

    return respond(users, 200);
  } catch (error) {
    console.error('Error fetching users:', error);
    return respond({ error: 'Internal server error' }, 500);
  }
}
