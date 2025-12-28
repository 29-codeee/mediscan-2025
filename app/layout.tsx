import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

// 1. Viewport configuration (Separate from Metadata in Next.js 15)
export const viewport: Viewport = {
  themeColor: "#2563eb", // Your brand blue
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover", // Essential for notch/safe-area on modern phones
};

// 2. Main Metadata Configuration
export const metadata: Metadata = {
  title: "MediScan | Medical Intelligence",
  description: "AI-Powered Prescription Scanning & Medical Dashboard",
  manifest: "/manifest.json", // Link to your PWA manifest
  
  // Modern PWA support
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "MediScan",
    // startupImage: [], // You can add splash screen images here
  },

  // Fixing the deprecation: Adding both tags via 'other'
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} h-full bg-slate-50 antialiased`}>
        {/* You can wrap providers here (e.g., Auth, Theme) */}
        <div className="flex flex-col min-h-screen">
          {children}
        </div>
      </body>
    </html>
  );
}