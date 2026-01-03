-- Ensure users table exists
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(20) UNIQUE,
  full_name VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_verified BOOLEAN DEFAULT FALSE,
  verification_token VARCHAR(255),
  token_expires_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);

-- Allow public access to insert new users (needed for registration/OTP)
DROP POLICY IF EXISTS "Allow public insert to users" ON users;
CREATE POLICY "Allow public insert to users" ON users
  FOR INSERT WITH CHECK (true);

-- Allow public read access to users (needed to check if user exists)
DROP POLICY IF EXISTS "Allow public read users" ON users;
CREATE POLICY "Allow public read users" ON users
  FOR SELECT USING (true);

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

-- OTP Codes Table Policies
ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public insert otp_codes" ON otp_codes;
CREATE POLICY "Allow public insert otp_codes" ON otp_codes
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read otp_codes" ON otp_codes;
CREATE POLICY "Allow public read otp_codes" ON otp_codes
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public update otp_codes" ON otp_codes;
CREATE POLICY "Allow public update otp_codes" ON otp_codes
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow public delete otp_codes" ON otp_codes;
CREATE POLICY "Allow public delete otp_codes" ON otp_codes
  FOR DELETE USING (true);

-- Add password columns to users
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS password_hash TEXT,
  ADD COLUMN IF NOT EXISTS password_salt TEXT;

-- Allow updating users for password setup
DROP POLICY IF EXISTS "Allow public update users" ON users;
CREATE POLICY "Allow public update users" ON users
  FOR UPDATE USING (true) WITH CHECK (true);

-- Ensure medications table exists
CREATE TABLE IF NOT EXISTS medications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  dosage VARCHAR(100),
  frequency VARCHAR(100),
  instructions TEXT,
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_medications_user_id ON medications(user_id);

-- Medications Table Policies
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public insert medications" ON medications;
CREATE POLICY "Allow public insert medications" ON medications
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read medications" ON medications;
CREATE POLICY "Allow public read medications" ON medications
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public update medications" ON medications;
CREATE POLICY "Allow public update medications" ON medications
  FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public delete medications" ON medications;
CREATE POLICY "Allow public delete medications" ON medications
  FOR DELETE USING (true);

-- Ensure pill_reminders table exists
CREATE TABLE IF NOT EXISTS pill_reminders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  medication_id UUID REFERENCES medications(id) ON DELETE CASCADE,
  reminder_time TIME NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pill_reminders_user_id ON pill_reminders(user_id);

-- Pill Reminders Table Policies
ALTER TABLE pill_reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public insert pill_reminders" ON pill_reminders;
CREATE POLICY "Allow public insert pill_reminders" ON pill_reminders
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read pill_reminders" ON pill_reminders;
CREATE POLICY "Allow public read pill_reminders" ON pill_reminders
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public update pill_reminders" ON pill_reminders;
CREATE POLICY "Allow public update pill_reminders" ON pill_reminders
  FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public delete pill_reminders" ON pill_reminders;
CREATE POLICY "Allow public delete pill_reminders" ON pill_reminders
  FOR DELETE USING (true);

-- Ensure prescriptions table exists
CREATE TABLE IF NOT EXISTS prescriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  prescription_data JSONB NOT NULL,
  scanned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prescriptions_user_id ON prescriptions(user_id);

-- Prescriptions Table Policies
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public insert prescriptions" ON prescriptions;
CREATE POLICY "Allow public insert prescriptions" ON prescriptions
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read prescriptions" ON prescriptions;
CREATE POLICY "Allow public read prescriptions" ON prescriptions
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public update prescriptions" ON prescriptions;
CREATE POLICY "Allow public update prescriptions" ON prescriptions
  FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public delete prescriptions" ON prescriptions;
CREATE POLICY "Allow public delete prescriptions" ON prescriptions
  FOR DELETE USING (true);

-- Medical History Table Policies
ALTER TABLE medical_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public insert medical_history" ON medical_history;
CREATE POLICY "Allow public insert medical_history" ON medical_history
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read medical_history" ON medical_history;
CREATE POLICY "Allow public read medical_history" ON medical_history
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public update medical_history" ON medical_history;
CREATE POLICY "Allow public update medical_history" ON medical_history
  FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public delete medical_history" ON medical_history;
CREATE POLICY "Allow public delete medical_history" ON medical_history
  FOR DELETE USING (true);

-- AI Chat Logs Table Policies
ALTER TABLE ai_chat_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public insert ai_chat_logs" ON ai_chat_logs;
CREATE POLICY "Allow public insert ai_chat_logs" ON ai_chat_logs
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read ai_chat_logs" ON ai_chat_logs;
CREATE POLICY "Allow public read ai_chat_logs" ON ai_chat_logs
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public update ai_chat_logs" ON ai_chat_logs;
CREATE POLICY "Allow public update ai_chat_logs" ON ai_chat_logs
  FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public delete ai_chat_logs" ON ai_chat_logs;
CREATE POLICY "Allow public delete ai_chat_logs" ON ai_chat_logs
  FOR DELETE USING (true);

-- Appointments Table Policies
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public insert appointments" ON appointments;
CREATE POLICY "Allow public insert appointments" ON appointments
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read appointments" ON appointments;
CREATE POLICY "Allow public read appointments" ON appointments
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public update appointments" ON appointments;
CREATE POLICY "Allow public update appointments" ON appointments
  FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public delete appointments" ON appointments;
CREATE POLICY "Allow public delete appointments" ON appointments
  FOR DELETE USING (true);

-- Health Metrics Table Policies
ALTER TABLE health_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public insert health_metrics" ON health_metrics;
CREATE POLICY "Allow public insert health_metrics" ON health_metrics
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read health_metrics" ON health_metrics;
CREATE POLICY "Allow public read health_metrics" ON health_metrics
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public update health_metrics" ON health_metrics;
CREATE POLICY "Allow public update health_metrics" ON health_metrics
  FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public delete health_metrics" ON health_metrics;
CREATE POLICY "Allow public delete health_metrics" ON health_metrics
  FOR DELETE USING (true);
