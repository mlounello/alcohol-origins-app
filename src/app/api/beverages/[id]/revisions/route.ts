import { NextRequest, NextResponse } from 'next/server';
import { Beverage, BeverageRevision } from '@/types/database';
import { createDbClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

async function getResolvedRole(db: Awaited<ReturnType<typeof createDbClient>>['db']) {
  const { data: roleResult } = await db.rpc('get_user_role');
  return (
    (typeof roleResult === 'string'
      ? roleResult
      : (roleResult as { get_user_role?: string } | null)?.get_user_role) || 'viewer'
  );
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const { db } = await createDbClient();

  try {
    const { data: revisions, error } = await db
      .from('beverage_revisions')
      .select('*')
      .eq('beverage_id', id)
      .order('revision_number', { ascending: false });

    if (error) {
      console.error('Supabase fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch revisions' },
        { status: 500 }
      );
    }

    return NextResponse.json((revisions || []) as BeverageRevision[]);
  } catch (error) {
    console.error('Error fetching revisions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
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
    const body = await request.json();
    const revisionId = body.revision_id as string | undefined;

    if (!revisionId) {
      return NextResponse.json(
        { error: 'Revision id is required' },
        { status: 400 }
      );
    }

    // Check role (editor, moderator, admin)
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

    const userRole = await getResolvedRole(db);
    if (!['editor', 'moderator', 'admin'].includes(userRole)) {
      return NextResponse.json(
        { error: 'Only editors, moderators, and admins can revert revisions' },
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

    const { data: revision } = await db
      .from('beverage_revisions')
      .select('*')
      .eq('id', revisionId)
      .eq('beverage_id', id)
      .single();

    if (!revision) {
      return NextResponse.json(
        { error: 'Revision not found' },
        { status: 404 }
      );
    }

    const revisionData = revision.data as Partial<Beverage>;

    const resolvedDateText =
      revisionData.date_text !== undefined ? revisionData.date_text : beverage.date_text;

    const updatePayload = {
      name: revisionData.name !== undefined ? revisionData.name : beverage.name,
      type: revisionData.type !== undefined ? revisionData.type : beverage.type,
      group: revisionData.group !== undefined ? revisionData.group : beverage.group,
      latitude: revisionData.latitude !== undefined ? revisionData.latitude : beverage.latitude,
      longitude: revisionData.longitude !== undefined ? revisionData.longitude : beverage.longitude,
      origin_region: revisionData.origin_region !== undefined ? revisionData.origin_region : beverage.origin_region,
      origin_country: revisionData.origin_country !== undefined ? revisionData.origin_country : beverage.origin_country,
      date_year: revisionData.date_year !== undefined ? revisionData.date_year : beverage.date_year,
      date_text: resolvedDateText || beverage.name,
      description: revisionData.description !== undefined ? revisionData.description : beverage.description,
      citation: revisionData.citation !== undefined ? revisionData.citation : beverage.citation,
      parent_id: revisionData.parent_id !== undefined ? revisionData.parent_id : beverage.parent_id,
      ingredients: revisionData.ingredients !== undefined ? revisionData.ingredients : beverage.ingredients,
      production_method: revisionData.production_method !== undefined ? revisionData.production_method : beverage.production_method,
      image_url: revisionData.image_url !== undefined ? revisionData.image_url : beverage.image_url,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    };

    const { data: updatedBeverage, error: updateError } = await db
      .from('beverages')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Supabase revert update error:', updateError);
      return NextResponse.json(
        { error: updateError.message || 'Failed to revert beverage' },
        { status: 500 }
      );
    }

    const { data: revisions } = await db
      .from('beverage_revisions')
      .select('revision_number')
      .eq('beverage_id', id)
      .order('revision_number', { ascending: false })
      .limit(1);

    const nextRevisionNumber = (revisions?.[0]?.revision_number || 0) + 1;

    await db
      .from('beverage_revisions')
      .insert({
        beverage_id: id,
        edited_by: user.id,
        revision_number: nextRevisionNumber,
        data: updatePayload,
        edit_summary: `Reverted to revision #${revision.revision_number}`,
      });

    await db
      .from('activity_log')
      .insert({
        user_id: user.id,
        action: 'revert',
        beverage_id: id,
        beverage_name: updatedBeverage.name,
        details: { revision_id: revision.id, reverted_to: revision.revision_number },
      });

    return NextResponse.json({ beverage: updatedBeverage });
  } catch (error) {
    console.error('Error reverting revision:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
