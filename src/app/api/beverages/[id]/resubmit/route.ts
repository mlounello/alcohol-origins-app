import { NextResponse } from 'next/server';
import { createDbClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const { supabase, db } = await createDbClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

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

  const { data: beverage } = await db
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

  const { data: roleResult } = await db.rpc('get_user_role');
  const userRole =
    (typeof roleResult === 'string'
      ? roleResult
      : (roleResult as { get_user_role?: string } | null)?.get_user_role) || 'viewer';
  const canModerate = ['editor', 'moderator', 'admin'].includes(userRole);

  if (beverage.created_by !== user.id && !canModerate) {
    return NextResponse.json(
      { error: 'Only the submitter or a moderator/editor/admin can move this beverage back to pending' },
      { status: 403 }
    );
  }

  if (beverage.approval_status !== 'rejected') {
    return NextResponse.json(
      { error: 'Only rejected beverages can be resubmitted' },
      { status: 400 }
    );
  }

  const { data: updated, error } = await db
    .from('beverages')
    .update({
      approval_status: 'pending',
      rejected_by: null,
      rejected_at: null,
      rejection_reason: null,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error resubmitting beverage:', error);
    return NextResponse.json(
      { error: 'Failed to resubmit beverage' },
      { status: 500 }
    );
  }

  await db
    .from('activity_log')
    .insert({
      user_id: user.id,
      action: 'create',
      beverage_id: id,
      beverage_name: updated?.name || beverage.name,
      details: { resubmitted: true },
    });

  return NextResponse.json({ beverage: updated });
}
