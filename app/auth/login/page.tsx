"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  
  // Login State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"credentials" | "otp">("credentials");
  const [isLoading, setIsLoading] = useState(false);

  // Reset Password State
  const [resetStep, setResetStep] = useState<'none' | 'request' | 'verify'>('none');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Step 1: Send OTP after entering email and password
  async function sendOtp() {
    if (!email || !password) return alert("Please enter both email and password");
    if (password.length < 6) return alert("Password must be at least 6 characters");
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: email, type: 'email', password }),
      });

      const data = await response.json();

      if (response.ok) {
        setStep("otp");
        alert("OTP sent to your email! Please check your inbox.");
      } else {
        alert(data.error || "Failed to send OTP. Please try again.");
      }
    } catch (error) {
      alert("Error sending OTP. Please check your connection.");
    } finally {
      setIsLoading(false);
    }
  }

  // Step 2: Verify OTP and sign in
  async function verifyOtpAndLogin() {
    if (otp.length !== 6) return alert("Please enter the 6-digit code");
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: email, otp }),
      });

      const data = await response.json();

      if (response.ok) {
        // OTP verified - sign in automatically
        localStorage.setItem("mediscan_user", email);
        if (data.user) {
          localStorage.setItem("mediscan_user_data", JSON.stringify(data.user));
        }
        router.push("/dashboard");
      } else {
        alert(data.error || "Invalid OTP. Please try again.");
      }
    } catch (error) {
      alert("Error verifying OTP. Please check your connection.");
    } finally {
      setIsLoading(false);
    }
  }

  // --- Password Reset: Step 1 (Request Code) ---
  async function requestReset() {
    if (!email) return alert("Enter your email first");
    setIsLoading(true);
    try {
      const res = await fetch('/api/request-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      if (res.ok) {
        setResetStep('verify');
        alert("6-digit reset code sent to your email.");
      } else {
        const data = await res.json();
        alert(data.error || "Failed to send reset code.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  // --- Password Reset: Step 2 (Verify OTP & Update) ---
  async function handleResetSubmit() {
    if (!resetCode || !newPassword) return alert("Please fill in all fields");
    setIsLoading(true);
    try {
      const res = await fetch('/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: resetCode, new_password: newPassword })
      });
      
      if (res.ok) {
        alert("Password updated successfully! You can now sign in.");
        setResetStep('none');
        setResetCode('');
        setNewPassword('');
        setStep('credentials');
      } else {
        const data = await res.json();
        alert(data.error || "Invalid code or reset failed.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 relative overflow-hidden">
      {/* Background Decorations */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl -translate-y-1/2"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-400/10 rounded-full blur-3xl translate-y-1/2"></div>

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="border-b border-gray-200/50 bg-white/80 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <span className="text-2xl">🛡️</span>
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-cyan-600">
                MediScan
              </h1>
            </div>
          </div>
        </header>

        {/* Sign In Form */}
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md">
            <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100">
              <h2 className="text-2xl font-bold text-gray-800 text-center mb-2">
                {step === "credentials" ? "Sign In" : "Verify OTP"}
              </h2>
              <p className="text-gray-500 text-center mb-8">
                {step === "credentials" 
                  ? "Enter your email and password to continue" 
                  : `Enter the 6-digit code sent to ${email}`}
              </p>

              {step === "credentials" ? (
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
                    <input
                      type="email"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={isLoading}
                      />
                      <button 
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-xs font-bold text-blue-600"
                      >
                        {showPassword ? "HIDE" : "SHOW"}
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={sendOtp}
                    disabled={isLoading || !email || !password}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-200 disabled:opacity-50"
                  >
                    {isLoading ? "Sending OTP..." : "Continue"}
                  </button>

                  <div className="text-center pt-4">
                    <button 
                      onClick={() => setResetStep('request')}
                      className="text-sm text-gray-500 hover:text-blue-600 transition-colors"
                    >
                      Forgot your password?
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Enter 6-Digit Code</label>
                    <input
                      type="text"
                      maxLength={6}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-center tracking-widest font-bold text-2xl focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="000000"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      disabled={isLoading}
                    />
                  </div>

                  <button
                    onClick={verifyOtpAndLogin}
                    disabled={isLoading || otp.length !== 6}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-green-200 disabled:opacity-50"
                  >
                    {isLoading ? "Verifying..." : "Sign In"}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setStep("credentials");
                      setOtp("");
                    }}
                    className="w-full text-sm text-gray-500 hover:text-blue-600 transition-colors"
                  >
                    Back to email and password
                  </button>
                </div>
              )}
            </div>
          </div>
        </main>

        <footer className="py-6 text-center text-gray-400 text-xs">
          © 2025 MediScan. Secure Health Intelligence.
        </footer>
      </div>

      {/* --- RESET PASSWORD MODAL --- */}
      {resetStep !== 'none' && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl">
            {resetStep === 'request' ? (
              <>
                <h3 className="text-xl font-bold mb-2">Reset Password</h3>
                <p className="text-sm text-gray-500 mb-6">We will send a 6-digit code to your email.</p>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full px-4 py-3 rounded-xl border mb-4 outline-none focus:border-blue-500"
                />
                <div className="flex space-x-3">
                  <button onClick={requestReset} className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold">
                    Send Code
                  </button>
                  <button onClick={() => setResetStep('none')} className="px-4 py-3 text-gray-500 font-medium">
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-xl font-bold mb-2">Enter Code</h3>
                <p className="text-sm text-gray-500 mb-6">Type the code and your new password.</p>
                <input
                  type="text"
                  maxLength={6}
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value)}
                  placeholder="6-digit OTP"
                  className="w-full px-4 py-3 rounded-xl border mb-3 text-center tracking-widest font-bold"
                />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New Password"
                  className="w-full px-4 py-3 rounded-xl border mb-6 outline-none"
                />
                <button onClick={handleResetSubmit} className="w-full bg-green-600 text-white py-3 rounded-xl font-bold">
                  Update Password
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
