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
      // Find the OTP record - use maybeSingle to avoid errors when not found
      const { data: otpRecord, error: otpError } = await supabase
        .from('otp_codes')
        .select('id, user_id, otp_code, expires_at, is_used, created_at')
        .eq('contact', to)
        .eq('is_used', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (otpError) {
        console.error('Error fetching OTP from database:', otpError);
      }

      if (otpRecord) {
        console.log('Found OTP record:', { 
          id: otpRecord.id, 
          expiresAt: otpRecord.expires_at,
          isExpired: new Date(otpRecord.expires_at) < new Date(),
          codeMatch: otpRecord.otp_code === otp,
          receivedCode: otp
        });

        // Check if OTP is expired
        const expiresAt = new Date(otpRecord.expires_at);
        const now = new Date();
        if (expiresAt < now) {
          console.log('OTP expired:', { expiresAt, now, diff: now.getTime() - expiresAt.getTime() });
          return NextResponse.json({ error: 'OTP has expired' }, { status: 400 });
        }

        // Check if OTP matches
        if (otpRecord.otp_code === otp) {
          // Mark OTP as used
          const { error: updateError } = await supabase
            .from('otp_codes')
            .update({ is_used: true })
            .eq('id', otpRecord.id);
          
          if (updateError) {
            console.error('Error marking OTP as used:', updateError);
          }
            
          userId = otpRecord.user_id;
          dbVerified = true;
          console.log('OTP verified successfully via database for user:', userId);
        } else {
          console.log('OTP code mismatch:', { 
            expected: otpRecord.otp_code, 
            received: otp,
            contact: to 
          });
        }
      } else {
        console.log('No OTP record found in database for:', to);
      }
    } catch (dbError: any) {
      console.error('Exception during DB OTP check:', dbError);
    }

    // If not verified by DB, try in-memory store
    if (!dbVerified) {
      console.log('Trying in-memory store for OTP verification');
      const memoryVerified = otpStore.verify(to, otp);
      if (memoryVerified) {
        console.log(`OTP verified via in-memory store for ${to}`);
        // Try to find user in DB to return their ID
        const { data: user, error: userError } = await supabase
          .from('users')
          .select('id')
          .eq(to.includes('@') ? 'email' : 'phone', to)
          .maybeSingle();
          
        if (userError) {
          console.error('Error finding user:', userError);
        }
          
        if (user) {
          userId = user.id;
          dbVerified = true;
        } else {
          console.warn('User not found in DB after memory OTP verification');
          // Still allow verification but mark as mock
          userId = 'mock-user-id';
          dbVerified = true;
        }
      } else {
        // If neither verified, return error with more details
        console.error('OTP verification failed - not found in DB or memory store', {
          contact: to,
          codeLength: otp.length,
          codePrefix: otp.substring(0, 2) + '****'
        });
        return NextResponse.json({ 
          error: 'Invalid or expired OTP. Please request a new code.' 
        }, { status: 400 });
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