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

    // Send OTP to email for all login attempts
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await sendOTPEmail(email, otp);

    let user = null as any;
    try {
      const { data } = await supabase
        .from('users')
        .select('id, email, phone, full_name, is_verified, password_hash, password_salt')
        .eq('email', email)
        .single();
      user = data;
    } catch (e) {}

    if (!user || !user.password_hash || !user.password_salt) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const ok = verifyPassword(password, user.password_salt, user.password_hash);
    if (!ok) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

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
