-- Allow public access to insert new users (needed for registration/OTP)
CREATE POLICY "Allow public insert to users" ON users
  FOR INSERT WITH CHECK (true);

-- Allow public read access to users (needed to check if user exists)
CREATE POLICY "Allow public read users" ON users
  FOR SELECT USING (true);

-- OTP Codes Table Policies
ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public insert otp_codes" ON otp_codes
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read otp_codes" ON otp_codes
  FOR SELECT USING (true);

CREATE POLICY "Allow public update otp_codes" ON otp_codes
  FOR UPDATE USING (true);

CREATE POLICY "Allow public delete otp_codes" ON otp_codes
  FOR DELETE USING (true);

-- Ensure the table exists if it doesn't
CREATE TABLE IF NOT EXISTS otp_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  contact VARCHAR(255) NOT NULL,
  contact_type VARCHAR(10) NOT NULL CHECK (contact_type IN ('email', 'phone')),
  otp_code VARCHAR(6) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '10 minutes'),
  is_used BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_otp_codes_contact ON otp_codes(contact);

-- Add password columns to users
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS password_hash TEXT,
  ADD COLUMN IF NOT EXISTS password_salt TEXT;

-- Allow updating users for password setup
CREATE POLICY IF NOT EXISTS "Allow public update users" ON users
  FOR UPDATE USING (true) WITH CHECK (true);
