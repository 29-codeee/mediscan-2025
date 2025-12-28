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

  // 1. Send the 6-digit code using signUp
  async function sendOtp() {
    const contact = email || phone;
    if (!contact) return alert("Enter email or phone");
    if (!password || password.length < 6) return alert("Enter a password (min 6 characters)");

    setIsLoading(true);
    try {
      if (email) {
        // USE signUp instead of signInWithOtp to prevent magic link behavior
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            // We set this to your Vercel URL just in case, 
            // but the template change in Step 2 will ensure only a code is sent.
            emailRedirectTo: 'https://medi-scan-5c2a.vercel.app/dashboard',
          }
        });

        if (error) {
          alert(error.message);
        } else {
          setStep("verify");
          alert("Registration started! Check your email for the 6-digit code.");
        }
      } else {
        // Phone logic
        const response = await fetch('/api/send-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ to: contact, type: 'phone', password }),
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
        // For signUp, the type MUST be 'signup'
        const { data, error } = await supabase.auth.verifyOtp({
          email,
          token: otp,
          type: 'signup' 
        });

        if (error) {
          alert("Verification failed: " + error.message);
        } else {
          alert("Registration successful!");
          // Since they are verified, we redirect directly to the dashboard
          router.push("/dashboard");
        }
      } else {
        // Phone verification logic
        const response = await fetch('/api/verify-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 flex flex-col">
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md bg-white p-8 shadow-xl rounded-2xl border border-gray-100">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-blue-600 mb-2">MediScan</h1>
            <p className="text-gray-500">{step === "input" ? "Create your medical profile" : "Verify your identity"}</p>
          </div>

          {step === "input" ? (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold mb-2">Email Address</label>
                <input
                  type="email"
                  className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="name@company.com"
                  onChange={(e) => handleContactChange(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Password</label>
                <input
                  type={showPassword ? "text" : "password"}
                  className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button onClick={() => setShowPassword(!showPassword)} className="text-xs text-blue-600 mt-2">
                  {showPassword ? "Hide" : "Show"} Password
                </button>
              </div>
              <button 
                onClick={sendOtp} 
                disabled={isLoading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-md"
              >
                {isLoading ? "Processing..." : "Register with Code"}
              </button>
            </div>
          ) : (
            <div className="space-y-6 text-center">
              <p className="text-sm text-gray-600">Please enter the 6-digit code sent to <strong>{email}</strong></p>
              <input
                type="text"
                className="w-full p-4 text-center text-4xl tracking-widest border-2 border-blue-100 rounded-xl font-mono focus:border-blue-500 outline-none"
                placeholder="000000"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              />
              <button 
                onClick={verifyOtp} 
                disabled={isLoading}
                className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition-all shadow-md"
              >
                {isLoading ? "Verifying..." : "Complete Registration"}
              </button>
              <button onClick={() => setStep("input")} className="text-sm text-gray-500 hover:underline">Edit email address</button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}