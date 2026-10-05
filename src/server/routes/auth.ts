import { Elysia, t } from 'elysia';
import { jwtAuth, resolveAuthUser } from '../middleware/auth';
import { hexclave } from '../services/hexclave';
import { handleRegister } from './auth/register';
import { handleLogin } from './auth/login';
import { handleMe } from './auth/me';
import { handleLogout } from './auth/logout';

export const authRoutes = new Elysia({ prefix: '/v1/auth' })
  .use(jwtAuth)
  .derive({ as: 'scoped' }, async ({ headers, jwt }: any) => {
    const authUser = await resolveAuthUser(headers, jwt);
    return { authUser };
  })
  .get(
    '/config',
    () => {
      return {
        success: true,
        data: {
          hexclave_enabled: hexclave.isConfigured(),
          hexclave: hexclave.getPublicConfig(),
          self_service_registration: true,
        },
      };
    },
    {
      detail: { tags: ['Auth'], summary: 'Ambil status konfigurasi otentikasi platform' },
    }
  )
  .post(
    '/register',
    async ({ body, jwt, set }: any) => {
      return handleRegister(body, jwt, set);
    },
    {
      body: t.Object({
        store_name: t.String(),
        webhook_url: t.Optional(t.String()),
        access_token: t.Optional(t.String()),
        name: t.Optional(t.String()),
        email: t.Optional(t.String()),
        password: t.Optional(t.String()),
      }),
      detail: { tags: ['Auth'], summary: 'Pendaftaran Akun Merchant (via Hexclave token atau email+password)' },
    }
  )
  .post(
    '/login',
    async ({ body, jwt, set }: any) => {
      return handleLogin(body, jwt, set);
    },
    {
      body: t.Object({
        email: t.Optional(t.String()),
        password: t.Optional(t.String()),
        access_token: t.Optional(t.String()),
      }),
      detail: { tags: ['Auth'], summary: 'Login sebagai Merchant atau Administrator' },
    }
  )
  .get(
    '/me',
    async ({ authUser }: any) => {
      return handleMe(authUser);
    },
    {
      detail: { tags: ['Auth'], summary: 'Ambil data user yang sedang login' },
    }
  )
  .post(
    '/logout',
    ({ authUser }: any) => {
      return handleLogout();
    },
    {
      detail: { tags: ['Auth'], summary: 'Logout dari sesi saat ini' },
    }
  );
