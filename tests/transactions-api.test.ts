import { describe, it, expect } from 'bun:test';
import { createHmac } from 'crypto';
import { Elysia } from 'elysia';
import { settingsRoutes } from '../src/server/routes/settings';

// Buat JWT admin lokal yang valid (sama secret dengan middleware jwtAuth)
function signAdminJwt(): string {
  const secret = process.env.JWT_SECRET || 'qris_super_secret_jwt_key_2026_bismillah';
  const encode = (obj: unknown) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const header = encode({ alg: 'HS256', typ: 'JWT' });
  const payload = encode({
    sub: 'usr_apitest',
    email: 'api-tester@example.com',
    name: 'API Tester',
    role: 'admin',
    provider: 'local',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  });
  const signature = createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${signature}`;
}

const app = new Elysia().use(settingsRoutes);
const token = signAdminJwt();

describe('B12 - /v1/transactions mendukung pagination & counts server-side', () => {
  it('tanpa token ditolak 401 (route terproteksi authGuard)', async () => {
    const res = await app.handle(new Request('http://localhost/v1/transactions?limit=5'));
    expect(res.status).toBe(401);
  });

  it('query pagination mengembalikan data + pagination + counts per status', async () => {
    const res = await app.handle(
      new Request('http://localhost/v1/transactions?page=1&limit=5', {
        headers: { Authorization: `Bearer ${token}` },
      })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);

    // Data dibatasi limit (bukan seluruh tabel)
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.data.length).toBeLessThanOrEqual(5);

    // Struktur pagination server-side
    expect(json.pagination).toBeDefined();
    expect(json.pagination.page).toBe(1);
    expect(json.pagination.limit).toBe(5);
    expect(typeof json.pagination.total).toBe('number');
    expect(typeof json.pagination.totalPages).toBe('number');

    // Counts per status untuk pill filter
    expect(json.counts).toBeDefined();
    expect(typeof json.counts.PENDING).toBe('number');
    expect(typeof json.counts.PAID).toBe('number');
    expect(typeof json.counts.EXPIRED).toBe('number');
    expect(json.counts.PENDING + json.counts.PAID + json.counts.EXPIRED + (json.counts.CANCELLED || 0)).toBeGreaterThanOrEqual(
      json.pagination.total
    );
  });

  it('filter status & search diterapkan di server', async () => {
    const res = await app.handle(
      new Request('http://localhost/v1/transactions?page=1&limit=10&status=PAID&search=zzzz_tidak_ada_999', {
        headers: { Authorization: `Bearer ${token}` },
      })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data).toHaveLength(0);
    expect(json.pagination.total).toBe(0);
  });
});
