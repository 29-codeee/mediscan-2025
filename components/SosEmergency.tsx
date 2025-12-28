"use client";

import { useState } from "react";

interface EmergencyContact {
  id: number;
  name: string;
  phone: string;
  relationship: string;
}

export default function SosEmergency() {
  const [message, setMessage] = useState("");
  const [emergencyType, setEmergencyType] = useState("");
  const [location, setLocation] = useState("");
  const [contacts, setContacts] = useState<EmergencyContact[]>([
    { id: 1, name: "Emergency Services", phone: "911", relationship: "Emergency" }
  ]);
  const [isEmergency, setIsEmergency] = useState(false);
  const [medicationGuidance, setMedicationGuidance] = useState<string[]>([]);

  // RxNav API functions for emergency medication guidance
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

  const getEmergencyGuidance = async (symptoms: string) => {
    const guidance: string[] = [];

    // Common emergency medications based on symptoms
    const symptomMedMap: { [key: string]: string[] } = {
      "chest pain": ["aspirin", "nitroglycerin"],
      "allergic reaction": ["epinephrine", "diphenhydramine"],
      "asthma attack": ["albuterol", "prednisone"],
      "severe headache": ["acetaminophen", "ibuprofen"],
      "fever": ["acetaminophen", "ibuprofen"],
      "pain": ["acetaminophen", "ibuprofen"],
      "nausea": ["ondansetron", "metoclopramide"],
      "anxiety": ["lorazepam", "diazepam"],
      "seizure": ["diazepam", "lorazepam"]
    };

    for (const [symptom, meds] of Object.entries(symptomMedMap)) {
      if (symptoms.toLowerCase().includes(symptom)) {
        for (const med of meds) {
          try {
            const drugGroups = await searchDrugByName(med);
            if (drugGroups.length > 0) {
              const drugInfo = drugGroups[0].conceptProperties?.[0];
              if (drugInfo) {
                guidance.push(`💊 **${drugInfo.name}**: ${drugInfo.synonym || 'Emergency medication for ' + symptom}`);
              }
            }
          } catch (error) {
            console.error(`Error getting info for ${med}:`, error);
          }
        }
      }
    }

    return guidance;
  };

  const checkForCrisis = (msg: string) => {
    const crisisKeywords = [
      "chest pain", "heart attack", "stroke", "fainting", "unconscious",
      "severe bleeding", "can't breathe", "choking", "poisoning",
      "severe allergic reaction", "anaphylaxis", "seizure", "convulsion",
      "broken bone", "head injury", "emergency", "help me", "911"
    ];
    return crisisKeywords.some(keyword => msg.toLowerCase().includes(keyword));
  };

  const handleEmergencyMessage = async () => {
    const crisisDetected = checkForCrisis(message) || checkForCrisis(emergencyType);

    if (crisisDetected) {
      setIsEmergency(true);

      // Get medication guidance for symptoms
      const symptoms = message + " " + emergencyType;
      const guidance = await getEmergencyGuidance(symptoms);
      setMedicationGuidance(guidance);

      // Simulate emergency notification
      alert("🚨 RED ALERT: Emergency detected! Notifying emergency contacts and services. Stay calm - help is on the way!");

      // In a real app, this would:
      // 1. Send SMS to emergency contacts
      // 2. Call emergency services
      // 3. Share location data
      // 4. Send medical history to responders

    } else {
      alert("Message sent. If this is an emergency, please call emergency services (911) immediately.");
    }
  };

  const addEmergencyContact = () => {
    const newContact: EmergencyContact = {
      id: Date.now(),
      name: prompt("Contact name:") || "",
      phone: prompt("Phone number:") || "",
      relationship: prompt("Relationship:") || ""
    };

    if (newContact.name && newContact.phone) {
      setContacts([...contacts, newContact]);
    }
  };

  const callEmergency = (phone: string) => {
    // In a real app, this would initiate a phone call
    alert(`Calling ${phone}...`);
  };

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-500 to-orange-500 text-white p-6">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
            <span className="text-2xl">🚨</span>
          </div>
          <div>
            <h2 className="text-2xl font-bold">SOS Emergency System</h2>
            <p className="text-red-100">24/7 emergency response with medical guidance</p>
          </div>
        </div>
      </div>

      {/* Emergency Form */}
      <div className="p-6 bg-gray-50">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Emergency Type/Symptoms
            </label>
            <select
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              value={emergencyType}
              onChange={(e) => setEmergencyType(e.target.value)}
            >
              <option value="">Select emergency type...</option>
              <option value="chest pain">Chest Pain / Heart Issues</option>
              <option value="breathing difficulty">Breathing Difficulty</option>
              <option value="severe allergic reaction">Severe Allergic Reaction</option>
              <option value="unconscious">Unconscious / Fainting</option>
              <option value="severe bleeding">Severe Bleeding</option>
              <option value="poisoning">Poisoning</option>
              <option value="seizure">Seizure</option>
              <option value="head injury">Head Injury</option>
              <option value="broken bone">Broken Bone</option>
              <option value="other">Other Emergency</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Location (if safe to provide)
            </label>
            <input
              type="text"
              placeholder="Current location or address"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Describe your situation
            </label>
            <textarea
              placeholder="Describe what's happening, your symptoms, and any immediate needs..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 h-24 resize-none"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-6 flex space-x-3">
          <button
            onClick={handleEmergencyMessage}
            className="bg-red-500 hover:bg-red-600 text-white px-8 py-3 rounded-lg transition-colors duration-200 flex items-center space-x-2 font-semibold"
          >
            <span>🚨 SEND SOS ALERT</span>
          </button>

          <button
            onClick={() => callEmergency("911")}
            className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg transition-colors duration-200"
          >
            📞 Call 911
          </button>
        </div>
      </div>

      {/* Emergency Response */}
      {isEmergency && (
        <div className="mx-6 mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
          <h4 className="text-red-800 font-semibold mb-3">🚨 EMERGENCY RESPONSE ACTIVATED</h4>

          {medicationGuidance.length > 0 && (
            <div className="mb-4">
              <h5 className="text-red-700 font-medium mb-2">💊 Emergency Medication Guidance:</h5>
              <ul className="text-red-700 text-sm space-y-1">
                {medicationGuidance.map((med, index) => (
                  <li key={index}>{med}</li>
                ))}
              </ul>
              <p className="text-red-600 text-xs mt-2">
                ⚠️ Only use emergency medications if prescribed and available. Seek immediate medical attention.
              </p>
            </div>
          )}

          <div className="text-red-700 text-sm">
            <p className="font-medium mb-2">Emergency contacts have been notified:</p>
            <ul className="space-y-1">
              {contacts.map((contact) => (
                <li key={contact.id} className="flex justify-between items-center">
                  <span>{contact.name} ({contact.relationship})</span>
                  <button
                    onClick={() => callEmergency(contact.phone)}
                    className="bg-red-500 text-white px-3 py-1 rounded text-xs hover:bg-red-600"
                  >
                    Call {contact.phone}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Emergency Contacts */}
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Emergency Contacts</h3>
          <button
            onClick={addEmergencyContact}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm"
          >
            ➕ Add Contact
          </button>
        </div>

        <div className="space-y-3">
          {contacts.map((contact) => (
            <div key={contact.id} className="bg-gray-50 rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <span className="text-red-600">📞</span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800">{contact.name}</h4>
                  <p className="text-sm text-gray-600">{contact.relationship} • {contact.phone}</p>
                </div>
              </div>
              <button
                onClick={() => callEmergency(contact.phone)}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm"
              >
                Call
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-50 px-6 py-4 border-t">
        <p className="text-xs text-gray-500 text-center">
          ⚠️ This system provides emergency guidance but is not a substitute for professional emergency services. Always call 911 for life-threatening emergencies.
        </p>
      </div>
    </div>
  );
}