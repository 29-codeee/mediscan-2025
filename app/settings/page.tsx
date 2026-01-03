"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface UserSettings {
  emailNotifications: boolean;
  emergencyContact: string;
  language: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [settings, setSettings] = useState<UserSettings>({
    emailNotifications: true,
    emergencyContact: "",
    language: "English"
  });
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
      
      // Load existing settings
      loadSettings(userData.id || userData.userId);
    } catch (e) {
      setUser(userStr);
      // Try to get userId from user string if it's just an ID
      setUserId(userStr);
      loadSettings(userStr);
    }
  }, [router]);

  const loadSettings = async (id: string) => {
    try {
      const response = await fetch(`/api/user/profile?userId=${id}`);
      if (response.ok) {
        const data = await response.json();
        if (data.user) {
          // Try to load from user profile first (if preferences column exists)
          if (data.user.preferences) {
            setSettings(data.user.preferences);
            // Also save to localStorage for backup
            localStorage.setItem(`settings_${id}`, JSON.stringify(data.user.preferences));
          } else {
            // Fallback to localStorage
            const savedSettings = localStorage.getItem(`settings_${id}`);
            if (savedSettings) {
              setSettings(JSON.parse(savedSettings));
            }
          }
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      // Fallback to localStorage
      const savedSettings = localStorage.getItem(`settings_${id}`);
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
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
      // Save to localStorage
      localStorage.setItem(`settings_${userId}`, JSON.stringify(settings));
      
      // Also save to user profile if there's a preferences field
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          preferences: settings
        })
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Settings saved successfully!' });
        setTimeout(() => setMessage(null), 3000);
      } else {
        // Even if API fails, settings are saved in localStorage
        setMessage({ type: 'success', text: 'Settings saved locally!' });
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      // Settings are still saved in localStorage
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
                <label className="block text-sm font-medium mb-2">Language</label>
                <select 
                  className="border p-2 w-full rounded"
                  value={settings.language}
                  onChange={(e) => setSettings({ ...settings, language: e.target.value })}
                >
                  <option>English</option>
                  <option>Spanish</option>
                  <option>French</option>
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