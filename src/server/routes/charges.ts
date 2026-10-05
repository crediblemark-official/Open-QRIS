import { Elysia, t } from 'elysia';
import { store } from '../services/store';
import { createDynamicCharge } from '../services/qris';
import { jwtAuth, resolveAuthUser } from '../middleware/auth';

export const chargesRoutes = new Elysia({ prefix: '/v1' })
  .use(jwtAuth)
  .post(
    '/charges',
    async ({ headers, body, request, jwt, set }: any) => {
      let tenant: any = null;

      // 1. Cek apakah pemanggil adalah user login berbasis JWT session (Merchant / Admin)
      const authUser = await resolveAuthUser(headers, jwt);
      if (authUser) {
        if (authUser.role === 'merchant') {
          if (authUser.tenantId) {
            tenant = await store.getTenantById(authUser.tenantId);
          }
          if (!tenant && authUser.email) {
            const dbUser = await store.getUserByEmail(authUser.email);
            if (dbUser?.tenantId) {
              tenant = await store.getTenantById(dbUser.tenantId);
            }
          }
          if (!tenant) {
            const storeName = `Toko ${authUser.name || authUser.email?.split('@')[0] || 'Saya'}`;
            tenant = await store.createTenant({
              name: storeName,
              webhookUrl: 'https://my-store.com/api/webhook',
            });
            if (authUser.email) {
              const dbUser = await store.getUserByEmail(authUser.email);
              if (dbUser) {
                await store.updateUser(dbUser.id, { tenantId: tenant.id });
              }
            }
          }
        } else if (authUser.role === 'admin') {
          const targetTenantId = body.tenant_id;
          if (targetTenantId) {
            tenant = await store.getTenantById(targetTenantId);
          } else {
            const allTenants = await store.getTenants();
            tenant = allTenants[0] || null;
          }
        }
      }

      // 1.5 Fallback jika body.tenant_id disediakan secara eksplisit
      if (!tenant && body.tenant_id) {
        tenant = await store.getTenantById(body.tenant_id);
      }

      // 2. Fallback: cek API Key (Bearer / x-api-key / x-public-key) untuk integrasi eksternal SaaS
      if (!tenant) {
        const authHeader = headers['authorization'] || '';
        const secretKey = authHeader.startsWith('Bearer ')
          ? authHeader.slice(7).trim()
          : headers['x-api-key'] || '';
        const publicKey = headers['x-public-key'] || '';

        tenant = secretKey
          ? await store.getTenantBySecretKey(secretKey)
          : publicKey
          ? await store.getTenantByPublicKey(publicKey)
          : null;
      }

      // 3. Fallback jika user terotentikasi dan ada tenant di platform
      if (!tenant && authUser) {
        const allTenants = await store.getTenants();
        if (allTenants.length > 0) {
          tenant = allTenants[0];
        }
      }

      if (!tenant) {
        set.status = 401;
        return {
          status: 'error',
          code: 'UNAUTHORIZED',
          message: 'Autentikasi tidak valid. Sediakan session login atau API Key (X-Api-Key, Authorization Bearer, atau X-Public-Key)',
        };
      }

      try {
        const url = new URL(request.url);
        const originUrl = `${url.protocol}//${url.host}`;

        const charge = await createDynamicCharge(
          tenant,
          {
            orderId: body.order_id,
            amount: body.amount,
            customerName: body.customer_name,
            customerEmail: body.customer_email,
            expiryMinutes: body.expiry_minutes,
          },
          originUrl
        );

        if (authUser && authUser.role === 'admin') {
          store.logAudit({
            id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            userId: authUser.id,
            userEmail: authUser.email,
            action: 'CREATE_PAYMENT_LINK',
            targetTenantId: tenant.id,
            targetTenantName: tenant.name,
            details: {
              chargeId: charge.id,
              orderId: charge.orderId,
              amount: charge.amount,
              totalAmount: charge.totalAmount,
            },
            ipAddress: (headers['x-forwarded-for'] as string) || '127.0.0.1',
            createdAt: new Date().toISOString(),
          });
        }

        return {
          status: 'success',
          data: {
            charge_id: charge.id,
            tenant_id: tenant.id,
            tenant_name: tenant.name,
            order_id: charge.orderId,
            amount: charge.amount,
            unique_code: charge.uniqueCode,
            total_amount: charge.totalAmount,
            status: charge.status,
            raw_qris: charge.rawQRIS,
            qr_data_url: charge.qrDataUrl,
            checkout_url: `${originUrl}/checkout/${charge.id}`,
            expires_at: charge.expiresAt,
            created_at: charge.createdAt,
          },
        };
      } catch (err: any) {
        set.status = 400;
        return {
          status: 'error',
          code: 'BAD_REQUEST',
          message: err.message || 'Gagal membuat tagihan QRIS',
        };
      }
    },
    {
      body: t.Object({
        order_id: t.String(),
        amount: t.Number(),
        customer_name: t.Optional(t.String()),
        customer_email: t.Optional(t.String()),
        expiry_minutes: t.Optional(t.Number()),
        tenant_id: t.Optional(t.String()),
      }),
      detail: { tags: ['Charges'], summary: 'Buat tagihan QRIS Dinamis baru (API untuk SaaS & Dashboard)' },
    }
  )
  .get(
    '/charges/:id',
    async ({ params, request, set }) => {
      const charge = await store.getChargeById(params.id);
      if (!charge) {
        set.status = 404;
        return { status: 'error', message: 'Transaksi tidak ditemukan' };
      }

      const url = new URL(request.url);
      const originUrl = `${url.protocol}//${url.host}`;

      return {
        status: 'success',
        data: {
          ...charge,
          checkout_url: `${originUrl}/checkout/${charge.id}`,
          // Dinamis per request agar tombol Simulasi Bayar di checkout publik
          // hanya muncul jika server memang mengizinkan sandbox
          sandbox: process.env.SANDBOX_MODE === 'true',
        },
      };
    },
    {
      detail: { tags: ['Charges'], summary: 'Cek status transaksi berdasarkan Charge ID' },
    }
  );
