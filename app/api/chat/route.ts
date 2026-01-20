import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);

function stripMarkdown(text: string): string {
  if (!text) return text;
  return text
    .replace(/^#{1,6}\s+/gm, '') // headings
    .replace(/\*\*(.*?)\*\*/g, '$1') // bold
    .replace(/\*(.*?)\*/g, '$1') // italics
    .replace(/`([^`]+)`/g, '$1') // inline code
    .replace(/^\s*[-*]\s+/gm, '• ') // bullets
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function isImageRequest(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes('generate image') ||
    m.includes('generate a image') ||
    m.includes('generate picture') ||
    m.includes('generate a picture') ||
    m.includes('create image') ||
    m.includes('create a image') ||
    m.includes('create picture') ||
    m.includes('create a picture') ||
    m.includes('draw ') ||
    m.includes('make an image') ||
    m.includes('show me an image') ||
    m.includes('send an image') ||
    m.includes('picture of') ||
    m.includes('photo of')
  );
}

async function generateImageWithGemini(apiKey: string, prompt: string): Promise<{ mimeType: string; data: string } | null> {
  // Uses Gemini image-capable model (per your account model list)
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text:
                `Generate ONE image based on this request. ` +
                `Do not include markdown. If you cannot generate an image, explain briefly.\n\n` +
                `User request: ${prompt}`,
            },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`Image API failed: ${res.status} ${t}`);
  }

  const data: any = await res.json();
  const parts = data?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return null;

  for (const p of parts) {
    const inline = p?.inlineData;
    if (inline?.data && inline?.mimeType) {
      return { mimeType: inline.mimeType, data: inline.data };
    }
  }
  return null;
}

// Smart fallback response generator for demo purposes
function generateMockResponse(message: string, language: string, allergies: string, medicationContext: string): string {
  const lowerMessage = message.toLowerCase();
  
  // Common medical queries with intelligent responses
  if (lowerMessage.includes('fever') || lowerMessage.includes('temperature')) {
    return `I understand you're asking about fever. Here's some general guidance:

**For Fever:**
- Rest and stay hydrated with water or electrolyte drinks
- You can take acetaminophen (paracetamol) or ibuprofen if you're not allergic
- Monitor your temperature regularly
- If fever persists for more than 3 days, is above 103°F (39.4°C), or you have severe symptoms, please consult a healthcare provider immediately

⚠️ **Important:** This is general information only. Always consult a healthcare professional for proper diagnosis and treatment.

${allergies ? `\n**Note:** You have listed allergies: ${allergies}. Please ensure any medication you consider is safe for you.` : ''}`;
  }
  
  if (lowerMessage.includes('headache') || lowerMessage.includes('head ache')) {
    return `I understand you're experiencing a headache. Here's some general guidance:

**For Headaches:**
- Rest in a quiet, dark room
- Stay hydrated
- You can try over-the-counter pain relievers like acetaminophen or ibuprofen (if not allergic)
- Apply a cold or warm compress to your forehead
- If headaches are severe, frequent, or accompanied by other symptoms, consult a healthcare provider

⚠️ **Important:** This is general information only. Always consult a healthcare professional for proper diagnosis and treatment.

${allergies ? `\n**Note:** You have listed allergies: ${allergies}. Please ensure any medication you consider is safe for you.` : ''}`;
  }
  
  if (lowerMessage.includes('cough') || lowerMessage.includes('cold')) {
    return `I understand you're asking about cough or cold symptoms. Here's some general guidance:

**For Cough/Cold:**
- Rest and stay hydrated
- Use a humidifier or steam inhalation
- Gargle with warm salt water
- Honey (for adults) can help soothe cough
- Over-the-counter cough suppressants may help (check with pharmacist if you have allergies)
- If symptoms persist for more than 10 days or worsen, consult a healthcare provider

⚠️ **Important:** This is general information only. Always consult a healthcare professional for proper diagnosis and treatment.

${allergies ? `\n**Note:** You have listed allergies: ${allergies}. Please ensure any medication you consider is safe for you.` : ''}`;
  }
  
  if (lowerMessage.includes('pain') || lowerMessage.includes('ache')) {
    return `I understand you're experiencing pain. Here's some general guidance:

**For Pain Management:**
- Rest the affected area
- Apply ice (for acute injuries) or heat (for muscle stiffness)
- Over-the-counter pain relievers like acetaminophen or ibuprofen may help (if not allergic)
- Gentle stretching or massage may provide relief
- If pain is severe, persistent, or worsening, please consult a healthcare provider

⚠️ **Important:** This is general information only. Always consult a healthcare professional for proper diagnosis and treatment.

${allergies ? `\n**Note:** You have listed allergies: ${allergies}. Please ensure any medication you consider is safe for you.` : ''}`;
  }
  
  if (lowerMessage.includes('medication') || lowerMessage.includes('medicine') || lowerMessage.includes('pill')) {
    return `I can help with medication-related questions. Here's some general guidance:

**Medication Safety:**
- Always take medications as prescribed by your healthcare provider
- Never share medications with others
- Store medications safely away from children
- Check expiration dates regularly
- If you miss a dose, follow your prescription instructions or consult your pharmacist

${medicationContext ? `\n**Your Current Medications:**\n${medicationContext}\n` : ''}

${allergies ? `\n**⚠️ Important:** You have listed allergies: ${allergies}. Always inform your doctor and pharmacist about your allergies before taking any new medication.` : ''}

⚠️ **Remember:** This is general information only. Always consult a healthcare professional or pharmacist for medication-specific advice.`;
  }
  
  // Default intelligent response
  return `Hello! I'm Healix, your medical assistant. I understand you're asking: "${message}"

**General Health Guidance:**
- For specific symptoms, it's best to consult with a healthcare professional
- For emergencies, call emergency services immediately (911 or your local emergency number)
- Keep track of your medications and follow prescribed regimens
- Maintain a healthy lifestyle with proper diet, exercise, and sleep

${allergies ? `\n**Note:** You have listed allergies: ${allergies}. Always inform healthcare providers about your allergies.` : ''}

${medicationContext ? `\n**Your Current Medications:**\n${medicationContext}\n` : ''}

⚠️ **Important:** I'm here to provide general health information, but I cannot replace professional medical advice. For specific concerns, please consult with a qualified healthcare provider.

Is there anything specific about your health or medications you'd like to discuss?`;
}

export async function POST(request: NextRequest) {
  try {
    const { message, userId, language = 'en-IN', allergies = '', conversationHistory = [] } = await request.json();

    if (!message || !userId) {
      return NextResponse.json({ error: 'Message and user ID are required' }, { status: 400 });
    }

    // Verify user exists
    let user = null;
    if (userId.startsWith('mock-')) {
      user = { id: userId };
    } else {
      const { data: dbUser, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('id', userId)
        .single();
      
      if (!userError && dbUser) {
        user = dbUser;
      }
    }

    if (!user) {
      // Fallback for development/demo if DB is down but we want to test AI
      console.warn('User verification failed, proceeding with mock user for demo purposes');
      user = { id: 'fallback-user' };
    }

    // Get user's recent medications for context
   let medications: any[] = [];
    if (!userId.startsWith('mock-') && userId !== 'fallback-user') {
      const { data: dbMedications } = await supabase
        .from('medications')
        .select('name, dosage, frequency, instructions')
        .eq('user_id', userId)
        .eq('is_active', true)
        .limit(10);
      medications = dbMedications || [];
    }

    // Prepare context for AI
    const medicationContext = medications && medications.length > 0
      ? `\n\nUser's current medications:\n${medications.map(med =>
          `- ${med.name}: ${med.dosage || 'N/A'}, ${med.frequency || 'N/A'}${med.instructions ? ` (${med.instructions})` : ''}`
        ).join('\n')}`
      : '';

    const allergiesContext =
      allergies && String(allergies).trim().length > 0
        ? `\n\nUser-reported allergies:\n${String(allergies)}\n`
        : '';

    // Create the AI prompt with medical + allergy context
    const systemPrompt = `You are Healix, an AI medical assistant for MediScan. You provide helpful, accurate medical information and guidance.

IMPORTANT GUIDELINES:
- Always emphasize that you are not a replacement for professional medical advice
- Recommend consulting healthcare professionals for serious concerns
- Provide general health information based on established medical knowledge
- Be empathetic and supportive
- If discussing medications, remind users to follow their prescribed regimens
- For emergencies, direct users to call emergency services immediately

ALLERGY & SAFETY RULES:
- Never recommend or prescribe a specific medication as a replacement for a doctor.
- If a medication conflicts with the user's allergies or looks unsafe, clearly say it may be unsafe and advise them to contact a doctor or pharmacist for an alternative.
- You may mention general classes of medicines or over-the-counter options only in very high-level, generic terms and always add a strong disclaimer.

LANGUAGE REQUIREMENT:
- Respond in the user's selected language: ${language}
- If the user used a mix of languages, respond primarily in ${language} but keep medical drug names in English where appropriate.

FORMAT REQUIREMENT:
- Respond in plain text only.
- Do NOT use markdown formatting (no **bold**, no # headings, no code blocks).

${medicationContext}${allergiesContext}

Current user question: ${message}

Please provide a helpful, medically-informed response.`;

    // Generate AI response using Gemini SDK
    let aiResponse: string | undefined;
    let image: { mimeType: string; data: string } | null = null;
    try {
      // Check if API key is available
      if (!process.env.GOOGLE_AI_API_KEY) {
        throw new Error('GOOGLE_AI_API_KEY is not set in environment variables');
      }

      const apiKey = process.env.GOOGLE_AI_API_KEY;

      // If the user explicitly asks for an image, try image model first.
      if (isImageRequest(message)) {
        try {
          image = await generateImageWithGemini(apiKey, message);
          if (image) {
            aiResponse = "Here’s the image you requested.";
          }
        } catch (e) {
          // If image generation fails, continue with text response
          console.warn("Image generation failed, falling back to text:", e);
        }
      }

      // If we already generated an image, we can optionally skip text generation.
      if (!aiResponse) {
      // Initialize Gemini AI with API key
      const genAIInstance = new GoogleGenerativeAI(apiKey);
      
      // Try models in order - Use actual available models from API
      const modelNames = [
        'gemini-3-flash-preview',  // Gemini 3 Flash Preview (user's model!)
        'gemini-2.5-flash',        // Stable and fast
        'gemini-2.5-pro',          // More capable
        'gemini-2.0-flash',         // Alternative option
        'gemini-flash-latest'       // Latest stable
      ];
      
      let lastError: any = null;
      let success = false;
      
      for (const modelName of modelNames) {
        try {
          console.log(`Attempting to use model: ${modelName}`);
          
          // Get the model
          const model = genAIInstance.getGenerativeModel({ 
            model: modelName,
            generationConfig: {
              temperature: 0.7,
              topP: 0.8,
              topK: 40,
            }
          });
          
          // Generate content
          const result = await model.generateContent(systemPrompt);
          const response = await result.response;
          aiResponse = response.text();
          
          if (aiResponse && aiResponse.trim().length > 0) {
            console.log(`✅ Successfully used model: ${modelName}`);
            success = true;
            break;
          } else {
            throw new Error('Empty response from model');
          }
        } catch (modelError: any) {
          const errorMsg = modelError?.message || String(modelError);
          console.warn(`❌ Model ${modelName} failed:`, errorMsg);
          
          // If model is overloaded (503), wait a bit and try next model
          if (errorMsg.includes('503') || errorMsg.includes('overloaded')) {
            console.log(`Model ${modelName} is overloaded, trying next model...`);
          }
          
          lastError = modelError;
          // Continue to next model
          continue;
        }
      }
      
      if (!success) {
        // If SDK fails, try direct REST API as last resort
        console.log('SDK failed, trying direct REST API...');
        
        // Try REST API with available models
        try {
          const restUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-3-flash-preview:generateContent?key=${apiKey}`;
          const restResponse = await fetch(restUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: systemPrompt }] }],
              generationConfig: {
                temperature: 0.7,
                topP: 0.8,
                topK: 40,
              }
            })
          });
          
          if (restResponse.ok) {
            const restData = await restResponse.json();
            aiResponse = restData.candidates?.[0]?.content?.parts?.[0]?.text;
            if (aiResponse && aiResponse.trim().length > 0) {
              console.log('✅ REST API succeeded');
              success = true;
            }
          }
        } catch (restError) {
          console.warn('REST API also failed:', restError);
        }
        
        if (!success) {
          throw lastError || new Error('All API attempts failed');
        }
      }
      }
    } catch (aiError: any) {
      console.error('❌ AI Generation completely failed:', aiError);
      console.error('Error details:', {
        message: aiError?.message,
        stack: aiError?.stack,
        apiKeySet: !!process.env.GOOGLE_AI_API_KEY,
        apiKeyLength: process.env.GOOGLE_AI_API_KEY?.length
      });
      
      // Only use fallback if absolutely necessary
      aiResponse = generateMockResponse(message, language, allergies, medicationContext);
    }

    aiResponse = stripMarkdown(aiResponse || '');

    // Store the conversation in database
    if (!userId.startsWith('mock-') && userId !== 'fallback-user') {
      const { error: insertError } = await supabase
        .from('chat_history')
        .insert([
          {
            user_id: userId,
            message: message,
            response: aiResponse,
            message_type: 'user'
          }
        ]);

      if (insertError) {
        console.error('Error storing chat history:', insertError);
        // Don't fail the request if storing fails
      }
    }

    return NextResponse.json({
      success: true,
      response: aiResponse,
      image,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error processing chat:', error);
    return NextResponse.json({ error: 'Failed to process chat message' }, { status: 500 });
  }
}

// GET - Fetch chat history
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const { data: chatHistory, error } = await supabase
      .from('chat_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching chat history:', error);
      return NextResponse.json({ error: 'Failed to fetch chat history' }, { status: 500 });
    }

    // Reverse to get chronological order
    const chronologicalHistory = chatHistory.reverse();

    return NextResponse.json({
      success: true,
      chatHistory: chronologicalHistory
    });

  } catch (error) {
    console.error('Error fetching chat history:', error);
    return NextResponse.json({ error: 'Failed to fetch chat history' }, { status: 500 });
  }
}