import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { email, code, new_password } = await request.json();
    if (!email || !code || !new_password) {
      return NextResponse.json({ error: 'Email, code and new password are required' }, { status: 400 });
    }
    if (new_password.length < 6) {
      return NextResponse.json({ error: 'Password too short (min 6)' }, { status: 400 });
    }

    // First try to find user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, verification_token, token_expires_at')
      .eq('email', email)
      .maybeSingle();

    if (userError) {
      console.error('Error fetching user for password reset:', userError);
      return NextResponse.json({ error: 'Failed to check user' }, { status: 500 });
    }

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let codeValid = false;
    let codeExpired = false;

    // Check if code is in users table (verification_token)
    if (user.verification_token && user.token_expires_at) {
      if (user.verification_token === code) {
        if (new Date(user.token_expires_at) < new Date()) {
          codeExpired = true;
        } else {
          codeValid = true;
        }
      }
    }

    // If not found in users table, check otp_codes table
    if (!codeValid && !codeExpired) {
      const { data: otpRecord, error: otpError } = await supabase
        .from('otp_codes')
        .select('id, otp_code, expires_at, is_used')
        .eq('contact', email)
        .eq('contact_type', 'email')
        .eq('is_used', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (otpError) {
        console.error('Error checking OTP codes:', otpError);
      } else if (otpRecord) {
        if (otpRecord.otp_code === code) {
          if (new Date(otpRecord.expires_at) < new Date()) {
            codeExpired = true;
          } else {
            codeValid = true;
            // Mark OTP as used
            await supabase
              .from('otp_codes')
              .update({ is_used: true })
              .eq('id', otpRecord.id);
          }
        }
      }
    }

    if (codeExpired) {
      return NextResponse.json({ error: 'Code expired' }, { status: 400 });
    }

    if (!codeValid) {
      return NextResponse.json({ error: 'Invalid code' }, { status: 400 });
    }

    // Update password
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(new_password, salt, 64).toString('hex');

    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        password_hash: hash, 
        password_salt: salt, 
        verification_token: null, 
        token_expires_at: null 
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error updating password:', updateError);
      return NextResponse.json({ error: 'Failed to update password' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Password updated successfully' });
  } catch (error: any) {
    console.error('Password reset failed:', error);
    return NextResponse.json({ error: 'Password reset failed: ' + (error.message || 'Unknown error') }, { status: 500 });
  }
}
