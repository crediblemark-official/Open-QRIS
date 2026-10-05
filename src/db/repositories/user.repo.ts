import { db } from '../index';
import { users } from '../schema';
import { eq } from 'drizzle-orm';
import type { User } from '../schema';

export class UserRepository {
  private mapRow(r: any): User {
    return {
      id: r.id,
      email: r.email,
      passwordHash: r.passwordHash,
      name: r.name,
      role: r.role,
      tenantId: r.tenantId,
      createdAt: r.createdAt,
    };
  }

  async create(data: typeof users.$inferInsert) {
    const [user] = await db.insert(users).values(data).returning();
    return this.mapRow(user);
  }

  async getByEmail(email: string) {
    if (!email) return undefined;
    const [r] = await db.select().from(users).where(eq(users.email, email.toLowerCase().trim())).limit(1);
    return r ? this.mapRow(r) : undefined;
  }

  async getById(id: string) {
    if (!id) return undefined;
    const [r] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return r ? this.mapRow(r) : undefined;
  }

  async getByTenantId(tenantId: string) {
    if (!tenantId) return undefined;
    const [r] = await db.select().from(users).where(eq(users.tenantId, tenantId)).limit(1);
    return r ? this.mapRow(r) : undefined;
  }

  async update(id: string, data: Partial<typeof users.$inferInsert>) {
    const [user] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return user ? this.mapRow(user) : undefined;
  }

  async updateByEmail(email: string, data: Partial<typeof users.$inferInsert>) {
    if (!email) return undefined;
    const [user] = await db.update(users).set(data).where(eq(users.email, email.toLowerCase().trim())).returning();
    return user ? this.mapRow(user) : undefined;
  }
}

export const userRepo = new UserRepository();