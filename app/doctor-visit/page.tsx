"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppLang } from "@/components/useAppLang";

export default function DoctorVisitPage() {
  const router = useRouter();
  const { t } = useAppLang();
  const [userId, setUserId] = useState<string>("");

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
  }, [router]);

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
      <div className="flex justify-center py-6 print:hidden">
        <img src="/logo.svg" alt="MediScan Logo" className="h-16" />
      </div>

      <div className="px-4 pb-4 flex justify-between items-center max-w-3xl mx-auto print:hidden">
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
          {t("exportPdf")}
        </button>
      </div>

      <div className="p-4 flex justify-center">
        <div className="max-w-3xl w-full bg-white rounded-2xl shadow-xl overflow-hidden print:shadow-none print:rounded-none">
          <div className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white p-6 print:bg-white print:text-black">
            <h1 className="text-2xl font-bold">Doctor Visit Summary</h1>
            <p className="text-sm opacity-90 print:opacity-100">
              Generated from MediScan • {new Date().toLocaleString()}
            </p>
          </div>

          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border rounded-xl p-4">
                <p className="text-xs text-gray-500">Allergies</p>
                <p className="text-sm">{settings?.allergies || "—"}</p>
              </div>
              <div className="border rounded-xl p-4">
                <p className="text-xs text-gray-500">Conditions</p>
                <p className="text-sm">{settings?.conditions || "—"}</p>
              </div>
            </div>

            <div className="border rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-2">Current Medications</p>
              {medications.length === 0 ? (
                <p className="text-sm text-gray-600">—</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b">
                      <th className="py-2">Medication</th>
                      <th className="py-2">Dosage</th>
                      <th className="py-2">Schedule</th>
                    </tr>
                  </thead>
                  <tbody>
                    {medications.map((m: any) => (
                      <tr key={m.id} className="border-b last:border-b-0">
                        <td className="py-2 font-medium">{m.name}</td>
                        <td className="py-2">{m.dosage}</td>
                        <td className="py-2">{m.time}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="border rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-2">Notes for Doctor</p>
              <ul className="text-sm text-gray-700 list-disc list-inside space-y-1">
                <li>Please verify interactions with my full medical history.</li>
                <li>Confirm correct dosage and timing for each medication.</li>
                <li>Review allergies before prescribing new medication.</li>
              </ul>
            </div>
          </div>

          <div className="bg-gray-50 px-6 py-4 border-t print:bg-white">
            <p className="text-xs text-gray-500 text-center">
              This summary is informational and may be incomplete. Always consult professionals.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}


