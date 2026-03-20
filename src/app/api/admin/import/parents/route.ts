import { NextRequest, NextResponse } from 'next/server';
import { createDbClient } from '@/lib/supabase/server';

// Check if user is admin
async function checkAdmin(
  supabase: Awaited<ReturnType<typeof createDbClient>>['supabase'],
  db: Awaited<ReturnType<typeof createDbClient>>['db']
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: profile } = await db
    .from('profiles')
    .select('is_banned')
    .eq('id', user.id)
    .single();
  if (profile?.is_banned) return false;

  const { data: roleResult } = await db.rpc('get_user_role');
  const userRole =
    (typeof roleResult === 'string'
      ? roleResult
      : (roleResult as { get_user_role?: string } | null)?.get_user_role) || 'viewer';

  return userRole === 'admin';
}

// PATCH - Update parent relationships
export async function PATCH(request: NextRequest) {
  const { supabase, db } = await createDbClient();
  const isAdmin = await checkAdmin(supabase, db);

  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

    try {
      const { updates, nodeIdToUuid } = await request.json();

    if (!Array.isArray(updates) || !nodeIdToUuid) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    let updatedCount = 0;

      for (const update of updates) {
        const childUuid = nodeIdToUuid[update.node_id];
        const parentNodeId = typeof update.parent_node_id === 'string'
          ? update.parent_node_id
          : null;

        if (!childUuid || !parentNodeId) {
          console.warn(`Could not resolve parent link for ${update.node_id} -> ${update.parent_node_id}`);
          continue;
        }

        const { error } = await db
          .from('beverages')
          .update({ parent_id: parentNodeId })
          .eq('id', childUuid);

      if (!error) {
        updatedCount++;
      } else {
        console.warn(`Failed to update parent for ${update.node_id}`, error.message);
      }
    }

    return NextResponse.json({ success: true, updated: updatedCount });
  } catch (error) {
    console.error('Error updating parents:', error);
    return NextResponse.json({ error: 'Failed to update parents' }, { status: 500 });
  }
}
