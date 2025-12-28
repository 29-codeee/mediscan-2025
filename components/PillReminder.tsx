"use client";
import { useState, useEffect } from 'react';

interface Medication {
  id: number;
  name: string;
  dosage: string;
  time: string;
  rxcui?: string;
}

export default function PillReminder() {
  const [medication, setMedication] = useState({
    name: "",
    dosage: "",
    time: ""
  });
  const [medications, setMedications] = useState<Medication[]>([]);
  const [conflicts, setConflicts] = useState<string[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [activeAlarm, setActiveAlarm] = useState<Medication | null>(null);

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
      // Alarm chime (Major Triad)
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(523.25, now); // C5
      oscillator.frequency.setValueAtTime(659.25, now + 0.2); // E5
      oscillator.frequency.setValueAtTime(783.99, now + 0.4); // G5
      oscillator.frequency.setValueAtTime(1046.50, now + 0.6); // C6
      
      gainNode.gain.setValueAtTime(0.3, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 1.5);
      
      oscillator.start(now);
      oscillator.stop(now + 1.5);
    } else if (type === 'morning') {
      // Gentle morning melody
      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(440, now);
      oscillator.frequency.linearRampToValueAtTime(554.37, now + 0.5);
      gainNode.gain.setValueAtTime(0.2, now);
      gainNode.gain.linearRampToValueAtTime(0, now + 2);
      oscillator.start(now);
      oscillator.stop(now + 2);
    } else if (type === 'afternoon') {
      // Upbeat
      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(440, now);
      oscillator.frequency.setValueAtTime(880, now + 0.2);
      gainNode.gain.setValueAtTime(0.1, now);
      gainNode.gain.linearRampToValueAtTime(0, now + 0.5);
      oscillator.start(now);
      oscillator.stop(now + 0.5);
    } else {
      // Evening lullaby
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(220, now);
      oscillator.frequency.linearRampToValueAtTime(110, now + 2);
      gainNode.gain.setValueAtTime(0.2, now);
      gainNode.gain.linearRampToValueAtTime(0, now + 3);
      oscillator.start(now);
      oscillator.stop(now + 3);
    }
  };

  // Check for reminders every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      
      const dueMed = medications.find(m => m.time === currentTime);
      if (dueMed && !activeAlarm) {
        setActiveAlarm(dueMed);
        playMelody('alarm');
        // Also use browser notification if available
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(`Time to take ${dueMed.name}`, { body: `Dosage: ${dueMed.dosage}` });
        }
      }
    }, 10000); // Check every 10 seconds

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => clearInterval(interval);
  }, [medications, activeAlarm]);

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

    try {
      // Get RxCUI for new medication
      const drugGroups = await searchDrugByName(newMed.name);
      if (drugGroups.length > 0) {
        const newRxcui = drugGroups[0].conceptProperties?.[0]?.rxcui;
        newMed.rxcui = newRxcui;

        // Check interactions with existing medications
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
    setIsChecking(false);
    return newConflicts.length === 0;
  };

  const addMedication = async () => {
    if (!medication.name || !medication.dosage || !medication.time) return;

    const newMed: Medication = {
      id: Date.now(),
      name: medication.name,
      dosage: medication.dosage,
      time: medication.time
    };

    const hasNoConflicts = await checkMedicationConflicts(newMed);

    if (hasNoConflicts) {
      setMedications([...medications, newMed]);
      setMedication({ name: "", dosage: "", time: "" });
      alert(`✅ Medication "${newMed.name}" added successfully!`);
    } else {
      alert("⚠️ Potential medication conflicts detected. Please review and consult your healthcare provider.");
    }
  };

  const removeMedication = (id: number) => {
    setMedications(medications.filter(med => med.id !== id));
    setConflicts([]);
  };

  const suggestSong = (time: string) => {
    const hour = parseInt(time.split(":")[0]);
    if (hour < 12) return "A calming morning melody to start your day gently.";
    else if (hour < 18) return "An upbeat afternoon tune to keep you energized.";
    else return "A soothing evening lullaby for relaxation.";
  };

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-6">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
            <span className="text-2xl">💊</span>
          </div>
          <div>
            <h2 className="text-2xl font-bold">Pill Reminder</h2>
            <p className="text-purple-100">Smart medication management with safety checks</p>
          </div>
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
      {conflicts.length > 0 && (
        <div className="mx-6 mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
          <h4 className="text-red-800 font-semibold mb-2">⚠️ Potential Drug Interactions Detected</h4>
          <ul className="text-red-700 text-sm space-y-1">
            {conflicts.map((conflict, index) => (
              <li key={index}>{conflict}</li>
            ))}
          </ul>
          <p className="text-red-600 text-xs mt-2">
            Please consult your healthcare provider before proceeding.
          </p>
        </div>
      )}

      {/* Medication List */}
      <div className="p-6">
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
          <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-md w-full text-center animate-bounce-slight">
            <div className="text-6xl mb-4 animate-pulse">⏰</div>
            <h2 className="text-3xl font-bold text-gray-800 mb-2">Time to take your meds!</h2>
            <div className="bg-purple-100 p-4 rounded-xl mb-6">
              <p className="text-2xl font-semibold text-purple-700">{activeAlarm.name}</p>
              <p className="text-lg text-purple-600">{activeAlarm.dosage}</p>
            </div>
            <button
              onClick={() => setActiveAlarm(null)}
              className="bg-purple-600 hover:bg-purple-700 text-white text-xl font-bold py-4 px-8 rounded-full shadow-lg transform transition hover:scale-105"
            >
              I've taken it ✅
            </button>
          </div>
        </div>
      )}
    </div>
  );
}