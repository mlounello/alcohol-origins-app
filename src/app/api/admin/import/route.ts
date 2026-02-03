import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Check if user is admin
async function checkAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const profileUrl = `${SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}&select=role`;
  const response = await fetch(profileUrl, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
    },
  });

  if (!response.ok) return false;
  const profiles = await response.json();
  return profiles[0]?.role === 'admin';
}

// DELETE - Clear all beverages
export async function DELETE() {
  const supabase = await createClient();
  const isAdmin = await checkAdmin(supabase);

  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    // Delete all beverages using authenticated client
    const { error } = await supabase
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
  const supabase = await createClient();
  const isAdmin = await checkAdmin(supabase);

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

      const { data: inserted, error } = await supabase
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
