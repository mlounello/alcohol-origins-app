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
  const { data: targetProfile } = await db
    .from('v_admin_users')
    .select('effective_role')
    .eq('id', userId)
    .single();

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

      updates.role = role;
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

    if (Object.keys(updates).length === 1) {
      return NextResponse.json(
        { error: 'No changes provided' },
        { status: 400 }
      );
    }

    const { data: updatedProfile, error } = await db
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating profile:', error);
      return NextResponse.json(
        { error: 'Failed to update user role' },
        { status: 500 }
      );
    }

    if (!updatedProfile) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
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

    return NextResponse.json(updatedProfile);
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
