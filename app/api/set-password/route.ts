import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password too short' }, { status: 400 });
    }

    let userId: string | null = null;
    try {
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single();
      if (existing) userId = existing.id;
    } catch {}

    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');

    if (userId) {
      await supabase
        .from('users')
        .update({ password_hash: hash, password_salt: salt, is_verified: true, updated_at: new Date().toISOString() })
        .eq('id', userId);
    } else {
      const { error } = await supabase
        .from('users')
        .insert({ email, password_hash: hash, password_salt: salt, is_verified: true });
      if (error) return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to set password' }, { status: 500 });
  }
}
