import { NextRequest, NextResponse } from 'next/server';
import { createDbClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const { db, schema } = await createDbClient();
    const debugData = process.env.DEBUG_DATA === 'true';
    const tableName = 'beverage_groups';

    const { data: groups, error } = await db
      .from('beverage_groups')
      .select('*')
      .order('sort_order', { ascending: true });

    if (debugData) {
      console.log(`[DEBUG_DATA] schema=${schema}`);
      console.log(`[DEBUG_DATA] table=${tableName}`);
      console.log(`[DEBUG_DATA] error_code=${error?.code ?? 'none'}`);
      console.log(`[DEBUG_DATA] error_message=${error?.message ?? 'none'}`);
      console.log(`[DEBUG_DATA] data_length=${groups?.length ?? 0}`);
    }

    if (error) {
      console.error('Error fetching groups:', error);
      return NextResponse.json(
        { error: 'Failed to fetch groups' },
        { status: 500 }
      );
    }

    return NextResponse.json(groups || []);
  } catch (error) {
    console.error('Error in groups API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const { supabase, db } = await createDbClient();

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  try {
    // Check role (moderator or admin)
    const { data: profile } = await db
      .from('profiles')
      .select('role, is_banned')
      .eq('id', user.id)
      .single();

    if (profile?.is_banned) {
      return NextResponse.json(
        { error: 'Your account is banned' },
        { status: 403 }
      );
    }

    const userRole = profile?.role || 'viewer';
    if (!['moderator', 'admin'].includes(userRole)) {
      return NextResponse.json(
        { error: 'Only moderators and admins can create groups' },
        { status: 403 }
      );
    }

    const body = await request.json();

    if (!body.name || !body.name.trim()) {
      return NextResponse.json(
        { error: 'Group name is required' },
        { status: 400 }
      );
    }

    // Get the next sort order
    const { data: existing } = await db
      .from('beverage_groups')
      .select('sort_order')
      .order('sort_order', { ascending: false })
      .limit(1);

    const nextSortOrder = (existing?.[0]?.sort_order || 0) + 1;

    const { data: newGroup, error } = await db
      .from('beverage_groups')
      .insert({
        name: body.name.trim(),
        description: body.description || '',
        color: body.color || '#808080',
        sort_order: nextSortOrder,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'A group with this name already exists' },
          { status: 409 }
        );
      }
      console.error('Error creating group:', error);
      return NextResponse.json(
        { error: 'Failed to create group' },
        { status: 500 }
      );
    }

    return NextResponse.json(newGroup, { status: 201 });
  } catch (error) {
    console.error('Error in groups POST:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
