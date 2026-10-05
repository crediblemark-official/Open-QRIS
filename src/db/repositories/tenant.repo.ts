import { db } from '../index';
import { tenants } from '../schema';
import { eq, desc, isNull } from 'drizzle-orm';
import type { Tenant, NewTenant } from '../schema';

export class TenantRepository {
  async getAll() {
    return db.select().from(tenants).orderBy(desc(tenants.createdAt));
  }

  async getById(id: string) {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id)).limit(1);
    return tenant;
  }

  async getBySecretKey(secretKey: string) {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.secretKey, secretKey)).limit(1);
    return tenant;
  }

  async getByPublicKey(publicKey: string) {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.publicKey, publicKey)).limit(1);
    return tenant;
  }

  async getByDeviceToken(deviceToken: string) {
    if (!deviceToken) return undefined;
    const [tenant] = await db.select().from(tenants).where(eq(tenants.deviceToken, deviceToken)).limit(1);
    return tenant;
  }

  async create(data: typeof tenants.$inferInsert) {
    const [tenant] = await db.insert(tenants).values(data).returning();
    return tenant;
  }

  async update(id: string, patch: Partial<typeof tenants.$inferInsert>) {
    const [tenant] = await db.update(tenants).set(patch).where(eq(tenants.id, id)).returning();
    return tenant;
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