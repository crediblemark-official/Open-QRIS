import { Elysia, t } from 'elysia';
import { store } from '../services/store';
import { authGuard, adminGuard } from '../middleware/auth';

export const settingsRoutes = new Elysia({ prefix: '/v1' })
  .use(authGuard)
  .get(
    '/settings',
    async () => {
      return { success: true, data: await store.getSettings() };
    },
    {
      detail: { tags: ['Settings'], summary: 'Ambil konfigurasi gateway platform' },
    }
  )
  .get(
    '/transactions',
    async ({ authUser, query }: any) => {
      const tenantId = authUser?.role === 'merchant' ? authUser.tenantId : (query.tenant_id as string);
      if (
        query.page !== undefined ||
        query.limit !== undefined ||
        query.search !== undefined ||
        query.status !== undefined ||
        query.date_range !== undefined
      ) {
        const paginated = await store.getChargesPaginated({
          tenantId,
          search: query.search as string,
          status: query.status as string,
          dateRange: query.date_range as string,
          page: query.page ? Number(query.page) : 1,
          limit: query.limit ? Number(query.limit) : 25,
        });
        return {
          success: true,
          data: paginated.items,
          pagination: {
            page: paginated.page,
            limit: paginated.limit,
            total: paginated.total,
            totalPages: paginated.totalPages,
          },
        };
      }
      return { success: true, data: await store.getCharges(tenantId) };
    },
    {
      detail: { tags: ['Settings'], summary: 'Ambil riwayat transaksi (Scoped per Merchant atau Global Admin)' },
    }
  )
  .get(
    '/webhook-logs',
    async ({ authUser, query }: any) => {
      const tenantId = authUser?.role === 'merchant' ? authUser.tenantId : (query.tenant_id as string);
      if (
        query.page !== undefined ||
        query.limit !== undefined ||
        query.search !== undefined ||
        query.status !== undefined
      ) {
        const paginated = await store.getWebhookLogsPaginated({
          tenantId,
          search: query.search as string,
          status: query.status as string,
          page: query.page ? Number(query.page) : 1,
          limit: query.limit ? Number(query.limit) : 25,
        });
        return {
          success: true,
          data: paginated.items,
          pagination: {
            page: paginated.page,
            limit: paginated.limit,
            total: paginated.total,
            totalPages: paginated.totalPages,
          },
        };
      }
      return { success: true, data: await store.getWebhookLogs(tenantId) };
    },
    {
      detail: { tags: ['Settings'], summary: 'Ambil riwayat log pengiriman webhook' },
    }
  )
  .use(adminGuard)
  .get(
    '/audit-logs',
    async ({ query }: any) => {
      const limit = query.limit ? Number(query.limit) : 100;
      return { success: true, data: await store.getAuditLogs(limit) };
    },
    {
      detail: { tags: ['Settings'], summary: 'Ambil log audit aksi platform owner (Admin Protected)' },
    }
  )
  .post(
    '/settings',
    async ({ authUser, body, headers }) => {
      const previousSettings = await store.getSettings();
      const updated = await store.updateSettings({
        defaultStaticQRIS: body.default_static_qris,
        useUniqueCode: body.use_unique_code,
        expiryMinutes: body.expiry_minutes,
      });

      // Audit log untuk aksi update settings
      await store.logAudit({
        id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        userId: authUser?.id || 'unknown',
        userEmail: authUser?.email || 'unknown',
        action: 'UPDATE_SETTINGS',
        details: {
          previous: previousSettings,
          updated: updated,
          changedFields: {
            defaultStaticQRIS: body.default_static_qris !== undefined,
            useUniqueCode: body.use_unique_code !== undefined,
            expiryMinutes: body.expiry_minutes !== undefined,
          },
        },
        ipAddress: (headers['x-forwarded-for'] as string) || '127.0.0.1',
        createdAt: new Date().toISOString(),
      });

      return { success: true, data: updated };
    },
    {
      body: t.Object({
        default_static_qris: t.Optional(t.String()),
        use_unique_code: t.Optional(t.Boolean()),
        expiry_minutes: t.Optional(t.Number()),
      }),
      detail: { tags: ['Settings'], summary: 'Perbarui konfigurasi gateway platform (Admin Protected)' },
    }
  );
