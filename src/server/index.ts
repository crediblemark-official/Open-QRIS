/**
 * OpenQRIS Gateway - Elysia Backend Server
 * High performance self-hosted multi-tenant Payment Gateway on Bun + Elysia
 */

import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { swagger } from '@elysiajs/swagger';
import { staticPlugin } from '@elysiajs/static';
import { existsSync } from 'fs';
import { store } from './services/store.pg';

// Modular Route Controllers
import { toolsRoutes } from './routes/tools';
import { chargesRoutes } from './routes/charges';
import { webhooksRoutes } from './routes/webhooks';
import { appsRoutes } from './routes/apps';
import { settingsRoutes } from './routes/settings';
import { authRoutes } from './routes/auth';

// Interval otomatis menandai invoice kadaluarsa
setInterval(() => {
  store.reapExpiredCharges();
}, 60 * 1000);

const app = new Elysia()
  // Global Middlewares
  .use(cors())
  .use(
    swagger({
      documentation: {
        info: {
          title: 'OpenQRIS Gateway API',
          version: '1.1.0',
          description:
            'Dokumentasi API Payment Gateway Mandiri berbasis Dynamic QRIS untuk Integrasi SaaS & E-Commerce',
        },
        tags: [
          { name: 'Auth', description: 'Autentikasi Administrator' },
          { name: 'Charges', description: 'Transaksi Pembayaran QRIS' },
          { name: 'Apps', description: 'Manajemen Tenant SaaS & API Keys' },
          { name: 'Webhooks', description: 'Ingestion & Simulasi Notifikasi Pembayaran' },
          { name: 'Settings', description: 'Pengaturan & Log Transaksi' },
          { name: 'Tools', description: 'Utility & Parser QRIS' },
        ],
      },
    })
  )

  // Mount Modular Routers
  .use(authRoutes)
  .use(toolsRoutes)
  .use(chargesRoutes)
  .use(webhooksRoutes)
  .use(appsRoutes)
  .use(settingsRoutes);

// Serve frontend dist assets if compiled
if (existsSync('dist')) {
  app.use(
    staticPlugin({
      assets: 'dist',
      prefix: '/',
    })
  );
}

// Embeddable modal script untuk SaaS mitra
app.get('/embed.js', async ({ set }: { set: any }) => {
  const file = Bun.file('src/server/assets/embed.js');
  if (await file.exists()) {
    set.headers['Content-Type'] = 'application/javascript';
    return file;
  }
  return 'console.error("embed.js not found");';
});

// Downloadable WooCommerce plugin zip
app.get('/downloads/woocommerce-openqris.zip', async ({ set }: { set: any }) => {
  let file = Bun.file('public/downloads/woocommerce-openqris.zip');
  if (!(await file.exists())) {
    file = Bun.file('dist/downloads/woocommerce-openqris.zip');
  }
  if (await file.exists()) {
    set.headers['Content-Type'] = 'application/zip';
    set.headers['Content-Disposition'] = 'attachment; filename="woocommerce-openqris.zip"';
    return file;
  }
  return 'File plugin tidak ditemukan';
});

const serveSpaHtml = async ({ set }: { set: any }) => {
  const file = Bun.file('dist/index.html');
  if (await file.exists()) {
    set.headers['Content-Type'] = 'text/html';
    return file;
  }
  return 'Frontend build is compiling... Please build frontend first.';
};

// Root & SPA routes handler
app.get('/', serveSpaHtml);
app.get('/login', serveSpaHtml);
app.get('/sign-up', serveSpaHtml);
app.get('/signup', serveSpaHtml);
app.get('/forgot-password', serveSpaHtml);
app.get('/password-reset', serveSpaHtml);
app.get('/reset-password', serveSpaHtml);
app.get('/verify-email', serveSpaHtml);
app.get('/email-verification', serveSpaHtml);
app.get('/account-settings', serveSpaHtml);
app.get('/settings', serveSpaHtml);
app.get('/settings/*', serveSpaHtml);
app.get('/error', serveSpaHtml);
app.get('/mfa', serveSpaHtml);
app.get('/dashboard', serveSpaHtml);
app.get('/dashboard/:tab', serveSpaHtml);
app.get('/dashboard/*', serveSpaHtml);
app.get('/admin', serveSpaHtml);
app.get('/admin/:tab', serveSpaHtml);
app.get('/admin/*', serveSpaHtml);
app.get('/panel', serveSpaHtml);
app.get('/panel/:tab', serveSpaHtml);
app.get('/panel/*', serveSpaHtml);
app.get('/qris', serveSpaHtml);
app.get('/apps', serveSpaHtml);
app.get('/listener', serveSpaHtml);
app.get('/playground', serveSpaHtml);
app.get('/docs', serveSpaHtml);
app.get('/webhooks', serveSpaHtml);
app.get('/checkout/:id', serveSpaHtml);

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, () => {
  console.log(`🚀 OpenQRIS Gateway is running on http://localhost:${PORT}`);
  console.log(`📖 Swagger API Docs available at http://localhost:${PORT}/swagger`);
});
