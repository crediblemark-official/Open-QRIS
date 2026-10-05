/**
 * Shared TypeScript Types untuk OpenQRIS Frontend
 * Mengurangi penggunaan `any` dan meningkatkan type safety
 */

export interface Tenant {
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
  expiresAt: string;
  paidAt?: string;
  createdAt: string;
}

export interface WebhookLog {
  id: string;
  tenantId: string;
  chargeId: string;
  orderId: string;
  targetUrl: string;
  payload: any;
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  statusCode?: number;
  responseBody?: string;
  attemptedAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userEmail: string;
  action: 'CREATE_PAYMENT_LINK' | 'DELETE_TENANT' | 'UPDATE_SETTINGS' | 'UPDATE_TENANT';
  targetTenantId?: string;
  targetTenantName?: string;
  details?: any;
  ipAddress?: string;
  createdAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'merchant';
  tenantId?: string;
  provider?: string;
  tenant?: Tenant;
}

export interface GatewaySettings {
  defaultStaticQRIS: string;
  useUniqueCode: boolean;
  expiryMinutes: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  code?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export type TransactionStatus = 'PENDING' | 'PAID' | 'EXPIRED' | 'CANCELLED';
export type WebhookStatus = 'SUCCESS' | 'FAILED' | 'PENDING';
export type UserRole = 'admin' | 'merchant';
export type DateRange = 'ALL' | 'TODAY' | '7D' | '30D';
