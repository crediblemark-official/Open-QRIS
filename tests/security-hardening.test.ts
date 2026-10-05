import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { Elysia } from 'elysia';
import { webhooksRoutes } from '../src/server/routes/webhooks';
import { chargesRoutes } from '../src/server/routes/charges';
import { store } from '../src/server/services/store';
import { chargeRepo } from '../src/db/repositories/charge.repo';
import { db } from '../src/db/index';
import { charges, tenants } from '../src/db/schema';
import { inArray } from 'drizzle-orm';

const app = new Elysia().use(chargesRoutes).use(webhooksRoutes);

let testTenant: any;
let testCharge: any;
const originalSandbox = process.env.SANDBOX_MODE;

const AMOUNT = 8710011;

beforeAll(async () => {
  delete process.env.SANDBOX_MODE; // pastikan default mati
  testTenant = await store.createTenant({
    name: 'TEST-SEC Toko',
    webhookUrl: '',
  });
  testCharge = await chargeRepo.create({
    id: 'ch_testsec01',
    tenantId: testTenant.id,
    tenantName: testTenant.name,
    orderId: 'test-sec-simulate',
    amount: AMOUNT,
    uniqueCode: 0,
    totalAmount: AMOUNT,
    customerName: 'Sandbox Tester',
    rawQris: '000201TEST',
    qrDataUrl: 'data:image/png;base64,TEST',
    status: 'PENDING',
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    createdAt: new Date(),
  });
});

afterAll(async () => {
  if (originalSandbox === undefined) delete process.env.SANDBOX_MODE;
  else process.env.SANDBOX_MODE = originalSandbox;
  await db.delete(charges).where(inArray(charges.tenantId, [testTenant.id]));
  await db.delete(tenants).where(inArray(tenants.id, [testTenant.id]));
});

const postSimulate = (chargeId: string) =>
  app.handle(
    new Request(`http://localhost/v1/charges/${chargeId}/simulate-paid`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    })
  );

describe('B8 - kredensial dibuat dengan CSPRNG (bukan Math.random)', () => {
  it('createTenant menghasilkan secret/public key & device token berentropi tinggi', async () => {
    const t: any = await store.createTenant({ name: 'TEST-SEC Keys', webhookUrl: '' });
    try {
      expect(t.secretKey).toMatch(/^sk_live_[0-9a-f]{64}$/); // 256-bit hex
      expect(t.publicKey).toMatch(/^pk_live_[0-9a-f]{32}$/); // 128-bit hex
      expect(t.deviceToken).toMatch(/^dev_[0-9a-f]{32}$/); // 128-bit hex

      // Dua tenant tidak pernah berbagi token
      const t2: any = await store.createTenant({ name: 'TEST-SEC Keys 2', webhookUrl: '' });
      expect(t2.secretKey).not.toBe(t.secretKey);
      expect(t2.deviceToken).not.toBe(t.deviceToken);
      await store.deleteTenant(t2.id);
    } finally {
      await store.deleteTenant(t.id);
    }
  });
});

describe('B7 - Simulasi Bayar dikendalikan SANDBOX_MODE', () => {
  it('tanpa SANDBOX_MODE: simulate tanpa login ditolak 401 dan tagihan tetap PENDING', async () => {
    const res = await postSimulate(testCharge.id);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);

    const row = await chargeRepo.getById(testCharge.id);
    expect(row!.status).toBe('PENDING');
  });

  it('respons GET charge memuat flag sandbox=false saat sandbox mati', async () => {
    const res = await app.handle(new Request(`http://localhost/v1/charges/${testCharge.id}`));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.sandbox).toBe(false);
  });

  it('dengan SANDBOX_MODE=true: simulate tanpa login berhasil dan charge menjadi PAID', async () => {
    process.env.SANDBOX_MODE = 'true';

    const flagRes = await app.handle(new Request(`http://localhost/v1/charges/${testCharge.id}`));
    const flagJson = await flagRes.json();
    expect(flagJson.data.sandbox).toBe(true);

    const res = await postSimulate(testCharge.id);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.status).toBe('PAID');

    const row = await chargeRepo.getById(testCharge.id);
    expect(row!.status).toBe('PAID');
    expect(row!.paidAt).toBeInstanceOf(Date);
  });
});
