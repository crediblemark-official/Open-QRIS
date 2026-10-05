<script setup lang="ts">
import { ref } from 'vue';
import {
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Eye,
  RefreshCw,
  Building2,
  Webhook
} from 'lucide-vue-next';
import { formatDateTime } from '../../utils/formatters';
import { useClipboard } from '../../composables/useClipboard';
import type { WebhookLog, Tenant } from '../../types';

const props = defineProps<{
  logs: WebhookLog[];
  isLoading: boolean;
  isMerchant: boolean;
  tenants?: Tenant[];
}>();

const emit = defineEmits<{
  (e: 'viewDetail', log: WebhookLog): void;
  (e: 'resend', log: WebhookLog): void;
}>();

const { copy } = useClipboard();
const copiedField = ref<string | null>(null);

const getTenantName = (tenantId: string) => {
  if (!props.tenants) return tenantId;
  const t = props.tenants.find((item) => item.id === tenantId);
  return t ? t.name : tenantId;
};

const copyValue = async (text: string, fieldKey: string) => {
  const ok = await copy(text, fieldKey);
  if (ok) {
    copiedField.value = fieldKey;
  }
};
</script>

<template>
  <div class="overflow-x-auto">
    <table class="w-full text-left text-xs">
      <thead class="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
        <tr>
          <th class="py-2.5 px-4 w-28">Status</th>
          <th v-if="!isMerchant" class="py-2.5 px-4">SaaS Tenant</th>
          <th class="py-2.5 px-4">Order ID / Charge</th>
          <th class="py-2.5 px-4">Target Webhook URL</th>
          <th class="py-2.5 px-4 w-24">HTTP Code</th>
          <th class="py-2.5 px-4">Waktu Eksekusi</th>
          <th class="py-2.5 px-4 text-right">Aksi</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-100">
        <tr v-if="isLoading" class="text-slate-400">
          <td :colspan="isMerchant ? 6 : 7" class="py-8 text-center">
            <div class="flex items-center justify-center gap-2">
              <RefreshCw :size="16" class="animate-spin text-[#d71920]" />
              <span>Memuat data log webhook...</span>
            </div>
          </td>
        </tr>

        <tr v-else-if="logs.length === 0" class="text-slate-400">
          <td :colspan="isMerchant ? 6 : 7" class="py-12 text-center">
            <div class="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
              <Webhook :size="24" />
            </div>
            <div class="font-bold text-slate-700 text-sm">Belum Ada Log Webhook</div>
            <p class="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Webhook akan tercatat otomatis setiap kali notifikasi transfer masuk dan pembayaran tagihan terkonfirmasi.
            </p>
          </td>
        </tr>

        <tr
          v-for="log in logs"
          :key="log.id"
          class="hover:bg-slate-50/80 transition"
        >
          <!-- STATUS -->
          <td class="py-3 px-4">
            <span
              v-if="log.status === 'SUCCESS'"
              class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200"
            >
              <CheckCircle2 :size="11" />
              SUCCESS
            </span>
            <span
              v-else
              class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200"
            >
              <XCircle :size="11" />
              FAILED
            </span>
          </td>

          <!-- TENANT (ADMIN ONLY) -->
          <td v-if="!isMerchant" class="py-3 px-4 font-medium text-slate-800">
            <div class="flex items-center gap-1.5">
              <Building2 :size="13" class="text-slate-400 shrink-0" />
              <span class="truncate max-w-[130px]">{{ getTenantName(log.tenantId) }}</span>
            </div>
          </td>

          <!-- ORDER & CHARGE ID -->
          <td class="py-3 px-4">
            <div class="font-mono font-bold text-slate-900">{{ log.orderId }}</div>
            <div class="text-[10px] font-mono text-slate-400 truncate max-w-[140px]">{{ log.chargeId }}</div>
          </td>

          <!-- TARGET URL -->
          <td class="py-3 px-4">
            <div class="flex items-center gap-1 max-w-[260px]">
              <span class="font-mono text-[11px] text-slate-600 truncate" :title="log.targetUrl">
                {{ log.targetUrl }}
              </span>
              <button
                class="text-slate-400 hover:text-slate-700 p-0.5"
                title="Copy URL"
                @click="copyValue(log.targetUrl, `url-${log.id}`)"
              >
                <Check v-if="copiedField === `url-${log.id}`" :size="11" class="text-emerald-600" />
                <Copy v-else :size="11" />
              </button>
            </div>
          </td>

          <!-- HTTP STATUS CODE -->
          <td class="py-3 px-4">
            <span
              v-if="log.statusCode && log.statusCode >= 200 && log.statusCode < 300"
              class="font-mono text-xs font-bold text-emerald-600"
            >
              {{ log.statusCode }} OK
            </span>
            <span
              v-else-if="log.statusCode"
              class="font-mono text-xs font-bold text-rose-600"
            >
              {{ log.statusCode }}
            </span>
            <span v-else class="font-mono text-xs text-slate-400">
              -
            </span>
          </td>

          <!-- ATTEMPTED AT -->
          <td class="py-3 px-4 text-slate-600 text-[11px] whitespace-nowrap">
            {{ formatDateTime(log.attemptedAt) }}
          </td>

          <!-- ACTIONS -->
          <td class="py-3 px-4 text-right">
            <div class="flex items-center justify-end gap-1.5">
              <button
                class="p-1.5 rounded-md hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition cursor-pointer"
                title="Lihat Detail Payload & Response"
                @click="emit('viewDetail', log)"
              >
                <Eye :size="14" />
              </button>

              <button
                class="btn btn-secondary !py-1 !px-2 text-[11px] flex items-center gap-1"
                :disabled="false"
                title="Kirim Ulang Webhook ini ke Endpoint Merchant"
                @click="emit('resend', log)"
              >
                <RefreshCw :size="11" />
                <span>Retry</span>
              </button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
