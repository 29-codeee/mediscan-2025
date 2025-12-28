import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';
import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 });

    const { data: user } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', email)
      .single();

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    await supabase
      .from('users')
      .update({ verification_token: code, token_expires_at: expiresAt })
      .eq('id', user.id);

    let emailSent = false;
    if (resend) {
      try {
        const { error } = await resend.emails.send({
          from: 'MediScan <onboarding@resend.dev>',
          to: [email],
          subject: 'MediScan Password Reset Code',
          html: `<p>Your password reset code is <strong>${code}</strong>. It expires in 15 minutes.</p>`
        });
        if (!error) emailSent = true;
      } catch {}
    }

    const payload: any = { success: true, message: 'Reset code sent' };
    if (!emailSent) {
      payload.code = code;
      payload.message += ' (Use this code here for testing)';
    }
    return NextResponse.json(payload);
  } catch {
    return NextResponse.json({ error: 'Password reset request failed' }, { status: 500 });
  }
}
