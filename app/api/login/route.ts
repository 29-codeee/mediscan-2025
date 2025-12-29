import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';
import crypto from 'crypto';
import { sendOTPEmail } from '../../../lib/send-otp-email';

function verifyPassword(password: string, salt: string, hash: string) {
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(derived, 'hex'), Buffer.from(hash, 'hex'));
}

// This endpoint now just redirects to send-otp logic
// The login page uses send-otp directly, but keeping this for any legacy calls
export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    // Just return success - the actual OTP sending is handled by send-otp endpoint
    // The frontend should call /api/send-otp directly
    return NextResponse.json({ 
      success: true, 
      message: 'Please use /api/send-otp endpoint for OTP-based login' 
    });
  } catch (error) {
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
