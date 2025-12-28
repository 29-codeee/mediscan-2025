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

  // 1. Send the 6-digit code
  async function sendOtp() {
    const contact = email || phone;
    if (!contact) return alert("Enter email or phone");
    if (!password || password.length < 6) return alert("Enter a password (min 6 characters)");

    setIsLoading(true);
    try {
      if (email) {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            shouldCreateUser: true, // This creates the user in auth.users
          }
        });
        if (error) {
          alert(error.message);
        } else {
          setStep("verify");
          alert("A 6-digit code has been sent to your email.");
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
          alert("OTP sent to your phone");
        } else {
          const data = await response.json();
          alert(data.error || "Failed to send OTP");
        }
      }
    } catch (error) {
      alert("Error sending OTP - please try again");
    }
    setIsLoading(false);
  }

  // 2. Verify the 6-digit code and set the password
  async function verifyOtp() {
    if (otp.length !== 6) return alert("Enter the 6-digit code");
    setIsLoading(true);
    try {
      if (email) {
        // Verify the code
        const { data, error } = await supabase.auth.verifyOtp({
          email,
          token: otp,
          type: 'signup' // Use 'signup' for new accounts
        });

        if (error) {
          alert(error.message);
        } else {
          // Once verified, we call your API to set the password 
          // because OTP login doesn't set a permanent password by default
          const resp = await fetch('/api/set-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
          });

          if (resp.ok) {
            alert("Registration successful!");
            router.push("/auth/login");
          } else {
            const payload = await resp.json();
            alert(payload.error || "Failed to set password");
          }
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
          router.push("/auth/login");
        } else {
          const data = await response.json();
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
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-blue-400/20 to-cyan-400/20 rounded-full blur-3xl -translate-y-48 translate-x-48"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-cyan-400/20 to-blue-400/20 rounded-full blur-3xl translate-y-48 -translate-x-48"></div>
      </div>

      <div className="relative z-10 min-h-screen flex flex-col">
        <header className="border-b border-gray-200/50 bg-white/80 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <h1 className="text-xl font-bold text-blue-600">MediScan</h1>
            </div>
            <button onClick={() => router.push("/auth/login")} className="text-sm font-medium text-gray-600">Sign In</button>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-md bg-white p-8 shadow-xl rounded-2xl">
            <h2 className="text-2xl font-bold text-center mb-6">
              {step === "input" ? "Join MediScan" : "Verify Email"}
            </h2>

            {step === "input" ? (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold mb-2">Email or Phone</label>
                  <input
                    type="text"
                    className="w-full p-3 border-2 rounded-xl"
                    placeholder="your@email.com"
                    onChange={(e) => handleContactChange(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Password</label>
                  <input
                    type={showPassword ? "text" : "password"}
                    className="w-full p-3 border-2 rounded-xl"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <button 
                  onClick={sendOtp} 
                  disabled={isLoading}
                  className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold"
                >
                  {isLoading ? "Sending..." : "Send Verification Code"}
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <input
                  type="text"
                  className="w-full p-4 text-center text-3xl tracking-widest border-2 rounded-xl font-mono"
                  placeholder="000000"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                />
                <button 
                  onClick={verifyOtp} 
                  className="w-full py-3 bg-green-600 text-white rounded-xl font-bold"
                >
                  Confirm & Register
                </button>
                <button onClick={() => setStep("input")} className="w-full text-sm text-gray-500">Back</button>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}