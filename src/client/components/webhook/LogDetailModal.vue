<script setup lang="ts">
import { ref } from 'vue';
import {
  X,
  Webhook,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Code2,
  AlertCircle,
  RefreshCw
} from 'lucide-vue-next';
import { formatDateTime } from '../../utils/formatters';
import { useClipboard } from '../../composables/useClipboard';
import type { WebhookLog } from '../../types';

const props = defineProps<{
  log: WebhookLog | null;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'resend', log: WebhookLog): void;
}>();

const { copy } = useClipboard();
const copiedField = ref<string | null>(null);

const copyValue = async (text: string, fieldKey: string) => {
  const ok = await copy(text, fieldKey);
  if (ok) {
    copiedField.value = fieldKey;
  }
};
</script>

<template>
  <div
    v-if="log"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
    @click.self="emit('close')"
  >
    <div class="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
      <!-- MODAL HEADER -->
      <div class="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
        <div class="flex items-center gap-2">
          <div class="w-7 h-7 rounded-md bg-red-50 text-[#d71920] border border-red-200 flex items-center justify-center">
            <Webhook :size="14" />
          </div>
          <div>
            <h3 class="text-sm font-bold text-slate-900">Detail Webhook Execution</h3>
            <div class="text-[11px] font-mono text-slate-500">ID: {{ log.id }}</div>
          </div>
        </div>
        <button
          class="text-slate-400 hover:text-slate-700 p-1 rounded-md"
          @click="emit('close')"
        >
          <X :size="16" />
        </button>
      </div>

      <!-- MODAL BODY -->
      <div class="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
        <!-- Overview info grid -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
          <div>
            <span class="text-slate-400 text-[10px] uppercase font-bold block">Status</span>
            <span
              v-if="log.status === 'SUCCESS'"
              class="inline-flex items-center gap-1 mt-0.5 text-xs font-bold text-emerald-700"
            >
              <CheckCircle2 :size="12" /> Sukses
            </span>
            <span
              v-else
              class="inline-flex items-center gap-1 mt-0.5 text-xs font-bold text-rose-700"
            >
              <XCircle :size="12" /> Gagal
            </span>
          </div>

          <div>
            <span class="text-slate-400 text-[10px] uppercase font-bold block">HTTP Code</span>
            <span class="font-mono font-bold text-slate-900 mt-0.5 block">
              {{ log.statusCode || 'N/A' }}
            </span>
          </div>

          <div>
            <span class="text-slate-400 text-[10px] uppercase font-bold block">Order ID</span>
            <span class="font-mono font-bold text-slate-900 mt-0.5 block truncate">
              {{ log.orderId }}
            </span>
          </div>

          <div>
            <span class="text-slate-400 text-[10px] uppercase font-bold block">Waktu Percobaan</span>
            <span class="text-slate-700 mt-0.5 block">
              {{ formatDateTime(log.attemptedAt) }}
            </span>
          </div>
        </div>

        <!-- Target URL -->
        <div>
          <div class="flex items-center justify-between mb-1">
            <span class="font-bold text-slate-700">Target Webhook URL</span>
            <button
              class="text-[11px] text-[#d71920] hover:underline flex items-center gap-1"
              @click="copyValue(log.targetUrl, 'modal-target-url')"
            >
              <Check v-if="copiedField === 'modal-target-url'" :size="11" />
              <Copy v-else :size="11" />
              <span>{{ copiedField === 'modal-target-url' ? 'Disalin' : 'Copy URL' }}</span>
            </button>
          </div>
          <div class="p-2.5 rounded-lg bg-slate-900 text-slate-100 font-mono text-[11px] break-all border border-slate-800">
            {{ log.targetUrl }}
          </div>
        </div>

        <!-- JSON Payload -->
        <div>
          <div class="flex items-center justify-between mb-1">
            <span class="font-bold text-slate-700 flex items-center gap-1.5">
              <Code2 :size="13" class="text-slate-500" />
              HTTP Request Payload (JSON)
            </span>
            <button
              class="text-[11px] text-[#d71920] hover:underline flex items-center gap-1"
              @click="copyValue(JSON.stringify(log.payload, null, 2), 'modal-payload')"
            >
              <Check v-if="copiedField === 'modal-payload'" :size="11" />
              <Copy v-else :size="11" />
              <span>{{ copiedField === 'modal-payload' ? 'Disalin' : 'Copy JSON' }}</span>
            </button>
          </div>
          <pre class="p-3 rounded-lg bg-slate-900 text-emerald-400 font-mono text-[11px] overflow-x-auto max-h-52 border border-slate-800 leading-relaxed">{{ JSON.stringify(log.payload, null, 2) }}</pre>
        </div>

        <!-- Response Body -->
        <div>
          <div class="flex items-center justify-between mb-1">
            <span class="font-bold text-slate-700">Server Response Body</span>
            <span v-if="log.statusCode" class="text-[11px] font-mono text-slate-400">
              HTTP {{ log.statusCode }}
            </span>
          </div>
          <div class="p-3 rounded-lg bg-slate-100 text-slate-800 font-mono text-[11px] overflow-x-auto max-h-36 border border-slate-200 whitespace-pre-wrap">
            {{ log.responseBody || '(Tidak ada response body / koneksi terputus)' }}
          </div>
        </div>

        <!-- Troubleshooting guide if failed -->
        <div v-if="log.status === 'FAILED'" class="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 space-y-1">
          <div class="flex items-center gap-1.5 font-bold text-xs">
            <AlertCircle :size="14" />
            <span>Petunjuk Troubleshooting Endpoint Webhook</span>
          </div>
          <p class="text-[11px] leading-relaxed text-rose-700">
            Pengiriman gagal dapat disebabkan URL webhook tidak merespons dalam waktu 10 detik, mengembalikan HTTP error code (4xx / 5xx), atau SSL/HTTPS server merchant belum valid. Pastikan endpoint merchant mengembalikan respon <code>200 OK</code> dengan segera.
          </p>
        </div>
      </div>

      <!-- MODAL FOOTER -->
      <div class="p-4 border-t border-slate-200 flex items-center justify-between bg-slate-50">
        <button
          class="btn btn-secondary text-xs"
          @click="emit('close')"
        >
          Tutup
        </button>

        <button
          class="btn btn-primary text-xs flex items-center gap-1.5"
          :disabled="false"
          @click="emit('resend', log)"
        >
          <RefreshCw :size="12" />
          <span>Kirim Ulang Webhook Sekarang</span>
        </button>
      </div>
    </div>
  </div>
</template>
