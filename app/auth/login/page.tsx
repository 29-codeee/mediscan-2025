"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [resetStep, setResetStep] = useState<'none' | 'request' | 'verify'>('none');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function doLogin() {
    if (!email || !password) return alert("Enter email and password");
    setIsLoading(true);
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem("mediscan_user", email);
        if (data.user) localStorage.setItem("mediscan_user_data", JSON.stringify(data.user));
        router.push("/dashboard");
      } else {
        alert(data.error || "Invalid credentials");
      }
    } catch (error) {
      alert("Login failed");
    }
    setIsLoading(false);
  }

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
                onClick={() => router.push("/auth/register")}
                className="text-sm text-gray-600 hover:text-blue-600 font-medium transition-colors"
              >
                Sign Up
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
                Welcome Back
              </h1>
              <p className="text-lg text-gray-600 max-w-sm mx-auto">
                Sign in to access your health dashboard
              </p>
            </div>

            {/* Login Card */}
            <div className="auth-card p-8 shadow-xl rounded-2xl">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-800 text-center mb-2">
                  Sign In
                </h2>
                <p className="text-gray-600 text-center text-sm leading-relaxed">
                  Enter your email and password to access your account
                </p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="your@email.com"
                    className="auth-input w-full text-base py-3 px-4 rounded-xl border-2"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Password
                  </label>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
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
                  onClick={doLogin}
                  disabled={isLoading || !email || !password}
                  className="auth-button w-full py-3 text-base font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center auth-loading">
                      <div className="spinner mr-2"></div>
                      Signing In...
                    </div>
                  ) : (
                    "Sign In"
                  )}
                </button>
              </div>

              <div className="mt-8 pt-6 border-t border-gray-200">
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <div>
                    Don't have an account?{" "}
                    <button
                      onClick={() => router.push("/auth/register")}
                      className="text-blue-600 hover:text-blue-700 font-semibold hover:underline transition-colors"
                    >
                      Create one here
                    </button>
                  </div>
                  <button
                    onClick={() => setResetStep('request')}
                    className="text-blue-600 hover:text-blue-700 font-semibold hover:underline transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
              </div>
            </div>

            {/* Security Notice */}
            <div className="mt-8 text-center">
              <div className="inline-flex items-center space-x-2 text-sm text-gray-600 bg-white/60 backdrop-blur-sm px-4 py-2 rounded-full border border-gray-200/50">
                <span className="text-green-500">🔒</span>
                <span className="font-medium">Secure Password Authentication</span>
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
      {/* Reset Password Modal */}
      {resetStep !== 'none' && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            {resetStep === 'request' ? (
              <>
                <h3 className="text-xl font-bold text-gray-800 mb-2">Reset your password</h3>
                <p className="text-sm text-gray-600 mb-4">Enter your email to receive a reset code.</p>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="auth-input w-full text-base py-3 px-4 rounded-xl border-2 mb-3"
                />
                <div className="flex items-center space-x-3">
                  <button
                    onClick={async () => {
                      if (!email) return alert('Enter your email');
                      setIsLoading(true);
                      try {
                        const res = await fetch('/api/request-password-reset', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ email })
                        });
                        const data = await res.json();
                        if (res.ok) {
                          if (data.code) setResetCode(data.code);
                          setResetStep('verify');
                          alert('Reset code sent. Check your email (or use the provided code).');
                        } else {
                          alert(data.error || 'Failed to send reset code');
                        }
                      } finally {
                        setIsLoading(false);
                      }
                    }}
                    className="auth-button px-5 py-3 rounded-xl"
                  >
                    {isLoading ? 'Sending...' : 'Send Reset Code'}
                  </button>
                  <button
                    onClick={() => setResetStep('none')}
                    className="px-5 py-3 rounded-xl border-2 border-gray-200 hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-xl font-bold text-gray-800 mb-2">Enter code & new password</h3>
                <input
                  type="text"
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value)}
                  placeholder="6-digit code"
                  className="auth-input w-full text-base py-3 px-4 rounded-xl border-2 mb-3"
                />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New password"
                  className="auth-input w-full text-base py-3 px-4 rounded-xl border-2 mb-3"
                />
                <div className="flex items-center space-x-3">
                  <button
                    onClick={async () => {
                      if (!email || !resetCode || !newPassword) return alert('Fill all fields');
                      setIsLoading(true);
                      try {
                        const res = await fetch('/api/reset-password', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ email, code: resetCode, new_password: newPassword })
                        });
                        const data = await res.json();
                        if (res.ok) {
                          alert('Password updated. Please sign in.');
                          setResetStep('none');
                        } else {
                          alert(data.error || 'Failed to reset password');
                        }
                      } finally {
                        setIsLoading(false);
                      }
                    }}
                    className="auth-button px-5 py-3 rounded-xl"
                  >
                    {isLoading ? 'Resetting...' : 'Reset Password'}
                  </button>
                  <button
                    onClick={() => setResetStep('none')}
                    className="px-5 py-3 rounded-xl border-2 border-gray-200 hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
