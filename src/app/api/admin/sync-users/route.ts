import { NextResponse } from 'next/server';
import { createDbClient } from '@/lib/supabase/server';
import { syncAppUsersToControlRoom } from '@/lib/control-room/app-user-sync';

export async function POST() {
  const { supabase, db } = await createDbClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { data: profile } = await db
    .from('profiles')
    .select('is_banned')
    .eq('id', user.id)
    .maybeSingle();

  if (profile?.is_banned) {
    return NextResponse.json({ error: 'Your account is banned' }, { status: 403 });
  }

  const { data: roleResult, error: roleError } = await db.rpc('get_user_role');
  const role =
    (typeof roleResult === 'string'
      ? roleResult
      : (roleResult as { get_user_role?: string } | null)?.get_user_role) || 'viewer';

  if (roleError) {
    console.error('[admin-sync-users] failed to resolve role', {
      code: roleError.code,
      message: roleError.message,
      details: roleError.details,
      hint: roleError.hint,
    });
  }

  if (role !== 'admin') {
    return NextResponse.json({ error: 'Administrator access required' }, { status: 403 });
  }

  const result = await syncAppUsersToControlRoom({
    db,
    fullSync: true,
    trigger: 'manual-admin-sync',
  });

  if (result.skipped) {
    return NextResponse.json(
      {
        error: result.error || 'User sync is not configured',
        controlRoom: result.responseBody ?? null,
      },
      { status: 500 }
    );
  }

  if (!result.ok) {
    return NextResponse.json(
      {
        error: result.error || 'Failed to sync users',
        syncedCount: result.syncedCount,
        controlRoom: result.responseBody ?? null,
      },
      { status: result.status || 502 }
    );
  }

  return NextResponse.json({
    ok: true,
    syncedCount: result.syncedCount,
    controlRoom: result.responseBody ?? null,
  });
}
