import { groq } from '@ai-sdk/groq';
import { generateObject } from 'ai';
import { z } from 'zod';

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    // Extract data from the conversation history using Groq
    const { object } = await generateObject({
      model: groq('llama-3.3-70b-versatile'),
      schema: z.object({
        name: z.string().default(""),
        phone: z.string().default(""),
        email: z.string().default(""),
        address: z.string().default(""),
        cleaningType: z.string().default(""),
        propertySize: z.string().default(""),
        date: z.string().default(""),
        comments: z.string().default(""),
        isFinal: z.boolean().default(false)
      }),
      prompt: `Проанализируй историю чата клининговой компании с клиентом и извлеки все данные, которые уже известны. Если чего-то нет, оставь пустую строку.\n\nИстория чата:\n${JSON.stringify(messages.map((m:any) => m.role + ": " + m.content).join("\n"))}`
    });

    if (!object.phone) {
      return new Response(JSON.stringify({ success: false, reason: "No phone number found yet" }));
    }

    // Call the Google Sheets webhook
    const GOOGLE_SHEETS_WEBHOOK_URL = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
    if (GOOGLE_SHEETS_WEBHOOK_URL) {
      await fetch(GOOGLE_SHEETS_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date_submitted: new Date().toISOString(),
          ...object
        }),
      });
    }

    return new Response(JSON.stringify({ success: true, lead: object }));
  } catch (error) {
    console.error("Extract Lead Error:", error);
    return new Response(JSON.stringify({ error: "Failed to extract lead" }), { status: 500 });
  }
}
