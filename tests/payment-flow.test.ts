import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { Elysia } from 'elysia';
import { webhooksRoutes } from '../src/server/routes/webhooks';
import { createDynamicCharge } from '../src/server/services/qris';
import { store, type TenantApp } from '../src/server/services/store';
import { chargeRepo } from '../src/db/repositories/charge.repo';
import { db } from '../src/db/index';
import { charges, tenants } from '../src/db/schema';
import { inArray } from 'drizzle-orm';

// Sample EMVCo static QRIS (sama dengan tests/api.test.ts)
const SAMPLE_STATIC_QRIS =
  '00020101021126570011ID.DANA.WWW011893600915303549932302090354993230303UMI51440014ID.CO.QRIS.WWW0215ID10266039578320303UMI5204899953033605802ID5912Crediblemark6012Kab. Sumenep6105694726304D204';

const app = new Elysia().use(webhooksRoutes);

function postListener(body: Record<string, unknown>, headers: Record<string, string> = {}) {
  return app.handle(
    new Request('http://localhost/v1/webhooks/listener', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
    })
  );
}

let tenantA: TenantApp;
let tenantB: TenantApp;
let restoreDefaultQRIS: string | null = null;

// Nominal test dipisah per >= 10.000 agar tidak tumpang-tindih dengan kode unik (11..999)
const AMT_B1 = 7310001;
const AMT_PAID = 7320001;
const AMT_EXPIRED = 7330001;
const AMT_TENANT_B = 7340001;
const AMT_UNKNOWN = 7990001;

beforeAll(async () => {
  const settings = await store.getSettings();
  if (!settings.defaultStaticQRIS) {
    restoreDefaultQRIS = settings.defaultStaticQRIS;
    await store.updateSettings({ defaultStaticQRIS: SAMPLE_STATIC_QRIS });
  }

  // webhookUrl '' -> dispatchPaymentWebhook langsung return false (tidak ada fetch keluar saat test)
  tenantA = (await store.createTenant({ name: 'TEST-FLOW Toko A', webhookUrl: '' })) as unknown as TenantApp;
  tenantB = (await store.createTenant({ name: 'TEST-FLOW Toko B', webhookUrl: '' })) as unknown as TenantApp;
});

afterAll(async () => {
  await db.delete(charges).where(inArray(charges.tenantId, [tenantA.id, tenantB.id]));
  await db.delete(tenants).where(inArray(tenants.id, [tenantA.id, tenantB.id]));
  if (restoreDefaultQRIS !== null) {
    await store.updateSettings({ defaultStaticQRIS: restoreDefaultQRIS });
  }
});

describe('B1 - createDynamicCharge menyimpan expiresAt/createdAt sebagai Date (bukan string)', () => {
  it('insert ke PostgreSQL sukses dan row bertipe Date', async () => {
    const charge = await createDynamicCharge(tenantA, {
      orderId: 'test-b1-create',
      amount: AMT_B1,
    });

    expect(charge.id).toMatch(/^ch_/);
    expect(charge.expiresAt).toBeInstanceOf(Date);
    expect(charge.createdAt).toBeInstanceOf(Date);

    // Row yang benar-benar tersimpan di DB
    const row = await chargeRepo.getById(charge.id);
    expect(row).toBeDefined();
    expect(row!.status).toBe('PENDING');
    expect(row!.expiresAt).toBeInstanceOf(Date);
    expect(row!.createdAt).toBeInstanceOf(Date);
    expect(row!.expiresAt.getTime()).toBeGreaterThan(Date.now());
    // Sebelum fix: mapToDriverValue melempar "value.toISOString is not a function" -> insert gagal
    expect(row!.totalAmount).toBe(charge.totalAmount);
  });
});

describe('B3 - /v1/webhooks/listener wajib device token valid', () => {
  it('tanpa device token ditolak 401 dan tagihan tetap PENDING', async () => {
    const charge = await createDynamicCharge(tenantA, {
      orderId: 'test-b3-noauth',
      amount: AMT_PAID + 1,
      expiryMinutes: 5,
    });

    const res = await postListener({ amount: charge.totalAmount });
    expect(res.status).toBe(401);

    const body = await res.json();
    expect(body.success).toBe(false);

    const row = await chargeRepo.getById(charge.id);
    expect(row!.status).toBe('PENDING');
  });

  it('device token salah ditolak 401', async () => {
    const res = await postListener(
      { amount: AMT_PAID },
      { 'x-device-token': 'dev_inidakvalid123' }
    );
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it('secret key API TIDAK diterima sebagai device token', async () => {
    const res = await postListener({ amount: AMT_PAID, device_token: tenantA.secretKey });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it('device token valid (header) + nominal tepat -> dicocokkan dan menjadi PAID', async () => {
    const charge = await createDynamicCharge(tenantA, {
      orderId: 'test-b3-paid',
      amount: AMT_PAID,
      expiryMinutes: 10,
    });

    const res = await postListener(
      { amount: charge.totalAmount, sender: 'TEST SENDER' },
      { 'x-device-token': tenantA.deviceToken! }
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.matched).toBe(true);
    expect(body.charge_id).toBe(charge.id);

    const row = await chargeRepo.getById(charge.id);
    expect(row!.status).toBe('PAID');
    expect(row!.paidAt).toBeInstanceOf(Date);
  });
});

describe('B2 - pencocokan nominal scoped tenant & expiry (satu and(...), bukan .where() dobel)', () => {
  it('device token Toko A tidak bisa melunasi tagihan milik Toko B', async () => {
    const chargeB = await createDynamicCharge(tenantB, {
      orderId: 'test-b2-cross-tenant',
      amount: AMT_TENANT_B,
      expiryMinutes: 10,
    });

    const res = await postListener(
      { amount: chargeB.totalAmount },
      { 'x-device-token': tenantA.deviceToken! }
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.matched).toBe(false);

    const row = await chargeRepo.getById(chargeB.id);
    expect(row!.status).toBe('PENDING'); // sebelum fix: ke-scoring tenant B karena where() tenant di-overwrite
  });

  it('tagihan yang sudah kedaluwarsa tidak dicocokkan', async () => {
    const expired = await createDynamicCharge(tenantA, {
      orderId: 'test-b2-expired',
      amount: AMT_EXPIRED,
      expiryMinutes: -10,
    });
    expect(expired.expiresAt.getTime()).toBeLessThan(Date.now());

    const res = await postListener(
      { amount: expired.totalAmount },
      { 'x-device-token': tenantA.deviceToken! }
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.matched).toBe(false);

    const row = await chargeRepo.getById(expired.id);
    expect(row!.status).toBe('PENDING'); // sebelum fix: cond expiry ikut ter-overwrite
  });

  it('nominal tanpa tagihan pending -> matched false (token via body device_token)', async () => {
    const res = await postListener({ amount: AMT_UNKNOWN, device_token: tenantA.deviceToken! });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.matched).toBe(false);
  });
});
