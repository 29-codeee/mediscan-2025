"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface UserSettings {
  emailNotifications: boolean;
  emergencyContact: string;
  language: string;
  allergies: string;
  bloodGroup: string;
  conditions: string;
  accessibilityLargeText: boolean;
  accessibilityHighContrast: boolean;
}

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [settings, setSettings] = useState<UserSettings>({
    emailNotifications: true,
    emergencyContact: "",
    language: "English",
    allergies: "",
    bloodGroup: "",
    conditions: "",
    accessibilityLargeText: false,
    accessibilityHighContrast: false,
  });
  const [profileId, setProfileId] = useState<string>("default");
  const [profiles, setProfiles] = useState<{ id: string; name: string; relation: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    const userStr = localStorage.getItem("mediscan_user");
    if (!userStr) {
      router.push("/auth/login");
      return;
    }
    
    try {
      const userData = JSON.parse(userStr);
      setUser(userStr);
      setUserId(userData.id || userData.userId);
      loadSettings(userData.id || userData.userId);
    } catch (e) {
      setUser(userStr);
      setUserId(userStr);
      loadSettings(userStr);
    }
  }, [router]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("mediscan_profiles");
      const parsed = stored ? JSON.parse(stored) : [];
      const list = Array.isArray(parsed) ? parsed : [];
      const withDefault =
        list.find((p: any) => p?.id === "default")
          ? list
          : [{ id: "default", name: "Me", relation: "Self" }, ...list];
      setProfiles(withDefault);

      const active = localStorage.getItem("mediscan_active_profile") || "default";
      setProfileId(active);
    } catch {
      setProfiles([{ id: "default", name: "Me", relation: "Self" }]);
      setProfileId("default");
    }
  }, []);

  const saveProfiles = (next: { id: string; name: string; relation: string }[]) => {
    setProfiles(next);
    try {
      localStorage.setItem("mediscan_profiles", JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const loadSettings = async (id: string) => {
    try {
      const response = await fetch(`/api/user/profile?userId=${id}`);
      if (response.ok) {
        const data = await response.json();
        if (data.user && data.user.preferences) {
          setSettings(data.user.preferences);
          localStorage.setItem(`settings_${id}`, JSON.stringify(data.user.preferences));
          return;
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }

    const savedSettings = localStorage.getItem(`settings_${id}`);
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  };

  const handleSaveSettings = async () => {
    if (!userId) {
      setMessage({ type: 'error', text: 'User not found. Please log in again.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      localStorage.setItem(`settings_${userId}`, JSON.stringify(settings));
      localStorage.setItem("mediscan_allergies", settings.allergies || "");
      localStorage.setItem("mediscan_accessibility_large_text", String(settings.accessibilityLargeText));
      localStorage.setItem("mediscan_accessibility_high_contrast", String(settings.accessibilityHighContrast));
      
      await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          preferences: settings
        })
      }).catch(() => {});

      setMessage({ type: 'success', text: 'Settings saved successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage({ type: 'success', text: 'Settings saved locally!' });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setLoading(false);
    }
  };

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
            
            {message && (
              <div className={`mb-4 p-3 rounded ${
                message.type === 'success' 
                  ? 'bg-green-100 text-green-700 border border-green-300' 
                  : 'bg-red-100 text-red-700 border border-red-300'
              }`}>
                {message.text}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Caregiver Mode (Profiles)</label>
                <div className="flex gap-2">
                  <select
                    className="border p-2 w-full rounded"
                    value={profileId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setProfileId(id);
                      localStorage.setItem("mediscan_active_profile", id);
                    }}
                  >
                    {profiles.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.relation})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="bg-blue-500 text-white px-3 rounded hover:bg-blue-600"
                    onClick={() => {
                      const name = prompt("Profile name? (e.g., Mom)")?.trim();
                      if (!name) return;
                      const relation = prompt("Relation? (e.g., Mother)")?.trim() || "Family";
                      const id = `p_${Date.now()}`;
                      const next = [...profiles, { id, name, relation }];
                      saveProfiles(next);
                      setProfileId(id);
                      localStorage.setItem("mediscan_active_profile", id);
                    }}
                  >
                    + Add
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Meds, reminders, stats are stored per profile (local-first).
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Email Notifications</label>
                <label className="flex items-center">
                  <input 
                    type="checkbox" 
                    className="mr-2" 
                    checked={settings.emailNotifications}
                    onChange={(e) => setSettings({ ...settings, emailNotifications: e.target.checked })}
                  />
                  <span className="text-sm">Receive medication reminders</span>
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Emergency Contacts</label>
                <input
                  type="text"
                  placeholder="Add emergency contact"
                  className="border p-2 w-full rounded"
                  value={settings.emergencyContact}
                  onChange={(e) => setSettings({ ...settings, emergencyContact: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Allergies (comma separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Penicillin, Ibuprofen, Nuts"
                  className="border p-2 w-full rounded"
                  value={settings.allergies}
                  onChange={(e) => setSettings({ ...settings, allergies: e.target.value })}
                />
                <p className="text-xs text-gray-500 mt-1">
                  We’ll use this to highlight warnings when you add meds, scan prescriptions, or chat with Healix.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Blood Group</label>
                <input
                  type="text"
                  placeholder="e.g. O+"
                  className="border p-2 w-full rounded"
                  value={settings.bloodGroup}
                  onChange={(e) => setSettings({ ...settings, bloodGroup: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Conditions (comma separated)</label>
                <input
                  type="text"
                  placeholder="e.g. Diabetes, Hypertension"
                  className="border p-2 w-full rounded"
                  value={settings.conditions}
                  onChange={(e) => setSettings({ ...settings, conditions: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Accessibility</label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="mr-2"
                      checked={settings.accessibilityLargeText}
                      onChange={(e) => setSettings({ ...settings, accessibilityLargeText: e.target.checked })}
                    />
                    <span className="text-sm">Larger text</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="mr-2"
                      checked={settings.accessibilityHighContrast}
                      onChange={(e) => setSettings({ ...settings, accessibilityHighContrast: e.target.checked })}
                    />
                    <span className="text-sm">High contrast</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Data Backup</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="bg-gray-800 text-white px-4 py-2 rounded hover:bg-gray-900"
                    onClick={() => {
                      const payload = {
                        exportedAt: new Date().toISOString(),
                        activeProfile: localStorage.getItem("mediscan_active_profile") || "default",
                        profiles: JSON.parse(localStorage.getItem("mediscan_profiles") || "[]"),
                        settings: JSON.parse(localStorage.getItem(`settings_${userId}`) || "null"),
                        pillMeds: {
                          default: JSON.parse(localStorage.getItem("mediscan_pill_medications") || "[]"),
                        },
                        pillStats: JSON.parse(localStorage.getItem("mediscan_pill_stats") || "null"),
                      };
                      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = "mediscan-backup.json";
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                  >
                    Export JSON
                  </button>
                  <button
                    type="button"
                    className="bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300"
                    onClick={() => {
                      const raw = prompt("Paste backup JSON here:");
                      if (!raw) return;
                      try {
                        const data = JSON.parse(raw);
                        if (data?.settings && userId) {
                          localStorage.setItem(`settings_${userId}`, JSON.stringify(data.settings));
                        }
                        if (data?.profiles) {
                          localStorage.setItem("mediscan_profiles", JSON.stringify(data.profiles));
                        }
                        if (data?.activeProfile) {
                          localStorage.setItem("mediscan_active_profile", data.activeProfile);
                        }
                        if (data?.pillMeds?.default) {
                          localStorage.setItem("mediscan_pill_medications", JSON.stringify(data.pillMeds.default));
                        }
                        if (data?.pillStats) {
                          localStorage.setItem("mediscan_pill_stats", JSON.stringify(data.pillStats));
                        }
                        setMessage({ type: "success", text: "Backup imported. Reload the app to apply everything." });
                      } catch {
                        setMessage({ type: "error", text: "Invalid JSON backup." });
                      }
                    }}
                  >
                    Import JSON
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Export/import is local-first. Server sync is best-effort when your API is working.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Language</label>
                <select 
                  className="border p-2 w-full rounded"
                  value={settings.language}
                  onChange={(e) => setSettings({ ...settings, language: e.target.value })}
                >
                  <option>English</option>
                  <option>Hindi</option>
                  <option>Kannada</option>
                </select>
              </div>
              <button 
                onClick={handleSaveSettings}
                disabled={loading}
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}