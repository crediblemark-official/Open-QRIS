<script setup lang="ts">
import { ref, watch } from 'vue';
import { X, QrCode, Copy, Check, Smartphone } from 'lucide-vue-next';
import QRCode from 'qrcode';
import type { Tenant } from '../../types';

const props = defineProps<{
  app: Tenant | null;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const qrUrl = ref('');
const copied = ref(false);

watch(() => props.app, async (app) => {
  if (!app) {
    qrUrl.value = '';
    return;
  }
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  const listenerEndpoint = `${origin}/v1/webhooks/listener`;
  const pairingPayload = JSON.stringify({
    serverUrl: listenerEndpoint,
    deviceToken: app.deviceToken || app.secretKey,
    name: app.name,
  });

  try {
    qrUrl.value = await QRCode.toDataURL(pairingPayload, {
      margin: 2,
      width: 260,
      color: {
        dark: '#1e293b',
        light: '#ffffff',
      },
    });
  } catch (e) {
    console.error('Failed generating pairing QR', e);
  }
}, { immediate: true });

const handleCopy = async () => {
  if (!props.app) return;
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  const listenerEndpoint = `${origin}/v1/webhooks/listener`;
  await navigator.clipboard.writeText(listenerEndpoint);
  copied.value = true;
  setTimeout(() => (copied.value = false), 2000);
};
</script>

<template>
  <div v-if="app" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs" @click.self="emit('close')">
    <div class="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
      <!-- Header -->
      <div class="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
        <div class="flex items-center gap-2">
          <div class="w-7 h-7 rounded-md bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center">
            <Smartphone :size="14" />
          </div>
          <div>
            <h3 class="text-sm font-bold text-slate-900">Pairing HP Listener</h3>
            <div class="text-[11px] text-slate-500">{{ app.name }}</div>
          </div>
        </div>
        <button @click="emit('close')" class="text-slate-400 hover:text-slate-600 p-1 rounded-md">
          <X :size="16" />
        </button>
      </div>

      <!-- Body -->
      <div class="p-5 space-y-4">
        <div class="text-center">
          <div class="inline-flex w-12 h-12 rounded-full bg-blue-50 border border-blue-200 items-center justify-center mb-3">
            <QrCode :size="24" class="text-blue-600" />
          </div>
          <p class="text-xs text-slate-600">
            Scan QR code ini dengan aplikasi Android OpenQRIS Listener untuk menghubungkan perangkat ini.
          </p>
        </div>

        <div class="flex justify-center">
          <div class="p-3 bg-white border border-slate-200 rounded-lg">
            <img v-if="qrUrl" :src="qrUrl" alt="Pairing QR Code" class="w-48 h-48" />
            <div v-else class="w-48 h-48 flex items-center justify-center text-slate-400">
              <QrCode :size="48" />
            </div>
          </div>
        </div>

        <div class="p-3 bg-slate-50 rounded-lg border border-slate-200">
          <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Listener Endpoint</div>
          <div class="flex items-center gap-2">
            <code class="flex-1 text-[11px] font-mono text-slate-700 truncate">
              {{ typeof window !== 'undefined' ? window.location.origin : '' }}/v1/webhooks/listener
            </code>
            <button
              @click="handleCopy"
              class="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition"
              title="Salin endpoint"
            >
              <Check v-if="copied" :size="14" class="text-emerald-600" />
              <Copy v-else :size="14" />
            </button>
          </div>
        </div>

        <div class="text-[11px] text-slate-500 text-center">
          Device Token: <code class="font-mono text-slate-700">{{ app.deviceToken || app.secretKey }}</code>
        </div>
      </div>
    </div>
  </div>
</template>
