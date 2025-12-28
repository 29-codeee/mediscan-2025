import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

// GET - Fetch user's pill reminders
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const { data: reminders, error } = await supabase
      .from('pill_reminders')
      .select(`
        *,
        medications (
          name,
          dosage,
          frequency
        )
      `)
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('reminder_time', { ascending: true });

    if (error) {
      console.error('Error fetching reminders:', error);
      return NextResponse.json({ error: 'Failed to fetch reminders' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      reminders: reminders || []
    });

  } catch (error) {
    console.error('Error fetching reminders:', error);
    return NextResponse.json({ error: 'Failed to fetch reminders' }, { status: 500 });
  }
}

// POST - Create new pill reminder
export async function POST(request: NextRequest) {
  try {
    const { userId, medicationId, reminderTime } = await request.json();

    if (!userId || !medicationId || !reminderTime) {
      return NextResponse.json({ error: 'User ID, medication ID, and reminder time are required' }, { status: 400 });
    }

    // Verify medication belongs to user
    const { data: medication, error: medError } = await supabase
      .from('medications')
      .select('id')
      .eq('id', medicationId)
      .eq('user_id', userId)
      .single();

    if (medError || !medication) {
      return NextResponse.json({ error: 'Medication not found' }, { status: 404 });
    }

    const { data: reminder, error } = await supabase
      .from('pill_reminders')
      .insert({
        user_id: userId,
        medication_id: medicationId,
        reminder_time: reminderTime,
        is_active: true
      })
      .select(`
        *,
        medications (
          name,
          dosage,
          frequency
        )
      `)
      .single();

    if (error) {
      console.error('Error creating reminder:', error);
      return NextResponse.json({ error: 'Failed to create reminder' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Reminder created successfully',
      reminder
    });

  } catch (error) {
    console.error('Error creating reminder:', error);
    return NextResponse.json({ error: 'Failed to create reminder' }, { status: 500 });
  }
}

// PUT - Update reminder
export async function PUT(request: NextRequest) {
  try {
    const { id, userId, ...updates } = await request.json();

    if (!id || !userId) {
      return NextResponse.json({ error: 'Reminder ID and User ID are required' }, { status: 400 });
    }

    const { data: reminder, error } = await supabase
      .from('pill_reminders')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select(`
        *,
        medications (
          name,
          dosage,
          frequency
        )
      `)
      .single();

    if (error) {
      console.error('Error updating reminder:', error);
      return NextResponse.json({ error: 'Failed to update reminder' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Reminder updated successfully',
      reminder
    });

  } catch (error) {
    console.error('Error updating reminder:', error);
    return NextResponse.json({ error: 'Failed to update reminder' }, { status: 500 });
  }
}

// DELETE - Deactivate reminder
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const userId = searchParams.get('userId');

    if (!id || !userId) {
      return NextResponse.json({ error: 'Reminder ID and User ID are required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('pill_reminders')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting reminder:', error);
      return NextResponse.json({ error: 'Failed to delete reminder' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Reminder removed successfully'
    });

  } catch (error) {
    console.error('Error deleting reminder:', error);
    return NextResponse.json({ error: 'Failed to delete reminder' }, { status: 500 });
  }
}