import { NextRequest, NextResponse } from 'next/server';
import { createDbClient } from '@/lib/supabase/server';
import { syncAppUsersToControlRoom } from '@/lib/control-room/app-user-sync';
import { UserRole } from '@/types/database';

interface RouteParams {
  params: Promise<{ userId: string }>;
}

const VALID_ROLES: UserRole[] = ['viewer', 'contributor', 'editor', 'moderator', 'admin'];

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { userId } = await params;
  const { supabase, db } = await createDbClient();

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  // Check if user is admin or moderator
  const { data: currentProfile } = await db
    .from('profiles')
    .select('is_banned')
    .eq('id', user.id)
    .single();

  if (currentProfile?.is_banned) {
    return NextResponse.json(
      { error: 'Your account is banned' },
      { status: 403 }
    );
  }

  const { data: roleResult } = await db.rpc('get_user_role');
  const currentRole =
    (typeof roleResult === 'string'
      ? roleResult
      : (roleResult as { get_user_role?: string } | null)?.get_user_role) || 'viewer';

  const isAdmin = currentRole === 'admin';
  const isModerator = currentRole === 'moderator';

  if (!isAdmin && !isModerator) {
    return NextResponse.json(
      { error: 'Admin or moderator access required' },
      { status: 403 }
    );
  }

  // Prevent self role change
  if (userId === user.id) {
    return NextResponse.json(
      { error: 'You cannot change your own role' },
      { status: 400 }
    );
  }

  // Get target user's current role
  const { data: targetProfiles, error: targetProfileError } = await db.rpc('get_admin_user', {
    p_user_id: userId,
  });
  const targetProfile = targetProfiles?.[0];

  if (targetProfileError) {
    console.error('Error loading target user:', targetProfileError);
    return NextResponse.json(
      { error: 'Failed to load target user' },
      { status: 500 }
    );
  }

  if (!targetProfile) {
    return NextResponse.json(
      { error: 'User not found' },
      { status: 404 }
    );
  }

  // Moderators cannot edit admins or other moderators
  if (isModerator && !isAdmin) {
      if (targetProfile?.effective_role === 'admin' || targetProfile?.effective_role === 'moderator') {
      return NextResponse.json(
        { error: 'Moderators cannot modify admin or moderator accounts' },
        { status: 403 }
      );
    }
  }

  try {
    const body = await request.json();
    const { role, is_banned, banned_reason } = body;

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    let roleHandledByRpc = false;

    if (role !== undefined) {
      // Validate role
      if (!VALID_ROLES.includes(role)) {
        return NextResponse.json(
          { error: 'Invalid role' },
          { status: 400 }
        );
      }

      // Moderators cannot assign admin or moderator roles
      if (isModerator && !isAdmin && (role === 'admin' || role === 'moderator')) {
        return NextResponse.json(
          { error: 'Moderators cannot assign admin or moderator roles' },
          { status: 403 }
        );
      }

      const { error: roleUpdateError } = await db.rpc('set_managed_user_role', {
        p_user_id: userId,
        p_role: role,
      });

      if (roleUpdateError) {
        console.error('Error updating effective user role:', roleUpdateError);
        return NextResponse.json(
          { error: 'Failed to update user role' },
          { status: 500 }
        );
      }

      roleHandledByRpc = true;
    }

    if (is_banned !== undefined) {
      if (typeof is_banned !== 'boolean') {
        return NextResponse.json(
          { error: 'Invalid ban flag' },
          { status: 400 }
        );
      }

      updates.is_banned = is_banned;
      updates.banned_at = is_banned ? new Date().toISOString() : null;
      updates.banned_reason = is_banned
        ? (typeof banned_reason === 'string' ? banned_reason : null)
        : null;
    }

    if (Object.keys(updates).length === 1 && !roleHandledByRpc) {
      return NextResponse.json(
        { error: 'No changes provided' },
        { status: 400 }
      );
    }

    let updatedProfile: Record<string, unknown> | null = null;
    let error: { message?: string } | null = null;

    if (Object.keys(updates).length > 1) {
      const profileUpdateResult = await db
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      updatedProfile = profileUpdateResult.data as Record<string, unknown> | null;
      error = profileUpdateResult.error;
    }

    if (error) {
      console.error('Error updating profile:', error);
      return NextResponse.json(
        { error: 'Failed to update user role' },
        { status: 500 }
      );
    }

    if (Object.keys(updates).length > 1 && !updatedProfile) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const { data: normalizedUsers, error: normalizedUserError } = await db.rpc('get_admin_user', {
      p_user_id: userId,
    });
    const normalizedUser = normalizedUsers?.[0];

    if (normalizedUserError || !normalizedUser) {
      console.error('Error fetching normalized user:', normalizedUserError);
      return NextResponse.json(
        { error: 'Failed to load updated user' },
        { status: 500 }
      );
    }

    const syncResult = await syncAppUsersToControlRoom({
      db,
      fullSync: false,
      userId,
      trigger: 'admin-user-update',
    });

    if (!syncResult.ok && !syncResult.skipped) {
      console.error('[admin-user-update] control room sync failed', syncResult);
    }

    return NextResponse.json({
      ...normalizedUser,
      role: normalizedUser.effective_role ?? 'viewer',
    });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
