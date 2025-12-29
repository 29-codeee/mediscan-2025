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
  const [step, setStep] = useState<"input" | "verify">("input");
  const [isLoading, setIsLoading] = useState(false);

  // 1. Send the 6-digit code using signUp / phone OTP
  async function sendOtp() {
    const contact = email || phone;
    if (!contact) return alert("Enter email or phone");
    if (!password || password.length < 6) return alert("Enter a password (min 6 characters)");

    setIsLoading(true);
    try {
      if (email) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: "https://medi-scan-5c2a.vercel.app/dashboard",
          },
        });

        if (error) {
          alert(error.message);
        } else {
          setStep("verify");
          alert("Registration started! Check your email for the 6-digit code.");
        }
      } else {
        const response = await fetch("/api/send-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ to: contact, type: "phone", password }),
        });
        if (response.ok) {
          setStep("verify");
        } else {
          const data = await response.json();
          alert(data.error || "Failed to send OTP");
        }
      }
    } catch (error) {
      alert("Error sending verification code");
    }
    setIsLoading(false);
  }

  // 2. Verify the 6-digit code
  async function verifyOtp() {
    if (otp.length !== 6) return alert("Enter the 6-digit code");
    setIsLoading(true);
    try {
      if (email) {
        const { error } = await supabase.auth.verifyOtp({
          email,
          token: otp,
          type: "signup",
        });

        if (error) {
          alert("Verification failed: " + error.message);
        } else {
          alert("Registration successful!");
          router.push("/dashboard");
        }
      } else {
        const response = await fetch("/api/verify-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ to: phone, otp }),
        });
        if (response.ok) {
          alert("Registration successful!");
          router.push("/dashboard");
        } else {
          const data = await response.json();
          alert(data.error || "Invalid OTP");
        }
      }
    } catch (error) {
      alert("Error during verification");
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
                Create Account
              </h1>
              <p className="text-lg text-gray-600 max-w-sm mx-auto">
                Sign up to start using your health dashboard
              </p>
            </div>

            {/* Register Card */}
            <div className="auth-card p-8 shadow-xl rounded-2xl">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-800 text-center mb-2">
                  Sign Up
                </h2>
                <p className="text-gray-600 text-center text-sm leading-relaxed">
                  Create your account using email or phone and verify with a 6-digit code
                </p>
              </div>

              {step === "input" ? (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Email or Phone
                    </label>
                    <input
                      type="text"
                      placeholder="you@example.com or +91 98765 43210"
                      className="auth-input w-full text-base py-3 px-4 rounded-xl border-2"
                      onChange={(e) => handleContactChange(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Password
                    </label>
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a strong password"
                      className="auth-input w-full text-base py-3 px-4 rounded-xl border-2"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                    />
                    <div className="mt-2 text-right">
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-xs text-blue-600 hover:text-blue-700 font-semibold"
                      >
                        {showPassword ? "Hide" : "Show"}
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={sendOtp}
                    disabled={isLoading}
                    className="auth-button w-full py-3 text-base font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? "Processing..." : "Continue with OTP"}
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  <p className="text-sm text-gray-600 text-center">
                    Please enter the 6-digit code sent to{" "}
                    <strong>{email || phone}</strong>
                  </p>
                  <input
                    type="text"
                    className="auth-input w-full text-3xl text-center tracking-[0.4em] py-4 px-4 rounded-xl border-2 font-mono"
                    placeholder="000000"
                    value={otp}
                    onChange={(e) =>
                      setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    disabled={isLoading}
                  />
                  <button
                    onClick={verifyOtp}
                    disabled={isLoading}
                    className="auth-button w-full py-3 text-base font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? "Verifying..." : "Complete Registration"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep("input")}
                    className="w-full text-sm text-gray-600 hover:text-blue-700 font-medium hover:underline mt-1"
                  >
                    Edit contact information
                  </button>
                </div>
              )}

              <div className="mt-8 pt-6 border-t border-gray-200">
                <div className="text-sm text-gray-600 text-center">
                  Already have an account?{" "}
                  <button
                    onClick={() => router.push("/auth/login")}
                    className="text-blue-600 hover:text-blue-700 font-semibold hover:underline transition-colors"
                  >
                    Sign in here
                  </button>
                </div>
              </div>
            </div>

            {/* Security Notice */}
            <div className="mt-8 text-center">
              <div className="inline-flex items-center space-x-2 text-sm text-gray-600 bg-white/60 backdrop-blur-sm px-4 py-2 rounded-full border border-gray-200/50">
                <span className="text-green-500">🔐</span>
                <span className="font-medium">OTP-secured account creation</span>
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