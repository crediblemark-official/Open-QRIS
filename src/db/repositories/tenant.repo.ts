import { db } from '../index';
import { tenants } from '../schema';
import { eq, desc, isNull } from 'drizzle-orm';
import type { Tenant, NewTenant } from '../schema';

export class TenantRepository {
  /**
   * Kolom DB bernama `static_qris` (key `staticQris`), tetapi type TenantApp di server
   * dan type Tenant di client membaca `staticQRIS`. Ekspos keduanya agar QRIS toko
   * merchant benar-benar terbaca (dulu selalu undefined -> jatuh ke default platform).
   */
  private mapRow(t: Tenant) {
    return { ...t, staticQRIS: t.staticQris ?? undefined };
  }

  async getAll() {
    const rows = await db.select().from(tenants).orderBy(desc(tenants.createdAt));
    return rows.map((t) => this.mapRow(t));
  }

  async getById(id: string) {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id)).limit(1);
    return tenant ? this.mapRow(tenant) : undefined;
  }

  async getBySecretKey(secretKey: string) {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.secretKey, secretKey)).limit(1);
    return tenant ? this.mapRow(tenant) : undefined;
  }

  async getByPublicKey(publicKey: string) {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.publicKey, publicKey)).limit(1);
    return tenant ? this.mapRow(tenant) : undefined;
  }

  async getByDeviceToken(deviceToken: string) {
    if (!deviceToken) return undefined;
    const [tenant] = await db.select().from(tenants).where(eq(tenants.deviceToken, deviceToken)).limit(1);
    return tenant ? this.mapRow(tenant) : undefined;
  }

  async create(data: typeof tenants.$inferInsert) {
    const rows = await db.insert(tenants).values(data).returning();
    if (!rows[0]) {
      throw new Error('Gagal membuat tenant: tidak ada row yang di-return oleh insert');
    }
    return this.mapRow(rows[0]);
  }

  async update(id: string, patch: Partial<typeof tenants.$inferInsert>) {
    const [tenant] = await db.update(tenants).set(patch).where(eq(tenants.id, id)).returning();
    return tenant ? this.mapRow(tenant) : undefined;
  }

  async delete(id: string) {
    const result = await db.delete(tenants).where(eq(tenants.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async recordHeartbeat(deviceToken: string, info: { battery?: number; model?: string; isCharging?: boolean }) {
    const tenant = await this.getByDeviceToken(deviceToken);
    if (!tenant) return false;

    const updates: Record<string, any> = {
      deviceLastSeen: new Date(),
    };
    if (info.battery !== undefined) updates.deviceBattery = info.battery;
    if (info.model !== undefined) updates.deviceModel = info.model;
    if (info.isCharging !== undefined) updates.deviceIsCharging = info.isCharging;

    await db.update(tenants).set(updates).where(eq(tenants.id, tenant.id));
    return true;
  }
}

export const tenantRepo = new TenantRepository();