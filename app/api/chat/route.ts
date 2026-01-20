import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);

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

${medicationContext}${allergiesContext}

Current user question: ${message}

Please provide a helpful, medically-informed response.`;

    // Generate AI response
    let aiResponse;
    try {
      // Check if API key is available
      if (!process.env.GOOGLE_AI_API_KEY) {
        throw new Error('GOOGLE_AI_API_KEY is not set');
      }
      
      // Try Gemini 3 Flash Preview model names (newer preview models use gemini-2.0-flash-exp)
      const modelNames = [
        'gemini-2.0-flash-exp',
        'gemini-2.0-flash-thinking-exp-1219',
        'gemini-1.5-flash',
        'gemini-1.5-pro',
        'gemini-pro'
      ];
      
      let lastError: any = null;
      let success = false;
      
      for (const modelName of modelNames) {
        try {
          const model = genAI.getGenerativeModel({ model: modelName });
          const result = await model.generateContent(systemPrompt);
          const response = await result.response;
          aiResponse = response.text();
          console.log(`Successfully used model: ${modelName}`);
          success = true;
          break;
        } catch (modelError: any) {
          console.warn(`Model ${modelName} failed:`, modelError?.message);
          lastError = modelError;
          continue;
        }
      }
      
      if (!success) {
        throw lastError || new Error('All model attempts failed');
      }
    } catch (aiError: any) {
      console.error('AI Generation failed:', aiError);
      console.error('Error details:', {
        message: aiError?.message,
        status: aiError?.status,
        statusText: aiError?.statusText,
        apiKeySet: !!process.env.GOOGLE_AI_API_KEY
      });
      aiResponse = `I apologize, but I'm currently unable to access my medical knowledge base. Error: ${aiError?.message || 'Unknown error'}. Please check your API key configuration and try again. For health concerns, it is always best to consult with a healthcare provider.`;
    }

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