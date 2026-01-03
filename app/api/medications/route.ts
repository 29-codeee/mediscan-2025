import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

// GET - Fetch user's medications
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const { data: medications, error } = await supabase
      .from('medications')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching medications:', error);
      return NextResponse.json({ error: 'Failed to fetch medications' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      medications: medications || []
    });

  } catch (error) {
    console.error('Error fetching medications:', error);
    return NextResponse.json({ error: 'Failed to fetch medications' }, { status: 500 });
  }
}

// POST - Add new medication
export async function POST(request: NextRequest) {
  try {
    const { userId, name, dosage, frequency, instructions, startDate, endDate } = await request.json();

    if (!userId || !name) {
      return NextResponse.json({ error: 'User ID and medication name are required' }, { status: 400 });
    }

    const { data: medication, error } = await supabase
      .from('medications')
      .insert({
        user_id: userId,
        name,
        dosage,
        frequency,
        instructions,
        start_date: startDate,
        end_date: endDate,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating medication:', error);
      // Provide more specific error message
      let errorMessage = 'Failed to create medication';
      if (error.message?.includes('policy') || error.message?.includes('RLS') || error.message?.includes('permission')) {
        errorMessage = 'Database permission error. Please check RLS policies allow public insert on medications table.';
      } else if (error.message) {
        errorMessage = `Failed to create medication: ${error.message}`;
      }
      return NextResponse.json({ 
        error: errorMessage,
        details: error.message 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Medication added successfully',
      medication
    });

  } catch (error) {
    console.error('Error creating medication:', error);
    return NextResponse.json({ error: 'Failed to create medication' }, { status: 500 });
  }
}

// PUT - Update medication
export async function PUT(request: NextRequest) {
  try {
    const { id, userId, ...updates } = await request.json();

    if (!id || !userId) {
      return NextResponse.json({ error: 'Medication ID and User ID are required' }, { status: 400 });
    }

    const { data: medication, error } = await supabase
      .from('medications')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating medication:', error);
      return NextResponse.json({ error: 'Failed to update medication' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Medication updated successfully',
      medication
    });

  } catch (error) {
    console.error('Error updating medication:', error);
    return NextResponse.json({ error: 'Failed to update medication' }, { status: 500 });
  }
}

// DELETE - Deactivate medication
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const userId = searchParams.get('userId');

    if (!id || !userId) {
      return NextResponse.json({ error: 'Medication ID and User ID are required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('medications')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting medication:', error);
      return NextResponse.json({ error: 'Failed to delete medication' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Medication removed successfully'
    });

  } catch (error) {
    console.error('Error deleting medication:', error);
    return NextResponse.json({ error: 'Failed to delete medication' }, { status: 500 });
  }
}