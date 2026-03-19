import { NextRequest, NextResponse } from 'next/server';
import { createDbClient } from '@/lib/supabase/server';
import { Beverage } from '@/types/database';

interface RouteParams {
  params: Promise<{ id: string }>;
}

async function getResolvedRole(db: Awaited<ReturnType<typeof createDbClient>>['db']) {
  const { data: roleResult, error: roleErr } = await db.rpc('get_user_role');
  const resolvedRole =
    (typeof roleResult === 'string'
      ? roleResult
      : (roleResult as { get_user_role?: string } | null)?.get_user_role) || 'viewer';

  return { resolvedRole, roleErr };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const { supabase, db } = await createDbClient();
  const debugData = process.env.DEBUG_DATA === 'true';

  try {
    const { data: { user } } = await supabase.auth.getUser();

    let userRole: string | null = null;
    if (user) {
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
      const { resolvedRole, roleErr } = await getResolvedRole(db);
      userRole = resolvedRole;
      if (debugData) {
        console.log('[DEBUG_DATA] beverage_detail_role', {
          id,
          userId: user.id,
          resolvedRole,
          roleErrorCode: roleErr?.code ?? null,
          roleErrorMessage: roleErr?.message ?? null,
        });
      }
    }

    let query = db
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
  const { supabase, db } = await createDbClient();
  const debugData = process.env.DEBUG_DATA === 'true';

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
    const { data: currentBeverage, error: currentError } = await db
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

    const { resolvedRole, roleErr } = await getResolvedRole(db);
    const userRole = resolvedRole;
    if (debugData) {
      console.log('[DEBUG_DATA] beverage_update_role', {
        id,
        userId: user.id,
        resolvedRole,
        roleErrorCode: roleErr?.code ?? null,
        roleErrorMessage: roleErr?.message ?? null,
      });
    }

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
      image_url: body.image_url !== undefined ? body.image_url || null : currentBeverage.image_url,
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

    const { data: updatedBeverage, error: updateError } = await db
      .from('beverages')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Supabase update error:', {
        code: updateError.code,
        message: updateError.message,
        details: updateError.details,
        hint: updateError.hint,
      });
      return NextResponse.json(
        { error: updateError.message || 'Failed to update beverage' },
        { status: 500 }
      );
    }

    // Get latest revision number
    const { data: revisions } = await db
      .from('beverage_revisions')
      .select('revision_number')
      .eq('beverage_id', id)
      .order('revision_number', { ascending: false })
      .limit(1);

    const nextRevisionNumber = (revisions?.[0]?.revision_number || 0) + 1;

    // Create revision (column names match DB schema: edited_by, edit_summary)
    await db
      .from('beverage_revisions')
      .insert({
        beverage_id: id,
        edited_by: user.id,
        revision_number: nextRevisionNumber,
        data: updateData,
        edit_summary: body.change_summary || 'Updated beverage information',
      });

    // Log activity
    await db
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
  const { supabase, db } = await createDbClient();
  const debugData = process.env.DEBUG_DATA === 'true';

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

    const { resolvedRole, roleErr } = await getResolvedRole(db);
    const userRole = resolvedRole;
    if (debugData) {
      console.log('[DEBUG_DATA] beverage_delete_role', {
        id,
        userId: user.id,
        resolvedRole,
        roleErrorCode: roleErr?.code ?? null,
        roleErrorMessage: roleErr?.message ?? null,
      });
    }

    if (!['editor', 'moderator', 'admin'].includes(userRole)) {
      return NextResponse.json(
        { error: 'Only editors, moderators, and admins can delete beverages' },
        { status: 403 }
      );
    }

    // Get beverage name before deleting (for activity log)
    const { data: beverage } = await db
      .from('beverages')
      .select('name')
      .eq('id', id)
      .single();

    // Delete beverage using Supabase client (carries user's auth session for RLS)
    const { error: deleteError } = await db
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
    await db
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
