"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  
  // Registration State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"input" | "verify">("input");
  const [isLoading, setIsLoading] = useState(false);

  // Reset Password State
  const [resetStep, setResetStep] = useState<'none' | 'request' | 'verify'>('none');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // 1. Send OTP for registration
  async function sendOtp() {
    if (!email) return alert("Enter your email address");
    if (!password || password.length < 6) return alert("Enter a password (min 6 characters)");

    setIsLoading(true);
    try {
      const response = await fetch('/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: email, type: 'email', password }),
      });

      const data = await response.json();

      if (response.ok) {
        setStep("verify");
        alert("OTP sent to your email! Check your inbox.");
      } else {
        alert(data.error || "Failed to send OTP");
      }
    } catch (error) {
      alert("Error sending verification code");
    }
    setIsLoading(false);
  }

  // 2. Verify OTP and complete registration
  async function verifyOtp() {
    if (otp.length !== 6) return alert("Enter the 6-digit code");
    setIsLoading(true);
    try {
      const response = await fetch('/api/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: email, otp }),
      });

      const data = await response.json();

      if (response.ok) {
        alert("Registration successful! You can now sign in.");
        router.push("/auth/login");
      } else {
        alert(data.error || "Invalid OTP");
      }
    } catch (error) {
      alert("Error during verification");
    }
    setIsLoading(false);
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
        alert("Failed to send reset code.");
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
            <button onClick={() => router.push("/auth/login")} className="text-sm font-medium text-blue-600">
              Sign In
            </button>
          </div>
        </header>

        {/* Registration Form */}
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md">
            <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100">
              <h2 className="text-2xl font-bold text-gray-800 text-center mb-2">Create Account</h2>
              <p className="text-gray-500 text-center mb-8">Sign up to access your medical intelligence dashboard</p>

              {step === "input" ? (
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
                    {isLoading ? "Sending OTP..." : "Continue with OTP"}
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
                  <p className="text-sm text-gray-600 text-center mb-4">
                    Please enter the 6-digit code sent to <strong>{email}</strong>
                  </p>
                  <input
                    type="text"
                    maxLength={6}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-center tracking-widest font-bold text-2xl focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="000000"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    disabled={isLoading}
                  />
                  <button
                    onClick={verifyOtp}
                    disabled={isLoading || otp.length !== 6}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-green-200 disabled:opacity-50"
                  >
                    {isLoading ? "Verifying..." : "Complete Registration"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep("input")}
                    className="w-full text-sm text-gray-500 hover:text-blue-600 transition-colors"
                  >
                    Edit email address
                  </button>
                </div>
              )}

              <div className="text-center pt-6 border-t border-gray-200 mt-6">
                <p className="text-sm text-gray-500">
                  Already have an account?{" "}
                  <button
                    onClick={() => router.push("/auth/login")}
                    className="text-blue-600 hover:text-blue-700 font-semibold"
                  >
                    Sign in here
                  </button>
                </p>
              </div>
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
