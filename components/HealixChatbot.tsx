"use client";

import { useState, useEffect, useRef } from "react";

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'healix';
  timestamp: Date;
  image?: { mimeType: string; data: string } | null;
}

export default function HealixChatbot() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const getHistoryKey = (userId: string) => `mediscan_chat_history_${userId}`;

  // Voice (Web Speech API)
  const VOICE_STORAGE_KEY = "mediscan_chat_voice_enabled";

  const language = "en-IN";
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(true);
  const speechRate = 1;
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = (useRef<any>(null) as any);

  const isSpeechRecognitionSupported =
    typeof window !== "undefined" && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  const isSpeechSynthesisSupported = typeof window !== "undefined" && "speechSynthesis" in window;

  const speakText = (text: string) => {
    if (!voiceEnabled) return;
    if (!isSpeechSynthesisSupported) return;
    if (!text) return;

    try {
      // Stop any ongoing speech first
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language;
      utterance.rate = speechRate;
      utterance.pitch = 1;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn("Speech synthesis failed", e);
    }
  };

  useEffect(() => {
    try {
      const savedVoice = localStorage.getItem(VOICE_STORAGE_KEY);
      if (savedVoice) setVoiceEnabled(savedVoice === "true");
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(VOICE_STORAGE_KEY, String(voiceEnabled));
    } catch {
      // ignore
    }
  }, [voiceEnabled]);

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

  const checkForDrugQuery = (message: string) => {
    const drugKeywords = ['medication', 'drug', 'pill', 'medicine', 'prescription', 'ibuprofen', 'paracetamol', 'aspirin', 'interaction'];
    return drugKeywords.some(keyword => message.toLowerCase().includes(keyword));
  };

  const getAllergiesString = () => {
    try {
      const userStr = localStorage.getItem("mediscan_user");
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          const uid = user.id || user.userId || userStr;
          const settingsStr = localStorage.getItem(`settings_${uid}`);
          if (settingsStr) {
            const settings = JSON.parse(settingsStr);
            if (settings?.allergies) return String(settings.allergies);
          }
        } catch {
          // ignore
        }
      }
      const raw = localStorage.getItem("mediscan_allergies");
      return raw || "";
    } catch {
      return "";
    }
  };

  // Initialize with greeting + history
  useEffect(() => {
    const greetingMessage: Message = {
      id: 1,
      text: "Hi! I am Healix, your medical intelligence assistant. How can I help you today?",
      sender: "healix",
      timestamp: new Date(),
    };

    const loadHistory = async () => {
      // Default to mock user if not logged in
      let userId = "mock-user-id";
      try {
        const userData = localStorage.getItem("mediscan_user_data");
        if (userData) {
          const user = JSON.parse(userData);
          if (user?.id) userId = user.id;
        }
      } catch (e) {
        console.warn("Could not parse user data for chat history", e);
      }

      // Try server-side history first for real users
      if (!userId.startsWith("mock-")) {
        try {
          const res = await fetch(`/api/chat?userId=${encodeURIComponent(userId)}&limit=50`);
          if (res.ok) {
            const data = await res.json();
            if (data.success && Array.isArray(data.chatHistory) && data.chatHistory.length > 0) {
              let idCounter = 2;
              const historyMessages: Message[] = [];

              data.chatHistory.forEach((entry: any) => {
                const createdAt = entry.created_at ? new Date(entry.created_at) : new Date();

                if (entry.message) {
                  historyMessages.push({
                    id: idCounter++,
                    text: entry.message,
                    sender: "user",
                    timestamp: createdAt,
                  });
                }

                if (entry.response) {
                  historyMessages.push({
                    id: idCounter++,
                    text: entry.response,
                    sender: "healix",
                    timestamp: createdAt,
                  });
                }
              });

              setMessages([greetingMessage, ...historyMessages]);

              // Cache locally
              try {
                const simple = historyMessages.map((m) => ({
                  text: m.text,
                  sender: m.sender,
                  timestamp: m.timestamp.getTime(),
                }));
                localStorage.setItem(getHistoryKey(userId), JSON.stringify(simple));
              } catch (err) {
                console.warn("Failed to cache chat history locally", err);
              }
              return;
            }
          }
        } catch (err) {
          console.warn("Failed to load chat history from server", err);
        }
      }

      // Fallback to local storage (also used for mock users)
      try {
        const stored = localStorage.getItem(getHistoryKey(userId));
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            let idCounter = 2;
            const historyMessages: Message[] = parsed.map((item: any) => ({
              id: idCounter++,
              text: item.text,
              sender: item.sender === "user" ? "user" : "healix",
              timestamp: new Date(item.timestamp || Date.now()),
            }));
            setMessages([greetingMessage, ...historyMessages]);
            return;
          }
        }
      } catch (err) {
        console.warn("Failed to load chat history from local storage", err);
      }

      // Default: only greeting
      setMessages([greetingMessage]);
    };

    loadHistory();
  }, []);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: messages.length + 1,
      text: inputMessage,
      sender: "user",
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentMessage = inputMessage;
    setInputMessage("");
    setIsLoading(true);

    try {
      let responseText = "";

      // Determine user id for history and backend
      let userId = "mock-user-id";
      try {
        const userData = localStorage.getItem("mediscan_user_data");
        if (userData) {
          const user = JSON.parse(userData);
          if (user?.id) userId = user.id;
        }
      } catch (e) {
        console.warn("Could not parse user data", e);
      }

      // Check if this is a drug-related query
      if (checkForDrugQuery(currentMessage)) {
        // Extract potential drug names from the message
        const drugMatches = currentMessage.match(/\b(ibuprofen|paracetamol|aspirin|acetaminophen|naproxen|diclofenac|amoxicillin|azithromycin|metformin|atorvastatin|simvastatin|omeprazole|lisinopril|amlodipine|hydrochlorothiazide|levothyroxine|sertraline|escitalopram|citalopram|fluoxetine|gabapentin|tramadol|oxycodone|morphine|warfarin|heparin|insulin|metoprolol|atenolol|propranolol|furosemide|spironolactone|prednisone|dexamethasone|albuterol|fluticasone|montelukast|loratadine|cetirizine|diphenhydramine|ranitidine|famotidine|omeprazole|esomeprazole|lansoprazole|pantoprazole)\b/gi);

        if (drugMatches) {
          const drugName = drugMatches[0];

          // Allergy warning based on user settings
          try {
            const userStr = localStorage.getItem("mediscan_user");
            let settingsAllergies: string[] = [];
            if (userStr) {
              try {
                const user = JSON.parse(userStr);
                const uid = user.id || user.userId || userStr;
                const settingsStr = localStorage.getItem(`settings_${uid}`);
                if (settingsStr) {
                  const settings = JSON.parse(settingsStr);
                  if (settings?.allergies) {
                    settingsAllergies = String(settings.allergies)
                      .split(",")
                      .map((s: string) => s.trim().toLowerCase())
                      .filter(Boolean);
                  }
                }
              } catch {
                // ignore
              }
            }
            const lowerDrug = drugName.toLowerCase();
            const allergyHit = settingsAllergies.find((a) => lowerDrug.includes(a));
            if (allergyHit) {
              responseText += `\n\n🚫 **Allergy Alert:** You have marked an allergy related to **${allergyHit}**. Please avoid using **${drugName}** and contact your doctor immediately.\n`;
            }
          } catch (e) {
            console.warn("Could not evaluate allergy warnings for chatbot", e);
          }
          const drugGroups = await searchDrugByName(drugName);

          if (drugGroups.length > 0) {
            const rxcui = drugGroups[0].conceptProperties?.[0]?.rxcui;
            const interactions = await getDrugInteractions(rxcui);

            responseText = `Based on NIH RxNav database information for **${drugName}**:\n\n`;

            if (interactions.length > 0) {
              responseText += `⚠️ **Drug Interactions Found:**\n`;
              interactions.slice(0, 3).forEach((interaction: any, index: number) => {
                const interactingDrug = interaction.interactionType?.[0]?.interactionPair?.[0]?.interactionConcept?.[1]?.sourceConceptItem?.name || 'Unknown drug';
                const severity = interaction.interactionType?.[0]?.interactionPair?.[0]?.severity || 'Unknown';
                responseText += `• Interacts with: **${interactingDrug}** (Severity: ${severity})\n`;
              });
              responseText += `\n`;
            }

            responseText += `📋 **Important Safety Information:**\n`;
            responseText += `• Always consult your healthcare provider before starting or stopping medications\n`;
            responseText += `• Report any side effects immediately\n`;
            responseText += `• Do not share prescriptions with others\n`;
            responseText += `• Store medications safely away from children\n\n`;
          }
        }
      }

      // If no drug-specific info found, use Healix API for general response
      let responseImage: { mimeType: string; data: string } | null = null;

      if (!responseText) {
        const allergies = getAllergiesString();
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: currentMessage,
            userId: userId,
            language: language,
            allergies,
          }),
        });

        const data = await response.json();

        if (response.ok) {
          responseText = data.response;
          responseImage = data.image || null;
        } else {
          throw new Error(data.error || 'Failed to get response');
        }
      }

      const healixMessage: Message = {
        id: messages.length + 2,
        text: responseText,
        sender: "healix",
        timestamp: new Date(),
        image: responseImage,
      };

      setMessages(prev => {
        const updated = [...prev, healixMessage];
        try {
          const simple = updated
            .filter(m => m.id !== 1) // don't persist greeting
            .map(m => ({
              text: m.text,
              sender: m.sender,
              timestamp: m.timestamp.getTime(),
            }));
          localStorage.setItem(getHistoryKey(userId), JSON.stringify(simple));
        } catch (err) {
          console.warn("Failed to store chat history locally", err);
        }
        return updated;
      });

      // Speak Healix response if enabled
      speakText(responseText);
    } catch (error) {
      const errorMessage: Message = {
        id: messages.length + 2,
        text: "Sorry, I'm having trouble connecting right now. Please try again later.",
        sender: 'healix',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    }

    setIsLoading(false);
  };

  const startListening = () => {
    if (isLoading) return;
    if (!isSpeechRecognitionSupported) {
      alert("Voice input is not supported in this browser. Try Microsoft Edge or Google Chrome.");
      return;
    }

    try {
      const SpeechRecognitionCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognitionCtor();
      recognition.lang = language;
      recognition.interimResults = true;
      recognition.continuous = false;

      recognition.onstart = () => setIsListening(true);
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
      recognition.onresult = (event: any) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setInputMessage(transcript.trim());
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.warn("Speech recognition failed to start", e);
      alert("Could not start voice input. Please try again.");
    }
  };

  const stopListening = () => {
    try {
      recognitionRef.current?.stop?.();
    } catch {
      // ignore
    }
    setIsListening(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearHistory = async () => {
    if (!confirm('Are you sure you want to clear all chat history? This cannot be undone.')) {
      return;
    }

    // Reset to just greeting
    const greetingMessage: Message = {
      id: 1,
      text: "Hi! I am Healix, your medical intelligence assistant. How can I help you today?",
      sender: "healix",
      timestamp: new Date(),
    };
    setMessages([greetingMessage]);

    // Clear local storage
    try {
      let userId = "mock-user-id";
      try {
        const userData = localStorage.getItem("mediscan_user_data");
        if (userData) {
          const user = JSON.parse(userData);
          if (user?.id) userId = user.id;
        }
      } catch (e) {
        // ignore
      }
      localStorage.removeItem(getHistoryKey(userId));
    } catch (err) {
      console.warn("Failed to clear local history", err);
    }

    // Clear server-side history if user is logged in
    try {
      let userId = "mock-user-id";
      try {
        const userData = localStorage.getItem("mediscan_user_data");
        if (userData) {
          const user = JSON.parse(userData);
          if (user?.id) userId = user.id;
        }
      } catch (e) {
        // ignore
      }

      if (!userId.startsWith("mock-")) {
        // Try to delete from server (if API endpoint exists)
        await fetch(`/api/chat?userId=${encodeURIComponent(userId)}`, {
          method: 'DELETE'
        }).catch(() => {
          // Ignore if endpoint doesn't exist
        });
      }
    } catch (err) {
      // Ignore errors
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
              <span className="text-2xl">🤖</span>
            </div>
            <div>
              <h2 className="text-2xl font-bold">Healix AI Assistant</h2>
              <p className="text-blue-100">Your intelligent medical companion</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={clearHistory}
              className="text-sm px-3 py-2 rounded-lg bg-white bg-opacity-20 hover:bg-opacity-30"
              title="Clear chat history"
            >
              🗑️ Clear
            </button>
            <button
              onClick={() => setVoiceEnabled((v) => !v)}
              className="text-sm px-3 py-2 rounded-lg bg-white bg-opacity-20 hover:bg-opacity-30"
              title="Toggle voice output"
            >
              {voiceEnabled ? "🔊 Voice" : "🔇 Voice"}
            </button>
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="h-96 overflow-y-auto p-6 space-y-4 bg-gray-50">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${
                message.sender === 'user'
                  ? 'bg-blue-500 text-white rounded-br-sm'
                  : 'bg-white text-gray-800 rounded-bl-sm shadow-sm border'
              }`}
            >
              {message.image?.data ? (
                <div className="space-y-2">
                  <p className="text-sm whitespace-pre-line">{message.text}</p>
                  <img
                    src={`data:${message.image.mimeType};base64,${message.image.data}`}
                    alt="Generated"
                    className="rounded-lg border max-w-full"
                  />
                </div>
              ) : (
                <p className="text-sm whitespace-pre-line">{message.text}</p>
              )}
              <p className={`text-xs mt-2 ${
                message.sender === 'user' ? 'text-blue-100' : 'text-gray-400'
              }`}>
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white text-gray-800 px-4 py-3 rounded-2xl rounded-bl-sm shadow-sm border">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-6 bg-white border-t">
        <div className="flex space-x-3 mb-2">
          <button
            type="button"
            onClick={isListening ? stopListening : startListening}
            disabled={isLoading}
            className={`px-4 py-3 rounded-full transition-colors duration-200 ${
              isListening ? "bg-red-500 hover:bg-red-600 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-700"
            }`}
            title={isListening ? "Stop listening" : "Start voice input"}
          >
            {isListening ? "⏹" : "🎤"}
          </button>

          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me about your health..."
            className="flex-1 px-4 py-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
          />
          <button
            onClick={handleSendMessage}
            disabled={isLoading || !inputMessage.trim()}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white px-6 py-3 rounded-full transition-colors duration-200 flex items-center space-x-2"
          >
            <span>Send</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2 text-center">
          ⚠️ This is not medical advice. Always consult healthcare professionals for serious concerns.
        </p>
        {!isSpeechRecognitionSupported && (
          <p className="text-xs text-amber-600 mt-2 text-center">
            Voice input isn’t supported in this browser. Try Microsoft Edge or Google Chrome.
          </p>
        )}
      </div>
    </div>
  );
}