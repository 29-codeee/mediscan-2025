"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<string | null>(null);

  useEffect(() => {
    const user = localStorage.getItem("mediscan_user");
    if (!user) router.push("/auth/login");
    else setUser(user);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("mediscan_user");
    router.push("/auth/login");
  };

  const features = [
    {
      title: "MediScan AI",
      desc: "Smart prescription scanning with real drug data & interactions.",
      icon: "🔍",
      path: "/prescription-scanner",
      gradient: "from-blue-500 to-cyan-500",
      bgColor: "bg-blue-50"
    },
    {
      title: "Healix Chat",
      desc: "AI-powered medical assistant with RxNav integration.",
      icon: "🤖",
      path: "/chatbot",
      gradient: "from-purple-500 to-pink-500",
      bgColor: "bg-purple-50"
    },
    {
      title: "Pill Reminder",
      desc: "Smart medication tracking with conflict detection.",
      icon: "💊",
      path: "/pill-reminder",
      gradient: "from-emerald-500 to-teal-500",
      bgColor: "bg-emerald-50"
    },
    {
      title: "SOS Emergency",
      desc: "24/7 emergency response with medical guidance.",
      icon: "🚨",
      path: "/sos-emergency",
      gradient: "from-red-500 to-orange-500",
      bgColor: "bg-red-50"
    },
    {
      title: "Secure Auth",
      desc: "OTP-based authentication via email.",
      icon: "🔐",
      path: "/settings",
      gradient: "from-indigo-500 to-purple-500",
      bgColor: "bg-indigo-50"
    },
  ];

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-cyan-50">
      <div className="text-center">
        <div className="spinner mx-auto mb-4"></div>
        <p className="text-gray-600 font-medium">Loading MediScan...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50">
      {/* Header */}
      <header className="relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-cyan-600/10"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-blue-400/20 to-cyan-400/20 rounded-full blur-3xl -translate-y-48 translate-x-48"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-cyan-400/20 to-blue-400/20 rounded-full blur-3xl translate-y-48 -translate-x-48"></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 sm:space-x-4 flex-shrink-0">
              <div className="relative">
                <img
                  src="/logo.svg"
                  alt="MediScan Logo"
                  className="h-10 sm:h-12 lg:h-16 w-auto max-w-[120px] sm:max-w-[160px] lg:max-w-[200px] object-contain hover-lift"
                />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl sm:text-2xl font-bold gradient-text">MediScan</h1>
                <p className="text-xs sm:text-sm text-gray-600">Health Intelligence System</p>
              </div>
            </div>

            <div className="flex items-center space-x-3 sm:space-x-4 flex-shrink-0">
              <div className="text-right hidden sm:block">
                <p className="text-xs sm:text-sm text-gray-600">Welcome back</p>
                <p className="font-semibold text-gray-800 text-sm sm:text-base truncate max-w-[120px]">{user}</p>
              </div>
              <button
                onClick={handleLogout}
                className="btn-primary bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-xs sm:text-sm px-3 sm:px-4 py-2 sm:py-3"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Welcome Section */}
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold gradient-text mb-4 px-4">
            Your Health Dashboard
          </h2>
          <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto px-4">
            Access powerful AI-driven health tools designed to keep you informed and safe.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              onClick={() => router.push(feature.path)}
              className="group relative card hover-lift cursor-pointer overflow-hidden min-h-[200px] sm:min-h-[220px]"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Card background gradient */}
              <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}></div>

              {/* Icon container */}
              <div className={`inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl ${feature.bgColor} mb-4 sm:mb-6 group-hover:scale-110 transition-transform duration-300 flex-shrink-0`}>
                <span className="text-2xl sm:text-3xl">{feature.icon}</span>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-2 sm:mb-3 group-hover:text-blue-600 transition-colors line-clamp-2">
                  {feature.title}
                </h3>
                <p className="text-sm sm:text-base text-gray-600 leading-relaxed line-clamp-3">
                  {feature.desc}
                </p>
              </div>

              {/* Hover indicator */}
              <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>

              {/* Decorative elements */}
              <div className="absolute top-4 right-4 w-2 h-2 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-full opacity-60"></div>
              <div className="absolute bottom-4 left-4 w-1 h-1 bg-gradient-to-br from-cyan-400 to-blue-400 rounded-full opacity-40"></div>
            </div>
          ))}
        </div>

        {/* Stats Section */}
        <div className="mt-16 sm:mt-20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          <div className="card text-center p-6 sm:p-8">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-green-400 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-xl sm:text-2xl">📊</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">Real Data</h3>
            <p className="text-sm sm:text-base text-gray-600">Powered by NIH RxNav database for accurate medical information</p>
          </div>

          <div className="card text-center p-6 sm:p-8">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-purple-400 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-xl sm:text-2xl">🤖</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">AI-Powered</h3>
            <p className="text-sm sm:text-base text-gray-600">Advanced Gemini AI for intelligent health assistance</p>
          </div>

          <div className="card text-center p-6 sm:p-8 sm:col-span-2 lg:col-span-1">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-xl sm:text-2xl">🔒</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">Secure</h3>
            <p className="text-sm sm:text-base text-gray-600">OTP-based authentication with encrypted data handling</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative mt-16 sm:mt-20 bg-white/80 backdrop-blur-sm border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="text-center">
            <p className="text-sm sm:text-base text-gray-600">
              © 2025 MediScan. Your trusted health intelligence companion.
            </p>
            <p className="text-xs sm:text-sm text-gray-500 mt-2">
              Always consult healthcare professionals for medical decisions.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}