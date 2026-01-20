"use client";
import { useState, useEffect, useRef } from 'react';

interface Medication {
  id: string;
  name: string;
  dosage: string;
  time: string;
  rxcui?: string;
  pillsRemaining?: number;
  refillBy?: string; // YYYY-MM-DD
  pillsPerDose?: number;
  refillThreshold?: number;
}

export default function PillReminder() {
  const [medication, setMedication] = useState({
    name: "",
    dosage: "",
    time: "",
    pillsRemaining: "",
    refillBy: "",
    pillsPerDose: "1",
    refillThreshold: "5",
  });
  const [medications, setMedications] = useState<Medication[]>([]);
  const [conflicts, setConflicts] = useState<string[]>([]);
  const [allergyWarnings, setAllergyWarnings] = useState<string[]>([]);
  const [stats, setStats] = useState<{
    taken: number;
    missed: number;
    streak: number;
  }>({ taken: 0, missed: 0, streak: 0 });
  const [weekly, setWeekly] = useState<{ day: string; taken: number; missed: number }[]>([]);
  const snoozeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeAlarm, setActiveAlarm] = useState<Medication | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const notificationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const scheduledNotificationsRef = useRef<Map<string, number>>(new Map());

  // Get user ID on mount
  useEffect(() => {
    const userData = localStorage.getItem("mediscan_user_data");
    if (userData) {
      try {
        const user = JSON.parse(userData);
        setUserId(user.id);
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }
  }, []);

  // Local storage helpers so reminders still work if API / Supabase fails
  const LOCAL_STORAGE_KEY = "mediscan_pill_medications";
  const STATS_STORAGE_KEY = "mediscan_pill_stats";
  const ALLERGY_STORAGE_KEY = "mediscan_allergies";
  const DOSE_EVENTS_KEY = "mediscan_dose_events";

  const loadMedicationsFromLocal = () => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!stored) return [];
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed)) return [];
      return parsed as Medication[];
    } catch (error) {
      console.error("Error loading medications from local storage:", error);
      return [];
    }
  };

  const saveMedicationsToLocal = (list: Medication[]) => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
    } catch (error) {
      console.error("Error saving medications to local storage:", error);
    }
  };

  const loadStatsFromLocal = () => {
    try {
      const stored = localStorage.getItem(STATS_STORAGE_KEY);
      if (!stored) return { taken: 0, missed: 0, streak: 0 };
      const parsed = JSON.parse(stored);
      return {
        taken: parsed.taken || 0,
        missed: parsed.missed || 0,
        streak: parsed.streak || 0,
      };
    } catch {
      return { taken: 0, missed: 0, streak: 0 };
    }
  };

  const saveStatsToLocal = (s: { taken: number; missed: number; streak: number }) => {
    try {
      localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(s));
    } catch {
      // ignore
    }
  };

  const addDoseEvent = (status: "taken" | "missed") => {
    try {
      const raw = localStorage.getItem(DOSE_EVENTS_KEY);
      const list = raw ? JSON.parse(raw) : [];
      const events = Array.isArray(list) ? list : [];
      events.push({ ts: Date.now(), status });
      localStorage.setItem(DOSE_EVENTS_KEY, JSON.stringify(events));
      computeWeekly(events);
    } catch {
      // ignore
    }
  };

  const computeWeekly = (eventsOverride?: any[]) => {
    try {
      const raw = eventsOverride ?? JSON.parse(localStorage.getItem(DOSE_EVENTS_KEY) || "[]");
      const events = Array.isArray(raw) ? raw : [];
      const days: { day: string; taken: number; missed: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toDateString();
        const taken = events.filter((e: any) => new Date(e.ts).toDateString() === key && e.status === "taken").length;
        const missed = events.filter((e: any) => new Date(e.ts).toDateString() === key && e.status === "missed").length;
        days.push({
          day: d.toLocaleDateString([], { weekday: "short" }),
          taken,
          missed,
        });
      }
      setWeekly(days);
    } catch {
      setWeekly([]);
    }
  };

  const getAllergyList = (): string[] => {
    try {
      // Prefer structured settings if present
      const userStr = localStorage.getItem("mediscan_user");
      let userId = "";
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          userId = user.id || user.userId || "";
        } catch {
          userId = userStr;
        }
      }
      if (userId) {
        const settingsStr = localStorage.getItem(`settings_${userId}`);
        if (settingsStr) {
          const settings = JSON.parse(settingsStr);
          if (settings?.allergies) {
            return String(settings.allergies)
              .split(",")
              .map((s: string) => s.trim().toLowerCase())
              .filter(Boolean);
          }
        }
      }
      // Fallback generic allergies key
      const raw = localStorage.getItem(ALLERGY_STORAGE_KEY);
      if (!raw) return [];
      return raw
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
    } catch {
      return [];
    }
  };

  // Load stats once on mount
  useEffect(() => {
    setStats(loadStatsFromLocal());
    computeWeekly();
  }, []);

  // Load medications (try database, fall back to local storage)
  useEffect(() => {
    const mergeMedicationLists = (serverMeds: Medication[], localMeds: Medication[]): Medication[] => {
      try {
        const map = new Map<string, Medication>();

        // Helper key: prefer id, otherwise name+dosage+time
        const makeKey = (m: Medication) =>
          m.id || `${m.name.toLowerCase()}|${(m.dosage || '').toLowerCase()}|${(m.time || '').toLowerCase()}`;

        localMeds.forEach((m) => {
          map.set(makeKey(m), m);
        });
        serverMeds.forEach((m) => {
          map.set(makeKey(m), m); // server overwrites local if same key
        });

        return Array.from(map.values());
      } catch {
        return serverMeds.length ? serverMeds : localMeds;
      }
    };

    async function loadMedications() {
      setIsLoading(true);
      try {
        // If logged in, try the API first
        if (userId) {
          const response = await fetch(`/api/medications?userId=${userId}`);
          if (response.ok) {
            const data = await response.json();

            if (data.success && data.medications) {
              // Convert database format to component format
              const formattedMeds = data.medications.map((med: any) => ({
                id: med.id,
                name: med.name,
                dosage: med.dosage || '',
                time: med.frequency || '', // Using frequency as time for now
                rxcui: undefined
              }));

              // Merge with any locally stored meds (e.g., added from scanner while offline / API failing)
              const localMeds = loadMedicationsFromLocal();
              const merged = mergeMedicationLists(formattedMeds, localMeds);

              setMedications(merged);
              saveMedicationsToLocal(merged);

              // Schedule notifications for all medications
              merged.forEach((med: Medication) => {
                if (med.time) {
                  scheduleNotification(med);
                }
              });
              return;
            }
          }
        }

        // If API not available or no user, fall back to local storage
        const localMeds = loadMedicationsFromLocal();
        setMedications(localMeds);
        localMeds.forEach((med) => {
          if (med.time) scheduleNotification(med);
        });
      } catch (error) {
        console.error('Error loading medications:', error);
        // On error, still use local so reminders work offline
        const localMeds = loadMedicationsFromLocal();
        setMedications(localMeds);
        localMeds.forEach((med) => {
          if (med.time) scheduleNotification(med);
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadMedications();
  }, [userId]);

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          console.log('Notification permission granted');
        }
      });
    }
  }, []);

  // Schedule browser notification for a medication
  function scheduleNotification(med: Medication) {
    if (!med.time) return;

    const [hours, minutes] = med.time.split(':').map(Number);
    const now = new Date();
    const scheduledTime = new Date();
    scheduledTime.setHours(hours, minutes, 0, 0);

    // If time has passed today, schedule for tomorrow
    if (scheduledTime < now) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }

    const timeUntilNotification = scheduledTime.getTime() - now.getTime();
    const notificationKey = `${med.id}-${med.time}`;

    // Clear existing notification for this medication
    const existingTimeout = scheduledNotificationsRef.current.get(notificationKey);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Schedule new notification
    const timeoutId = setTimeout(() => {
      if ('Notification' in window && Notification.permission === 'granted') {
        const notification = new Notification(`💊 Time to take ${med.name}`, {
          body: `Dosage: ${med.dosage}`,
          icon: '/logo.svg',
          badge: '/logo.svg',
          tag: notificationKey,
          requireInteraction: true,
          silent: false
        });

        notification.onclick = () => {
          window.focus();
          notification.close();
        };

        // Schedule next day's notification
        scheduleNotification(med);
      }
    }, timeUntilNotification);

    scheduledNotificationsRef.current.set(notificationKey, timeoutId as any);
  }

  // Check for reminders every minute (for in-page alerts)
  useEffect(() => {
    if (notificationIntervalRef.current) {
      clearInterval(notificationIntervalRef.current);
    }

    notificationIntervalRef.current = setInterval(() => {
      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      
      const dueMed = medications.find(m => m.time === currentTime);
      if (dueMed && !activeAlarm) {
        setActiveAlarm(dueMed);
        playMelody('alarm');
        
        // Also show browser notification if permission granted
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(`💊 Time to take ${dueMed.name}`, {
            body: `Dosage: ${dueMed.dosage}`,
            icon: '/logo.svg',
            requireInteraction: true
          });
        }
      }
    }, 60000); // Check every minute

    return () => {
      if (notificationIntervalRef.current) {
        clearInterval(notificationIntervalRef.current);
      }
    };
  }, [medications, activeAlarm]);

  // Audio context for playing sounds
  const playMelody = (type: 'morning' | 'afternoon' | 'evening' | 'alarm') => {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    
    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    const now = ctx.currentTime;
    
    if (type === 'alarm') {
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(523.25, now);
      oscillator.frequency.setValueAtTime(659.25, now + 0.2);
      oscillator.frequency.setValueAtTime(783.99, now + 0.4);
      oscillator.frequency.setValueAtTime(1046.50, now + 0.6);
      
      gainNode.gain.setValueAtTime(0.3, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 1.5);
      
      oscillator.start(now);
      oscillator.stop(now + 1.5);
    } else if (type === 'morning') {
      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(440, now);
      oscillator.frequency.linearRampToValueAtTime(554.37, now + 0.5);
      gainNode.gain.setValueAtTime(0.2, now);
      gainNode.gain.linearRampToValueAtTime(0, now + 2);
      oscillator.start(now);
      oscillator.stop(now + 2);
    } else if (type === 'afternoon') {
      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(440, now);
      oscillator.frequency.setValueAtTime(880, now + 0.2);
      gainNode.gain.setValueAtTime(0.1, now);
      gainNode.gain.linearRampToValueAtTime(0, now + 0.5);
      oscillator.start(now);
      oscillator.stop(now + 0.5);
    } else {
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(220, now);
      oscillator.frequency.linearRampToValueAtTime(110, now + 2);
      gainNode.gain.setValueAtTime(0.2, now);
      gainNode.gain.linearRampToValueAtTime(0, now + 3);
      oscillator.start(now);
      oscillator.stop(now + 3);
    }
  };

  // RxNav API functions
  const searchDrugByName = async (drugName: string) => {
    try {
      const response = await fetch(`https://rxnav.nlm.nih.gov/REST/drugs.json?name=${encodeURIComponent(drugName)}`);
      const data = await response.json();
      return data.drugGroup?.conceptGroup || [];
    } catch (error) {
      console.error('Error searching drug:', error);
      return [];
    }
  };

  const getDrugInteractions = async (rxcui: string) => {
    try {
      const response = await fetch(`https://rxnav.nlm.nih.gov/REST/interaction/interaction.json?rxcui=${rxcui}`);
      const data = await response.json();
      return data.interactionTypeGroup || [];
    } catch (error) {
      console.error('Error getting interactions:', error);
      return [];
    }
  };

  const checkMedicationConflicts = async (newMed: Medication) => {
    setIsChecking(true);
    const newConflicts: string[] = [];
    const newAllergyWarnings: string[] = [];

    try {
      const allergies = getAllergyList();
      if (allergies.length > 0) {
        const nameLower = newMed.name.toLowerCase();
        const directAllergy = allergies.find((a) => nameLower.includes(a));
        if (directAllergy) {
          newAllergyWarnings.push(
            `🚫 Allergy alert: You have marked an allergy to **${directAllergy}** which may relate to **${newMed.name}**.`
          );
        }
      }
    } catch (e) {
      console.warn("Could not check allergies", e);
    }

    try {
      const drugGroups = await searchDrugByName(newMed.name);
      if (drugGroups.length > 0) {
        const newRxcui = drugGroups[0].conceptProperties?.[0]?.rxcui;
        newMed.rxcui = newRxcui;

        for (const existingMed of medications) {
          if (existingMed.rxcui) {
            const interactions = await getDrugInteractions(existingMed.rxcui);
            const conflictingInteraction = interactions.find((interaction: any) =>
              interaction.interactionType?.[0]?.interactionPair?.some((pair: any) =>
                pair.interactionConcept?.[1]?.sourceConceptItem?.name?.toLowerCase().includes(newMed.name.toLowerCase())
              )
            );

            if (conflictingInteraction) {
              const severity = conflictingInteraction.interactionType?.[0]?.interactionPair?.[0]?.severity || 'Unknown';
              newConflicts.push(`⚠️ **${newMed.name}** may interact with **${existingMed.name}** (Severity: ${severity})`);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error checking conflicts:', error);
    }

    setConflicts(newConflicts);
    setAllergyWarnings(newAllergyWarnings);
    setIsChecking(false);
    return newConflicts.length === 0 && newAllergyWarnings.length === 0;
  };

  const addMedication = async () => {
    if (!medication.name || !medication.dosage || !medication.time) return;

    const newMed: Medication = {
      id: Date.now().toString(),
      name: medication.name,
      dosage: medication.dosage,
      time: medication.time,
      pillsRemaining: medication.pillsRemaining ? Number(medication.pillsRemaining) : undefined,
      refillBy: medication.refillBy || undefined,
      pillsPerDose: medication.pillsPerDose ? Number(medication.pillsPerDose) : 1,
      refillThreshold: medication.refillThreshold ? Number(medication.refillThreshold) : 5,
    };

    const hasNoConflicts = await checkMedicationConflicts(newMed);

    if (hasNoConflicts) {
      try {
        // Try to save to database if a user is logged in
        if (userId) {
          const response = await fetch('/api/medications', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId,
              name: newMed.name,
              dosage: newMed.dosage,
              frequency: newMed.time // Store time as frequency
            })
          });

          if (response.ok) {
            const data = await response.json();
            if (data.medication) {
              // Use database ID if available
              newMed.id = data.medication.id;
            }
          } else {
            console.warn("Failed to save medication on server, using local only.");
          }
        }

        const updated = [...medications, newMed];
        setMedications(updated);
        saveMedicationsToLocal(updated);
        setMedication({ name: "", dosage: "", time: "", pillsRemaining: "", refillBy: "", pillsPerDose: "1", refillThreshold: "5" });

        // Schedule notification
        scheduleNotification(newMed);

        alert(`✅ Medication "${newMed.name}" added successfully!`);
      } catch (error) {
        console.error('Error saving medication:', error);
        // Still keep it locally so reminders work
        const updated = [...medications, newMed];
        setMedications(updated);
        saveMedicationsToLocal(updated);
        setMedication({ name: "", dosage: "", time: "", pillsRemaining: "", refillBy: "", pillsPerDose: "1", refillThreshold: "5" });
        scheduleNotification(newMed);
        alert("Medication saved locally. Some online features may not work.");
      }
    } else {
      alert("⚠️ Potential medication conflicts detected. Please review and consult your healthcare provider.");
    }
  };

  const downloadICS = (filename: string, ics: string) => {
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const addRefillToCalendar = (med: Medication) => {
    if (!med.refillBy) return;
    const date = med.refillBy.replace(/-/g, "");
    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//MediScan//Refill//EN",
      "BEGIN:VEVENT",
      `UID:${med.id}@mediscan`,
      `DTSTAMP:${date}T090000Z`,
      `DTSTART;VALUE=DATE:${date}`,
      `SUMMARY:Refill ${med.name}`,
      `DESCRIPTION:Refill reminder for ${med.name}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
    downloadICS(`refill-${med.name}.ics`, ics);
  };

  const removeMedication = async (id: string) => {
    try {
      // If logged in, try to delete from database (but don't block local removal)
      if (userId) {
        const response = await fetch(`/api/medications?id=${id}&userId=${userId}`, {
          method: 'DELETE'
        });

        if (!response.ok) {
          console.warn("Failed to delete medication on server, removing locally only.");
        }
      }

      // Remove notification timeout if any
      const med = medications.find(m => m.id === id);
      if (med && med.time) {
        const notificationKey = `${med.id}-${med.time}`;
        const timeoutId = scheduledNotificationsRef.current.get(notificationKey);
        if (timeoutId) {
          clearTimeout(timeoutId);
          scheduledNotificationsRef.current.delete(notificationKey);
        }
      }

      const remaining = medications.filter(med => med.id !== id);
      setMedications(remaining);
      saveMedicationsToLocal(remaining);
      setConflicts([]);
    } catch (error) {
      console.error('Error deleting medication:', error);
      // Even if server fails, remove locally so UI and reminders stay clean
      const remaining = medications.filter(med => med.id !== id);
      setMedications(remaining);
      saveMedicationsToLocal(remaining);
      setConflicts([]);
    }
  };

  const suggestSong = (time: string) => {
    const hour = parseInt(time.split(":")[0]);
    if (hour < 12) return "A calming morning melody to start your day gently.";
    else if (hour < 18) return "An upbeat afternoon tune to keep you energized.";
    else return "A soothing evening lullaby for relaxation.";
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl p-8 text-center">
        <p className="text-gray-500">Loading your medications...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
              <span className="text-2xl">💊</span>
            </div>
            <div>
              <h2 className="text-2xl font-bold">Pill Reminder</h2>
              <p className="text-purple-100">Smart medication management with safety checks</p>
            </div>
          </div>
          {Notification.permission !== 'granted' && (
            <button
              onClick={() => Notification.requestPermission()}
              className="bg-white bg-opacity-20 hover:bg-opacity-30 px-4 py-2 rounded-lg text-sm"
            >
              Enable Notifications
            </button>
          )}
        </div>
      </div>

      {/* Add Medication Form */}
      <div className="p-6 bg-gray-50">
        <h3 className="text-lg font-semibold mb-4 text-gray-800">Add New Medication</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <input
            type="text"
            placeholder="Medication name (e.g., Ibuprofen)"
            className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            value={medication.name}
            onChange={(e) => setMedication({ ...medication, name: e.target.value })}
          />
          <input
            type="text"
            placeholder="Dosage (e.g., 200mg)"
            className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            value={medication.dosage}
            onChange={(e) => setMedication({ ...medication, dosage: e.target.value })}
          />
          <input
            type="time"
            className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            value={medication.time}
            onChange={(e) => setMedication({ ...medication, time: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <input
            type="number"
            min="0"
            placeholder="Pills remaining"
            className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            value={medication.pillsRemaining}
            onChange={(e) => setMedication({ ...medication, pillsRemaining: e.target.value })}
          />
          <input
            type="number"
            min="1"
            placeholder="Pills per dose"
            className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            value={medication.pillsPerDose}
            onChange={(e) => setMedication({ ...medication, pillsPerDose: e.target.value })}
          />
          <input
            type="number"
            min="0"
            placeholder="Refill alert at"
            className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            value={medication.refillThreshold}
            onChange={(e) => setMedication({ ...medication, refillThreshold: e.target.value })}
          />
          <input
            type="date"
            className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            value={medication.refillBy}
            onChange={(e) => setMedication({ ...medication, refillBy: e.target.value })}
          />
        </div>

        <div className="flex space-x-3">
          <button
            onClick={addMedication}
            disabled={isChecking || !medication.name || !medication.dosage || !medication.time}
            className="bg-purple-500 hover:bg-purple-600 disabled:bg-gray-300 text-white px-6 py-3 rounded-lg transition-colors duration-200 flex items-center space-x-2"
          >
            {isChecking ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Checking...</span>
              </>
            ) : (
              <>
                <span>➕ Add Medication</span>
              </>
            )}
          </button>

          {medication.time && (
            <button
              onClick={() => {
                const hour = parseInt(medication.time.split(":")[0]);
                let type: 'morning' | 'afternoon' | 'evening' = 'morning';
                if (hour >= 12 && hour < 18) type = 'afternoon';
                else if (hour >= 18) type = 'evening';
                
                playMelody(type);
                alert(suggestSong(medication.time));
              }}
              className="bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-3 rounded-lg transition-colors duration-200"
            >
              🎵 Suggest Song
            </button>
          )}
        </div>
      </div>

      {/* Conflicts Alert */}
      {(conflicts.length > 0 || allergyWarnings.length > 0) && (
        <div className="mx-6 mb-4 bg-red-50 border border-red-200 rounded-lg p-4 space-y-3">
          {conflicts.length > 0 && (
            <div>
              <h4 className="text-red-800 font-semibold mb-2">⚠️ Potential Drug Interactions Detected</h4>
              <ul className="text-red-700 text-sm space-y-1">
                {conflicts.map((conflict, index) => (
                  <li key={index}>{conflict}</li>
                ))}
              </ul>
            </div>
          )}

          {allergyWarnings.length > 0 && (
            <div>
              <h4 className="text-red-800 font-semibold mb-2">🚫 Allergy Warnings</h4>
              <ul className="text-red-700 text-sm space-y-1">
                {allergyWarnings.map((w, index) => (
                  <li key={index}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-red-600 text-xs mt-2">
            Please consult your healthcare provider before proceeding or changing medications.
          </p>
        </div>
      )}

      {/* Weekly report + Adherence Summary + Medication List */}
      <div className="p-6 space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-blue-800 uppercase tracking-wide mb-3">
            Weekly Report (last 7 days)
          </h3>
          {weekly.length === 0 ? (
            <p className="text-sm text-blue-700">No data yet. Mark doses taken/missed to see your chart.</p>
          ) : (
            <div className="grid grid-cols-7 gap-2 items-end">
              {weekly.map((d) => {
                const total = d.taken + d.missed;
                const height = Math.min(80, total * 18);
                return (
                  <div key={d.day} className="text-center">
                    <div className="h-24 flex items-end justify-center">
                      <div className="w-6">
                        <div className="bg-green-500 rounded-t" style={{ height: `${Math.min(80, d.taken * 18)}px` }} />
                        <div className="bg-red-400" style={{ height: `${Math.min(80 - Math.min(80, d.taken * 18), d.missed * 18)}px` }} />
                      </div>
                    </div>
                    <div className="text-[11px] text-gray-600">{d.day}</div>
                  </div>
                );
              })}
            </div>
          )}
          <p className="text-xs text-gray-500 mt-2">Green = taken, Red = missed</p>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-purple-800 uppercase tracking-wide">
              Adherence Summary
            </h3>
            <p className="text-xs text-purple-700 mt-1">
              Keep your streak going by marking doses when you take them.
            </p>
          </div>
          <div className="flex space-x-6 text-sm">
            <div className="text-center">
              <p className="text-xs text-gray-500">Taken</p>
              <p className="text-lg font-bold text-green-600">{stats.taken}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500">Missed</p>
              <p className="text-lg font-bold text-red-500">{stats.missed}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500">Streak (days)</p>
              <p className="text-lg font-bold text-purple-700">{stats.streak}</p>
            </div>
          </div>
        </div>

        <h3 className="text-lg font-semibold mb-4 text-gray-800">Your Medications</h3>
        {medications.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No medications added yet. Add your first medication above.</p>
        ) : (
          <div className="space-y-3">
            {medications.map((med) => (
              <div key={med.id} className="bg-gray-50 rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-purple-600 text-lg">💊</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800">{med.name}</h4>
                    <p className="text-sm text-gray-600">{med.dosage} • {med.time}</p>
                    {typeof med.pillsRemaining === "number" && (
                      <p className="text-xs text-gray-500">
                        Pills left: <span className="font-medium">{med.pillsRemaining}</span>
                        {typeof med.refillThreshold === "number" && med.pillsRemaining <= med.refillThreshold ? (
                          <span className="text-red-600 font-semibold"> • Refill soon</span>
                        ) : null}
                      </p>
                    )}
                    {med.refillBy && (
                      <button
                        type="button"
                        onClick={() => addRefillToCalendar(med)}
                        className="mt-2 text-xs bg-white border px-3 py-1 rounded hover:bg-gray-100"
                      >
                        📅 Add refill to calendar
                      </button>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => removeMedication(med.id)}
                  className="text-red-500 hover:text-red-700 p-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-gray-50 px-6 py-4 border-t">
        <p className="text-xs text-gray-500 text-center">
          ⚠️ This app helps manage medication reminders but is not a substitute for professional medical advice.
        </p>
      </div>

      {/* Alarm Modal */}
      {activeAlarm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-md w-full text-center animate-bounce-slight space-y-4">
            <div className="text-6xl mb-2 animate-pulse">⏰</div>
            <h2 className="text-3xl font-bold text-gray-800 mb-2">Time to take your meds!</h2>
            <div className="bg-purple-100 p-4 rounded-xl">
              <p className="text-2xl font-semibold text-purple-700">{activeAlarm.name}</p>
              <p className="text-lg text-purple-600">{activeAlarm.dosage}</p>
            </div>
            <div className="flex flex-col space-y-3 mt-4">
              <button
                onClick={() => {
                  setStats(prev => {
                    const next = {
                      taken: prev.taken + 1,
                      missed: prev.missed,
                      streak: prev.streak + 1,
                    };
                    saveStatsToLocal(next);
                    return next;
                  });
                  addDoseEvent("taken");
                  // Decrement pills remaining
                  const perDose = activeAlarm.pillsPerDose ?? 1;
                  if (typeof activeAlarm.pillsRemaining === "number") {
                    const updated = medications.map((m) =>
                      m.id === activeAlarm.id
                        ? { ...m, pillsRemaining: Math.max(0, (m.pillsRemaining ?? 0) - perDose) }
                        : m
                    );
                    setMedications(updated);
                    saveMedicationsToLocal(updated);
                  }
                  setActiveAlarm(null);
                }}
                className="bg-purple-600 hover:bg-purple-700 text-white text-xl font-bold py-3 px-8 rounded-full shadow-lg transform transition hover:scale-105"
              >
                I've taken it ✅
              </button>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => {
                    if (snoozeTimeoutRef.current) clearTimeout(snoozeTimeoutRef.current);
                    const med = activeAlarm;
                    setActiveAlarm(null);
                    snoozeTimeoutRef.current = setTimeout(() => setActiveAlarm(med), 5 * 60 * 1000);
                  }}
                  className="bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm font-medium py-2 px-4 rounded-full transition"
                >
                  Snooze 5m
                </button>
                <button
                  onClick={() => {
                    if (snoozeTimeoutRef.current) clearTimeout(snoozeTimeoutRef.current);
                    const med = activeAlarm;
                    setActiveAlarm(null);
                    snoozeTimeoutRef.current = setTimeout(() => setActiveAlarm(med), 10 * 60 * 1000);
                  }}
                  className="bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm font-medium py-2 px-4 rounded-full transition"
                >
                  Snooze 10m
                </button>
              </div>
              <button
                onClick={() => {
                  setStats(prev => {
                    const next = {
                      taken: prev.taken,
                      missed: prev.missed + 1,
                      streak: 0,
                    };
                    saveStatsToLocal(next);
                    return next;
                  });
                  addDoseEvent("missed");
                  setActiveAlarm(null);
                }}
                className="bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-medium py-2 px-6 rounded-full transition"
              >
                Skip / I missed this dose
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
