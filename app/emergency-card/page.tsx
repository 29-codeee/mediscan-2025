"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppLang } from "@/components/useAppLang";

type Profile = { id: string; name: string; relation: string };

export default function EmergencyCardPage() {
  const router = useRouter();
  const { t } = useAppLang();
  const [userId, setUserId] = useState<string>("");
  const [profileId, setProfileId] = useState<string>("default");

  useEffect(() => {
    const userStr = localStorage.getItem("mediscan_user");
    if (!userStr) {
      router.push("/auth/login");
      return;
    }
    try {
      const user = JSON.parse(userStr);
      setUserId(user.id || user.userId || userStr);
    } catch {
      setUserId(userStr);
    }
    setProfileId(localStorage.getItem("mediscan_active_profile") || "default");
  }, [router]);

  const profile: Profile | null = useMemo(() => {
    try {
      const stored = localStorage.getItem("mediscan_profiles");
      const list = stored ? JSON.parse(stored) : [];
      const profiles = Array.isArray(list) ? (list as Profile[]) : [];
      return profiles.find((p) => p.id === profileId) || { id: "default", name: "Me", relation: "Self" };
    } catch {
      return { id: "default", name: "Me", relation: "Self" };
    }
  }, [profileId]);

  const settings = useMemo(() => {
    try {
      if (!userId) return null;
      const raw = localStorage.getItem(`settings_${userId}`);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, [userId]);

  const medications = useMemo(() => {
    try {
      const raw = localStorage.getItem("mediscan_pill_medications");
      const list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  }, []);

  if (!userId) return <div className="p-6">{t("loading")}</div>;

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="flex justify-center py-6">
        <img src="/logo.svg" alt="MediScan Logo" className="h-16" />
      </div>

      <div className="px-4 pb-4 flex justify-between items-center max-w-3xl mx-auto">
        <button
          onClick={() => router.push("/dashboard")}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          {t("back")}
        </button>
        <button
          onClick={() => window.print()}
          className="bg-gray-800 text-white px-4 py-2 rounded hover:bg-gray-900"
        >
          {t("printSavePdf")}
        </button>
      </div>

      <div className="p-4 flex justify-center">
        <div className="max-w-3xl w-full bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-red-500 to-orange-500 text-white p-6">
            <h1 className="text-2xl font-bold">Emergency Medical ID</h1>
            <p className="text-red-100 text-sm">Show this to a doctor/paramedic. Keep your phone unlocked if possible.</p>
          </div>

          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border rounded-xl p-4">
                <p className="text-xs text-gray-500">Name / Profile</p>
                <p className="text-lg font-semibold">{profile?.name}</p>
                <p className="text-sm text-gray-600">{profile?.relation}</p>
              </div>
              <div className="border rounded-xl p-4">
                <p className="text-xs text-gray-500">Blood Group</p>
                <p className="text-lg font-semibold">{settings?.bloodGroup || "—"}</p>
              </div>
            </div>

            <div className="border rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Allergies</p>
              <p className="text-sm">{settings?.allergies || "—"}</p>
            </div>

            <div className="border rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Conditions</p>
              <p className="text-sm">{settings?.conditions || "—"}</p>
            </div>

            <div className="border rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-2">Key Medications</p>
              {medications.length === 0 ? (
                <p className="text-sm text-gray-600">—</p>
              ) : (
                <ul className="text-sm text-gray-800 space-y-1">
                  {medications.slice(0, 6).map((m: any) => (
                    <li key={m.id}>
                      <span className="font-medium">{m.name}</span> — {m.dosage} ({m.time})
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="border rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-2">SOS Contact</p>
              <p className="text-sm">{settings?.emergencyContact || "—"}</p>
              {settings?.emergencyContact && (
                <a
                  className="inline-block mt-3 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                  href={`tel:${String(settings.emergencyContact).replace(/\s/g, "")}`}
                >
                  Call Now
                </a>
              )}
            </div>
          </div>

          <div className="bg-gray-50 px-6 py-4 border-t">
            <p className="text-xs text-gray-500 text-center">
              In an emergency, call local emergency services immediately.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}


