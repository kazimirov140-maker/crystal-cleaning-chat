import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const { name, phone, email, address, city, zipCode, cleaningType, propertySize, date, comments, isFinal } = data;

    const finalAddress = address || city || zipCode || 'не указан';
    const finalPhone = phone || email || 'не указан';
    
    console.log("LEAD GATHERED (CUSTOM API):", { name, finalPhone, finalAddress, cleaningType, propertySize, date, comments, isFinal });

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    const sheetsWebhook = process.env.GOOGLE_SHEETS_WEBHOOK_URL;

    // 1. Отправка в Telegram ТОЛЬКО если анкета завершена
    if (isFinal && botToken && chatId) {
      try {
        const text = `🔔 *Новая заявка на уборку!*\n\n` +
          `👤 *Имя:* ${name || 'не указано'}\n` +
          `📞 *Телефон:* ${finalPhone}\n` +
          `📍 *Адрес/ZIP:* ${finalAddress}\n` +
          `🧹 *Тип уборки:* ${cleaningType || 'не указан'}\n` +
          `🏠 *Размер:* ${propertySize || 'не указан'}\n` +
          `📅 *Дата:* ${date || 'не указана'}\n` +
          `💬 *Детали:* ${comments || 'нет'}`;

        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' })
        });
      } catch (err) {
        console.error("Error sending to Telegram:", err);
      }
    }

    // 2. Отправка в Google Sheets (фоново)
    if (sheetsWebhook) {
      try {
        await fetch(sheetsWebhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date_submitted: new Date().toISOString(),
            name: name || '',
            phone: finalPhone || '',
            address: finalAddress || '',
            cleaningType: cleaningType || '',
            propertySize: propertySize || '',
            date: date || '',
            comments: comments || ''
          })
        });
      } catch (err) {
        console.error("Error logging to Google Sheets:", err);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in save-lead:", error);
    return NextResponse.json({ success: false, error: 'Failed to save lead' }, { status: 500 });
  }
}
