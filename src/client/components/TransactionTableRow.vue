<script setup lang="ts">
import { computed } from 'vue';
import {
  Copy,
  Check,
  ExternalLink,
  Zap,
  Clock
} from 'lucide-vue-next';
import StatusBadge from './StatusBadge.vue';
import { formatRupiah, formatTime, formatDateTime, getInvoiceTimeRemaining } from '../utils/formatters';
import { useClipboard } from '../composables/useClipboard';
import type { Charge } from '../types';

const props = defineProps<{
  transaction: Charge;
  showTenantColumn: boolean;
  currentTime: number;
}>();

const emit = defineEmits<{
  (e: 'simulatePaid', id: string): void;
  (e: 'copyCheckoutUrl', id: string): void;
}>();

const { copiedId, copy } = useClipboard();

const copyCheckoutRoute = async (chargeId: string) => {
  const fullUrl = `${window.location.origin}/checkout/${chargeId}`;
  await copy(fullUrl, `checkout-${chargeId}`);
};

const timeRemaining = computed(() => {
  if (props.transaction.status !== 'PENDING' || !props.transaction.expiresAt) return null;
  return getInvoiceTimeRemaining(props.transaction.expiresAt, props.currentTime);
});
</script>

<template>
  <tr class="hover:bg-slate-50/80 transition border-b border-slate-100 text-xs">
    <!-- 1. INVOICE (HANYA ORDER ID, 1 BARIS) -->
    <td class="py-2.5 px-3.5 whitespace-nowrap">
      <span class="font-bold text-slate-900 font-mono text-xs">{{ transaction.orderId }}</span>
    </td>

    <!-- 2. ID TRANSAKSI (DIPINDAHKAN MENJADI KOLOM TERSENDIRI, 1 BARIS) -->
    <td class="py-2.5 px-3.5 whitespace-nowrap">
      <div class="flex items-center gap-1.5 font-mono text-[11px]">
        <span class="text-slate-500" :title="transaction.id">{{ transaction.id.slice(0, 14) }}...</span>
        <button
          @click="copyCheckoutRoute(transaction.id)"
          class="text-slate-400 hover:text-slate-700 transition cursor-pointer p-0.5 rounded hover:bg-slate-100"
          title="Salin Link Checkout"
        >
          <Check v-if="copiedId === `checkout-${transaction.id}`" :size="12" class="text-emerald-500" />
          <Copy v-else :size="12" />
        </button>
      </div>
    </td>

    <!-- 3. SAAS TENANT (JIKA ADMIN) -->
    <td v-if="showTenantColumn" class="py-2.5 px-3.5 whitespace-nowrap">
      <span class="font-semibold text-slate-900">{{ transaction.tenantName || 'Platform Default' }}</span>
    </td>

    <!-- 4. PELANGGAN (1 BARIS) -->
    <td class="py-2.5 px-3.5 whitespace-nowrap">
      <span class="text-slate-800 font-medium">{{ transaction.customerName || '-' }}</span>
    </td>

    <!-- 5. KONTAK / EMAIL (DIPINDAHKAN MENJADI KOLOM TERSENDIRI, 1 BARIS) -->
    <td v-if="!showTenantColumn" class="py-2.5 px-3.5 whitespace-nowrap">
      <span class="text-slate-500 font-mono text-[11px]">{{ transaction.customerEmail || '-' }}</span>
    </td>

    <!-- 6. TOTAL TRANSFER (1 BARIS) -->
    <td class="py-2.5 px-3.5 whitespace-nowrap font-mono">
      <span class="font-bold text-slate-900 tabular-nums">
        {{ formatRupiah(transaction.totalAmount || transaction.amount) }}
      </span>
    </td>

    <!-- 7. KODE UNIK (DIPINDAHKAN MENJADI KOLOM TERSENDIRI, 1 BARIS) -->
    <td class="py-2.5 px-3.5 whitespace-nowrap font-mono text-[11px]">
      <span
        v-if="transaction.uniqueCode"
        class="text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded leading-none inline-block"
      >
        +{{ transaction.uniqueCode }}
      </span>
      <span v-else class="text-slate-300">-</span>
    </td>

    <!-- 8. STATUS & COUNTDOWN (1 BARIS HORIZONTAL) -->
    <td class="py-2.5 px-3.5 whitespace-nowrap">
      <div class="flex items-center gap-1.5">
        <StatusBadge :status="transaction.status" />

        <!-- LIVE COUNTDOWN FOR PENDING INVOICES -->
        <template v-if="timeRemaining && !timeRemaining.isExpired">
          <span
            :class="[
              'inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full border',
              timeRemaining.isUrgent
                ? 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse font-bold'
                : 'bg-slate-50 text-slate-600 border-slate-200'
            ]"
            :title="`Batas waktu: ${formatTime(transaction.expiresAt)}`"
          >
            <Clock :size="10" />
            <span>{{ timeRemaining.formatted }}</span>
          </span>
        </template>
      </div>
    </td>

    <!-- 9. WAKTU (1 BARIS LENGKAP: TANGGAL & JAM SEJAJAR) -->
    <td class="py-2.5 px-3.5 whitespace-nowrap text-slate-600 font-mono text-[11px]">
      <span>{{ formatDateTime(transaction.createdAt) }}</span>
    </td>

    <!-- 10. AKSI (1 BARIS) -->
    <td class="py-2.5 px-3.5 whitespace-nowrap text-right">
      <div class="flex items-center justify-end gap-1.5">
        <button
          v-if="transaction.status === 'PENDING'"
          @click="emit('simulatePaid', transaction.id)"
          class="btn btn-secondary !py-1 !px-2 !text-[11px] cursor-pointer text-emerald-700 hover:bg-emerald-50 hover:border-emerald-200 inline-flex items-center gap-1 leading-none shadow-2xs"
          title="Simulasikan Notifikasi Pembayaran Berhasil"
        >
          <Zap :size="11" class="text-emerald-600" />
          <span>Bayar</span>
        </button>

        <a
          :href="`/checkout/${transaction.id}`"
          target="_blank"
          class="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition inline-flex items-center"
          title="Buka Halaman Checkout Pembayaran"
        >
          <ExternalLink :size="13" />
        </a>
      </div>
    </td>
  </tr>
</template>
