import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';
import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 });

    // Check if user exists
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', email)
      .maybeSingle();

    if (userError) {
      console.error('Error fetching user for password reset:', userError);
      return NextResponse.json({ error: 'Failed to check user' }, { status: 500 });
    }

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    // Update user with reset code (using verification_token column if it exists, otherwise store in OTP table)
    const { error: updateError } = await supabase
      .from('users')
      .update({ verification_token: code, token_expires_at: expiresAt })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error updating user with reset code:', updateError);
      // If verification_token column doesn't exist, store in otp_codes table instead
      const { error: otpError } = await supabase
        .from('otp_codes')
        .insert({
          user_id: user.id,
          contact: email,
          contact_type: 'email',
          otp_code: code,
          expires_at: expiresAt,
          is_used: false
        });

      if (otpError) {
        console.error('Error storing reset code in otp_codes:', otpError);
        return NextResponse.json({ error: 'Failed to store reset code' }, { status: 500 });
      }
    }

    let emailSent = false;
    if (resend) {
      try {
        const { error: emailError } = await resend.emails.send({
          from: 'MediScan <onboarding@resend.dev>',
          to: [email],
          subject: 'MediScan Password Reset Code',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #3B82F6; margin: 0; font-size: 28px;">MediScan</h1>
                <p style="color: #666; margin: 5px 0;">Your Health Companion</p>
              </div>
              <div style="background-color: #f8fafc; border-radius: 12px; padding: 30px; text-align: center; margin: 20px 0;">
                <h2 style="color: #1e293b; margin: 0 0 20px 0;">Password Reset Code</h2>
                <p style="color: #64748b; margin: 0 0 30px 0;">Your password reset code is:</p>
                <div style="background-color: #3B82F6; color: white; border-radius: 8px; padding: 20px; display: inline-block; margin: 0 auto;">
                  <span style="font-size: 32px; font-weight: bold; letter-spacing: 4px;">${code}</span>
                </div>
                <p style="color: #64748b; margin: 30px 0 0 0; font-size: 14px;">
                  This code will expire in 15 minutes. Please do not share it with anyone.
                </p>
              </div>
              <div style="text-align: center; color: #64748b; font-size: 12px;">
                <p>If you didn't request this code, please ignore this email.</p>
                <p>© 2025 MediScan. All rights reserved.</p>
              </div>
            </div>
          `
        });
        if (emailError) {
          console.error('Resend error:', emailError);
        } else {
          emailSent = true;
        }
      } catch (emailErr) {
        console.error('Email sending exception:', emailErr);
      }
    }

    const payload: any = { success: true, message: 'Reset code sent' };
    if (!emailSent) {
      payload.code = code;
      payload.message += ' (Use this code here for testing)';
      console.log(`Password reset code for ${email}: ${code}`);
    }
    return NextResponse.json(payload);
  } catch (error: any) {
    console.error('Password reset request failed:', error);
    return NextResponse.json({ error: 'Password reset request failed: ' + (error.message || 'Unknown error') }, { status: 500 });
  }
}
