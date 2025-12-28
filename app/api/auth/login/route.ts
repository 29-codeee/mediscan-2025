import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import { sendOTPEmail } from '../../../../lib/send-otp-email';

export async function POST(request: NextRequest) {
  try {
    const { email, phone } = await request.json();

    if (!email && !phone) {
      return NextResponse.json({ error: 'Email or phone is required' }, { status: 400 });
    }

    // Send OTP to email for all login attempts (if email is provided)
    if (email) {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      await sendOTPEmail(email, otp);
    }

    // Find user by email or phone
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, phone, full_name, is_verified')
      .or(`email.eq.${email || ''},phone.eq.${phone || ''}`)
      .single();

    if (error || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!user.is_verified) {
      return NextResponse.json({ error: 'Account not verified. Please verify your account first.' }, { status: 403 });
    }

    // Generate a simple session token (in production, use JWT)
    const sessionToken = `session_${user.id}_${Date.now()}`;

    // Store session in localStorage equivalent (you might want to use Redis in production)
    // For now, we'll just return the user data

    return NextResponse.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        full_name: user.full_name,
        is_verified: user.is_verified
      },
      token: sessionToken
    });

  } catch (error) {
    console.error('Error during login:', error);
    return NextResponse.json({ error: 'Failed to login' }, { status: 500 });
  }
}