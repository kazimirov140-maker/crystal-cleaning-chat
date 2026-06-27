import { google } from '@ai-sdk/google';
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
Красные флаги (Строгий отказ): НЕ убираем черную плесень, экскременты животных, био-опасные жидкости. Не работаем с экстремальным захламлением (hoarding). Не двигаем мебель тяжелее 15 кг.

АНКЕТА ДЛЯ СБОРА
1. Имя клиента
2. Номер телефона
3. ZIP-код или город
4. Тип уборки (Residential, Move-In/Out, Airbnb/STR, Post-Construction)
5. Размер объекта (площадь или кол-во комнат)
6. Желаемая дата
7. Детали / Доп. услуги (аллергии, животные, пожелания по химии)

ПРАВИЛА ПОВЕДЕНИЯ И ЛОГИКА ЭКСПЕРТА
Диалог: Задавай не более 1-2 вопросов за раз. Дожидайся ответа клиента.
Форматирование: Старайся не писать длинные тексты. Используй короткие абзацы и списки для легкости чтения.
Защита от ухода с темы: Если клиент спрашивает о вещах, не связанных с уборкой, вежливо скажи, что ты специализируешься только на клининге, и верни диалог к анкете.
Чужой регион: Если клиент называет ZIP-код или город, который явно далеко от Миссури, вежливо сообщи, что мы пока работаем только в регионе Ozarks, и не продолжай сбор анкеты.
Апсейл: Если Airbnb — предлагай чистку духовки/микроволновки. Если Move-In — советуй мойку внутри шкафов/холодильника. Если ремонт — акцент на вентиляцию и рамы.
Отказ давать телефон: Если клиент категорически отказывается давать номер телефона до озвучивания цены, предложи оставить Email, либо позвонить напрямую по номеру 417-470-2314.
Вопросы о цене: Если клиент спрашивает цену, отвечай: "Понимаю ваше желание узнать цену заранее, но каждый объект уникален. Точную стоимость сможет рассчитать наш менеджер после уточнения всех деталей. Смогу ли я передать ему ваши контакты, чтобы он с вами связался?"

ЗАВЕРШЕНИЕ
Как только все 7 пунктов собраны, вызови инструмент (tool) "submit_lead", чтобы передать данные менеджеру, и вежливо попрощайся, сообщив, что менеджер скоро свяжется с клиентом.`;

export async function POST(req: Request) {
  const { messages } = await req.json();
  console.dir(messages, { depth: null, colors: true });

  const sanitizedMessages = messages.map((msg: any) => ({
    ...msg,
    parts: msg.parts || [{ type: 'text', text: msg.content || '' }]
  }));
  const modelMessages = await convertToModelMessages(sanitizedMessages);

  const result = streamText({
    model: google('gemini-2.0-flash-lite'),
    system: systemPrompt,
    messages: modelMessages,
    stopWhen: isStepCount(5),
    tools: {
      submit_lead: tool({
        description: 'Submit the gathered lead information to the manager. Call this ONLY when all mandatory information is collected.',
        parameters: z.object({
          name: z.string().describe("Client's full name"),
          phone: z.string().describe("Client's phone number"),
          address: z.string().describe("Client's ZIP code or full address"),
          cleaningType: z.string().describe("Type of cleaning requested"),
          propertySize: z.string().describe("Size of the property (beds/baths or sq ft)"),
          date: z.string().describe("Desired date for the cleaning"),
          comments: z.string().optional().describe("Any additional comments, pets, or allergies"),
        }),
        // @ts-expect-error - AI SDK type mismatch
        execute: async ({ name, phone, address, cleaningType, propertySize, date, comments }) => {
          console.log("LEAD GATHERED:", { name, phone, address, cleaningType, propertySize, date, comments });
          
          const botToken = process.env.TELEGRAM_BOT_TOKEN;
          const chatId = process.env.TELEGRAM_CHAT_ID;
          const sheetsWebhook = process.env.GOOGLE_SHEETS_WEBHOOK_URL;

          // 1. Отправка в Telegram
          if (botToken && chatId) {
            try {
              const text = `🔔 *Новая заявка на уборку!*\n\n` +
                `👤 *Имя:* ${name}\n` +
                `📞 *Телефон:* ${phone}\n` +
                `📍 *Адрес/ZIP:* ${address}\n` +
                `🧹 *Тип уборки:* ${cleaningType}\n` +
                `📐 *Размер объекта:* ${propertySize}\n` +
                `📅 *Дата:* ${date}\n` +
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
                  name,
                  phone,
                  address,
                  cleaningType,
                  propertySize,
                  date,
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
            message: "Информация успешно передана менеджеру! Мы свяжемся с вами для подтверждения заявки."
          };
        },
      }),
    },
  });

  return result.toUIMessageStreamResponse();
}
