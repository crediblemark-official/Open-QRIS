<script setup lang="ts">
import { ref } from 'vue';
import { 
  Code2, 
  Copy, 
  Check,
  Download,
  ExternalLink,
  Package,
  BookOpen,
  ArrowRight
} from 'lucide-vue-next';
import { useClipboard } from '../composables/useClipboard';

const docsTab = ref<'overview' | 'integration' | 'webhook' | 'hexclave'>('overview');
const { isCopied: copied, copy } = useClipboard();

const snippets: Record<string, string> = {
  overview: `
# OpenQRIS Gateway - Quick Start

## 🚀 Integrasi Cepat (5 Menit)

### 1. Daftar Akun Merchant
\`\`\`bash
curl -X POST http://localhost:3000/v1/auth/register \\
  -H "Content-Type: application/json" \\
  -d '{
    "store_name": "Toko Saya",
    "webhook_url": "https://domainku.com/api/webhook"
  }'
\`\`\`

### 2. Buat Payment Link
\`\`\`bash
curl -X POST http://localhost:3000/v1/charges \\
  -H "Authorization: Bearer sk_live_YOUR_SECRET_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "order_id": "INV-10023",
    "amount": 50000,
    "customer_name": "Budi Santoso"
  }'
\`\`\`

### 3. Arahkan Pelanggan ke Checkout
Response akan berisi \`checkout_url\`. Redirect pelanggan ke URL tersebut untuk bayar via QRIS.

---

## 📚 Dokumentasi Lengkap

**[📖 Buka Swagger API Docs →](/swagger)** - Interactive API documentation with try-it-out feature
  `,
  curl: `curl -X POST http://localhost:3000/v1/charges \\
  -H "Authorization: Bearer sk_live_YOUR_SECRET_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "order_id": "INV-10023",
    "amount": 50000,
    "customer_name": "Budi Santoso",
    "customer_email": "budi@example.com"
  }'`,

  ts: `import fetch from 'node-fetch';

const createCharge = async () => {
  const response = await fetch('http://localhost:3000/v1/charges', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer sk_live_YOUR_SECRET_KEY',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      order_id: 'INV-10023',
      amount: 50000,
      customer_name: 'Budi Santoso'
    })
  });

  const { data } = await response.json();
  console.log('Checkout URL:', data.checkout_url);
  console.log('QR Image URL:', data.qr_data_url);
};`,

  php: `<?php
$ch = curl_init('http://localhost:3000/v1/charges');
curl_setopt_array($ch, [
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_POST => true,
  CURLOPT_HTTPHEADER => [
    'Authorization: Bearer sk_live_YOUR_SECRET_KEY',
    'Content-Type: application/json'
  ],
  CURLOPT_POSTFIELDS => json_encode([
    'order_id' => 'INV-10023',
    'amount' => 50000,
    'customer_name' => 'Budi Santoso'
  ])
]);

$response = json_decode(curl_exec($ch), true);
curl_close($ch);

header('Location: ' . $response['data']['checkout_url']);
exit;`,

  python: `import requests

url = "http://localhost:3000/v1/charges"
headers = {
    "Authorization": "Bearer sk_live_YOUR_SECRET_KEY",
    "Content-Type": "application/json"
}
payload = {
    "order_id": "INV-10023",
    "amount": 50000,
    "customer_name": "Budi Santoso"
}

res = requests.post(url, json=payload, headers=headers).json()
print("Checkout URL:", res["data"]["checkout_url"])`,

  webhook: `// Webhook endpoint example (Node.js/Express)
app.post('/api/webhook/qris', express.json(), async (req, res) => {
  // Verify signature
  const signature = req.headers['x-qris-signature'];
  const payload = JSON.stringify(req.body);
  const expectedSignature = crypto
    .createHmac('sha256', process.env.MERCHANT_SECRET_KEY)
    .update(payload)
    .digest('hex');
  
  if (signature !== expectedSignature) {
    return res.status(401).send('Invalid signature');
  }
  
  const { event, data } = req.body;
  if (event === 'payment.success') {
    console.log('Payment received:', data);
    // Update order status in your database
    await updateOrderStatus(data.order_id, 'paid');
  }
  
  res.status(200).send('OK');
});`,

  hexclave: `# Hexclave Integration

## 1. Setup Hexclave Project
1. Daftar di [Hexclave](https://hexclave.com)
2. Buat project baru
3. Copy Project ID & Publishable Key

## 2. Frontend Integration
\`\`\`bash
npm install @hexclave/js
\`\`\`

\`\`\`typescript
import { Hexclave } from '@hexclave/js';

const hexclave = new Hexclave({
  projectId: 'YOUR_PROJECT_ID',
  publishableKey: 'YOUR_PUBLISHABLE_KEY'
});

// Sign up / Sign in
await hexclave.signUp({
  email: 'user@example.com',
  password: 'securepassword'
});
\`\`\`

## 3. Backend Token Exchange
\`\`\`bash
curl -X POST http://localhost:3000/v1/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"access_token": "HEXCLAVE_ACCESS_TOKEN"}'
\`\`\`
`
};

const openSwagger = () => {
  window.open('/swagger', '_blank');
};
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Header with Swagger Redirect -->
    <div class="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div>
        <h2 class="text-lg font-bold text-blue-900 flex items-center gap-2">
          <BookOpen :size="20" />
          Dokumentasi OpenQRIS
        </h2>
        <p class="text-sm text-blue-700 mt-1">
          Dokumentasi API lengkap tersedia di Swagger UI dengan fitur Try-it-out
        </p>
      </div>
      <a
        href="/swagger"
        target="_blank"
        class="btn btn-primary flex items-center gap-2 shrink-0"
      >
        <ExternalLink :size="14" />
        <span>Buka Swagger API Docs →</span>
      </a>
    </div>

    <!-- Tab Navigation -->
    <div class="mb-4 border-b border-slate-200">
      <nav class="flex gap-1 overflow-x-auto pb-1" aria-label="Documentation tabs">
        <button
          v-for="(label, key) in tabs"
          :key="key"
          @click="docsTab = key"
          :class="[
            'px-3 py-1.5 text-xs font-semibold rounded-t-lg transition cursor-pointer whitespace-nowrap shrink-0',
            docsTab === key
              ? 'bg-white text-[#d71920] border-b-2 border-[#d71920]'
              : 'text-slate-500 hover:text-slate-700'
          ]"
        >
          {{ label }}
        </button>
      </nav>
    </div>

    <!-- Content Area -->
    <div class="flex-1 overflow-y-auto">
      <div class="p-4 bg-slate-50/50 rounded-lg border border-slate-200/50 h-full">
        <pre v-if="docsTab !== 'overview'" class="p-4 bg-slate-900 text-emerald-400 font-mono text-[11px] overflow-x-auto rounded-lg max-h-[60vh] border border-slate-800 leading-relaxed">{{ snippets[docsTab] }}</pre>
        <div v-else class="prose prose-sm max-w-none text-slate-700">
          <div v-html="renderMarkdown(snippets.overview)"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { computed } from 'vue';

const tabs = computed(() => ({
  overview: '🚀 Quick Start',
  curl: 'cURL',
  ts: 'TypeScript',
  php: 'PHP',
  python: 'Python',
  webhook: 'Webhook',
  hexclave: 'Hexclave'
}));

function renderMarkdown(md: string): string {
  return md
    .replace(/^### (.*$)/gim, '<h3 class="text-base font-bold text-slate-900 mt-4 mb-2">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-lg font-bold text-slate-900 mt-6 mb-3">$1</h2>')
    .replace(/`([^`]+)`/g, '<code class="bg-slate-100 px-1 py-0.5 rounded text-sm font-mono text-blue-700">$1</code>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^- (.*$)/gim, '<li class="ml-4 mb-1">$1</li>')
    .replace(/^```(\w*)\n([\s\S]*?)```/gim, '<pre class="bg-slate-900 text-emerald-400 p-3 rounded-lg text-[11px] overflow-x-auto my-3"><code class="language-$1">$2</code></pre>')
    .replace(/^> (.*$)/gim, '<blockquote class="border-l-4 border-blue-500 pl-3 italic text-slate-600 my-2">$1</blockquote>');
}
</script>