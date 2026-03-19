import { NextRequest, NextResponse } from 'next/server';
import { createDbClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
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
    // Get user profile to check role
    const { data: profile } = await db
      .from('profiles')
      .select('is_banned')
      .eq('id', user.id)
      .single();

    if (profile?.is_banned) {
      return NextResponse.json(
        { error: 'Your account is banned' },
        { status: 403 }
      );
    }

    const { data: roleResult } = await db.rpc('get_user_role');
    const userRole =
      (typeof roleResult === 'string'
        ? roleResult
        : (roleResult as { get_user_role?: string } | null)?.get_user_role) || 'viewer';

    // Only editors, moderators, and admins can lock/unlock
    if (!['editor', 'moderator', 'admin'].includes(userRole)) {
      return NextResponse.json(
        { error: 'Only editors, moderators, and admins can lock beverages' },
        { status: 403 }
      );
    }

    // Get the action from request body
    const body = await request.json();
    const lock = body.lock === true;

    // Update the is_locked field
    const { data: updatedBeverage, error: updateError } = await db
      .from('beverages')
      .update({
        is_locked: lock,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating lock status:', updateError);
      return NextResponse.json(
        { error: 'Failed to update lock status' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      is_locked: updatedBeverage.is_locked,
      message: lock ? 'Beverage locked successfully' : 'Beverage unlocked successfully',
    });
  } catch (error) {
    console.error('Error in lock endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
