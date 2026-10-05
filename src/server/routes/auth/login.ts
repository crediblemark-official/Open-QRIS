/**
 * Auth Login Handler
 * Menangani login merchant dan admin
 */

import { store } from '../../services/store';
import { hexclave } from '../../services/hexclave';
import { hexclaveServerApp } from '../../hexclave/server';

const ADMIN_EMAILS = new Set(
  (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
);

const isAdminEmail = (email?: string | null) =>
  !!email && ADMIN_EMAILS.has(email.toLowerCase().trim());

export async function handleLogin(body: any, jwt: any, set: any) {
  // 1. Login via Email & Password
  if (body.email && body.password) {
    const email = body.email.toLowerCase().trim();
    const localUser = await store.getUserByEmail(email);

    if (localUser) {
      const isPasswordValid = await Bun.password.verify(body.password, localUser.passwordHash);
      if (!isPasswordValid) {
        set.status = 401;
        return { success: false, message: 'Kata sandi salah. Silakan coba lagi.' };
      }

      const effectiveRole = isAdminEmail(localUser.email) ? 'admin' : localUser.role;

      const tenant = localUser.tenantId ? await store.getTenantById(localUser.tenantId) : undefined;
      const token = await jwt.sign({
        sub: localUser.id,
        email: localUser.email,
        name: localUser.name,
        role: effectiveRole,
        tenantId: effectiveRole === 'admin' ? undefined : localUser.tenantId,
        provider: 'local',
        createdAt: Date.now(),
      });

      return {
        success: true,
        token,
        user: {
          id: localUser.id,
          email: localUser.email,
          name: localUser.name,
          role: effectiveRole,
          tenantId: effectiveRole === 'admin' ? undefined : localUser.tenantId,
        },
        tenant: effectiveRole === 'admin' ? undefined : tenant,
        provider: 'local',
        message: `Login berhasil sebagai ${effectiveRole === 'admin' ? 'Administrator' : 'Merchant'}`,
      };
    }

    // Coba login via Hexclave untuk Administrator
    if (hexclave.isConfigured()) {
      const result = await hexclave.signInWithPassword(email, body.password);
      if (result.success && result.token) {
        const token = await jwt.sign({
          sub: result.user?.id || 'hexclave_admin',
          email,
          name: result.user?.displayName || 'Administrator',
          role: 'admin',
          provider: 'hexclave',
          createdAt: Date.now(),
        });

        return {
          success: true,
          token,
          user: result.user,
          provider: 'hexclave',
          message: 'Login berhasil via Hexclave Admin',
        };
      }
    }

    set.status = 401;
    return { success: false, message: 'Email atau kata sandi tidak ditemukan' };
  }

  // 2. Login via Hexclave Access Token
  if (body.access_token) {
    let user: any = null;
    try {
      user = await hexclaveServerApp.getUser({
        tokenStore: {
          headers: {
            authorization: `Bearer ${body.access_token}`,
            'x-stack-access-token': body.access_token,
          },
        } as any,
      });
    } catch (e) {}

    if (!user?.id && hexclave.isConfigured()) {
      const verify = await hexclave.verifyAccessToken(body.access_token);
      if (verify.success && verify.user) {
        user = verify.user;
      }
    }

    if (!user?.id) {
      set.status = 401;
      return { success: false, message: 'Token Hexclave tidak valid atau kadaluarsa' };
    }

    const hexEmail = ((user.email || user.primaryEmail || '') as string).toLowerCase().trim();
    const hexRole = isAdminEmail(hexEmail) ? 'admin' : 'merchant';
    let dbUser = hexEmail ? await store.getUserByEmail(hexEmail) : null;

    // Jika merchant baru dari Hexclave belum terdaftar di DB lokal,
    // otomatis buatkan profil toko (tenant) & user merchant
    if (hexRole === 'merchant' && !dbUser && hexEmail) {
      const storeName = `Toko ${user.displayName || hexEmail.split('@')[0] || 'Saya'}`;
      const newTenant = await store.createTenant({
        name: storeName,
        webhookUrl: 'https://my-store.com/api/webhook',
      });
      const dummyPasswordHash = await Bun.password.hash(`hexclave_${user.id}_${Date.now()}`, {
        algorithm: 'bcrypt',
        cost: 10,
      });
      dbUser = await store.createUser({
        email: hexEmail,
        passwordHash: dummyPasswordHash,
        name: user.displayName || hexEmail.split('@')[0] || 'Merchant',
        role: 'merchant',
        tenantId: newTenant.id,
      });
    }

    const tenant = hexRole === 'admin' ? undefined : (dbUser?.tenantId ? await store.getTenantById(dbUser.tenantId) : undefined);

    const token = await jwt.sign({
      sub: user.id,
      email: hexEmail,
      name: user.displayName || dbUser?.name || (hexRole === 'admin' ? 'Administrator' : 'Merchant'),
      role: hexRole,
      tenantId: hexRole === 'admin' ? undefined : dbUser?.tenantId,
      provider: 'hexclave',
      createdAt: Date.now(),
    });

    return {
      success: true,
      token,
      user: {
        id: user.id,
        email: hexEmail,
        name: user.displayName || dbUser?.name || (hexRole === 'admin' ? 'Administrator' : 'Merchant'),
        role: hexRole,
        tenantId: hexRole === 'admin' ? undefined : dbUser?.tenantId,
        tenant,
      },
      tenant,
      provider: 'hexclave',
      message: `Login berhasil sebagai ${hexRole === 'admin' ? 'Administrator' : 'Merchant'} via Hexclave`,
    };
  }

  set.status = 400;
  return { success: false, message: 'Harap sediakan email & password atau access_token Hexclave' };
}
