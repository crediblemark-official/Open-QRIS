import { db } from '../index';
import { auditLogs } from '../schema';
import { desc, count } from 'drizzle-orm';
import type { AuditLog } from '../schema';

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class AuditLogRepository {
  async log(log: {
    id: string;
    userId: string;
    userEmail: string;
    action: string;
    targetTenantId?: string;
    targetTenantName?: string;
    details?: any;
    ipAddress?: string;
    createdAt: string;
  }) {
    await db.insert(auditLogs).values({
      id: log.id,
      userId: log.userId,
      userEmail: log.userEmail,
      action: log.action,
      targetTenantId: log.targetTenantId ?? null,
      targetTenantName: log.targetTenantName ?? null,
      details: log.details ?? null,
      ipAddress: log.ipAddress ?? null,
      createdAt: log.createdAt ? new Date(log.createdAt) : new Date(),
    });
  }

  async getAll(limit = 100) {
    const rows = await db.select()
      .from(auditLogs)
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);

    return rows.map(r => ({
      id: r.id,
      userId: r.userId,
      userEmail: r.userEmail,
      action: r.action,
      targetTenantId: r.targetTenantId ?? undefined,
      targetTenantName: r.targetTenantName ?? undefined,
      details: r.details ?? undefined,
      ipAddress: r.ipAddress ?? undefined,
      createdAt: r.createdAt ? r.createdAt.toISOString() : new Date().toISOString(),
    }));
  }
}

export const auditLogRepo = new AuditLogRepository();