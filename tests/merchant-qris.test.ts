import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { createDynamicCharge } from '../src/server/services/qris';
import { store, type TenantApp, type GatewaySettings } from '../src/server/services/store';
import { db } from '../src/db/index';
import { charges, tenants } from '../src/db/schema';
import { inArray, eq } from 'drizzle-orm';

// QRIS platform (default) - nama merchant 'Crediblemark'
const PLATFORM_QRIS =
  '00020101021126570011ID.DANA.WWW011893600915303549932302090354993230303UMI51440014ID.CO.QRIS.WWW0215ID10266039578320303UMI5204899953033605802ID5912Crediblemark6012Kab. Sumenep6105694726304D204';
// QRIS toko merchant - nama merchant 'TestMerchant' (panjang sama, tag 59 tetap valid)
const MERCHANT_QRIS = PLATFORM_QRIS.replace('5912Crediblemark', '5912TestMerchant');

let originalSettings: GatewaySettings;
let merchantTenant: TenantApp;
let plainTenant: TenantApp;

beforeAll(async () => {
  originalSettings = await store.getSettings();
  await store.updateSettings({ defaultStaticQRIS: PLATFORM_QRIS });

  // Jalur simpan normal (sama dengan PUT /v1/apps): tanpa QRIS, lalu update kolom static_qris
  merchantTenant = (await store.createTenant({
    name: 'TEST-QRIS Toko Merchant',
    webhookUrl: '',
  })) as unknown as TenantApp;
  await store.updateTenant(merchantTenant.id, { staticQris: MERCHANT_QRIS });

  plainTenant = (await store.createTenant({
    name: 'TEST-QRIS Toko Tanpa QRIS',
    webhookUrl: '',
  })) as unknown as TenantApp;
});

afterAll(async () => {
  await store.updateSettings({
    defaultStaticQRIS: originalSettings.defaultStaticQRIS,
    useUniqueCode: originalSettings.useUniqueCode,
    expiryMinutes: originalSettings.expiryMinutes,
  });
  await db.delete(charges).where(inArray(charges.tenantId, [merchantTenant.id, plainTenant.id]));
  await db.delete(tenants).where(inArray(tenants.id, [merchantTenant.id, plainTenant.id]));
});

describe('B4 - mismatch staticQris (kolom DB) vs staticQRIS (dibaca server & client)', () => {
  it('getTenantById (dipakai /v1/apps & /v1/auth/me) mengekspos staticQRIS', async () => {
    const row = await store.getTenantById(merchantTenant.id);
    expect(row).toBeDefined();
    expect(row!.staticQris).toBe(MERCHANT_QRIS); // key DB lama tetap ada
    expect((row as any).staticQRIS).toBe(MERCHANT_QRIS); // key yang dibaca client/type TenantApp
  });

  it('getTenants() (list /v1/apps admin) juga mengekspos staticQRIS', async () => {
    const list = await store.getTenants();
    const found = list.find((t) => t.id === merchantTenant.id);
    expect(found).toBeDefined();
    expect((found as any).staticQRIS).toBe(MERCHANT_QRIS);
  });

  it('createDynamicCharge memakai QRIS toko merchant, BUKAN default platform', async () => {
    const fresh = (await store.getTenantById(merchantTenant.id)) as unknown as TenantApp;
    const charge = await createDynamicCharge(fresh, {
      orderId: 'test-mq-merchant',
      amount: 5510011,
      expiryMinutes: 5,
    });

    // Sebelum fix: tenant.staticQRIS selalu undefined -> pakai default platform
    expect(charge.rawQRIS).toContain('TestMerchant');
    expect(charge.rawQRIS).not.toContain('Crediblemark');
  });

  it('tenant tanpa QRIS toko tetap jatuh ke default platform', async () => {
    const fresh = (await store.getTenantById(plainTenant.id)) as unknown as TenantApp;
    const charge = await createDynamicCharge(fresh, {
      orderId: 'test-mq-fallback',
      amount: 5520001,
      expiryMinutes: 5,
    });

    expect(charge.rawQRIS).toContain('Crediblemark');
    expect(charge.rawQRIS).not.toContain('TestMerchant');
  });
});
