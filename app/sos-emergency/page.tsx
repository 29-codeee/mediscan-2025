"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import SosEmergency from "@/components/SosEmergency";

export default function SosEmergencyPage() {
  const router = useRouter();
  const [user, setUser] = useState<string | null>(null);

  useEffect(() => {
    const user = localStorage.getItem("mediscan_user");
    if (!user) router.push("/auth/login");
    else setUser(user);
  }, []);

  if (!user) return <div>Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="flex justify-center py-6">
        <img src="/logo.svg" alt="MediScan Logo" className="h-16" />
      </div>
      <div className="px-4 pb-4 flex justify-start">
        <button
          onClick={() => router.push("/dashboard")}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          ← Back to Dashboard
        </button>
      </div>
      <div className="p-4 flex justify-center">
        <div className="max-w-2xl w-full">
          <SosEmergency />
        </div>
      </div>
    </div>
  );
}