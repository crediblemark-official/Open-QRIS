import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { createHmac } from 'crypto';
import { Elysia } from 'elysia';
import { webhooksRoutes } from '../src/server/routes/webhooks';
import { store } from '../src/server/services/store';
import { chargeRepo } from '../src/db/repositories/charge.repo';
import { db } from '../src/db/index';
import { charges, tenants, webhookLogs } from '../src/db/schema';
import { inArray } from 'drizzle-orm';

// Server lokal penangkap webhook (menggantikan endpoint merchant)
let captured: { headers: Record<string, string>; raw: string } | null = null;
const server = Bun.serve({
  port: 0,
  fetch: async (req) => {
    captured = {
      headers: Object.fromEntries(req.headers.entries()),
      raw: await req.text(),
    };
    return new Response('{"ok":true}', {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  },
});

const app = new Elysia().use(webhooksRoutes);

let testTenant: any;
let testCharge: any;

const AMOUNT = 8610011; // nominal unik agar tidak bentrok dengan data/test lain

beforeAll(async () => {
  testTenant = await store.createTenant({
    name: 'TEST-WEBHOOK Toko',
    webhookUrl: `http://127.0.0.1:${server.port}/hook`,
  });

  // Charge pending dibuat langsung (tanpa dependensi settings/QRIS)
  testCharge = await chargeRepo.create({
    id: 'ch_testwebhook01',
    tenantId: testTenant.id,
    tenantName: testTenant.name,
    orderId: 'test-webhook-contract',
    amount: AMOUNT,
    uniqueCode: 0,
    totalAmount: AMOUNT,
    customerName: 'Ahmad Rizqi',
    rawQris: '000201TEST',
    qrDataUrl: 'data:image/png;base64,TEST',
    status: 'PENDING',
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    createdAt: new Date(),
  });
});

afterAll(async () => {
  server.stop(true);
  // Beri waktu agar insert webhook_log async yang belum selesai sempat masuk
  await Bun.sleep(200);
  await db.delete(webhookLogs).where(inArray(webhookLogs.tenantId, [testTenant.id]));
  await db.delete(charges).where(inArray(charges.tenantId, [testTenant.id]));
  await db.delete(tenants).where(inArray(tenants.id, [testTenant.id]));
});

describe('B6 - payload & header webhook sesuai dokumentasi README', () => {
  it('listener memicu webhook dengan event charge.paid, header X-OpenQRIS-Signature, status PAID', async () => {
    const res = await app.handle(
      new Request('http://localhost/v1/webhooks/listener', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-device-token': testTenant.deviceToken,
        },
        body: JSON.stringify({ amount: AMOUNT, sender: 'TEST SENDER' }),
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.matched).toBe(true);

    // dispatchPaymentWebhook fire-and-forget -> tunggu sampai request masuk
    for (let i = 0; i < 60 && !captured; i++) {
      await Bun.sleep(50);
    }
    expect(captured).not.toBeNull();

    const { headers, raw } = captured!;

    // 1. Header signature sesuai README: X-OpenQRIS-Signature = HMAC-SHA256(raw body)
    const signature = headers['x-openqris-signature'];
    expect(signature).toBeDefined();
    const expected = createHmac('sha256', testTenant.secretKey).update(raw).digest('hex');
    expect(signature).toBe(expected);

    // 2. Header event (prefix X-OpenQRIS-* sesuai README)
    expect(headers['x-openqris-event']).toBe('charge.paid');
    expect(headers['content-type']).toContain('application/json');

    // 3. Payload body sesuai kontrak README
    const payload = JSON.parse(raw);
    expect(payload.event).toBe('charge.paid');
    expect(payload.data).toBeDefined();

    const data = payload.data;
    expect(data.charge_id).toBe(testCharge.id);
    expect(data.order_id).toBe('test-webhook-contract');
    expect(data.amount).toBe(AMOUNT);
    expect(data.unique_code).toBe(0);
    expect(data.total_amount).toBe(AMOUNT);
    expect(data.customer_name).toBe('Ahmad Rizqi');
    expect(data.status).toBe('PAID'); // sebelum fix: 'PENDING' (row stale)
    // paid_at harus string ISO-8601
    expect(typeof data.paid_at).toBe('string');
    expect(data.paid_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);

    // Webhook log tercatat sebagai SUCCESS (dispatch tidak awaited)
    let logs: any[] = [];
    for (let i = 0; i < 40 && logs.length === 0; i++) {
      logs = await store.getWebhookLogs(testTenant.id);
      if (logs.length === 0) await Bun.sleep(50);
    }
    expect(logs.length).toBeGreaterThan(0);
    expect(logs[0].status).toBe('SUCCESS');
    expect(logs[0].orderId).toBe('test-webhook-contract');
  });

  it('charge di database berstatus PAID dengan paidAt terisi', async () => {
    const row = await chargeRepo.getById(testCharge.id);
    expect(row!.status).toBe('PAID');
    expect(row!.paidAt).toBeInstanceOf(Date);
  });
});
