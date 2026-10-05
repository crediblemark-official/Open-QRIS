import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { store } from '../src/server/services/store';
import { chargeRepo } from '../src/db/repositories/charge.repo';
import { db } from '../src/db/index';
import { charges, tenants } from '../src/db/schema';
import { inArray } from 'drizzle-orm';

let tenantA: any;
let tenantB: any;

async function makeCharge(
  tenantId: string,
  tenantName: string,
  overrides: Record<string, any> = {}
) {
  const id = `ch_f${Math.random().toString(36).slice(2, 10)}`;
  return chargeRepo.create({
    id,
    tenantId,
    tenantName,
    orderId: `test-filter-${id}`,
    amount: 100000,
    uniqueCode: 0,
    totalAmount: 100000,
    customerName: 'Pelanggan Umum',
    rawQris: '000201TEST',
    qrDataUrl: 'data:image/png;base64,TEST',
    status: 'PENDING',
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    createdAt: new Date(),
    ...overrides,
  });
}

beforeAll(async () => {
  tenantA = await store.createTenant({ name: 'TEST-FILTER Toko A', webhookUrl: '' });
  tenantB = await store.createTenant({ name: 'TEST-FILTER Toko B', webhookUrl: '' });
});

afterAll(async () => {
  await db.delete(charges).where(inArray(charges.tenantId, [tenantA.id, tenantB.id]));
  await db.delete(tenants).where(inArray(tenants.id, [tenantA.id, tenantB.id]));
});

describe('B5 - getPaginated membangun SQL filter pencarian yang valid', () => {
  it('filter gabungan tenantId + status + dateRange + search tidak melempar SQL rusak', async () => {
    // Sebelum fix: sql`${conditions[0]}${conditions.slice(1).map(...)}` meng-interpolasi array
    // -> Postgres error syntax (SQL invalid "$1( AND ...)") begitu kondisi > 1
    const cPending = await makeCharge(tenantA.id, tenantA.name, { customerName: 'Budi FilterUnik' });
    const cPaid = await makeCharge(tenantA.id, tenantA.name, { customerName: 'Budi FilterUnik' });
    await chargeRepo.updateStatus(cPaid.id, 'PAID');
    // Milik toko lain dengan kata kunci sama -> harus ikut ter-scope keluar
    await makeCharge(tenantB.id, tenantB.name, { customerName: 'Budi FilterUnik' });

    const result = await chargeRepo.getPaginated({
      tenantId: tenantA.id,
      status: 'PENDING',
      dateRange: '7D',
      search: 'FilterUnik',
      page: 1,
      limit: 10,
    });

    expect(result.total).toBe(1);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].id).toBe(cPending.id);
    expect(result.items[0].status).toBe('PENDING');
  });

  it('pencarian tanpa hasil mengembalikan total 0 dan list kosong', async () => {
    const result = await chargeRepo.getPaginated({
      tenantId: tenantA.id,
      search: 'KataKunciYangTidakAda99',
    });
    expect(result.total).toBe(0);
    expect(result.items).toHaveLength(0);
    expect(result.totalPages).toBe(1);
  });

  it('kombinasi tenantId + search membatasi hasil ke tenant tersebut (tanpa error)', async () => {
    // createdAt dibuat berbeda agar urutan ORDER BY deterministik antar halaman
    const base = Date.now() - 60_000;
    const p1 = await makeCharge(tenantA.id, tenantA.name, { orderId: 'test-filter-page-1', createdAt: new Date(base) });
    const p2 = await makeCharge(tenantA.id, tenantA.name, { orderId: 'test-filter-page-2', createdAt: new Date(base + 1000) });
    const p3 = await makeCharge(tenantA.id, tenantA.name, { orderId: 'test-filter-page-3', createdAt: new Date(base + 2000) });
    // Kandidat di tenant lain yang juga cocok -> tidak boleh muncul
    await makeCharge(tenantB.id, tenantB.name, { orderId: 'test-filter-page-B' });

    const page1 = await chargeRepo.getPaginated({
      tenantId: tenantA.id,
      search: 'test-filter-page',
      page: 1,
      limit: 2,
    });
    expect(page1.total).toBe(3);
    expect(page1.items).toHaveLength(2);
    expect(page1.totalPages).toBe(2);

    const page2 = await chargeRepo.getPaginated({
      tenantId: tenantA.id,
      search: 'test-filter-page',
      page: 2,
      limit: 2,
    });
    expect(page2.items).toHaveLength(1);

    const returnedIds = [...page1.items, ...page2.items].map((c) => c.id).sort();
    expect(returnedIds).toEqual([p1.id, p2.id, p3.id].sort());
  });

  it('tanpa filter apapun tetap valid (whereClause undefined)', async () => {
    const result = await chargeRepo.getPaginated({ page: 1, limit: 5 });
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.items.length).toBeLessThanOrEqual(5);
    expect(result.total).toBeGreaterThanOrEqual(result.items.length);
  });
});

describe('B12 - getStatusCounts menghitung per status di server', () => {
  it('counts mengikuti filter tenant + search, dihitung untuk semua status', async () => {
    await makeCharge(tenantA.id, tenantA.name, { customerName: 'CountTok Pending' });
    const paid = await makeCharge(tenantA.id, tenantA.name, { customerName: 'CountTok Lunas' });
    await chargeRepo.updateStatus(paid.id, 'PAID');
    await makeCharge(tenantB.id, tenantB.name, { customerName: 'CountTok TokoB' });

    const countsA = await chargeRepo.getStatusCounts({ tenantId: tenantA.id, search: 'CountTok' });
    expect(countsA.PENDING).toBe(1);
    expect(countsA.PAID).toBe(1);
    expect(countsA.EXPIRED).toBe(0);
    expect(countsA.CANCELLED).toBe(0);

    const countsB = await chargeRepo.getStatusCounts({ tenantId: tenantB.id, search: 'CountTok' });
    expect(countsB.PENDING).toBe(1);
    expect(countsB.PAID).toBe(0);
  });
});
