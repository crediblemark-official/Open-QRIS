/**
 * Hexclave (formerly Stack Auth) Integration Service
 * Menghubungkan gateway ke user infrastructure Hexclave untuk verifikasi pengguna,
 * autentikasi session, dan RBAC.
 */

export interface HexclaveConfig {
  projectId: string;
  publishableClientKey?: string;
  secretServerKey: string;
  apiUrl?: string;
}

export interface HexclaveUser {
  id: string;
  email?: string;
  displayName?: string;
  primaryEmail?: string;
  roles?: string[];
  [key: string]: any;
}

export class HexclaveService {
  private getEffectiveConfig(): HexclaveConfig | null {
    const projectId = process.env.HEXCLAVE_PROJECT_ID || process.env.STACK_PROJECT_ID;
    const secretServerKey = process.env.HEXCLAVE_SECRET_SERVER_KEY || process.env.STACK_SECRET_SERVER_KEY;
    const publishableClientKey = process.env.HEXCLAVE_PUBLISHABLE_CLIENT_KEY || process.env.STACK_PUBLISHABLE_CLIENT_KEY;
    let apiUrl = process.env.HEXCLAVE_API_URL || 'https://apigcp.hexclave.com';

    if (!apiUrl.endsWith('/api/v1')) {
      apiUrl = apiUrl.replace(/\/$/, '') + '/api/v1';
    }

    if (!projectId || !secretServerKey) {
      return null;
    }

    return {
      projectId,
      publishableClientKey,
      secretServerKey,
      apiUrl,
    };
  }

  isConfigured(): boolean {
    return this.getEffectiveConfig() !== null;
  }

  getPublicConfig() {
    const cfg = this.getEffectiveConfig();
    return {
      enabled: cfg !== null,
      projectId: cfg ? cfg.projectId : null,
      publishableClientKey: cfg ? cfg.publishableClientKey : null,
    };
  }

  /**
   * Verifikasi Access Token pengguna langsung ke REST API Hexclave
   */
  async verifyAccessToken(accessToken: string): Promise<{ success: boolean; user?: HexclaveUser; error?: string }> {
    const cfg = this.getEffectiveConfig();
    if (!cfg) {
      return { success: false, error: 'Hexclave belum dikonfigurasi di server' };
    }

    const endpoints = [
      `${cfg.apiUrl}/users/me`,
      `https://api.hexclave.com/api/v1/users/me`,
      `https://api.stack-auth.com/api/v1/users/me`,
    ];

    for (const url of endpoints) {
      try {
        const res = await fetch(url, {
          method: 'GET',
          headers: {
            'X-Stack-Access-Type': 'server',
            'X-Stack-Project-Id': cfg.projectId,
            'X-Stack-Secret-Server-Key': cfg.secretServerKey,
            'X-Stack-Access-Token': accessToken,
          },
          signal: AbortSignal.timeout(8000),
        });

        if (res.ok) {
          const user = (await res.json()) as HexclaveUser;
          return { success: true, user };
        }
      } catch (e: any) {
        // Coba endpoint fallback
      }
    }

    return { success: false, error: 'Sesi token Hexclave tidak valid atau kadaluarsa' };
  }

  /**
   * Sign In via Email & Password melalui API Hexclave
   */
  async signInWithPassword(email: string, password: string): Promise<{ success: boolean; token?: string; user?: HexclaveUser; error?: string }> {
    const cfg = this.getEffectiveConfig();
    if (!cfg) {
      return { success: false, error: 'Hexclave belum dikonfigurasi. Silakan isi HEXCLAVE_PROJECT_ID dan HEXCLAVE_SECRET_SERVER_KEY di .env' };
    }

    const endpoints = [
      `${cfg.apiUrl}/auth/password/sign-in`,
      `https://api.hexclave.com/api/v1/auth/password/sign-in`,
      `https://api.stack-auth.com/api/v1/auth/password/sign-in`,
    ];

    for (const url of endpoints) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Stack-Access-Type': 'server',
            'X-Stack-Project-Id': cfg.projectId,
            'X-Stack-Secret-Server-Key': cfg.secretServerKey,
          },
          body: JSON.stringify({ email, password }),
          signal: AbortSignal.timeout(8000),
        });

        const data: any = await res.json();
        if (res.ok && (data.access_token || data.token || data.user)) {
          return {
            success: true,
            token: data.access_token || data.token,
            user: data.user,
          };
        } else if (data.message || data.error) {
          return { success: false, error: data.message || data.error };
        }
      } catch (err: any) {
        // Coba fallback
      }
    }

    return { success: false, error: 'Gagal terhubung ke layanan otentikasi Hexclave' };
  }
}

export const hexclave = new HexclaveService();
