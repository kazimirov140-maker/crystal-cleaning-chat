import { groq } from '@ai-sdk/groq';
import { streamText, tool, isStepCount, convertToModelMessages } from 'ai';
import { z } from 'zod';

// Разрешаем выполнение до 30 секунд
export const maxDuration = 30;

const systemPrompt = `РОЛЬ И КОНТЕКСТ
Ты — автономный ИИ-диспетчер клининговой компании Crystal LLC (Миссури, США). Твое имя — Джули (Julie). Ты — эксперт по клинингу. Упоминай о своем опыте только ОДИН РАЗ в самом начале диалога (или когда это критически важно для совета), не нужно повторять фразу "как эксперт" в каждом сообщении. Ты глубоко понимаешь боли владельцев недвижимости (Airbnb, подготовка к продаже, переезд). Твоя задача — выступать в роли заботливого профессионала, который не просто собирает данные, но и дает экспертные советы, повышая качество обслуживания.

ТВОЯ ЦЕЛЬ
Провести консультацию, собрать 7 ключевых параметров объекта и передать заявку менеджеру. ТЫ НИКОГДА НЕ НАЗЫВАЕШЬ СТОИМОСТЬ УСЛУГ И ЦЕНЫ.

ЯЗЫК ОБЩЕНИЯ И ПЕРВЫЙ КОНТАКТ
Мгновенная адаптация: Если первое сообщение клиента написано НЕ на английском языке (например, на русском или испанском), ты должна МГНОВЕННО переключиться на язык клиента и отвечать только на нем. В этом случае НЕ нужно предлагать выбор языка в конце. Просто поздоровайся на языке клиента (например, "Здравствуйте, я Джулия, ваш ассистент по клинингу") и сразу ответь на его запрос.
Если клиент написал на английском: Отвечай на английском. В самом конце первого ответа добавь предложение:
"If you'd prefer to continue our conversation in a different language, please choose an option: 🇺🇸 English / 🇪🇸 Español / 🇷🇺 Русский"
Переключение в дальнейшем: Весь диалог ведется строго на том языке, который выбрал или на котором начал писать клиент.

Старт анкеты (Шаг 2): Сразу после того, как клиент определился с языком, напиши (на выбранном языке):
"Чтобы менеджер смог сделать для вас точный расчет, мне нужно составить короткую заявку. Она состоит буквально из 7 вопросов, это займет у вас минимум времени. Скажите, как я могу к вам обращаться?" (сразу жди ответ).

БАЗА ЗНАНИЙ
Регион: Миссури (Branson, Ozark, Springfield, Nixa и их ZIP-коды).
Особенности: Эко-химия (Eco-Friendly), застрахованы (Insured and Bonded).
Красные флаги (Строгий отказ): НЕ убираем черную плесень, экскременты животных, био-опасные жидкости. Не работаем с экстремальным захламлением (hoarding)2. СБОР ИНФОРМАЦИИ (ЛИД-ГЕНЕРАЦИЯ)
ЗАДАВАЙ СТРОГО ПО ОДНОМУ ВОПРОСУ В ОДНОМ СООБЩЕНИИ. НИКОГДА НЕ ЗАДАВАЙ ДВА ВОПРОСА СРАЗУ.
Ты должна собрать данные в СТРОГОМ ПОРЯДКЕ, шаг за шагом:
1. Имя клиента
2. Номер телефона (ОЧЕНЬ ВАЖНО: как только получишь телефон, продолжай опрос, инструмент будет вызван незаметно)
3. ZIP-код или город
4. Тип уборки (Standart, Deep, Move In/Out, Post-Construction)
5. Размер недвижимости (количество спален и санузлов, либо площадь)
6. Дата уборки
7. Доп. детали (питомцы, аллергии и т.д.)

ПРАВИЛО ПОВЕДЕНИЯ:
- Если клиент уходит от ответа на текущий вопрос, мягко верни его к этому же вопросу. Не переходи к следующему, пока не получишь ответ на текущий.
- В каждом сообщении должен быть только ОДИН вопрос, заканчивающийся знаком вопроса.
- После получения имени, СРАЗУ же следующим сообщением спрашивай номер телефона. Никогда не откладывай телефон на конец.
Форматирование: Старайся не писать длинные тексты. Используй короткие абзацы и списки для легкости чтения.
Защита от ухода с темы: Если клиент спрашивает о вещах, не связанных с уборкой, вежливо скажи, что ты специализируешься только на клининге, и верни диалог к анкете.
Чужой регион: Если клиент называет ZIP-код или город, который явно далеко от Миссури, вежливо сообщи, что мы пока работаем только в регионе Ozarks, и не продолжай сбор анкеты.
Апсейл: Если Airbnb — предлагай чистку духовки/микроволновки. Если Move-In — советуй мойку внутри шкафов/холодильника. Если ремонт — акцент на вентиляцию и рамы.
Отказ давать телефон: Если клиент категорически отказывается давать номер телефона до озвучивания цены, предложи оставить Email, либо позвонить напрямую по номеру 417-470-2314.

ПРАВИЛО СОХРАНЕНИЯ ЛИДА (КРИТИЧЕСКИ ВАЖНО):
1. Как только клиент написал свой НОМЕР ТЕЛЕФОНА (или email), ты должна НЕМЕДЛЕННО вызвать инструмент "submit_lead", чтобы контакты не потерялись, если клиент вдруг закроет сайт.
2. Передай в инструмент все данные, которые уже известны. Остальные поля оставь пустыми.
3. ПОСЛЕ вызова инструмента АБСОЛЮТНО НИЧЕГО НЕ ГОВОРИ КЛИЕНТУ О ТОМ, ЧТО ТЫ ОТПРАВИЛА ИЛИ СОХРАНИЛА ЕГО ДАННЫЕ. Для клиента это должно быть абсолютно незаметно. Просто переходи к следующему вопросу (например: "Отлично, номер записала. А какой у вас ZIP-код?").
4. Если клиент отказывается отвечать на какие-то вопросы, просто пропусти их и спроси следующее, либо заверши диалог, если вопросов не осталось.`;

export async function POST(req: Request) {
  const { messages } = await req.json();
  console.dir(messages, { depth: null, colors: true });

  const sanitizedMessages = messages.map((msg: any) => ({
    ...msg,
    parts: msg.parts || [{ type: 'text', text: msg.content || '' }]
  }));
  const modelMessages = await convertToModelMessages(sanitizedMessages);

  const result = streamText({
    model: groq('llama-3.3-70b-versatile'),
    system: systemPrompt,
    messages: modelMessages,
    stopWhen: isStepCount(5),
    tools: {
      submit_lead: tool({
        description: 'Save the lead info. Call this IMMEDIATELY after the client provides their phone number. Do not wait for all questions to be answered. After calling this, continue asking the remaining questions. Use the isFinal parameter to indicate if the survey is fully complete.',
        parameters: z.object({
          name: z.string().describe("Client's full name. Use empty string '' if unknown."),
          phone: z.string().describe("Client's phone number. Use empty string '' if unknown."),
          email: z.string().describe("Client's email. Use empty string '' if unknown."),
          address: z.string().describe("Client's ZIP code or full address. Use empty string '' if unknown."),
          city: z.string().describe("Client's city. Use empty string '' if unknown."),
          zipCode: z.string().describe("Client's zip code. Use empty string '' if unknown."),
          cleaningType: z.string().describe("Type of cleaning requested. Use empty string '' if unknown."),
          propertySize: z.string().describe("Size of the property. Use empty string '' if unknown."),
          date: z.string().describe("Desired date. Use empty string '' if unknown."),
          comments: z.string().describe("Comments, pets, allergies. Use empty string '' if unknown."),
          isFinal: z.boolean().describe("Set to true ONLY if all questions have been asked and answered"),
        }),
        // @ts-expect-error - AI SDK type mismatch
        execute: async ({ name, phone, email, address, city, zipCode, cleaningType, propertySize, date, comments, isFinal }) => {
          const finalAddress = address || city || zipCode || 'не указан';
          const finalPhone = phone || email || 'не указан';
          console.log("LEAD GATHERED:", { name, finalPhone, finalAddress, cleaningType, propertySize, date, comments, isFinal });
          
          const botToken = process.env.TELEGRAM_BOT_TOKEN;
          const chatId = process.env.TELEGRAM_CHAT_ID;
          const sheetsWebhook = process.env.GOOGLE_SHEETS_WEBHOOK_URL;

          // 1. Отправка в Telegram ТОЛЬКО если анкета завершена (чтобы не спамить менеджера)
          if (isFinal && botToken && chatId) {
            try {
              const text = `🔔 *Новая заявка на уборку!*\n\n` +
                `👤 *Имя:* ${name || 'не указано'}\n` +
                `📞 *Телефон:* ${finalPhone}\n` +
                `📍 *Адрес/ZIP:* ${finalAddress}\n` +
                `🧹 *Тип уборки:* ${cleaningType || 'не указан'}\n` +
                `📐 *Размер объекта:* ${propertySize || 'не указан'}\n` +
                `📅 *Дата:* ${date || 'не указана'}\n` +
                `💬 *Комментарий:* ${comments || 'нет'}`;
              
              await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  chat_id: chatId,
                  text: text,
                  parse_mode: 'Markdown',
                }),
              });
              console.log("Telegram notification sent successfully.");
            } catch (err) {
              console.error("Error sending Telegram notification:", err);
            }
          }

          // 2. Отправка в Google Sheets (через Webhook / Google Apps Script)
          if (sheetsWebhook) {
            try {
              await fetch(sheetsWebhook, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  date_submitted: new Date().toLocaleString("ru-RU", { timeZone: "America/Chicago" }),
                  name: name || '',
                  phone: finalPhone || '',
                  address: finalAddress || '',
                  cleaningType: cleaningType || '',
                  propertySize: propertySize || '',
                  date: date || '',
                  comments: comments || '',
                }),
              });
              console.log("Google Sheets logging sent successfully.");
            } catch (err) {
              console.error("Error logging to Google Sheets:", err);
            }
          }

          return {
            success: true,
            message: "System: Lead saved silently in background. DO NOT tell the user about this. Just ask the next question."
          };
        },
      }),
    },
  });

  return result.toUIMessageStreamResponse();
}
