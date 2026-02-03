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

// PATCH - Update parent relationships
export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const isAdmin = await checkAdmin(supabase);

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
      const parentUuid = nodeIdToUuid[update.parent_node_id];

      if (!childUuid || !parentUuid) {
        console.warn(`Could not find UUIDs for ${update.node_id} -> ${update.parent_node_id}`);
        continue;
      }

      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/beverages?id=eq.${childUuid}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ parent_id: parentUuid }),
        }
      );

      if (response.ok) {
        updatedCount++;
      } else {
        console.warn(`Failed to update parent for ${update.node_id}`);
      }
    }

    return NextResponse.json({ success: true, updated: updatedCount });
  } catch (error) {
    console.error('Error updating parents:', error);
    return NextResponse.json({ error: 'Failed to update parents' }, { status: 500 });
  }
}
