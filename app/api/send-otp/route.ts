import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';
import { Resend } from 'resend';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { otpStore } from '../../../lib/otp-store';

const resend = process.env.RESEND_API_KEY 
  ? new Resend(process.env.RESEND_API_KEY) 
  : null;

// SMS configuration (you can use Twilio or similar service)
const smsTransporter = nodemailer.createTransport({
  host: 'smtp.gmail.com', // For demo - use actual SMS gateway
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function POST(request: NextRequest) {
  try {
    const { to, type, password } = await request.json();

    if (!to || !type) {
      return NextResponse.json({ error: 'Contact and type are required' }, { status: 400 });
    }

    if (!['email', 'phone'].includes(type)) {
      return NextResponse.json({ error: 'Invalid type. Must be email or phone' }, { status: 400 });
    }
    if (password && password.length < 6) {
      return NextResponse.json({ error: 'Password too short (min 6 characters)' }, { status: 400 });
    }

    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Log OTP for debugging/demo
    console.log(`Generated OTP for ${to}: ${otp}`);

    let dbSuccess = false;

    try {
      // Check if user exists, if not create them
      let userId: string;
      const { data: existingUser } = await supabase
        .from('users')
        .select('id, password_hash, password_salt')
        .eq(type === 'email' ? 'email' : 'phone', to)
        .single();

      if (existingUser) {
        userId = existingUser.id;
        if (password && !existingUser.password_hash) {
          const salt = crypto.randomBytes(16).toString('hex');
          const hash = crypto.scryptSync(password, salt, 64).toString('hex');
          await supabase
            .from('users')
            .update({ password_hash: hash, password_salt: salt })
            .eq('id', userId);
        }
      } else {
        // Create new user
        const salt = password ? crypto.randomBytes(16).toString('hex') : null;
        const hash = password && salt ? crypto.scryptSync(password, salt, 64).toString('hex') : null;
        const { data: newUser, error: userError } = await supabase
          .from('users')
          .insert({
            [type === 'email' ? 'email' : 'phone']: to,
            is_verified: false,
            password_hash: hash,
            password_salt: salt
          })
          .select('id')
          .single();

        if (userError) {
          console.error('Error creating user (DB might need RLS setup):', userError.message);
          throw userError;
        }
        userId = newUser.id;
      }

      // Clean up expired OTPs first (optional, ignore error)
      try {
        await supabase.rpc('cleanup_expired_otps');
      } catch (e) {
        console.warn('cleanup_expired_otps RPC failed (ignoring):', e);
      }

      // Store OTP in database
      const { error: otpError } = await supabase
        .from('otp_codes')
        .insert({
          user_id: userId,
          contact: to,
          contact_type: type,
          otp_code: otp,
          expires_at: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
        });

      if (otpError) {
        console.error('Error storing OTP in DB:', otpError.message);
        throw otpError;
      }
      
      dbSuccess = true;
    } catch (dbError) {
      console.warn('Database operations failed, falling back to in-memory store for OTP.');
      // Fallback to in-memory store
      otpStore.add(to, otp);
    }

    let emailSent = false;
    // Send OTP based on type
    if (type === 'email') {
      if (resend) {
        try {
          const { data, error } = await resend.emails.send({
            from: 'MediScan <onboarding@resend.dev>',
            to: [to],
            subject: 'MediScan OTP Verification',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="text-align: center; margin-bottom: 30px;">
                  <h1 style="color: #3B82F6; margin: 0; font-size: 28px;">MediScan</h1>
                  <p style="color: #666; margin: 5px 0;">Your Health Companion</p>
                </div>

                <div style="background-color: #f8fafc; border-radius: 12px; padding: 30px; text-align: center; margin: 20px 0;">
                  <h2 style="color: #1e293b; margin: 0 0 20px 0;">OTP Verification</h2>
                  <p style="color: #64748b; margin: 0 0 30px 0;">Your verification code is:</p>

                  <div style="background-color: #3B82F6; color: white; border-radius: 8px; padding: 20px; display: inline-block; margin: 0 auto;">
                    <span style="font-size: 32px; font-weight: bold; letter-spacing: 4px;">${otp}</span>
                  </div>

                  <p style="color: #64748b; margin: 30px 0 0 0; font-size: 14px;">
                    This code will expire in 10 minutes. Please do not share it with anyone.
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
            // Don't fail if email fails, just return OTP in dev mode
          } else {
            emailSent = true;
          }
        } catch (emailErr) {
          console.error('Email sending exception:', emailErr);
        }
      } else {
        console.log('Resend API key missing, skipping email send.');
      }
    } else if (type === 'phone') {
      // For demo purposes, we'll log the SMS. In production, integrate with SMS service like Twilio
      console.log(`SMS OTP for ${to}: ${otp}`);
      // Simulate SMS sent
      emailSent = true;
    }

    // Return success response
    // If email failed to send (e.g. Resend limitation), return OTP in response for testing
    // Otherwise, do NOT return OTP
    const responsePayload: any = {
      success: true,
      message: `OTP sent to your ${type}`,
      mode: dbSuccess ? 'database' : 'memory_fallback'
    };

    if (!emailSent) {
      responsePayload.otp = otp; // Fallback for testing when email fails
      responsePayload.message += ' (Check console or use this code for testing)';
    }

    return NextResponse.json(responsePayload);

  } catch (error) {
    console.error('Error sending OTP:', error);
    return NextResponse.json({ error: 'Failed to send OTP' }, { status: 500 });
  }
}
