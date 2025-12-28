import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY 
  ? new Resend(process.env.RESEND_API_KEY) 
  : null;

export async function sendOTPEmail(to: string, otp: string): Promise<boolean> {
  if (!resend) {
    console.log('Resend API key missing, skipping email send.');
    console.log(`Generated OTP for ${to}: ${otp}`);
    return false;
  }

  try {
    const { error } = await resend.emails.send({
      from: 'MediScan <onboarding@resend.dev>',
      to: [to],
      subject: 'MediScan Login OTP Verification',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #3B82F6; margin: 0; font-size: 28px;">MediScan</h1>
            <p style="color: #666; margin: 5px 0;">Your Health Companion</p>
          </div>

          <div style="background-color: #f8fafc; border-radius: 12px; padding: 30px; text-align: center; margin: 20px 0;">
            <h2 style="color: #1e293b; margin: 0 0 20px 0;">Login OTP Verification</h2>
            <p style="color: #64748b; margin: 0 0 30px 0;">Your verification code for login is:</p>

            <div style="background-color: #3B82F6; color: white; border-radius: 8px; padding: 20px; display: inline-block; margin: 0 auto;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 4px;">${otp}</span>
            </div>

            <p style="color: #64748b; margin: 30px 0 0 0; font-size: 14px;">
              This code will expire in 10 minutes. Please do not share it with anyone.
            </p>
            <p style="color: #ef4444; margin: 15px 0 0 0; font-size: 14px; font-weight: 600;">
              If you didn't attempt to login, please secure your account immediately.
            </p>
          </div>

          <div style="text-align: center; color: #64748b; font-size: 12px;">
            <p>If you didn't request this code, please ignore this email.</p>
            <p>© 2025 MediScan. All rights reserved.</p>
          </div>
        </div>
      `,
    });

    if (error) {
      console.error('Resend error:', error);
      console.log(`Generated OTP for ${to}: ${otp}`);
      return false;
    }

    return true;
  } catch (emailErr) {
    console.error('Email sending exception:', emailErr);
    console.log(`Generated OTP for ${to}: ${otp}`);
    return false;
  }
}

