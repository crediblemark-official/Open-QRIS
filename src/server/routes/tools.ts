import { Elysia, t } from 'elysia';
import { extractQRISInfo } from '../core/emvco';

export const toolsRoutes = new Elysia({ prefix: '/v1' })
  .get('/health', () => ({
    status: 'ok',
    service: 'OpenQRIS Gateway',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  }))
  .post(
    '/decode',
    ({ body, set }) => {
      try {
        const info = extractQRISInfo(body.qris);
        return { success: true, data: info };
      } catch (err: any) {
        set.status = 400;
        return { success: false, message: err.message || 'Gagal mem-parse string QRIS' };
      }
    },
    {
      body: t.Object({
        qris: t.String(),
      }),
      detail: { tags: ['Tools'], summary: 'Ekstrak informasi dari string QRIS' },
    }
  );
