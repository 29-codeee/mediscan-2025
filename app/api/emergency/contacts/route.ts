import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

// GET - Fetch user's emergency contacts
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const { data: contacts, error } = await supabase
      .from('emergency_contacts')
      .select('*')
      .eq('user_id', userId)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching emergency contacts:', error);
      return NextResponse.json({ error: 'Failed to fetch emergency contacts' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      emergencyContacts: contacts || []
    });

  } catch (error) {
    console.error('Error fetching emergency contacts:', error);
    return NextResponse.json({ error: 'Failed to fetch emergency contacts' }, { status: 500 });
  }
}

// POST - Add new emergency contact
export async function POST(request: NextRequest) {
  try {
    const { userId, name, phone, relationship, isPrimary } = await request.json();

    if (!userId || !name || !phone) {
      return NextResponse.json({ error: 'User ID, name, and phone are required' }, { status: 400 });
    }

    // If setting as primary, unset other primary contacts
    if (isPrimary) {
      await supabase
        .from('emergency_contacts')
        .update({ is_primary: false })
        .eq('user_id', userId);
    }

    const { data: contact, error } = await supabase
      .from('emergency_contacts')
      .insert({
        user_id: userId,
        name,
        phone,
        relationship,
        is_primary: isPrimary || false
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating emergency contact:', error);
      return NextResponse.json({ error: 'Failed to create emergency contact' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Emergency contact added successfully',
      contact
    });

  } catch (error) {
    console.error('Error creating emergency contact:', error);
    return NextResponse.json({ error: 'Failed to create emergency contact' }, { status: 500 });
  }
}

// PUT - Update emergency contact
export async function PUT(request: NextRequest) {
  try {
    const { id, userId, ...updates } = await request.json();

    if (!id || !userId) {
      return NextResponse.json({ error: 'Contact ID and User ID are required' }, { status: 400 });
    }

    // If setting as primary, unset other primary contacts
    if (updates.is_primary) {
      await supabase
        .from('emergency_contacts')
        .update({ is_primary: false })
        .eq('user_id', userId)
        .neq('id', id);
    }

    const { data: contact, error } = await supabase
      .from('emergency_contacts')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating emergency contact:', error);
      return NextResponse.json({ error: 'Failed to update emergency contact' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Emergency contact updated successfully',
      contact
    });

  } catch (error) {
    console.error('Error updating emergency contact:', error);
    return NextResponse.json({ error: 'Failed to update emergency contact' }, { status: 500 });
  }
}

// DELETE - Remove emergency contact
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const userId = searchParams.get('userId');

    if (!id || !userId) {
      return NextResponse.json({ error: 'Contact ID and User ID are required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('emergency_contacts')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting emergency contact:', error);
      return NextResponse.json({ error: 'Failed to delete emergency contact' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Emergency contact removed successfully'
    });

  } catch (error) {
    console.error('Error deleting emergency contact:', error);
    return NextResponse.json({ error: 'Failed to delete emergency contact' }, { status: 500 });
  }
}