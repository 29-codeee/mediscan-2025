"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
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
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Settings</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Email Notifications</label>
                <input type="checkbox" className="mr-2" defaultChecked />
                <span className="text-sm">Receive medication reminders</span>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Emergency Contacts</label>
                <input
                  type="text"
                  placeholder="Add emergency contact"
                  className="border p-2 w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Language</label>
                <select className="border p-2 w-full">
                  <option>English</option>
                  <option>Spanish</option>
                  <option>French</option>
                </select>
              </div>
              <button className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">
                Save Settings
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}