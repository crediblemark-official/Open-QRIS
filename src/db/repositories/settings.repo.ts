import { db } from '../index';
import { settings } from '../schema';
import { eq } from 'drizzle-orm';

export interface GatewaySettings {
  defaultStaticQRIS: string;
  useUniqueCode: boolean;
  expiryMinutes: number;
}

export class SettingsRepository {
  get(): GatewaySettings {
    // This needs to be run in an async context or we need a sync version
    // For now, we'll use a synchronous approach by running a query
    // In practice, this would need to be called in an async context
    throw new Error('Use getAsync() instead');
  }

  async getAsync(): Promise<GatewaySettings> {
    const row = await db.select().from(settings).where(eq(settings.key, 'gateway')).limit(1);
    if (row[0]?.value) {
      if (typeof row[0].value === 'string') {
        try {
          return JSON.parse(row[0].value);
        } catch (e) {}
      } else {
        return row[0].value as GatewaySettings;
      }
    }
    return {
      defaultStaticQRIS: '',
      useUniqueCode: true,
      expiryMinutes: 30,
    };
  }

  async update(patch: Partial<GatewaySettings>): Promise<GatewaySettings> {
    const current = await this.getAsync();
    const updated: GatewaySettings = {
      defaultStaticQRIS: patch.defaultStaticQRIS !== undefined ? patch.defaultStaticQRIS : current.defaultStaticQRIS,
      useUniqueCode: patch.useUniqueCode !== undefined ? patch.useUniqueCode : current.useUniqueCode,
      expiryMinutes: patch.expiryMinutes !== undefined ? patch.expiryMinutes : current.expiryMinutes,
    };

    await db.insert(settings)
      .values({ key: 'gateway', value: updated })
      .onConflictDoUpdate({
        target: settings.key,
        set: { value: updated },
      });

    return updated;
  }
}

export const settingsRepo = new SettingsRepository();