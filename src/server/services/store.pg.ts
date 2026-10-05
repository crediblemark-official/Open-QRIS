/**
 * OpenQRIS Drizzle ORM Store (PostgreSQL)
 * Facade yang menggunakan repository pattern dengan Drizzle ORM
 */

import { tenantRepo } from '../../db/repositories/tenant.repo';
import { chargeRepo } from '../../db/repositories/charge.repo';
import { userRepo } from '../../db/repositories/user.repo';
import { webhookLogRepo } from '../../db/repositories/webhook.repo';
import { auditLogRepo } from '../../db/repositories/audit.repo';
import { settingsRepo } from '../../db/repositories/settings.repo';

// Import and re-export types
import type { 
  TenantApp, 
  UserAccount, 
  Charge, 
  WebhookLog, 
  GatewaySettings, 
  ChargeFilterOptions, 
  WebhookLogFilterOptions, 
  PaginatedResult, 
  AuditLog 
} from './store.types';

export type { 
  TenantApp, 
  UserAccount, 
  Charge, 
  WebhookLog, 
  GatewaySettings, 
  ChargeFilterOptions, 
  WebhookLogFilterOptions, 
  PaginatedResult, 
  AuditLog 
};

class DrizzleStore {
  // --- SETTINGS ---
  async getSettings() {
    return settingsRepo.getAsync();
  }

  async updateSettings(patch: Partial<GatewaySettings>) {
    return settingsRepo.update(patch);
  }

  // --- TENANTS / SAAS APPS ---
  async getTenants() {
    return tenantRepo.getAll();
  }

  async getTenantById(id: string) {
    return tenantRepo.getById(id);
  }

  async getTenantBySecretKey(secretKey: string) {
    return tenantRepo.getBySecretKey(secretKey);
  }

  async getTenantByPublicKey(publicKey: string) {
    return tenantRepo.getByPublicKey(publicKey);
  }

  async getTenantByDeviceToken(deviceToken: string) {
    return tenantRepo.getByDeviceToken(deviceToken);
  }

  async createTenant(payload: {
    name: string;
    webhookUrl: string;
    staticQRIS?: string;
    telegramBotToken?: string;
    telegramChatId?: string;
    subscriptionTier?: string;
  }) {
    const randomHex = () => Math.random().toString(36).substring(2, 10);
    const tenant = {
      id: `app_${randomHex()}`,
      name: payload.name,
      publicKey: `pk_live_${randomHex()}${randomHex()}`,
      secretKey: `sk_live_${randomHex()}${randomHex()}${randomHex()}`,
      webhookUrl: payload.webhookUrl,
      staticQris: payload.staticQRIS || null,
      deviceToken: `dev_${randomHex()}${randomHex()}`,
      telegramBotToken: payload.telegramBotToken || null,
      telegramChatId: payload.telegramChatId || null,
      subscriptionTier: payload.subscriptionTier || 'pro',
      createdAt: new Date(),
    };

    return tenantRepo.create(tenant);
  }

  async updateTenant(
    id: string,
    patch: Partial<typeof import('../../db/schema').tenants.$inferInsert> & { staticQRIS?: string }
  ) {
    const formattedPatch: any = { ...patch };
    if (patch.staticQRIS !== undefined && formattedPatch.staticQris === undefined) {
      formattedPatch.staticQris = patch.staticQRIS;
      delete formattedPatch.staticQRIS;
    }
    return tenantRepo.update(id, formattedPatch);
  }

  async deleteTenant(id: string) {
    return tenantRepo.delete(id);
  }

  async recordDeviceHeartbeat(
    deviceToken: string,
    info: { battery?: number; model?: string; isCharging?: boolean }
  ): Promise<boolean> {
    return tenantRepo.recordHeartbeat(deviceToken, info);
  }

  // --- USERS & AUTH ---
  async createUser(payload: {
    id?: string;
    email: string;
    passwordHash: string;
    name: string;
    role?: 'admin' | 'merchant';
    tenantId?: string;
  }) {
    const randomHex = () => Math.random().toString(36).substring(2, 10);
    return userRepo.create({
      id: payload.id || `usr_${randomHex()}`,
      email: payload.email.toLowerCase().trim(),
      passwordHash: payload.passwordHash,
      name: payload.name,
      role: payload.role || 'merchant',
      tenantId: payload.tenantId,
      createdAt: new Date(),
    });
  }

  async getUserByEmail(email: string) {
    return userRepo.getByEmail(email);
  }

  async getUserById(id: string) {
    return userRepo.getById(id);
  }

  async getUserByTenantId(tenantId: string) {
    return userRepo.getByTenantId(tenantId);
  }

  async updateUser(id: string, patch: Partial<typeof import('../../db/schema').users.$inferInsert>) {
    return userRepo.update(id, patch);
  }

  async updateUserByEmail(email: string, patch: Partial<typeof import('../../db/schema').users.$inferInsert>) {
    return userRepo.updateByEmail(email, patch);
  }

  // --- CHARGES / TRANSAKSI ---
  async getCharges(tenantId?: string) {
    return chargeRepo.getAll(tenantId);
  }

  async getChargesPaginated(options: ChargeFilterOptions = {}): Promise<PaginatedResult<Charge>> {
    return chargeRepo.getPaginated(options);
  }

  async getChargeById(id: string) {
    return chargeRepo.getById(id);
  }

  async getPendingChargeByAmount(amount: number, tenantId?: string) {
    return chargeRepo.getPendingByAmount(amount, tenantId);
  }

  async findAvailableUniqueCode(baseAmount: number) {
    return chargeRepo.findAvailableUniqueCode(baseAmount);
  }

  async createCharge(charge: Charge) {
    return chargeRepo.create(charge);
  }

  async updateChargeStatus(id: string, status: 'PAID' | 'EXPIRED' | 'CANCELLED') {
    return chargeRepo.updateStatus(id, status);
  }

  async reapExpiredCharges(): Promise<number> {
    return chargeRepo.reapExpired();
  }

  // --- WEBHOOK LOGS ---
  async logWebhook(log: WebhookLog) {
    return webhookLogRepo.log({
      id: log.id,
      tenantId: log.tenantId,
      chargeId: log.chargeId,
      orderId: log.orderId,
      targetUrl: log.targetUrl,
      payload: log.payload,
      status: log.status,
      statusCode: log.statusCode ?? null,
      responseBody: log.responseBody ?? null,
      attemptedAt: typeof log.attemptedAt === 'string' ? new Date(log.attemptedAt) : (log.attemptedAt || new Date()),
    });
  }

  async getWebhookLogs(tenantId?: string): Promise<WebhookLog[]> {
    return webhookLogRepo.getAll(tenantId);
  }

  async getWebhookLogsPaginated(options: WebhookLogFilterOptions = {}): Promise<PaginatedResult<WebhookLog>> {
    return webhookLogRepo.getPaginated(options);
  }

  // --- AUDIT TRAIL LOGGING ---
  async logAudit(log: AuditLog) {
    return auditLogRepo.log(log);
  }

  async getAuditLogs(limit = 100) {
    return auditLogRepo.getAll(limit);
  }
}

export const store = new DrizzleStore();