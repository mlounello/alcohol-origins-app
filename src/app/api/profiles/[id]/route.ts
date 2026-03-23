import { NextResponse } from 'next/server';
import { createDbClient } from '@/lib/supabase/server';
import { syncAppUsersToControlRoom } from '@/lib/control-room/app-user-sync';

interface RouteParams {
  params: Promise<{ id: string }>;
}

const STORAGE_URL_MARKER = '/storage/v1/object/public/avatars/';

function extFromContentType(contentType: string | null): 'jpg' | 'png' {
  return contentType?.toLowerCase().includes('png') ? 'png' : 'jpg';
}

function jsonNoStore(body: unknown, init?: { status?: number }) {
  return NextResponse.json(body, {
    ...init,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}

export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const { supabase, db } = await createDbClient();
  const debugData = process.env.DEBUG_DATA === 'true';

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return jsonNoStore(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }
  if (debugData) {
    console.log('[DEBUG_DATA] user_metadata keys', Object.keys(user.user_metadata || {}));
    console.log('[DEBUG_DATA] user_metadata', user.user_metadata);
  }

  if (id !== user.id) {
    return jsonNoStore(
      { error: 'Forbidden' },
      { status: 403 }
    );
  }

  const { data: roleResult, error: roleErr } = await db.rpc('get_user_role');
  if (roleErr && debugData) {
    console.log('[DEBUG_DATA] profiles_route role_error', {
      code: roleErr.code,
      message: roleErr.message,
    });
  }
  const effectiveRole =
    (typeof roleResult === 'string'
      ? roleResult
      : (roleResult as { get_user_role?: string } | null)?.get_user_role) || 'viewer';

  const ensureStoredAvatar = async (
    userId: string,
    googleAvatarUrl: string | null,
    currentProfileAvatarUrl: string | null
  ): Promise<string | null> => {
    if (currentProfileAvatarUrl && currentProfileAvatarUrl.includes(STORAGE_URL_MARKER)) {
      return currentProfileAvatarUrl;
    }
    if (!googleAvatarUrl) {
      return currentProfileAvatarUrl;
    }

    try {
      const avatarResponse = await fetch(googleAvatarUrl);
      if (debugData) {
        console.log('[DEBUG_DATA] ensureStoredAvatar fetch_status', {
          status: avatarResponse.status,
          statusText: avatarResponse.statusText,
        });
      }
      if (avatarResponse.status === 429) {
        return currentProfileAvatarUrl;
      }
      if (!avatarResponse.ok) {
        return currentProfileAvatarUrl;
      }

      const contentType = avatarResponse.headers.get('content-type');
      const extension = extFromContentType(contentType);
      const path = `${userId}.${extension}`;
      const fileBytes = await avatarResponse.arrayBuffer();

      const { error: uploadError } = await supabase
        .storage
        .from('avatars')
        .upload(path, fileBytes, {
          upsert: true,
          contentType: contentType || `image/${extension === 'png' ? 'png' : 'jpeg'}`,
        });

      if (debugData) {
        console.log('[DEBUG_DATA] ensureStoredAvatar upload_result', {
          uploadError: uploadError
            ? {
                code: uploadError.name || null,
                message: uploadError.message,
              }
            : null,
        });
      }
      if (uploadError) {
        return currentProfileAvatarUrl;
      }

      const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${path}`;

      const { error: updateError } = await db
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', userId);

      if (debugData) {
        console.log('[DEBUG_DATA] ensureStoredAvatar profile_update_result', {
          updateError: updateError
            ? {
                code: updateError.code,
                message: updateError.message,
                details: updateError.details,
                hint: updateError.hint,
              }
            : null,
        });
      }

      if (updateError) {
        return currentProfileAvatarUrl;
      }
      return publicUrl;
    } catch (error) {
      if (debugData) {
        console.log('[DEBUG_DATA] ensureStoredAvatar exception', {
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
      return currentProfileAvatarUrl;
    }
  };

  let createdProfile = false;

  const { data: initialProfile, error: profileError } = await db
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();
  let profile = initialProfile;
  const needsName = !profile?.display_name || profile.display_name.trim() === '';
  const needsAvatar = !profile?.avatar_url || profile.avatar_url.trim() === '';
  const metadata = (user.user_metadata || {}) as Record<string, unknown>;
  const metaNameRaw = metadata.full_name ?? metadata.name ?? null;
  const metaAvatarRaw = metadata.avatar_url ?? metadata.picture ?? null;
  const metaName = typeof metaNameRaw === 'string' && metaNameRaw.trim() !== '' ? metaNameRaw : null;
  const metaAvatar = typeof metaAvatarRaw === 'string' && metaAvatarRaw.trim() !== '' ? metaAvatarRaw : null;
  if (debugData) {
    console.log('[DEBUG_DATA] profiles_route initial_profile_lookup', {
      profile,
      profileErr: profileError
        ? {
            code: profileError.code,
            message: profileError.message,
            details: profileError.details,
            hint: profileError.hint,
          }
        : null,
    });
  }

  if (!profile || needsName || needsAvatar) {
    const bootstrapCandidate: Record<string, unknown> = {
      id: user.id,
      email: user.email ?? '',
      role: profile?.role ?? 'viewer',
      is_banned: (profile?.is_banned as boolean | undefined) ?? false,
      display_name: needsName ? metaName : profile?.display_name ?? null,
      avatar_url: needsAvatar ? metaAvatar : profile?.avatar_url ?? null,
    };

    const { error: upsertErr } = await db
      .from('profiles')
      .upsert(bootstrapCandidate, { onConflict: 'id' });
    if (debugData) {
      console.log('[DEBUG_DATA] profiles_route bootstrap_upsert', {
        upsertErr: upsertErr
          ? {
              code: upsertErr.code,
              message: upsertErr.message,
              details: upsertErr.details,
              hint: upsertErr.hint,
            }
          : null,
      });
    }

    if (upsertErr) {
      // Fallback when optional columns are not present/writable.
      const { error: minimalErr } = await db
        .from('profiles')
        .upsert({ id: user.id }, { onConflict: 'id' });
      if (minimalErr) {
        return jsonNoStore(
          { error: 'Failed to bootstrap profile' },
          { status: 500 }
        );
      }
    }
    createdProfile = true;

    const { data: profile2, error: refetchErr } = await db
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();
    if (debugData) {
      console.log('[DEBUG_DATA] profiles_route refetch_profile', {
        refetchErr: refetchErr
          ? {
              code: refetchErr.code,
              message: refetchErr.message,
              details: refetchErr.details,
              hint: refetchErr.hint,
            }
          : null,
        profile2,
      });
    }
    profile = profile2 || null;
  }

  const storedAvatarUrl = await ensureStoredAvatar(
    user.id,
    metaAvatar,
    (profile?.avatar_url as string | null) ?? null
  );
  if (storedAvatarUrl && profile) {
    profile = {
      ...profile,
      avatar_url: storedAvatarUrl,
    };
  }

  const responseProfile = {
    ...(profile || { id: user.id }),
    id: user.id,
    role: effectiveRole,
    is_banned: (profile?.is_banned as boolean | undefined) ?? false,
  };

  if (debugData) {
    console.log('[DEBUG_DATA] profiles_route', {
      userId: user.id,
      effectiveRole,
      createdProfile,
    });
  }

  if (createdProfile) {
    void syncAppUsersToControlRoom({
      db,
      fullSync: false,
      userId: user.id,
      trigger: 'profile-bootstrap',
    })
      .then((syncResult) => {
        if (!syncResult.ok && !syncResult.skipped) {
          console.error('[profiles_route] control room sync failed', syncResult);
        }
      })
      .catch((syncError) => {
        console.error('[profiles_route] control room sync request failed', syncError);
      });
  }

  return jsonNoStore(responseProfile);
}
