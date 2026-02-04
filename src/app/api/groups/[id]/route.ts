import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();

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
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const userRole = profile?.role || 'viewer';
    if (!['moderator', 'admin'].includes(userRole)) {
      return NextResponse.json(
        { error: 'Only moderators and admins can update groups' },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Get current group to check for name changes
    const { data: currentGroup } = await supabase
      .from('beverage_groups')
      .select('name')
      .eq('id', id)
      .single();

    if (!currentGroup) {
      return NextResponse.json(
        { error: 'Group not found' },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (body.name !== undefined) updateData.name = body.name.trim();
    if (body.description !== undefined) updateData.description = body.description;
    if (body.color !== undefined) updateData.color = body.color;
    if (body.sort_order !== undefined) updateData.sort_order = body.sort_order;

    const { data: updatedGroup, error } = await supabase
      .from('beverage_groups')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'A group with this name already exists' },
          { status: 409 }
        );
      }
      console.error('Error updating group:', error);
      return NextResponse.json(
        { error: 'Failed to update group' },
        { status: 500 }
      );
    }

    // If the name changed, update all beverages that reference the old name
    if (body.name && body.name.trim() !== currentGroup.name) {
      await supabase
        .from('beverages')
        .update({ group: body.name.trim() })
        .eq('group', currentGroup.name);
    }

    return NextResponse.json(updatedGroup);
  } catch (error) {
    console.error('Error in group PUT:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  try {
    // Only admins can delete groups
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only admins can delete groups' },
        { status: 403 }
      );
    }

    // Check if any beverages use this group
    const { data: group } = await supabase
      .from('beverage_groups')
      .select('name')
      .eq('id', id)
      .single();

    if (!group) {
      return NextResponse.json(
        { error: 'Group not found' },
        { status: 404 }
      );
    }

    const { count } = await supabase
      .from('beverages')
      .select('id', { count: 'exact', head: true })
      .eq('group', group.name);

    if (count && count > 0) {
      return NextResponse.json(
        { error: `Cannot delete: ${count} beverage(s) are assigned to this group. Reassign them first.` },
        { status: 409 }
      );
    }

    const { error } = await supabase
      .from('beverage_groups')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting group:', error);
      return NextResponse.json(
        { error: 'Failed to delete group' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in group DELETE:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
