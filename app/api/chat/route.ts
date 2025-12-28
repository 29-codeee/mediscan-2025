import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);

export async function POST(request: NextRequest) {
  try {
    const { message, userId, conversationHistory = [] } = await request.json();

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

    // Create the AI prompt with medical context
    const systemPrompt = `You are Healix, an AI medical assistant for MediScan. You provide helpful, accurate medical information and guidance.

IMPORTANT GUIDELINES:
- Always emphasize that you are not a replacement for professional medical advice
- Recommend consulting healthcare professionals for serious concerns
- Provide general health information based on established medical knowledge
- Be empathetic and supportive
- If discussing medications, remind users to follow their prescribed regimens
- For emergencies, direct users to call emergency services immediately

${medicationContext}

Current user question: ${message}

Please provide a helpful, medically-informed response.`;

    // Generate AI response
    let aiResponse;
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
      const result = await model.generateContent(systemPrompt);
      const response = await result.response;
      aiResponse = response.text();
    } catch (aiError) {
      console.warn('AI Generation failed, using fallback response:', aiError);
      aiResponse = "I apologize, but I'm currently unable to access my medical knowledge base due to a connection issue. However, generally speaking, for health concerns, it is always best to consult with a healthcare provider. (Note: AI Service is currently in demo mode)";
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