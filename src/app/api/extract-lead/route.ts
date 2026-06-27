import { groq } from '@ai-sdk/groq';
import { generateText } from 'ai';

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    // Extract data from the conversation history using Groq
    const { text } = await generateText({
      model: groq('llama-3.3-70b-versatile'),
      system: `Ты - анализатор данных. Твоя задача - извлечь информацию о клиенте из истории чата и вернуть СТРОГО в формате JSON.
Формат JSON:
{
  "name": "Имя или пустая строка",
  "phone": "Телефон или пустая строка",
  "email": "Email или пустая строка",
  "address": "Адрес или пустая строка",
  "cleaningType": "Тип уборки или пустая строка",
  "propertySize": "Размер или пустая строка",
  "date": "Дата или пустая строка",
  "comments": "Детали или пустая строка",
  "isFinal": true (если опрос завершен) или false
}
НИКАКОГО дополнительного текста до или после JSON.`,
      prompt: `История чата:\n${JSON.stringify(messages.map((m:any) => m.role + ": " + m.content).join("\n"))}`
    });

    let object;
    try {
      const match = text.match(/\{[\s\S]*\}/);
      object = JSON.parse(match ? match[0] : text);
    } catch (e) {
      console.error("Failed to parse JSON", text);
      return new Response(JSON.stringify({ error: "Failed to parse JSON" }), { status: 500 });
    }

    if (!object.phone) {
      return new Response(JSON.stringify({ success: false, reason: "No phone number found yet" }));
    }

    // Call the Google Sheets webhook
    const GOOGLE_SHEETS_WEBHOOK_URL = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
    if (!GOOGLE_SHEETS_WEBHOOK_URL) {
      console.error("CRITICAL ERROR: GOOGLE_SHEETS_WEBHOOK_URL is missing from environment variables!");
      return new Response(JSON.stringify({ error: "Configuration missing" }), { status: 500 });
    }

    await fetch(GOOGLE_SHEETS_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date_submitted: new Date().toISOString(),
        ...object
      }),
    });

    return new Response(JSON.stringify({ success: true, lead: object }));
  } catch (error) {
    console.error("Extract Lead Error:", error);
    return new Response(JSON.stringify({ error: "Failed to extract lead" }), { status: 500 });
  }
}
