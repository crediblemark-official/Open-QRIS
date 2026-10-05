import { pgTable, text, timestamp, integer, boolean, jsonb, uniqueIndex, index } from 'drizzle-orm/pg-core';

// ============ TENANTS ============
export const tenants = pgTable('tenants', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  publicKey: text('public_key').notNull().unique(),
  secretKey: text('secret_key').notNull().unique(),
  webhookUrl: text('webhook_url').notNull(),
  staticQris: text('static_qris'),
  deviceToken: text('device_token'),
  deviceLastSeen: timestamp('device_last_seen'),
  deviceBattery: integer('device_battery'),
  deviceModel: text('device_model'),
  deviceIsCharging: boolean('device_is_charging'),
  telegramBotToken: text('telegram_bot_token'),
  telegramChatId: text('telegram_chat_id'),
  subscriptionTier: text('subscription_tier').default('pro'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  deviceTokenIdx: index('idx_tenants_device_token').on(table.deviceToken),
}));

// ============ USERS ============
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  role: text('role', { enum: ['admin', 'merchant'] }).default('merchant').notNull(),
  tenantId: text('tenant_id').references(() => tenants.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  emailIdx: uniqueIndex('idx_users_email').on(table.email),
  tenantIdx: index('idx_users_tenant').on(table.tenantId),
}));

// ============ CHARGES ============
export const charges = pgTable('charges', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  tenantName: text('tenant_name'),
  orderId: text('order_id').notNull(),
  amount: integer('amount').notNull(),
  uniqueCode: integer('unique_code').notNull(),
  totalAmount: integer('total_amount').notNull(),
  customerName: text('customer_name'),
  customerEmail: text('customer_email'),
  rawQris: text('raw_qris').notNull(),
  qrDataUrl: text('qr_data_url').notNull(),
  status: text('status', { enum: ['PENDING', 'PAID', 'EXPIRED', 'CANCELLED'] }).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  paidAt: timestamp('paid_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  statusAmountIdx: index('idx_charges_status_amount').on(table.status, table.totalAmount),
  tenantIdx: index('idx_charges_tenant').on(table.tenantId),
  expiresIdx: index('idx_charges_expires').on(table.expiresAt),
  createdAtIdx: index('idx_charges_created_at').on(table.createdAt),
}));

// ============ WEBHOOK LOGS ============
export const webhookLogs = pgTable('webhook_logs', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  chargeId: text('charge_id').notNull(),
  orderId: text('order_id').notNull(),
  targetUrl: text('target_url').notNull(),
  payload: jsonb('payload').notNull(),
  status: text('status', { enum: ['SUCCESS', 'FAILED', 'PENDING'] }).notNull(),
  statusCode: integer('status_code'),
  responseBody: text('response_body'),
  attemptedAt: timestamp('attempted_at').defaultNow().notNull(),
}, (table) => ({
  tenantIdx: index('idx_webhook_tenant').on(table.tenantId),
  attemptedIdx: index('idx_webhook_attempted').on(table.attemptedAt),
}));

// ============ AUDIT LOGS ============
export const auditLogs = pgTable('audit_logs', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  userEmail: text('user_email').notNull(),
  action: text('action').notNull(),
  targetTenantId: text('target_tenant_id'),
  targetTenantName: text('target_tenant_name'),
  details: jsonb('details'),
  ipAddress: text('ip_address'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  createdIdx: index('idx_audit_created').on(table.createdAt),
}));

// ============ SETTINGS ============
export const settings = pgTable('settings', {
  key: text('key').primaryKey(),
  value: jsonb('value').notNull(),
});

// ============ TYPES ============
export type Tenant = typeof tenants.$inferSelect;
export type NewTenant = typeof tenants.$inferInsert;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Charge = typeof charges.$inferSelect;
export type NewCharge = typeof charges.$inferInsert;
export type WebhookLog = typeof webhookLogs.$inferSelect;
export type NewWebhookLog = typeof webhookLogs.$inferInsert;
export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
export type GatewaySettings = { defaultStaticQRIS: string; useUniqueCode: boolean; expiryMinutes: number };