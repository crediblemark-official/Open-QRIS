/**
 * OpenQRIS Webhook Dispatcher
 * Mengirimkan callback ke aplikasi SaaS eksternal dengan signature HMAC-SHA256,
 * dilengkapi otomatisasi retry berjenjang (exponential backoff) jika target down.
 */

import { createHmac } from 'crypto';
import { store, type Charge, type TenantApp, type WebhookLog } from './store';

export function signPayload(payloadString: string, secretKey: string): string {
  return createHmac('sha256', secretKey).update(payloadString).digest('hex');
}

export async function dispatchPaymentWebhook(
  charge: any,
  tenant: any,
  attempt: number = 1
): Promise<boolean> {
  if (!tenant.webhookUrl) {
    return false;
  }

  const payload = {
    event: 'payment.success',
    timestamp: new Date().toISOString(),
    attempt,
    data: {
      charge_id: charge.id,
      order_id: charge.orderId,
      amount: charge.amount,
      unique_code: charge.uniqueCode,
      total_amount: charge.totalAmount,
      status: charge.status,
      customer_name: charge.customerName || null,
      customer_email: charge.customerEmail || null,
      paid_at: charge.paidAt || new Date().toISOString(),
    },
  };

  const payloadString = JSON.stringify(payload);
  const signature = signPayload(payloadString, tenant.secretKey);

  const logId = `wh_${Math.random().toString(36).substring(2, 10)}`;
  let statusCode = 0;
  let responseBody = '';
  let status: 'SUCCESS' | 'FAILED' = 'FAILED';

  try {
    const res = await fetch(tenant.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'OpenQRIS-Webhook-Engine/1.1',
        'X-QRIS-Signature': signature,
        'X-QRIS-Event': 'payment.success',
        'X-QRIS-Delivery': logId,
        'X-QRIS-Attempt': String(attempt),
      },
      body: payloadString,
      signal: AbortSignal.timeout(10000), // 10s timeout
    });

    statusCode = res.status;
    responseBody = await res.text().catch(() => '');
    if (res.ok) {
      status = 'SUCCESS';
    }
  } catch (err: any) {
    statusCode = 500;
    responseBody = err.message || 'Connection timeout / unreachable host';
  }

  const log: WebhookLog = {
    id: logId,
    tenantId: tenant.id,
    chargeId: charge.id,
    orderId: charge.orderId,
    targetUrl: tenant.webhookUrl,
    payload,
    status,
    statusCode,
    responseBody: responseBody.substring(0, 500),
    attemptedAt: new Date().toISOString(),
  };

  store.logWebhook(log);

  // Otomatis jadwalkan retry jika gagal dan attempt < 3
  if (status === 'FAILED' && attempt < 3) {
    const delays = [60 * 1000, 5 * 60 * 1000]; // Attempt 2: 1 min, Attempt 3: 5 mins
    const delay = delays[attempt - 1] || 60 * 1000;
    console.log(`[Webhook Retry] Menjadwalkan pengiriman ulang attempt ${attempt + 1} untuk charge ${charge.id} dalam ${delay / 1000}s`);
    setTimeout(() => {
      dispatchPaymentWebhook(charge, tenant, attempt + 1).catch((err) =>
        console.error(`[Webhook Retry Error] Attempt ${attempt + 1} gagal:`, err)
      );
    }, delay);
  }

  return status === 'SUCCESS';
}
