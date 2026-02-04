import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { Beverage } from '@/types/database';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();

  try {
    const { data: { user } } = await supabase.auth.getUser();

    let userRole: string | null = null;
    if (user) {
      const { data: profile } = await supabase
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
      userRole = profile?.role ?? 'viewer';
    }

    let query = supabase
      .from('beverages')
      .select('*')
      .eq('id', id);

    if (!userRole || !['editor', 'moderator', 'admin'].includes(userRole)) {
      if (user) {
        query = query.or(`approval_status.eq.approved,created_by.eq.${user.id}`);
      } else {
        query = query.eq('approval_status', 'approved');
      }
    }

    const { data: beverage, error } = await query.single();

    if (error || !beverage) {
      return NextResponse.json(
        { error: 'Beverage not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(beverage as Beverage);
  } catch (error) {
    console.error('Error fetching beverage:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
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
    const body = await request.json();

    // Get current beverage to check if it exists and to create revision
    const { data: currentBeverage, error: currentError } = await supabase
      .from('beverages')
      .select('*')
      .eq('id', id)
      .single();

    if (currentError || !currentBeverage) {
      return NextResponse.json(
        { error: 'Beverage not found' },
        { status: 404 }
      );
    }

    const { data: profile } = await supabase
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

    // Check if locked (only editors/admins can update locked entries)
    if (currentBeverage.is_locked) {
      if (!['editor', 'moderator', 'admin'].includes(userRole)) {
        return NextResponse.json(
          { error: 'This beverage is locked and can only be edited by editors, moderators, or admins' },
          { status: 403 }
        );
      }
    }

    // Update beverage
    const updateData = {
      name: body.name,
      type: body.type,
      group: body.group,
      latitude: body.latitude,
      longitude: body.longitude,
      origin_region: body.origin_region || null,
      origin_country: body.origin_country || null,
      date_year: body.date_year || null,
      date_text: body.date_text || currentBeverage.date_text || currentBeverage.name, // date_text is NOT NULL
      description: body.description || null,
      citation: body.citation || null,
      parent_id: body.parent_id || null,
      approval_status: currentBeverage.approval_status,
      approved_by: currentBeverage.approved_by,
      approved_at: currentBeverage.approved_at,
      rejected_by: currentBeverage.rejected_by,
      rejected_at: currentBeverage.rejected_at,
      rejection_reason: currentBeverage.rejection_reason,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    };

    const { data: updatedBeverage, error: updateError } = await supabase
      .from('beverages')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Supabase update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update beverage' },
        { status: 500 }
      );
    }

    // Get latest revision number
    const { data: revisions } = await supabase
      .from('beverage_revisions')
      .select('revision_number')
      .eq('beverage_id', id)
      .order('revision_number', { ascending: false })
      .limit(1);

    const nextRevisionNumber = (revisions?.[0]?.revision_number || 0) + 1;

    // Create revision (column names match DB schema: edited_by, edit_summary)
    await supabase
      .from('beverage_revisions')
      .insert({
        beverage_id: id,
        edited_by: user.id,
        revision_number: nextRevisionNumber,
        data: updateData,
        edit_summary: body.change_summary || 'Updated beverage information',
      });

    // Log activity
    await supabase
      .from('activity_log')
      .insert({
        user_id: user.id,
        action: 'edit',
        beverage_id: id,
        beverage_name: updatedBeverage.name,
        details: { change_summary: body.change_summary || 'Updated beverage information' },
      });

    return NextResponse.json(updatedBeverage);
  } catch (error) {
    console.error('Error updating beverage:', error);
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
    // Get user profile to check role (editors, moderators, and admins can delete)
    const { data: profile } = await supabase
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

    if (!['editor', 'moderator', 'admin'].includes(userRole)) {
      return NextResponse.json(
        { error: 'Only editors, moderators, and admins can delete beverages' },
        { status: 403 }
      );
    }

    // Get beverage name before deleting (for activity log)
    const { data: beverage } = await supabase
      .from('beverages')
      .select('name')
      .eq('id', id)
      .single();

    // Delete beverage using Supabase client (carries user's auth session for RLS)
    const { error: deleteError } = await supabase
      .from('beverages')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Supabase delete error:', deleteError);
      return NextResponse.json(
        { error: deleteError.message || 'Failed to delete beverage' },
        { status: 500 }
      );
    }

    // Log activity
    await supabase
      .from('activity_log')
      .insert({
        user_id: user.id,
        action: 'delete',
        beverage_name: beverage?.name || 'Unknown',
        details: { deleted_id: id },
      });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting beverage:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
