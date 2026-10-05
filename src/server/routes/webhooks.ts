import { Elysia, t } from 'elysia';
import { parseIncomingNotification } from '../core/notificationParser';
import { store } from '../services/store';
import { dispatchPaymentWebhook } from '../services/webhook';
import { sendPaymentAlert } from '../services/telegram';
import { authGuard, adminGuard } from '../middleware/auth';
import { createHash } from 'crypto';

// In-Memory Idempotency Deduplication Set (1 hour sliding window)
const processedHashes = new Map<string, number>();

function checkAndMarkDuplicate(signatureString: string): boolean {
  const hash = createHash('sha256').update(signatureString).digest('hex');
  const now = Date.now();

  // Bersihkan hash kadaluarsa (> 1 jam)
  for (const [key, timestamp] of processedHashes.entries()) {
    if (now - timestamp > 3600 * 1000) {
      processedHashes.delete(key);
    }
  }

  if (processedHashes.has(hash)) {
    return true; // Duplikat
  }

  processedHashes.set(hash, now);
  return false;
}

export const webhooksRoutes = new Elysia({ prefix: '/v1' })
  .post(
    '/webhooks/listener',
    async ({ headers, body, set }) => {
      let amount = Number(body.amount);
      let detectedBank = 'Direct API';
      let detectedSender = body.sender;

      // B3: Listener wajib terautentikasi dengan device token pairing (bukan secret key API).
      // Secret key `sk_live_` dipakai untuk HMAC webhook dan tidak boleh berada di HP Android.
      const deviceToken =
        body.device_token ||
        (headers['x-device-token'] as string) ||
        '';

      if (!deviceToken) {
        set.status = 401;
        return {
          success: false,
          message: 'Device token diperlukan. Masukkan Device Token dari menu Listener dashboard di aplikasi HP Anda.',
        };
      }

      const matchedTenant = await store.getTenantByDeviceToken(deviceToken);

      if (!matchedTenant) {
        set.status = 401;
        return {
          success: false,
          message: 'Device token tidak valid atau tidak terdaftar pada merchant manapun.',
        };
      }

      await store.recordDeviceHeartbeat(matchedTenant.deviceToken || deviceToken, {
        model: body.sender ? `Android: ${body.sender}` : undefined,
      });

      if ((!amount || isNaN(amount)) && body.text) {
        const parsed = parseIncomingNotification(body.text);

        if (parsed.isDebit) {
          return {
            success: false,
            isDebit: true,
            message: 'Notifikasi diabaikan: terdeteksi sebagai transaksi uang keluar (Debit)',
          };
        }

        if (parsed.amount) {
          amount = parsed.amount;
          detectedBank = parsed.bankOrWallet;
          if (parsed.sender) detectedSender = parsed.sender;
        }
      }

      if (!amount || isNaN(amount)) {
        set.status = 400;
        return { success: false, message: 'Nominal transfer tidak dapat dideteksi dari teks notifikasi' };
      }

      // Idempotency check: jika notifikasi teks/nominal yang sama dikirim ulang oleh HP Android dalam 1 jam
      const notifSignature = body.text ? body.text.trim() : `${amount}-${detectedSender || ''}-${matchedTenant?.id || ''}`;
      if (checkAndMarkDuplicate(notifSignature)) {
        return {
          success: true,
          matched: false,
          deduplicated: true,
          message: 'Notifikasi ini telah diproses sebelumnya (Idempotent ignore)',
        };
      }

      // Cari tagihan pending (selalu scoped ke tenant pemilik device token)
      const charge = await store.getPendingChargeByAmount(amount, matchedTenant.id);
      if (!charge) {
        return {
          success: false,
          matched: false,
          merchant: matchedTenant.name,
          message: `Tidak ada tagihan pending yang cocok untuk nominal Rp ${amount.toLocaleString('id-ID')} pada merchant ${matchedTenant.name}`,
        };
      }

      await store.updateChargeStatus(charge.id, 'PAID');

      const tenant = matchedTenant || await store.getTenantById(charge.tenantId);
      if (tenant) {
        dispatchPaymentWebhook(charge, tenant).catch((e) =>
          console.error('Error dispatching webhook', e)
        );
        sendPaymentAlert(tenant, charge, { bank: detectedBank, sender: detectedSender }).catch((e) =>
          console.error('Error dispatching Telegram alert', e)
        );
      }

      return {
        success: true,
        matched: true,
        charge_id: charge.id,
        order_id: charge.orderId,
        merchant_name: tenant?.name,
        amount: charge.totalAmount,
        provider: detectedBank,
        sender: detectedSender,
        message: 'Pembayaran berhasil diverifikasi otomatis!',
      };
    },
    {
      body: t.Object({
        amount: t.Optional(t.Number()),
        text: t.Optional(t.String()),
        sender: t.Optional(t.String()),
        device_token: t.Optional(t.String()),
      }),
      detail: {
        tags: ['Webhooks'],
        summary: 'Ingestion endpoint untuk notifikasi Android/SMS uang masuk (Scoped & Deduplicated)',
      },
    }
  )
  .post(
    '/devices/heartbeat',
    async ({ headers, body, set }) => {
      const deviceToken =
        body.device_token ||
        (headers['x-device-token'] as string) ||
        '';

      if (!deviceToken) {
        set.status = 401;
        return { success: false, message: 'device_token diperlukan' };
      }

      const updated = await store.recordDeviceHeartbeat(deviceToken, {
        battery: body.battery,
        model: body.model,
        isCharging: body.is_charging,
      });

      if (!updated) {
        set.status = 404;
        return { success: false, message: 'Device token tidak cocok dengan merchant terdaftar' };
      }

      return {
        success: true,
        message: 'Heartbeat tercatat',
        server_time: new Date().toISOString(),
      };
    },
    {
      body: t.Object({
        device_token: t.Optional(t.String()),
        battery: t.Optional(t.Number()),
        model: t.Optional(t.String()),
        is_charging: t.Optional(t.Boolean()),
      }),
      detail: { tags: ['Webhooks'], summary: 'Heartbeat ping status HP Android OpenQRIS Listener' },
    }
  )
  .use(authGuard)
  .post(
    '/charges/:id/simulate-paid',
    async ({ authUser, params, set }: any) => {
      const charge = await store.getChargeById(params.id);
      if (!charge) {
        set.status = 404;
        return { success: false, message: 'Transaksi tidak ditemukan' };
      }

      if (authUser?.role === 'merchant' && charge.tenantId !== authUser.tenantId) {
        set.status = 403;
        return { success: false, message: 'Akses ditolak: Anda hanya dapat mensimulasikan tagihan toko Anda sendiri' };
      }

      await store.updateChargeStatus(charge.id, 'PAID');
      const tenant = await store.getTenantById(charge.tenantId);
      let webhookDispatched = false;
      if (tenant) {
        webhookDispatched = await dispatchPaymentWebhook(charge, tenant);
        sendPaymentAlert(tenant, charge, { bank: 'SIMULASI', sender: 'Merchant Sandbox' }).catch((e) =>
          console.error('Error dispatching Telegram alert', e)
        );
      }

      return {
        success: true,
        charge_id: charge.id,
        status: 'PAID',
        webhook_dispatched: webhookDispatched,
        message: 'Simulasi bayar berhasil, webhook & notifikasi telah dipicu!',
      };
    },
    {
      detail: { tags: ['Webhooks'], summary: 'Simulasi pembayaran sukses tagihan' },
    }
  )
  .post(
    '/webhooks/resend/:id',
    async ({ authUser, params, set }: any) => {
      const charge = await store.getChargeById(params.id);
      if (!charge) {
        set.status = 404;
        return { success: false, message: 'Transaksi tidak ditemukan' };
      }

      if (authUser?.role === 'merchant' && charge.tenantId !== authUser.tenantId) {
        set.status = 403;
        return { success: false, message: 'Akses ditolak' };
      }

      const tenant = await store.getTenantById(charge.tenantId);
      if (!tenant) {
        set.status = 404;
        return { success: false, message: 'Tenant aplikasi untuk transaksi ini tidak ditemukan' };
      }

      const success = await dispatchPaymentWebhook(charge, tenant);
      return {
        success,
        charge_id: charge.id,
        message: success ? 'Webhook berhasil dikirim ulang' : 'Pengiriman webhook gagal (cek log webhook)',
      };
    },
    {
      detail: { tags: ['Webhooks'], summary: 'Kirim ulang webhook transaksi manual' },
    }
  );
