import { db } from '../index';
import { webhookLogs } from '../schema';
import { eq, desc, and, or, ilike, count } from 'drizzle-orm';
import type { WebhookLog } from '../schema';

export interface WebhookLogFilterOptions {
  tenantId?: string;
  search?: string;
  status?: string;
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

export class WebhookLogRepository {
  private mapRow(r: any): WebhookLog {
    let parsedPayload: any = r.payload;
    try {
      parsedPayload = typeof r.payload === 'string' ? JSON.parse(r.payload) : r.payload;
    } catch (e) {}

    return {
      id: r.id,
      tenantId: r.tenantId,
      chargeId: r.chargeId,
      orderId: r.orderId,
      targetUrl: r.targetUrl,
      payload: parsedPayload,
      status: r.status,
      statusCode: r.statusCode ?? null,
      responseBody: r.responseBody ?? null,
      attemptedAt: r.attemptedAt,
    };
  }

  async log(log: typeof webhookLogs.$inferInsert) {
    await db.insert(webhookLogs).values({
      ...log,
      payload: typeof log.payload === 'string' ? log.payload : JSON.stringify(log.payload),
    });
  }

  async getAll(tenantId?: string): Promise<WebhookLog[]> {
    let query = db.select().from(webhookLogs);
    if (tenantId) query.where(eq(webhookLogs.tenantId, tenantId));
    query.orderBy(desc(webhookLogs.attemptedAt)).limit(500);
    const rows = await query;
    return rows.map(this.mapRow);
  }

  async getPaginated(options: {
    tenantId?: string;
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{ items: WebhookLog[]; total: number; page: number; limit: number; totalPages: number }> {
    const page = Math.max(1, options.page ?? 1);
    const limit = Math.min(200, Math.max(1, options.limit ?? 25));
    const offset = (page - 1) * limit;

    const conditions = [];
    if (options.tenantId) conditions.push(eq(webhookLogs.tenantId, options.tenantId));
    if (options.status && options.status !== 'ALL') {
      conditions.push(eq(webhookLogs.status, options.status as 'PENDING' | 'SUCCESS' | 'FAILED'));
    }
    if (options.search?.trim()) {
      const q = `%${options.search.trim()}%`;
      conditions.push(
        or(
          ilike(webhookLogs.orderId, q),
          ilike(webhookLogs.chargeId, q),
          ilike(webhookLogs.targetUrl, q),
          ilike(webhookLogs.id, q)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [countResult] = await db.select({ count: count() }).from(webhookLogs).where(whereClause);
    const total = Number(countResult?.count ?? 0);
    const totalPages = Math.max(1, Math.ceil(total / limit));

    const rows = await db.select()
      .from(webhookLogs)
      .where(whereClause)
      .orderBy(desc(webhookLogs.attemptedAt))
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
}

export const webhookLogRepo = new WebhookLogRepository();