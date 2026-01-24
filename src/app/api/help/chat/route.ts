import { NextResponse } from 'next/server';
import { resolveUserContext } from '@/lib/help/context-resolver';
import { K9_KNOWLEDGE_BASE } from '@/lib/help/k9-knowledge-base';

/**
 * AI Help Bot Endpoint (K9 Assistant)
 * This handles the chat logic using RAG (Retrieval-Augmented Generation).
 */
export async function POST(req: Request) {
    try {
        const { message, chatHistory } = await req.json();

        // 1. Resolve Account Context
        const context = await resolveUserContext();

        // 2. Daily Quota Check
        // Set to 30 per user per day. 
        const DAILY_LIMIT = 30;
        const userUsage = 0; // Placeholder for actual usage tracking (e.g. Supabase usage table)

        if (userUsage >= DAILY_LIMIT) {
            return NextResponse.json({
                response: "You've reached your daily limit of 30 messages. This helps us keep the service fast and affordable for everyone! Try again tomorrow or use the support ticket.",
                role: 'assistant'
            });
        }

        // 3. Logic for "Real AI" vs "Smart Mock"
        const apiKey = process.env.OPENAI_API_KEY;
        let response = "";

        if (apiKey && apiKey !== 'your_openai_api_key_here') {
            // REAL OPENAI INTEGRATION
            try {
                const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: JSON.stringify({
                        model: 'gpt-4o-mini',
                        messages: [
                            {
                                role: 'system', content: `
You are the K9desk Support Assistant. Your ONLY goal is to help users navigate and use the K9desk CRM app.

${K9_KNOWLEDGE_BASE}

USER CONTEXT: 
- Biz: ${context?.businessName || 'K9 Grooming Business'}
- Leads: ${context?.leadsCount || 0}
- Recent Jobs: ${context?.recentJobs.map(j => j.pet_names).filter(Boolean).join(', ') || 'None'}

STRICT INSTRUCTIONS:
1. USE THE KNOWLEDGE BASE above to answer questions. It contains the exact steps for every feature.
2. If the user asks "How do I...", look for the "How to use" section in the Knowledge Base.
3. If a user asks for general business advice, polite decline: "I am your app support assistant. For business coaching, look out for our upcoming 'AI Business Partner' feature!"
4. Keep responses short, friendly, and step-by-step.
` },
                            ...chatHistory.slice(-5).map((m: any) => ({ role: m.role, content: m.content })),
                            { role: 'user', content: message }
                        ],
                        max_tokens: 300,
                        temperature: 0.7
                    })
                });

                if (!aiRes.ok) {
                    const errorText = await aiRes.text();
                    console.error('[OpenAI API Error]', errorText);
                    throw new Error(`OpenAI error: ${aiRes.status}`);
                }

                const aiData = await aiRes.json();
                response = aiData.choices?.[0]?.message?.content || "I'm having trouble processing that right now.";
            } catch (err) {
                console.error('[AI Bot Output Error]', err);
                response = "I'm having a momentary connection issue. Please try again or use the support ticket if it persists.";
            }
        } else {
            // SMART MOCK LOGIC (Fallback if key is missing)
            const cleanMsg = (message || "").toString().toLowerCase().trim();
            if (cleanMsg.includes('leads')) {
                response = `You currently have ${context?.leadsCount || 0} active leads waiting for you in the Leads tab. Would you like me to explain how to manage them?`;
            } else if (cleanMsg.includes('hello') || cleanMsg.includes('hi') || cleanMsg.includes('hey')) {
                response = `Hello! I'm your K9 Assistant for ${context?.businessName || 'your business'}. How can I help you with your grooming schedule today?`;
            } else {
                response = "I'm the K9 Assistant, here to help you navigate K9desk! You can ask me about your schedule, leads, or customers.";
            }
        }

        console.log(`[AI Bot] ${new Date().toISOString()} | Msg: "${message.substring(0, 20)}" | Resp: "${response.substring(0, 30)}..."`);

        return NextResponse.json({
            response: response.trim(),
            role: 'assistant'
        });

    } catch (error) {
        console.error('AI Bot Server Error:', error);
        return NextResponse.json({ error: 'Internal assistant error' }, { status: 500 });
    }
}
