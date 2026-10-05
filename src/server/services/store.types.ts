/**
 * Store Types
 * Type definitions untuk store
 */

export interface TenantApp {
  id: string;
  name: string;
  publicKey: string;
  secretKey: string;
  webhookUrl: string;
  staticQRIS?: string;
  deviceToken?: string;
  deviceLastSeen?: string;
  deviceBattery?: number;
  deviceModel?: string;
  deviceIsCharging?: boolean;
  telegramBotToken?: string;
  telegramChatId?: string;
  subscriptionTier?: string;
  createdAt: string;
}

export interface UserAccount {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: 'admin' | 'merchant';
  tenantId?: string;
  createdAt: string;
}

export interface Charge {
  id: string;
  tenantId: string;
  tenantName?: string;
  orderId: string;
  amount: number;
  uniqueCode: number;
  totalAmount: number;
  customerName?: string;
  customerEmail?: string;
  rawQRIS: string;
  qrDataUrl: string;
  status: 'PENDING' | 'PAID' | 'EXPIRED' | 'CANCELLED';
  expiresAt: Date;
  paidAt?: Date | null;
  createdAt: Date;
}

export interface WebhookLog {
  id: string;
  tenantId: string;
  chargeId: string;
  orderId: string;
  targetUrl: string;
  payload: any;
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  statusCode?: number | null;
  responseBody?: string | null;
  attemptedAt: string | Date;
}

export interface GatewaySettings {
  defaultStaticQRIS: string;
  useUniqueCode: boolean;
  expiryMinutes: number;
}

export interface ChargeFilterOptions {
  tenantId?: string;
  search?: string;
  status?: string;
  dateRange?: string;
  page?: number;
  limit?: number;
}

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

export interface AuditLog {
  id: string;
  userId: string;
  userEmail: string;
  action: string;
  targetTenantId?: string;
  targetTenantName?: string;
  details?: any;
  ipAddress?: string;
  createdAt: string;
}
