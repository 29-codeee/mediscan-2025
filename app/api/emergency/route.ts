import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { userId, location, emergencyType, description, userInfo } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Get user's emergency contacts
    const { data: contacts, error: contactsError } = await supabase
      .from('emergency_contacts')
      .select('*')
      .eq('user_id', userId);

    if (contactsError) {
      console.error('Error fetching emergency contacts:', contactsError);
    }

    // Get user's medical information
    const { data: medications } = await supabase
      .from('medications')
      .select('name, dosage')
      .eq('user_id', userId)
      .eq('is_active', true);

    // Prepare emergency data
    const emergencyData = {
      userId,
      timestamp: new Date().toISOString(),
      location: location || null,
      emergencyType: emergencyType || 'medical',
      description: description || '',
      userInfo: userInfo || {},
      emergencyContacts: contacts || [],
      currentMedications: medications || []
    };

    // In a real application, you would:
    // 1. Send SMS to emergency contacts
    // 2. Call emergency services
    // 3. Send notifications to medical professionals
    // 4. Store emergency log

    console.log('🚨 EMERGENCY ALERT TRIGGERED:', emergencyData);

    // Simulate sending alerts to emergency contacts
    if (contacts && contacts.length > 0) {
      for (const contact of contacts) {
        console.log(`📞 Alerting emergency contact: ${contact.name} at ${contact.phone}`);
        // In production, integrate with SMS service like Twilio
      }
    }

    // Log the emergency in database (you might want a separate emergencies table)
    const { error: logError } = await supabase
      .from('chat_history')
      .insert({
        user_id: userId,
        message: `EMERGENCY ALERT: ${emergencyType} - ${description}`,
        response: `Emergency services notified. Location: ${location || 'Unknown'}`,
        message_type: 'system'
      });

    if (logError) {
      console.error('Error logging emergency:', logError);
    }

    return NextResponse.json({
      success: true,
      message: 'Emergency alert sent successfully',
      emergencyId: `emergency_${Date.now()}`,
      contactsNotified: contacts?.length || 0,
      timestamp: emergencyData.timestamp
    });

  } catch (error) {
    console.error('Error processing emergency:', error);
    return NextResponse.json({ error: 'Failed to process emergency alert' }, { status: 500 });
  }
}

// GET - Get emergency contacts
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