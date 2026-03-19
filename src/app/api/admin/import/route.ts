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

// DELETE - Clear all beverages
export async function DELETE() {
  const { supabase, db } = await createDbClient();
  const isAdmin = await checkAdmin(supabase, db);

  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    // Delete all beverages using authenticated client
    const { error } = await db
      .from('beverages')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (error) {
      console.warn('Warning clearing data:', error.message);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error clearing data:', error);
    return NextResponse.json({ error: 'Failed to clear data' }, { status: 500 });
  }
}

// POST - Insert beverages
export async function POST(request: NextRequest) {
  const { supabase, db } = await createDbClient();
  const isAdmin = await checkAdmin(supabase, db);

  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { beverages } = await request.json();

    if (!Array.isArray(beverages) || beverages.length === 0) {
      return NextResponse.json({ error: 'No beverages provided' }, { status: 400 });
    }

    const nodeIdToUuid: Record<string, string> = {};
    let insertedCount = 0;

    // Insert in batches of 50 using the authenticated Supabase client
    const batchSize = 50;
    for (let i = 0; i < beverages.length; i += batchSize) {
      const batch = beverages.slice(i, i + batchSize);

      const { data: inserted, error } = await db
        .from('beverages')
        .insert(batch)
        .select();

      if (error) {
        console.error(`Error inserting batch: ${error.message}`);
        continue;
      }

      if (inserted) {
        for (const bev of inserted) {
          nodeIdToUuid[bev.node_id] = bev.id;
          insertedCount++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      count: insertedCount,
      nodeIdToUuid
    });
  } catch (error) {
    console.error('Error inserting beverages:', error);
    return NextResponse.json({ error: 'Failed to insert beverages' }, { status: 500 });
  }
}
