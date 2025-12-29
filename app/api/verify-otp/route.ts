import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';
import { otpStore } from '../../../lib/otp-store';

export async function POST(request: NextRequest) {
  try {
    const { to, otp } = await request.json();

    if (!to || !otp) {
      return NextResponse.json({ error: 'Contact and OTP are required' }, { status: 400 });
    }

    // Clean up expired OTPs first (optional)
    try {
      await supabase.rpc('cleanup_expired_otps');
    } catch (e) {
      console.warn('cleanup_expired_otps RPC failed (ignoring):', e);
    }

    // Attempt DB verification first
    let dbVerified = false;
    let userId = null;

    try {
      // Find the OTP record
      const { data: otpRecord, error: otpError } = await supabase
        .from('otp_codes')
        .select('id, user_id, otp_code, expires_at, is_used')
        .eq('contact', to)
        .eq('is_used', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (otpRecord && !otpError) {
        // Check if OTP is expired
        if (new Date(otpRecord.expires_at) < new Date()) {
          return NextResponse.json({ error: 'OTP has expired' }, { status: 400 });
        }

        // Check if OTP matches
        if (otpRecord.otp_code === otp) {
          // Mark OTP as used
          await supabase
            .from('otp_codes')
            .update({ is_used: true })
            .eq('id', otpRecord.id);
            
          userId = otpRecord.user_id;
          dbVerified = true;
        }
      }
    } catch (dbError) {
      console.warn('DB OTP check failed, trying in-memory store.');
    }

    // If not verified by DB, try in-memory store
    if (!dbVerified) {
      const memoryVerified = otpStore.verify(to, otp);
      if (memoryVerified) {
        console.log(`OTP verified via in-memory store for ${to}`);
        // Try to find user in DB to return their ID
        const { data: user } = await supabase
          .from('users')
          .select('id')
          .eq(to.includes('@') ? 'email' : 'phone', to)
          .single();
          
        if (user) {
          userId = user.id;
        } else {
          // Mock user ID if not found in DB
          userId = 'mock-user-id';
        }
      } else {
        // If neither verified, return error
        // But only if we are sure DB check wasn't just a connection error that hid the real record
        // In this case, if DB check failed and memory check failed, it's invalid.
        return NextResponse.json({ error: 'Invalid or expired OTP' }, { status: 400 });
      }
    }

    // Update user as verified (if we have a real user ID)
    if (userId && userId !== 'mock-user-id') {
      // First check if user has password set
      const { data: userCheck } = await supabase
        .from('users')
        .select('password_hash, password_salt')
        .eq('id', userId)
        .single();

      if (userCheck && (!userCheck.password_hash || !userCheck.password_salt)) {
        console.error('User verified but password not set. User ID:', userId);
        return NextResponse.json({ 
          error: 'Registration incomplete. Password was not saved. Please register again.' 
        }, { status: 400 });
      }

      const { error: userUpdateError } = await supabase
        .from('users')
        .update({
          is_verified: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (userUpdateError) {
        console.warn('Error updating user verification status:', userUpdateError.message);
      }
    }

    // Get user data for response
    let user = null;
    if (userId && userId !== 'mock-user-id') {
      const { data: dbUser } = await supabase
        .from('users')
        .select('id, email, phone, full_name, is_verified')
        .eq('id', userId)
        .single();
      user = dbUser;
    }

    return NextResponse.json({
      success: true,
      message: 'OTP verified successfully',
      user: user || { id: userId, email: to.includes('@') ? to : undefined, phone: !to.includes('@') ? to : undefined, is_verified: true }
    });

  } catch (error) {
    console.error('Error verifying OTP:', error);
    return NextResponse.json({ error: 'Failed to verify OTP' }, { status: 500 });
  }
}