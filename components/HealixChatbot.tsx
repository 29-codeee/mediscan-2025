"use client";

import { useState, useEffect } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GOOGLE_AI_API_KEY!);

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'healix';
  timestamp: Date;
}

export default function HealixChatbot() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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

  // Initialize with greeting message
  useEffect(() => {
    const greetingMessage: Message = {
      id: 1,
      text: "Hi! I am Healix, your medical intelligence assistant. How can I help you today?",
      sender: 'healix',
      timestamp: new Date()
    };
    setMessages([greetingMessage]);
  }, []);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: messages.length + 1,
      text: inputMessage,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentMessage = inputMessage;
    setInputMessage("");
    setIsLoading(true);

    try {
      let responseText = "";

      // Check if this is a drug-related query
      if (checkForDrugQuery(currentMessage)) {
        // Extract potential drug names from the message
        const drugMatches = currentMessage.match(/\b(ibuprofen|paracetamol|aspirin|acetaminophen|naproxen|diclofenac|amoxicillin|azithromycin|metformin|atorvastatin|simvastatin|omeprazole|lisinopril|amlodipine|hydrochlorothiazide|levothyroxine|sertraline|escitalopram|citalopram|fluoxetine|gabapentin|tramadol|oxycodone|morphine|warfarin|heparin|insulin|metoprolol|atenolol|propranolol|furosemide|spironolactone|prednisone|dexamethasone|albuterol|fluticasone|montelukast|loratadine|cetirizine|diphenhydramine|ranitidine|famotidine|omeprazole|esomeprazole|lansoprazole|pantoprazole)\b/gi);

        if (drugMatches) {
          const drugName = drugMatches[0];
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
      if (!responseText) {
        // Get user ID from local storage
        let userId = 'mock-user-id';
        try {
          const userData = localStorage.getItem('mediscan_user_data');
          if (userData) {
            const user = JSON.parse(userData);
            userId = user.id;
          }
        } catch (e) {
          console.warn('Could not parse user data', e);
        }

        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: currentMessage,
            userId: userId,
          }),
        });

        const data = await response.json();

        if (response.ok) {
          responseText = data.response;
        } else {
          throw new Error(data.error || 'Failed to get response');
        }
      }

      const healixMessage: Message = {
        id: messages.length + 2,
        text: responseText,
        sender: 'healix',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, healixMessage]);
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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white p-6">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
            <span className="text-2xl">🤖</span>
          </div>
          <div>
            <h2 className="text-2xl font-bold">Healix AI Assistant</h2>
            <p className="text-blue-100">Your intelligent medical companion</p>
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
              <p className="text-sm whitespace-pre-line">{message.text}</p>
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
        <div className="flex space-x-3">
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
      </div>
    </div>
  );
}