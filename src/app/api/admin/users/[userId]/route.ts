import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { UserRole } from '@/types/database';

interface RouteParams {
  params: Promise<{ userId: string }>;
}

const VALID_ROLES: UserRole[] = ['viewer', 'contributor', 'editor', 'admin'];

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { userId } = await params;
  const supabase = await createClient();

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  // Check if user is admin
  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (currentProfile?.role !== 'admin') {
    return NextResponse.json(
      { error: 'Admin access required' },
      { status: 403 }
    );
  }

  // Prevent self role change
  if (userId === user.id) {
    return NextResponse.json(
      { error: 'You cannot change your own role' },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    const { role } = body;

    // Validate role
    if (!role || !VALID_ROLES.includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      );
    }

    const { data: updatedProfile, error } = await supabase
      .from('profiles')
      .update({ role, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating profile:', error);
      return NextResponse.json(
        { error: 'Failed to update user role' },
        { status: 500 }
      );
    }

    if (!updatedProfile) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedProfile);
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
