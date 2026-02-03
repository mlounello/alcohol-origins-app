import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
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
    // Get user profile to check role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const userRole = profile?.role || 'viewer';

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
    const { data: updatedBeverage, error: updateError } = await supabase
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
