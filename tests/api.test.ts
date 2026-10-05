import { describe, it, expect } from 'bun:test';
import { Elysia } from 'elysia';
import { toolsRoutes } from '../src/server/routes/tools';
import { authRoutes } from '../src/server/routes/auth';

describe('API Route Endpoints', () => {
  const app = new Elysia()
    .use(toolsRoutes)
    .use(authRoutes);

  describe('GET /v1/health', () => {
    it('should return 200 with service status', async () => {
      const response = await app.handle(new Request('http://localhost/v1/health'));
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.status).toBe('ok');
      expect(json.service).toBe('OpenQRIS Gateway');
      expect(json.timestamp).toBeDefined();
    });
  });

  describe('POST /v1/decode', () => {
    const SAMPLE_STATIC_QRIS = 
      '00020101021126570011ID.DANA.WWW011893600915303549932302090354993230303UMI51440014ID.CO.QRIS.WWW0215ID10266039578320303UMI5204899953033605802ID5912Crediblemark6012Kab. Sumenep6105694726304D204';

    it('should correctly decode valid QRIS payload', async () => {
      const response = await app.handle(new Request('http://localhost/v1/decode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qris: SAMPLE_STATIC_QRIS }),
      }));

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.data.merchantName).toBe('Crediblemark');
      expect(json.data.merchantCity).toBe('Kab. Sumenep');
    });

    it('should reject requests missing required qris field', async () => {
      const response = await app.handle(new Request('http://localhost/v1/decode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wrong_field: 'test' }),
      }));

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('GET /v1/auth/config', () => {
    it('should return auth configuration status', async () => {
      const response = await app.handle(new Request('http://localhost/v1/auth/config'));
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.data.self_service_registration).toBe(true);
    });
  });

  describe('GET /v1/auth/me without token', () => {
    it('should return unauthenticated status when authorization header is missing', async () => {
      const response = await app.handle(new Request('http://localhost/v1/auth/me'));
      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.message).toContain('Tidak terautentikasi');
    });
  });
});
