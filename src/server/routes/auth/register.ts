/**
 * Auth Register Handler
 * Menangani registrasi merchant baru
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

export async function handleRegister(body: any, jwt: any, set: any) {
  const storeName = (body.store_name || '').trim();
  const webhookUrl = (body.webhook_url || '').trim() || 'https://my-store.com/api/webhook';

  if (!storeName) {
    set.status = 400;
    return { success: false, message: 'Nama bisnis / toko wajib diisi' };
  }

  let email: string;
  let name: string;
  let passwordHash: string;

  // MODE A: Hexclave access_token
  if (body.access_token) {
    let hexUser: any = null;
    try {
      hexUser = await hexclaveServerApp.getUser({
        tokenStore: {
          headers: {
            authorization: `Bearer ${body.access_token}`,
            'x-stack-access-token': body.access_token,
          },
        } as any,
      });
    } catch (e) {}

    if (!hexUser?.id && hexclave.isConfigured()) {
      const verify = await hexclave.verifyAccessToken(body.access_token);
      if (verify.success && verify.user) hexUser = verify.user;
    }

    if (!hexUser?.id) {
      set.status = 401;
      return { success: false, message: 'Token Hexclave tidak valid atau kadaluarsa' };
    }

    email = (hexUser.primaryEmail || hexUser.email || '').toLowerCase().trim();
    name = (body.name || hexUser.displayName || email.split('@')[0] || 'Merchant').trim();

    if (!email || !email.includes('@')) {
      set.status = 400;
      return { success: false, message: 'Email dari akun Hexclave tidak tersedia' };
    }

    if (isAdminEmail(email)) {
      set.status = 400;
      return { success: false, message: 'Email ini adalah akun Administrator dan tidak dapat didaftarkan sebagai merchant.' };
    }

    passwordHash = await Bun.password.hash(`hexclave_${hexUser.id}_${Date.now()}`, {
      algorithm: 'bcrypt',
      cost: 10,
    });
  }
  // MODE B: Email + Password langsung
  else if (body.email && body.password) {
    email = body.email.toLowerCase().trim();
    name = (body.name || '').trim();
    const password = body.password;

    if (!email || !email.includes('@')) {
      set.status = 400;
      return { success: false, message: 'Format alamat email tidak valid' };
    }
    if (!password || password.length < 6) {
      set.status = 400;
      return { success: false, message: 'Kata sandi minimal 6 karakter' };
    }
    if (!name) {
      set.status = 400;
      return { success: false, message: 'Nama lengkap wajib diisi' };
    }
    if (isAdminEmail(email)) {
      set.status = 400;
      return { success: false, message: 'Email ini ditetapkan sebagai Administrator.' };
    }

    passwordHash = await Bun.password.hash(password, { algorithm: 'bcrypt', cost: 10 });
  } else {
    set.status = 400;
    return { success: false, message: 'Harap sediakan access_token Hexclave atau email & password' };
  }

  const existingUser = await store.getUserByEmail(email);
  if (existingUser) {
    set.status = 400;
    return { success: false, message: 'Email sudah terdaftar. Silakan login langsung.' };
  }

  const tenant = await store.createTenant({ name: storeName, webhookUrl });
  const user = await store.createUser({
    email,
    passwordHash,
    name,
    role: 'merchant',
    tenantId: tenant.id,
  });

  const token = await jwt.sign({
    sub: user.id,
    email: user.email,
    name: user.name,
    role: 'merchant',
    tenantId: tenant.id,
    provider: body.access_token ? 'hexclave' : 'local',
    createdAt: Date.now(),
  });

  return {
    success: true,
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenantId,
    },
    tenant,
    message: 'Pendaftaran akun merchant berhasil!',
  };
}
