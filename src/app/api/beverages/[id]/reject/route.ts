import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
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
  if (!['editor', 'moderator', 'admin'].includes(userRole)) {
    return NextResponse.json(
      { error: 'Only editors, moderators, and admins can reject beverages' },
      { status: 403 }
    );
  }

  const body = await request.json();
  const rejectionReason = typeof body.rejection_reason === 'string'
    ? body.rejection_reason.trim()
    : '';
  const moderatorNotes = typeof body.moderator_notes === 'string'
    ? body.moderator_notes.trim()
    : '';

  const { data: beverage } = await supabase
    .from('beverages')
    .select('*')
    .eq('id', id)
    .single();

  if (!beverage) {
    return NextResponse.json(
      { error: 'Beverage not found' },
      { status: 404 }
    );
  }

  const { data: updated, error } = await supabase
    .from('beverages')
    .update({
      approval_status: 'rejected',
      rejected_by: user.id,
      rejected_at: new Date().toISOString(),
      rejection_reason: rejectionReason || null,
      moderator_notes: moderatorNotes || null,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error rejecting beverage:', error);
    return NextResponse.json(
      { error: 'Failed to reject beverage' },
      { status: 500 }
    );
  }

  await supabase
    .from('activity_log')
    .insert({
      user_id: user.id,
      action: 'reject',
      beverage_id: id,
      beverage_name: updated?.name || beverage.name,
      details: { rejection_reason: rejectionReason || null },
    });

  return NextResponse.json({ beverage: updated });
}
