import { Elysia } from 'elysia';
import { jwt } from '@elysiajs/jwt';
import { hexclave } from '../services/hexclave';
import { hexclaveServerApp } from '../hexclave/server';

import { store } from '../services/store';

export const ADMIN_EMAILS = new Set(
  (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
);

export const isAdminEmail = (email?: string | null) =>
  !!email && ADMIN_EMAILS.has(email.toLowerCase().trim());

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'merchant';
  tenantId?: string | null;
  provider: string;
}

export const jwtAuth = new Elysia({ name: 'jwt-auth' }).use(
  jwt({
    name: 'jwt',
    secret: process.env.JWT_SECRET || 'qris_super_secret_jwt_key_2026_bismillah',
    exp: '7d',
  })
);

export async function resolveAuthUser(
  headers: Record<string, string | undefined>,
  jwtInstance: any
): Promise<AuthUser | null> {
  const authHeader = headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice(7).trim();

  // 1. Cek apakah token adalah JWT lokal gateway (Admin atau Merchant)
  try {
    const payload: any = await jwtInstance.verify(token);
    if (payload && (payload.role === 'admin' || payload.role === 'merchant')) {
      const isEmailAdmin = isAdminEmail(payload.email);
      const effectiveRole: 'admin' | 'merchant' = isEmailAdmin ? 'admin' : (payload.role as 'admin' | 'merchant');
      let tenantId = effectiveRole === 'admin' ? undefined : (payload.tenantId as string | undefined);

      if (effectiveRole === 'merchant' && !tenantId && payload.email) {
        let dbUser = await store.getUserByEmail(payload.email);
        if (dbUser?.tenantId) {
          tenantId = dbUser.tenantId;
        } else {
          const storeName = `Toko ${payload.name || payload.email.split('@')[0] || 'Saya'}`;
          const newTenant = await store.createTenant({
            name: storeName,
            webhookUrl: 'https://my-store.com/api/webhook',
          });
          tenantId = newTenant.id;
          if (dbUser) {
            await store.updateUser(dbUser.id, { tenantId: newTenant.id });
          } else {
            const dummyPasswordHash = await Bun.password.hash(`jwt_${payload.sub}_${Date.now()}`, {
              algorithm: 'bcrypt',
              cost: 10,
            });
            await store.createUser({
              id: payload.sub,
              email: payload.email,
              passwordHash: dummyPasswordHash,
              name: payload.name || payload.email.split('@')[0] || 'Merchant',
              role: 'merchant',
              tenantId: newTenant.id,
            });
          }
        }
      }

      return {
        id: payload.sub,
        email: payload.email,
        name: payload.name || (effectiveRole === 'admin' ? 'Administrator' : 'Merchant'),
        role: effectiveRole,
        tenantId,
        provider: payload.provider || 'local',
      };
    }
  } catch (e) {
    // Token tidak valid atau kadaluarsa - lanjut ke method auth berikutnya
  }

  // 2. Cek apakah token adalah session token Hexclave via hexclaveServerApp SDK
  try {
    const tokenStoreHeaders: Record<string, string> = {
      authorization: authHeader,
      'x-stack-access-token': token,
    };
    if (headers.cookie) {
      tokenStoreHeaders['cookie'] = headers.cookie;
    }

    const user = await hexclaveServerApp.getUser({
      tokenStore: { headers: tokenStoreHeaders } as any,
    });

    if (user?.id) {
      const email = ((user as any).primaryEmail || (user as any).email || (user as any).selectedEmail || '').toLowerCase().trim();
      if (!email) {
        return null;
      }

      const role: 'admin' | 'merchant' = isAdminEmail(email) ? 'admin' : 'merchant';
      let dbUser = await store.getUserByEmail(email);
      let tenantId = role === 'admin' ? undefined : (dbUser?.tenantId || undefined);

      if (role === 'merchant' && !tenantId) {
        const storeName = `Toko ${(user as any).displayName || email.split('@')[0] || 'Saya'}`;
        const newTenant = await store.createTenant({
          name: storeName,
          webhookUrl: 'https://my-store.com/api/webhook',
        });
        tenantId = newTenant.id;
        if (dbUser) {
          await store.updateUser(dbUser.id, { tenantId: newTenant.id });
        } else {
          const dummyPasswordHash = await Bun.password.hash(`hexclave_${user.id}_${Date.now()}`, {
            algorithm: 'bcrypt',
            cost: 10,
          });
          dbUser = await store.createUser({
            id: user.id,
            email,
            passwordHash: dummyPasswordHash,
            name: (user as any).displayName || email.split('@')[0] || 'Merchant',
            role: 'merchant',
            tenantId: newTenant.id,
          });
        }
      }

      return {
        id: user.id,
        email,
        name: (user as any).displayName || dbUser?.name || (role === 'admin' ? 'Administrator' : 'Merchant'),
        role,
        tenantId,
        provider: 'hexclave',
      };
    }
  } catch (e) {}

  // 3. Fallback: verifikasi token melalui REST client hexclave
  if (hexclave.isConfigured()) {
    const hexclaveCheck = await hexclave.verifyAccessToken(token);
    if (hexclaveCheck.success && hexclaveCheck.user) {
      const email = (hexclaveCheck.user.primaryEmail || hexclaveCheck.user.email || (hexclaveCheck.user as any).selectedEmail || '').toLowerCase().trim();
      if (!email) {
        return null;
      }

      const role: 'admin' | 'merchant' = isAdminEmail(email) ? 'admin' : 'merchant';
      let dbUser = await store.getUserByEmail(email);
      let tenantId = role === 'admin' ? undefined : (dbUser?.tenantId || undefined);

      if (role === 'merchant' && !tenantId) {
        const storeName = `Toko ${hexclaveCheck.user.displayName || email.split('@')[0] || 'Saya'}`;
        const newTenant = await store.createTenant({
          name: storeName,
          webhookUrl: 'https://my-store.com/api/webhook',
        });
        tenantId = newTenant.id;
        if (dbUser) {
          await store.updateUser(dbUser.id, { tenantId: newTenant.id });
        } else {
          const dummyPasswordHash = await Bun.password.hash(`hexclave_${hexclaveCheck.user.id}_${Date.now()}`, {
            algorithm: 'bcrypt',
            cost: 10,
          });
          dbUser = await store.createUser({
            id: hexclaveCheck.user.id,
            email,
            passwordHash: dummyPasswordHash,
            name: hexclaveCheck.user.displayName || email.split('@')[0] || 'Merchant',
            role: 'merchant',
            tenantId: newTenant.id,
          });
        }
      }

      return {
        id: hexclaveCheck.user.id,
        email,
        name: hexclaveCheck.user.displayName || dbUser?.name || (role === 'admin' ? 'Administrator' : 'Merchant'),
        role,
        tenantId,
        provider: 'hexclave',
      };
    }
  }

  return null;
}

export const authGuard = new Elysia({ name: 'auth-guard' })
  .use(jwtAuth)
  .derive({ as: 'scoped' }, async ({ headers, jwt }: any) => {
    const authUser = await resolveAuthUser(headers, jwt);
    return { authUser };
  })
  .onBeforeHandle({ as: 'scoped' }, ({ authUser, set }) => {
    if (!authUser) {
      set.status = 401;
      return {
        success: false,
        message: 'Akses ditolak: Autentikasi diperlukan. Sesi tidak valid atau telah kadaluarsa',
      };
    }
  });

export const adminGuard = new Elysia({ name: 'admin-guard' })
  .use(authGuard)
  .onBeforeHandle({ as: 'scoped' }, ({ authUser, set }) => {
    if (!authUser || authUser.role !== 'admin') {
      set.status = 403;
      return {
        success: false,
        message: 'Akses ditolak: Fitur ini hanya dapat diakses oleh Administrator Platform',
      };
    }
  });
