import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';
import crypto from 'crypto';
import { sendOTPEmail } from '../../../lib/send-otp-email';

function verifyPassword(password: string, salt: string, hash: string) {
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(derived, 'hex'), Buffer.from(hash, 'hex'));
}

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    // Check if user exists first
    let user = null as any;
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, phone, full_name, is_verified, password_hash, password_salt')
        .eq('email', email)
        .single();
      
      if (error) {
        console.error('Error fetching user:', error);
      } else {
        user = data;
      }
    } catch (e) {
      console.error('Exception fetching user:', e);
    }

    // If user doesn't exist, return invalid credentials (don't send OTP)
    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Check if password is set
    if (!user.password_hash || !user.password_salt) {
      console.error('User exists but password not set:', { email, hasHash: !!user.password_hash, hasSalt: !!user.password_salt });
      return NextResponse.json({ error: 'Invalid credentials. Please reset your password.' }, { status: 401 });
    }

    // Verify password
    const ok = verifyPassword(password, user.password_salt, user.password_hash);
    if (!ok) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Only send OTP if user exists and password is correct
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await sendOTPEmail(email, otp);

    const safeUser = {
      id: user.id,
      email: user.email,
      phone: user.phone,
      full_name: user.full_name,
      is_verified: user.is_verified
    };

    return NextResponse.json({ success: true, user: safeUser });
  } catch (error) {
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
