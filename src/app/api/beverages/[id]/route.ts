import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { Beverage } from '@/types/database';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  try {
    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/beverages?id=eq.${id}&select=*`;

    const response = await fetch(url, {
      headers: {
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch beverage' },
        { status: response.status }
      );
    }

    const beverages: Beverage[] = await response.json();

    if (beverages.length === 0) {
      return NextResponse.json(
        { error: 'Beverage not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(beverages[0]);
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
    const currentUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/beverages?id=eq.${id}&select=*`;
    const currentResponse = await fetch(currentUrl, {
      headers: {
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
        'Content-Type': 'application/json',
      },
    });

    const currentBeverages = await currentResponse.json();
    if (currentBeverages.length === 0) {
      return NextResponse.json(
        { error: 'Beverage not found' },
        { status: 404 }
      );
    }

    const currentBeverage = currentBeverages[0];

    // Check if locked (only editors/admins can update locked entries)
    if (currentBeverage.is_locked) {
      // Get user profile to check role
      const profileUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}&select=role`;
      const profileResponse = await fetch(profileUrl, {
        headers: {
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
          'Content-Type': 'application/json',
        },
      });
      const profiles = await profileResponse.json();
      const userRole = profiles[0]?.role || 'viewer';

      if (!['editor', 'admin'].includes(userRole)) {
        return NextResponse.json(
          { error: 'This beverage is locked and can only be edited by editors or admins' },
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
      date_text: body.date_text || null,
      description: body.description || null,
      citation: body.citation || null,
      parent_id: body.parent_id || null,
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

    // Create revision
    await supabase
      .from('beverage_revisions')
      .insert({
        beverage_id: id,
        user_id: user.id,
        revision_number: nextRevisionNumber,
        data: updateData,
        change_summary: body.change_summary || 'Updated beverage information',
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
    // Get user profile to check role (only admins can delete)
    const profileUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}&select=role`;
    const profileResponse = await fetch(profileUrl, {
      headers: {
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
        'Content-Type': 'application/json',
      },
    });
    const profiles = await profileResponse.json();
    const userRole = profiles[0]?.role || 'viewer';

    if (userRole !== 'admin') {
      return NextResponse.json(
        { error: 'Only admins can delete beverages' },
        { status: 403 }
      );
    }

    // Delete beverage (revisions will be cascade deleted due to FK constraint)
    const deleteUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/beverages?id=eq.${id}`;
    const deleteResponse = await fetch(deleteUrl, {
      method: 'DELETE',
      headers: {
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
        'Content-Type': 'application/json',
      },
    });

    if (!deleteResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to delete beverage' },
        { status: deleteResponse.status }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting beverage:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
