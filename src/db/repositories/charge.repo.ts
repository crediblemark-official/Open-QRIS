import { db } from '../index';
import { charges } from '../schema';
import { eq, desc, and, gte, lte, or, like, count, sql, isNotNull } from 'drizzle-orm';
import type { Charge } from '../schema';

export interface ChargeFilterOptions {
  tenantId?: string;
  search?: string;
  status?: string;
  dateRange?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class ChargeRepository {
  private mapRow(c: any): any {
    return {
      id: c.id,
      tenantId: c.tenantId,
      tenantName: c.tenantName,
      orderId: c.orderId,
      amount: c.amount,
      uniqueCode: c.uniqueCode,
      totalAmount: c.totalAmount,
      customerName: c.customerName,
      customerEmail: c.customerEmail,
      rawQris: c.rawQris || c.rawQRIS,
      rawQRIS: c.rawQris || c.rawQRIS,
      qrDataUrl: c.qrDataUrl,
      status: c.status,
      expiresAt: c.expiresAt,
      paidAt: c.paidAt,
      createdAt: c.createdAt,
    };
  }

  async getAll(tenantId?: string) {
    const query = db.select().from(charges);
    if (tenantId) query.where(eq(charges.tenantId, tenantId));
    query.orderBy(desc(charges.createdAt));
    const rows = await query;
    return rows.map(this.mapRow);
  }

  async getPaginated(options: {
    tenantId?: string;
    search?: string;
    status?: string;
    dateRange?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{ items: any[]; total: number; page: number; limit: number; totalPages: number }> {
    const page = Math.max(1, options.page ?? 1);
    const limit = Math.min(200, Math.max(1, options.limit ?? 25));
    const offset = (page - 1) * limit;

    const conditions = [];
    if (options.tenantId) conditions.push(eq(charges.tenantId, options.tenantId));
    if (options.status && options.status !== 'ALL') conditions.push(eq(charges.status, options.status as any));
    
    if (options.dateRange && options.dateRange !== 'ALL') {
      const now = Date.now();
      let msAgo = 0;
      if (options.dateRange === 'TODAY') msAgo = 24 * 3600 * 1000;
      else if (options.dateRange === '7D') msAgo = 7 * 24 * 3600 * 1000;
      else if (options.dateRange === '30D') msAgo = 30 * 24 * 3600 * 1000;
      if (msAgo > 0) conditions.push(gte(charges.createdAt, new Date(now - msAgo)));
    }

    if (options.search?.trim()) {
      const q = `%${options.search.trim()}%`;
      conditions.push(sql`(
        ${charges.orderId} LIKE ${q} OR 
        ${charges.id} LIKE ${q} OR 
        ${charges.customerName} LIKE ${q} OR 
        ${charges.tenantName} LIKE ${q}
      )`);
    }

    const whereClause = conditions.length > 0 ? sql`${conditions[0]}${conditions.slice(1).map(c => sql` AND ${c}`)}` : undefined;

    const [countResult] = await db.select({ count: count() }).from(charges).where(whereClause);
    const total = Number(countResult?.count ?? 0);
    const totalPages = Math.max(1, Math.ceil(total / limit));

    const rows = await db.select()
      .from(charges)
      .where(whereClause)
      .orderBy(desc(charges.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      items: rows.map(this.mapRow),
      total,
      page,
      limit,
      totalPages,
    };
  }

  async getById(id: string) {
    const [row] = await db.select().from(charges).where(eq(charges.id, id)).limit(1);
    return row ? this.mapRow(row) : undefined;
  }

  async getPendingByAmount(amount: number, tenantId?: string) {
    const whereConditions = [
      eq(charges.status, 'PENDING'),
      gte(charges.expiresAt, new Date()),
      sql`(${charges.totalAmount} = ${amount} OR ${charges.amount} = ${amount})`,
    ];
    if (tenantId) whereConditions.push(eq(charges.tenantId, tenantId));

    const [row] = await db.select().from(charges)
      .where(and(...whereConditions))
      .orderBy(desc(charges.createdAt))
      .limit(1);

    return row ? this.mapRow(row) : undefined;
  }

  async findAvailableUniqueCode(baseAmount: number): Promise<{ uniqueCode: number; totalAmount: number }> {
    const now = new Date();
    const activeCharges = await db.select({ totalAmount: charges.totalAmount })
      .from(charges)
      .where(and(eq(charges.status, 'PENDING'), gte(charges.expiresAt, now)));

    const activeTotals = new Set<number>(activeCharges.map((c) => Math.round(c.totalAmount)));

    for (let attempts = 0; attempts < 100; attempts++) {
      const candidateCode = Math.floor(Math.random() * 980) + 11;
      const candidateTotal = baseAmount + candidateCode;
      if (!activeTotals.has(candidateTotal)) {
        return { uniqueCode: candidateCode, totalAmount: candidateTotal };
      }
    }

    for (let candidateCode = 1; candidateCode <= 999; candidateCode++) {
      const candidateTotal = baseAmount + candidateCode;
      if (!activeTotals.has(candidateTotal)) {
        return { uniqueCode: candidateCode, totalAmount: candidateTotal };
      }
    }

    return { uniqueCode: 1, totalAmount: baseAmount + 1 };
  }

  async create(charge: any) {
    const data = {
      id: charge.id,
      tenantId: charge.tenantId,
      tenantName: charge.tenantName ?? null,
      orderId: charge.orderId,
      amount: charge.amount,
      uniqueCode: charge.uniqueCode,
      totalAmount: charge.totalAmount,
      customerName: charge.customerName ?? null,
      customerEmail: charge.customerEmail ?? null,
      rawQris: charge.rawQris || charge.rawQRIS,
      qrDataUrl: charge.qrDataUrl,
      status: charge.status,
      expiresAt: charge.expiresAt instanceof Date ? charge.expiresAt : new Date(charge.expiresAt),
      paidAt: charge.paidAt ? (charge.paidAt instanceof Date ? charge.paidAt : new Date(charge.paidAt)) : null,
      createdAt: charge.createdAt ? (charge.createdAt instanceof Date ? charge.createdAt : new Date(charge.createdAt)) : new Date(),
    };
    const [row] = await db.insert(charges).values(data).returning();
    return row ? this.mapRow(row) : undefined;
  }

  async updateStatus(id: string, status: 'PAID' | 'EXPIRED' | 'CANCELLED') {
    const paidAt = status === 'PAID' ? new Date() : undefined;
    await db.update(charges)
      .set({ status, paidAt: paidAt ? sql`${new Date()}` : undefined })
      .where(eq(charges.id, id));

    return this.getById(id);
  }

  async reapExpired(): Promise<number> {
    const now = new Date();
    const result = await db.update(charges)
      .set({ status: 'EXPIRED' })
      .where(and(eq(charges.status, 'PENDING'), sql`${charges.expiresAt} <= ${now}`));
    
    return result.rowCount ?? 0;
  }
}

export const chargeRepo = new ChargeRepository();