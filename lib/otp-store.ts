// Simple in-memory store for OTPs (fallback when DB is unavailable)
// Note: This is not suitable for production serverless environments as memory is not shared across instances.
// It is useful for local development and demos.

type OtpRecord = {
  contact: string;
  otp: string;
  expiresAt: number;
};

// Use global to persist across hot reloads in development
const globalStore = global as unknown as { otpStore: OtpRecord[] };
if (!globalStore.otpStore) {
  globalStore.otpStore = [];
}

export const otpStore = {
  add: (contact: string, otp: string) => {
    // Remove existing OTPs for this contact
    globalStore.otpStore = globalStore.otpStore.filter(r => r.contact !== contact);
    
    // Add new OTP
    globalStore.otpStore.push({
      contact,
      otp,
      expiresAt: Date.now() + 10 * 60 * 1000 // 10 minutes
    });
    
    // Cleanup expired
    globalStore.otpStore = globalStore.otpStore.filter(r => r.expiresAt > Date.now());
  },
  
  verify: (contact: string, otp: string) => {
    const record = globalStore.otpStore.find(r => r.contact === contact && r.otp === otp);
    
    if (record && record.expiresAt > Date.now()) {
      // Remove used OTP
      globalStore.otpStore = globalStore.otpStore.filter(r => r !== record);
      return true;
    }
    return false;
  }
};
