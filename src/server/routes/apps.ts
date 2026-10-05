import { Elysia, t } from 'elysia';
import { store } from '../services/store';
import { authGuard, adminGuard } from '../middleware/auth';
import { sendTelegramMessage } from '../services/telegram';

export const appsRoutes = new Elysia({ prefix: '/v1' })
  .use(authGuard)
  .get(
    '/apps',
    async ({ authUser }: any) => {
      if (authUser?.role === 'merchant') {
        let tenant = authUser.tenantId ? await store.getTenantById(authUser.tenantId) : null;
        if (!tenant && authUser.email) {
          const dbUser = await store.getUserByEmail(authUser.email);
          if (dbUser?.tenantId) {
            tenant = await store.getTenantById(dbUser.tenantId);
          }
          if (!tenant) {
            const storeName = `Toko ${authUser.name || authUser.email.split('@')[0] || 'Saya'}`;
            tenant = await store.createTenant({
              name: storeName,
              webhookUrl: 'https://my-store.com/api/webhook',
            });
            if (dbUser) {
              await store.updateUser(dbUser.id, { tenantId: tenant.id });
            }
          }
        }
        return { success: true, data: tenant ? [tenant] : [] };
      }
      return { success: true, data: await store.getTenants() };
    },
    {
      detail: { tags: ['Apps'], summary: 'Daftar SaaS client apps (Scoped untuk Merchant, Lengkap untuk Admin)' },
    }
  )
  .get(
    '/apps/:id',
    async ({ authUser, params, set }: any) => {
      if (authUser?.role === 'merchant' && authUser.tenantId !== params.id) {
        set.status = 403;
        return { success: false, message: 'Akses ditolak' };
      }
      const tenant = await store.getTenantById(params.id);
      if (!tenant) {
        set.status = 404;
        return { success: false, message: 'Tenant app tidak ditemukan' };
      }
      return { success: true, data: tenant };
    },
    {
      detail: { tags: ['Apps'], summary: 'Detail SaaS client app' },
    }
  )
  .put(
    '/apps/:id',
    async ({ authUser, params, body, set, headers }: any) => {
      if (authUser?.role === 'merchant' && authUser.tenantId !== params.id) {
        set.status = 403;
        return { success: false, message: 'Akses ditolak untuk mengubah data toko lain' };
      }

      const existingTenant = await store.getTenantById(params.id);
      const updated = await store.updateTenant(params.id, {
        name: body.name,
        webhookUrl: body.webhook_url,
        staticQris: body.static_qris,
        telegramBotToken: body.telegram_bot_token,
        telegramChatId: body.telegram_chat_id,
      });

      if (!updated) {
        set.status = 404;
        return { success: false, message: 'Tenant app tidak ditemukan' };
      }

      // Audit log untuk aksi update tenant
      store.logAudit({
        id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        userId: authUser?.id || 'unknown',
        userEmail: authUser?.email || 'unknown',
        action: 'UPDATE_TENANT',
        targetTenantId: params.id,
        targetTenantName: updated.name,
        details: {
          previousName: existingTenant?.name,
          previousWebhookUrl: existingTenant?.webhookUrl,
          updatedFields: {
            name: body.name !== undefined,
            webhookUrl: body.webhook_url !== undefined,
            staticQRIS: body.static_qris !== undefined,
            telegramBotToken: body.telegram_bot_token !== undefined,
            telegramChatId: body.telegram_chat_id !== undefined,
          },
        },
        ipAddress: (headers['x-forwarded-for'] as string) || '127.0.0.1',
        createdAt: new Date().toISOString(),
      });

      return { success: true, data: updated, message: 'Pengaturan toko berhasil disimpan' };
    },
    {
      body: t.Object({
        name: t.Optional(t.String()),
        webhook_url: t.Optional(t.String()),
        static_qris: t.Optional(t.String()),
        telegram_bot_token: t.Optional(t.String()),
        telegram_chat_id: t.Optional(t.String()),
      }),
      detail: { tags: ['Apps'], summary: 'Perbarui konfigurasi toko / tenant app' },
    }
  )
  .post(
    '/merchant/telegram-test',
    async ({ authUser, body, set }: any) => {
      const botToken = body.bot_token;
      const chatId = body.chat_id;

      if (!botToken || !chatId) {
        set.status = 400;
        return { success: false, message: 'Bot Token dan Chat ID wajib diisi' };
      }

      const testMsg = [
        `<b>✅ TES NOTIFIKASI TELEGRAM BERHASIL</b>`,
        `━━━━━━━━━━━━━━━━━━━━`,
        `Bot OpenQRIS berhasil terhubung dengan akun Telegram Anda!`,
        `Setiap ada pelanggan yang membayar invoice QRIS, notifikasi instan akan otomatis masuk ke sini.`,
        `━━━━━━━━━━━━━━━━━━━━`,
        `<i>Waktu tes: ${new Date().toLocaleTimeString('id-ID')} WIB</i>`,
      ].join('\n');

      const res = await sendTelegramMessage({
        botToken,
        chatId,
        message: testMsg,
      });

      if (!res.success) {
        set.status = 400;
        return { success: false, message: res.error || 'Gagal mengirim pesan ke Telegram' };
      }

      return { success: true, message: 'Pesan tes berhasil dikirim ke Telegram Anda!' };
    },
    {
      body: t.Object({
        bot_token: t.String(),
        chat_id: t.String(),
      }),
      detail: { tags: ['Apps'], summary: 'Kirim pesan tes notifikasi bot Telegram' },
    }
  )
  .use(adminGuard)
  .post(
    '/apps',
    async ({ body }: any) => {
      const tenant = await store.createTenant({
        name: body.name,
        webhookUrl: body.webhook_url,
        staticQRIS: body.static_qris,
        telegramBotToken: body.telegram_bot_token,
        telegramChatId: body.telegram_chat_id,
      });
      return { success: true, data: tenant };
    },
    {
      body: t.Object({
        name: t.String(),
        webhook_url: t.String(),
        static_qris: t.Optional(t.String()),
        telegram_bot_token: t.Optional(t.String()),
        telegram_chat_id: t.Optional(t.String()),
      }),
      detail: { tags: ['Apps'], summary: 'Daftarkan SaaS client app baru (Admin Protected)' },
    }
  )
  .delete(
    '/apps/:id',
    async ({ authUser, params, set, headers }: any) => {
      const tenant = await store.getTenantById(params.id);
      const deleted = await store.deleteTenant(params.id);
      if (!deleted) {
        set.status = 404;
        return { success: false, message: 'Tenant app tidak ditemukan' };
      }

      // Audit log untuk aksi hapus tenant
      await store.logAudit({
        id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        userId: authUser?.id || 'unknown',
        userEmail: authUser?.email || 'unknown',
        action: 'DELETE_TENANT',
        targetTenantId: params.id,
        targetTenantName: tenant?.name || 'Unknown',
        details: { deletedAt: new Date().toISOString() },
        ipAddress: (headers['x-forwarded-for'] as string) || '127.0.0.1',
        createdAt: new Date().toISOString(),
      });

      return { success: true, message: 'Tenant app berhasil dihapus' };
    },
    {
      detail: { tags: ['Apps'], summary: 'Hapus SaaS client app (Admin Protected)' },
    }
  );
