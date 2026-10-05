/**
 * OpenQRIS Telegram Notification Service
 * Mengirimkan notifikasi pembayaran real-time langsung ke Telegram Merchant
 */

import { Charge, TenantApp } from './store';

export interface TelegramSendOptions {
  botToken: string;
  chatId: string;
  message: string;
}

export async function sendTelegramMessage(opts: TelegramSendOptions): Promise<{ success: boolean; error?: string }> {
  try {
    const { botToken, chatId, message } = opts;
    if (!botToken || !chatId) {
      return { success: false, error: 'Telegram Bot Token atau Chat ID belum dikonfigurasi' };
    }

    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });

    const json: any = await response.json();
    if (!response.ok || !json.ok) {
      return {
        success: false,
        error: json.description || `HTTP ${response.status}: Gagal mengirim pesan Telegram`,
      };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Koneksi ke Telegram Bot API gagal' };
  }
}

/**
 * Format & kirim notifikasi pembayaran masuk ke Telegram Merchant
 */
export async function sendPaymentAlert(
  tenant: any,
  charge: any,
  meta?: { bank?: string; sender?: string }
): Promise<boolean> {
  if (!tenant.telegramBotToken || !tenant.telegramChatId) {
    return false; // Merchant belum mengaktifkan notif telegram
  }

  const formattedAmount = `Rp ${Math.round(charge.totalAmount).toLocaleString('id-ID')}`;
  const now = new Date();
  const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateStr = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

  const bankSource = meta?.bank ? ` (${meta.bank})` : '';

  const message = [
    `<b>🎉 PEMBAYARAN QRIS DITERIMA!</b>`,
    `━━━━━━━━━━━━━━━━━━━━`,
    `🏪 <b>Toko:</b> ${tenant.name}`,
    `💰 <b>Nominal:</b> <code>${formattedAmount}</code>`,
    `📋 <b>Order ID:</b> <code>${charge.orderId}</code>`,
    `💳 <b>Sumber:</b> ${meta?.sender || 'QRIS Dinamis'}${bankSource}`,
    `📅 <b>Waktu:</b> ${dateStr}, ${timeStr} WIB`,
    `🆔 <b>ID Transaksi:</b> <code>${charge.id}</code>`,
    `━━━━━━━━━━━━━━━━━━━━`,
    `<i>OpenQRIS Payment Gateway Automation</i>`,
  ].join('\n');

  const res = await sendTelegramMessage({
    botToken: tenant.telegramBotToken,
    chatId: tenant.telegramChatId,
    message,
  });

  if (res.success) {
    console.log(`[Telegram] ✅ Notifikasi pembayaran berhasil dikirim ke Merchant ${tenant.name} (${tenant.telegramChatId})`);
  } else {
    console.warn(`[Telegram] ⚠️ Gagal mengirim notif ke ${tenant.name}: ${res.error}`);
  }

  return res.success;
}
