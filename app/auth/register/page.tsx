"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState("input"); // "input" or "verify"
  const [isLoading, setIsLoading] = useState(false);

  async function sendOtp() {
    const contact = email || phone;
    if (!contact) return alert("Enter email or phone");
    if (!password || password.length < 6) return alert("Enter a password (min 6 characters)");

    setIsLoading(true);
    try {
      if (email) {
        const { data, error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            shouldCreateUser: true
          }
        });
        if (error) {
          alert(error.message || "Failed to send OTP");
        } else {
          setStep("verify");
          alert("OTP sent to your email");
        }
      } else {
        const response = await fetch('/api/send-otp', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: contact,
            type: 'phone',
            password
          }),
        });
        const data = await response.json();
        if (response.ok) {
          setStep("verify");
          alert("OTP sent to your phone");
          if (data.otp) {
            alert(`Demo OTP: ${data.otp}`);
          }
        } else {
          alert(data.error || "Failed to send OTP");
        }
      }
    } catch (error) {
      alert("Error sending OTP - please try again");
    }
    setIsLoading(false);
  }

  async function verifyOtp() {
    setIsLoading(true);
    try {
      if (email) {
        const { data, error } = await supabase.auth.verifyOtp({
          email,
          token: otp,
          type: 'email'
        });
        if (error) {
          alert(error.message || "Invalid OTP");
        } else {
          const resp = await fetch('/api/set-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
          });
          const payload = await resp.json();
          if (!resp.ok) {
            alert(payload.error || "Failed to finalize registration");
          } else {
            alert("Registration successful!");
            router.push("/auth/login");
          }
        }
      } else {
        const response = await fetch('/api/verify-otp', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: phone,
            otp,
          }),
        });
        const data = await response.json();
        if (response.ok) {
          alert("Registration successful!");
          router.push("/auth/login");
        } else {
          alert(data.error || "Invalid OTP");
        }
      }
    } catch (error) {
      alert("Error verifying OTP");
    }
    setIsLoading(false);
  }

  const handleContactChange = (value: string) => {
    if (value.includes("@")) {
      setEmail(value);
      setPhone("");
    } else {
      setPhone(value);
      setEmail("");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-blue-400/20 to-cyan-400/20 rounded-full blur-3xl -translate-y-48 translate-x-48"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-cyan-400/20 to-blue-400/20 rounded-full blur-3xl translate-y-48 -translate-x-48"></div>
        <div className="absolute top-1/2 left-1/2 w-72 h-72 bg-gradient-to-br from-blue-300/10 to-cyan-300/10 rounded-full blur-2xl -translate-x-1/2 -translate-y-1/2"></div>
      </div>

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="relative overflow-hidden border-b border-gray-200/50 bg-white/80 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <img
                    src="/logo.svg"
                    alt="MediScan Logo"
                    className="h-10 w-auto object-contain"
                  />
                </div>
                <div className="hidden sm:block">
                  <h1 className="text-xl font-bold gradient-text">MediScan</h1>
                  <p className="text-xs text-gray-600">Health Intelligence System</p>
                </div>
              </div>
              <button
                onClick={() => router.push("/auth/login")}
                className="text-sm text-gray-600 hover:text-blue-600 font-medium transition-colors"
              >
                Sign In
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
          <div className="w-full max-w-md">
            {/* Welcome Section */}
            <div className="text-center mb-8">
              <h1 className="text-3xl sm:text-4xl font-bold gradient-text mb-3">
                Join MediScan
              </h1>
              <p className="text-lg text-gray-600 max-w-sm mx-auto">
                Create your account and start your health journey
              </p>
            </div>

            {/* Register Card */}
            <div className="auth-card p-8 shadow-xl rounded-2xl">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-800 text-center mb-2">
                  {step === "input" ? "Create Account" : "Verify Your Account"}
                </h2>
                <p className="text-gray-600 text-center text-sm leading-relaxed">
                  {step === "input"
                    ? "Enter your email or phone to get started"
                    : `We've sent a verification code to ${email || phone}`
                  }
                </p>
              </div>

              {step === "input" ? (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Email or Phone Number
                    </label>
                    <input
                      type="text"
                      placeholder="your@email.com or +1234567890"
                      className="auth-input w-full text-base py-3 px-4 rounded-xl border-2"
                      onChange={(e) => handleContactChange(e.target.value)}
                      disabled={isLoading}
                    />
                    {(email || phone) && (
                      <div className="mt-3 flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${email ? 'bg-blue-500' : 'bg-green-500'}`}></div>
                        <p className="text-xs text-gray-600 font-medium">
                          Using {email ? 'Email' : 'Phone'} authentication
                        </p>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Password
                    </label>
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter a secure password"
                      className="auth-input w-full text-base py-3 px-4 rounded-xl border-2"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                    />
                    <div className="mt-2 flex items-center justify-between">
                      <label className="text-xs text-gray-600">
                        {password.length < 6
                          ? "Weak password (min 6 characters)"
                          : /[A-Z]/.test(password) && /\d/.test(password) && /[^A-Za-z0-9]/.test(password)
                          ? "Strong password"
                          : "Medium strength (add uppercase, number, symbol)"}
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-xs text-blue-600 hover:text-blue-700 font-semibold"
                      >
                        {showPassword ? "Hide" : "Show"}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      A verification code will be sent to {email ? "your email" : "your phone"} to confirm your account.
                    </p>
                  </div>
                  <button
                    onClick={sendOtp}
                    disabled={isLoading || (!email && !phone)}
                    className="auth-button w-full py-3 text-base font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center auth-loading">
                        <div className="spinner mr-2"></div>
                        Sending Code...
                      </div>
                    ) : (
                      "Send Verification Code"
                    )}
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Enter 6-digit Verification Code
                    </label>
                    <input
                      type="text"
                      placeholder="000000"
                      className="auth-input w-full text-center text-2xl tracking-[0.5em] py-4 px-4 font-mono rounded-xl border-2"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      maxLength={6}
                      disabled={isLoading}
                    />
                    <p className="text-xs text-gray-500 mt-2 text-center">
                      Enter the code sent to your {email ? 'email' : 'phone'}
                    </p>
                  </div>
                  <div className="space-y-3">
                    <button
                      onClick={verifyOtp}
                      disabled={isLoading || otp.length !== 6}
                      className="auth-button w-full py-3 text-base font-semibold rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? (
                        <div className="flex items-center justify-center auth-loading">
                          <div className="spinner mr-2"></div>
                          Creating Account...
                        </div>
                      ) : (
                        "Create Account"
                      )}
                    </button>
                    <button
                      onClick={() => setStep("input")}
                      disabled={isLoading}
                      className="w-full bg-gray-50 hover:bg-gray-100 text-gray-700 font-medium py-3 px-4 rounded-xl transition-colors duration-200 border border-gray-200 hover:border-gray-300"
                    >
                      ← Back to Contact Info
                    </button>
                  </div>
                </div>
              )}

              <div className="mt-8 pt-6 border-t border-gray-200">
                <p className="text-sm text-gray-600 text-center">
                  Already have an account?{" "}
                  <button
                    onClick={() => router.push("/auth/login")}
                    className="text-blue-600 hover:text-blue-700 font-semibold hover:underline transition-colors"
                  >
                    Sign in here
                  </button>
                </p>
              </div>
            </div>

            {/* Features Preview */}
            <div className="mt-12 grid grid-cols-3 gap-4">
              <div className="text-center group">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform duration-200 shadow-lg">
                  <span className="text-white text-lg">🤖</span>
                </div>
                <p className="text-xs text-gray-600 font-semibold">AI Chat</p>
              </div>
              <div className="text-center group">
                <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform duration-200 shadow-lg">
                  <span className="text-white text-lg">📸</span>
                </div>
                <p className="text-xs text-gray-600 font-semibold">Scan Rx</p>
              </div>
              <div className="text-center group">
                <div className="w-12 h-12 bg-gradient-to-br from-red-400 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform duration-200 shadow-lg">
                  <span className="text-white text-lg">🚨</span>
                </div>
                <p className="text-xs text-gray-600 font-semibold">SOS</p>
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-gray-200/50 bg-white/50 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="text-center">
              <p className="text-sm text-gray-600">
                © 2025 MediScan. Your trusted health intelligence companion.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
