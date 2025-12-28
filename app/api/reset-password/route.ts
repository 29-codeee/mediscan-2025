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

    const { data: user } = await supabase
      .from('users')
      .select('id, verification_token, token_expires_at')
      .eq('email', email)
      .single();

    if (!user || !user.verification_token || !user.token_expires_at) {
      return NextResponse.json({ error: 'No reset request found' }, { status: 404 });
    }

    if (user.verification_token !== code) {
      return NextResponse.json({ error: 'Invalid code' }, { status: 400 });
    }
    if (new Date(user.token_expires_at) < new Date()) {
      return NextResponse.json({ error: 'Code expired' }, { status: 400 });
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(new_password, salt, 64).toString('hex');

    const { error } = await supabase
      .from('users')
      .update({ password_hash: hash, password_salt: salt, verification_token: null, token_expires_at: null })
      .eq('id', user.id);

    if (error) return NextResponse.json({ error: 'Failed to update password' }, { status: 500 });

    return NextResponse.json({ success: true, message: 'Password updated successfully' });
  } catch {
    return NextResponse.json({ error: 'Password reset failed' }, { status: 500 });
  }
}
