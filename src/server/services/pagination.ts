/**
 * Generic Pagination Helper
 * Abstract pagination logic untuk mengurangi duplikasi kode
 */

export interface PaginationOptions {
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

export interface FilterCondition {
  clause: string;
  param: any;
}

export function buildPagination(options: PaginationOptions): {
  page: number;
  limit: number;
  offset: number;
} {
  const page = Math.max(1, Number(options.page) || 1);
  const limit = Math.min(200, Math.max(1, Number(options.limit) || 25));
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

export function buildWhereClause(conditions: FilterCondition[]): {
  whereClause: string;
  params: any[];
} {
  const validConditions = conditions.filter((c) => c.clause && c.clause.trim());
  const whereClause = validConditions.length > 0 ? `WHERE ${validConditions.map((c) => c.clause).join(' AND ')}` : '';
  const params = validConditions.map((c) => c.param);

  return { whereClause, params };
}

export function buildSearchCondition(
  search: string | undefined,
  fields: string[]
): FilterCondition | null {
  if (!search || !search.trim()) return null;
  const q = `%${search.trim()}%`;
  const clause = `(${fields.map((f) => `${f} LIKE ?`).join(' OR ')})`;
  return { clause, param: q };
}

export function buildDateRangeCondition(
  dateRange: string | undefined,
  dateField: string = 'created_at'
): FilterCondition | null {
  if (!dateRange || dateRange === 'ALL') return null;

  const now = Date.now();
  let msAgo = 0;

  if (dateRange === 'TODAY') msAgo = 24 * 3600 * 1000;
  else if (dateRange === '7D') msAgo = 7 * 24 * 3600 * 1000;
  else if (dateRange === '30D') msAgo = 30 * 24 * 3600 * 1000;

  if (msAgo === 0) return null;

  const cutoffIso = new Date(now - msAgo).toISOString();
  return { clause: `${dateField} >= ?`, param: cutoffIso };
}

export function buildStatusCondition(
  status: string | undefined,
  statusField: string = 'status'
): FilterCondition | null {
  if (!status || status === 'ALL') return null;
  return { clause: `${statusField} = ?`, param: status.toUpperCase() };
}

export function buildTenantCondition(
  tenantId: string | undefined,
  tenantField: string = 'tenant_id'
): FilterCondition | null {
  if (!tenantId) return null;
  return { clause: `${tenantField} = ?`, param: tenantId };
}

export function createPaginatedResult<T>(
  items: T[],
  total: number,
  page: number,
  limit: number
): PaginatedResult<T> {
  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}
