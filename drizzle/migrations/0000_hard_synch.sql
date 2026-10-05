CREATE TABLE "audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"user_email" text NOT NULL,
	"action" text NOT NULL,
	"target_tenant_id" text,
	"target_tenant_name" text,
	"details" jsonb,
	"ip_address" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "charges" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"tenant_name" text,
	"order_id" text NOT NULL,
	"amount" integer NOT NULL,
	"unique_code" integer NOT NULL,
	"total_amount" integer NOT NULL,
	"customer_name" text,
	"customer_email" text,
	"raw_qris" text NOT NULL,
	"qr_data_url" text NOT NULL,
	"status" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"paid_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"public_key" text NOT NULL,
	"secret_key" text NOT NULL,
	"webhook_url" text NOT NULL,
	"static_qris" text,
	"device_token" text,
	"device_last_seen" timestamp,
	"device_battery" integer,
	"device_model" text,
	"device_is_charging" boolean,
	"telegram_bot_token" text,
	"telegram_chat_id" text,
	"subscription_tier" text DEFAULT 'pro',
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tenants_public_key_unique" UNIQUE("public_key"),
	CONSTRAINT "tenants_secret_key_unique" UNIQUE("secret_key")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text NOT NULL,
	"role" text DEFAULT 'merchant' NOT NULL,
	"tenant_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "webhook_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"charge_id" text NOT NULL,
	"order_id" text NOT NULL,
	"target_url" text NOT NULL,
	"payload" jsonb NOT NULL,
	"status" text NOT NULL,
	"status_code" integer,
	"response_body" text,
	"attempted_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "charges" ADD CONSTRAINT "charges_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_logs" ADD CONSTRAINT "webhook_logs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_audit_created" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_charges_status_amount" ON "charges" USING btree ("status","total_amount");--> statement-breakpoint
CREATE INDEX "idx_charges_tenant" ON "charges" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_charges_expires" ON "charges" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_charges_created_at" ON "charges" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_tenants_device_token" ON "tenants" USING btree ("device_token");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_users_email" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_users_tenant" ON "users" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_webhook_tenant" ON "webhook_logs" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_webhook_attempted" ON "webhook_logs" USING btree ("attempted_at");