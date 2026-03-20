import { createDbClient } from '@/lib/supabase/server';

type DbClient = Awaited<ReturnType<typeof createDbClient>>['db'];

type AdminUserRow = {
  id: string;
  email?: string | null;
  display_name?: string | null;
  role?: string | null;
  effective_role?: string | null;
  is_banned?: boolean | null;
  banned_reason?: string | null;
};

type ControlRoomUserPayload = {
  fullName: string;
  email: string;
  globalRole: string;
  accountStatus: string;
  appRole: string;
  permissionLevel: string;
  membershipStatus: string;
  notes: string;
};

export type AppUserSyncResult = {
  ok: boolean;
  skipped?: boolean;
  syncedCount: number;
  status?: number;
  error?: string;
  responseBody?: unknown;
};

const CONTROL_ROOM_SYNC_URL =
  process.env.CONTROL_ROOM_APP_USERS_SYNC_URL ||
  'https://mlounello.com/api/admin/sync/app-users';
const CONTROL_ROOM_SYNC_SECRET = process.env.APP_SYNC_SECRET;
const CF_ACCESS_CLIENT_ID = process.env.CF_ACCESS_CLIENT_ID;
const CF_ACCESS_CLIENT_SECRET = process.env.CF_ACCESS_CLIENT_SECRET;
const APP_SLUG = 'alcohol-origins';
const APP_NOTES = 'Imported from Alcohol Origins';

function normalizeRole(row: AdminUserRow) {
  return row.effective_role || row.role || 'viewer';
}

function deriveFullName(row: AdminUserRow) {
  if (row.display_name && row.display_name.trim() !== '') {
    return row.display_name.trim();
  }

  if (row.email && row.email.includes('@')) {
    return row.email.split('@')[0];
  }

  return 'Unknown User';
}

function mapGlobalRole(_row: AdminUserRow) {
  // This app does not currently store cross-app/global roles, so we sync
  // everyone as a member and preserve app-specific access in appRole.
  return 'member';
}

function mapPermissionLevel(row: AdminUserRow) {
  const role = normalizeRole(row);
  return ['editor', 'moderator', 'admin'].includes(role) ? 'managed' : 'standard';
}

function mapMembershipStatus(row: AdminUserRow) {
  return row.is_banned ? 'suspended' : 'active';
}

function mapAccountStatus(row: AdminUserRow) {
  return row.is_banned ? 'banned' : 'active';
}

function toPayloadUser(row: AdminUserRow): ControlRoomUserPayload | null {
  const email = row.email?.trim();
  if (!email) {
    return null;
  }

  const appRole = normalizeRole(row);

  return {
    fullName: deriveFullName(row),
    email,
    globalRole: mapGlobalRole(row),
    accountStatus: mapAccountStatus(row),
    appRole,
    permissionLevel: mapPermissionLevel(row),
    membershipStatus: mapMembershipStatus(row),
    notes: APP_NOTES,
  };
}

async function parseControlRoomResponse(response: Response) {
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }

  try {
    return await response.text();
  } catch {
    return null;
  }
}

function isCloudflareAccessBlock(responseBody: unknown) {
  if (typeof responseBody !== 'string') {
    return false;
  }

  return (
    responseBody.includes('Cloudflare Access') ||
    responseBody.includes('Sign in ・ Cloudflare Access') ||
    responseBody.includes('Error ・ Cloudflare Access') ||
    responseBody.includes('<title>Sign in ・ Cloudflare Access</title>') ||
    responseBody.includes('<title>Error ・ Cloudflare Access</title>')
  );
}

async function fetchUsersForSync(db: DbClient, userId?: string) {
  const { data, error } = userId
    ? await db.rpc('get_admin_user', { p_user_id: userId })
    : await db.rpc('get_admin_users');

  if (error) {
    throw new Error(`Failed to load app users for sync: ${error.message}`);
  }

  return ((data as AdminUserRow[] | null) || []).map((row) => ({
    ...row,
    effective_role: row.effective_role || row.role || 'viewer',
  }));
}

export async function syncAppUsersToControlRoom({
  db,
  fullSync,
  userId,
  users,
  trigger,
}: {
  db: DbClient;
  fullSync: boolean;
  userId?: string;
  users?: AdminUserRow[];
  trigger: string;
}): Promise<AppUserSyncResult> {
  if (!CONTROL_ROOM_SYNC_SECRET) {
    console.error('[app-user-sync] missing sync secret', { trigger });
    return {
      ok: false,
      skipped: true,
      syncedCount: 0,
      error: 'Missing APP_SYNC_SECRET',
    };
  }

  if (!CF_ACCESS_CLIENT_ID || !CF_ACCESS_CLIENT_SECRET) {
    console.error('[app-user-sync] missing cloudflare access service token env', {
      trigger,
      hasClientId: Boolean(CF_ACCESS_CLIENT_ID),
      hasClientSecret: Boolean(CF_ACCESS_CLIENT_SECRET),
    });
    return {
      ok: false,
      skipped: true,
      syncedCount: 0,
      error: 'Missing CF_ACCESS_CLIENT_ID or CF_ACCESS_CLIENT_SECRET',
    };
  }

  const sourceUsers = users ?? (await fetchUsersForSync(db, userId));
  const payloadUsers = sourceUsers.map(toPayloadUser).filter(Boolean) as ControlRoomUserPayload[];

  if (payloadUsers.length === 0) {
    console.log('[app-user-sync] no eligible users to sync', { trigger, fullSync, userId: userId ?? null });
    return { ok: true, syncedCount: 0 };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(CONTROL_ROOM_SYNC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-App-Sync-Secret': CONTROL_ROOM_SYNC_SECRET,
        'CF-Access-Client-Id': CF_ACCESS_CLIENT_ID,
        'CF-Access-Client-Secret': CF_ACCESS_CLIENT_SECRET,
      },
      body: JSON.stringify({
        appSlug: APP_SLUG,
        fullSync,
        users: payloadUsers,
      }),
      cache: 'no-store',
      signal: controller.signal,
    });

    const responseBody = await parseControlRoomResponse(response);

    if (!response.ok) {
      console.error('[app-user-sync] sync failed', {
        trigger,
        fullSync,
        status: response.status,
        statusText: response.statusText,
        body: typeof responseBody === 'string' ? responseBody.slice(0, 500) : responseBody,
      });

      return {
        ok: false,
        syncedCount: payloadUsers.length,
        status: response.status,
        error: response.statusText || 'Control room sync failed',
        responseBody,
      };
    }

    if (
      responseBody &&
      typeof responseBody === 'object' &&
      'ok' in responseBody &&
      (responseBody as { ok?: boolean }).ok === false
    ) {
      console.error('[app-user-sync] control room returned ok=false', {
        trigger,
        fullSync,
        status: response.status,
        body: responseBody,
      });

      return {
        ok: false,
        syncedCount: payloadUsers.length,
        status: response.status,
        error: 'Control room rejected sync payload',
        responseBody,
      };
    }

    if (isCloudflareAccessBlock(responseBody)) {
      console.error('[app-user-sync] blocked by cloudflare access', {
        trigger,
        fullSync,
        status: response.status,
      });

      return {
        ok: false,
        syncedCount: payloadUsers.length,
        status: response.status || 403,
        error: 'Cloudflare Access blocked sync request',
        responseBody,
      };
    }

    console.log('[app-user-sync] sync succeeded', {
      trigger,
      fullSync,
      syncedCount: payloadUsers.length,
      responseBody,
    });

    return {
      ok: true,
      syncedCount: payloadUsers.length,
      status: response.status,
      responseBody,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown sync error';
    console.error('[app-user-sync] sync exception', {
      trigger,
      fullSync,
      message,
    });
    return {
      ok: false,
      syncedCount: payloadUsers.length,
      error: message,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}
