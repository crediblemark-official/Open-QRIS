<script setup lang="ts">
import { computed } from 'vue';
import { 
  Copy, 
  Check, 
  ExternalLink, 
  Zap, 
  Clock,
  Store,
  User
} from 'lucide-vue-next';
import StatusBadge from './StatusBadge.vue';
import { formatRupiah, formatDateTime, getInvoiceTimeRemaining } from '../utils/formatters';
import { useClipboard } from '../composables/useClipboard';
import type { Charge } from '../types';

const props = defineProps<{
  transaction: Charge;
  showTenantColumn: boolean;
  currentTime: number;
}>();

const emit = defineEmits<{
  (e: 'simulatePaid', id: string): void;
}>();

const { copiedId, copy } = useClipboard();

const copyCheckoutRoute = async (chargeId: string) => {
  const fullUrl = `${window.location.origin}/checkout/${chargeId}`;
  await copy(fullUrl, `checkout-${chargeId}`);
};

const timeRemaining = computed(() => {
  if (props.transaction.status !== 'PENDING' || !props.transaction.expiredAt) return null;
  return getInvoiceTimeRemaining(props.transaction.expiredAt, props.currentTime);
});
</script>

<template>
  <div class="p-3.5 bg-white hover:bg-slate-50/80 transition flex flex-col gap-2.5">
    <!-- TOP ROW: ORDER ID & STATUS BADGE -->
    <div class="flex items-center justify-between gap-2">
      <div class="flex items-center gap-1.5 min-w-0">
        <span class="font-mono font-bold text-slate-900 text-xs truncate">
          {{ transaction.orderId }}
        </span>
        <button
          @click="copyCheckoutRoute(transaction.id)"
          class="p-1 rounded text-slate-400 hover:text-slate-700 transition cursor-pointer shrink-0"
          title="Salin Link Checkout"
        >
          <Check v-if="copiedId === `checkout-${transaction.id}`" :size="12" class="text-emerald-500" />
          <Copy v-else :size="12" />
        </button>
      </div>

      <div class="flex items-center gap-1 shrink-0">
        <StatusBadge :status="transaction.status" />
      </div>
    </div>

    <!-- MIDDLE ROW: TENANT/CUSTOMER & NOMINAL -->
    <div class="flex items-end justify-between gap-2">
      <div class="min-w-0 text-xs">
        <div class="flex items-center gap-1 text-slate-600 truncate">
          <component :is="showTenantColumn ? Store : User" :size="12" class="text-slate-400 shrink-0" />
          <span class="truncate font-medium">
            {{ showTenantColumn ? (transaction.tenantName || 'Platform Default') : (transaction.customerName || 'Pelanggan Toko') }}
          </span>
        </div>
        <div class="text-[11px] text-slate-400 mt-0.5 font-mono">
          {{ formatDateTime(transaction.createdAt) }}
        </div>
      </div>

      <!-- AMOUNT DISPLAY -->
      <div class="text-right shrink-0">
        <div class="font-mono font-black text-slate-900 text-sm tabular-nums">
          {{ formatRupiah(transaction.totalAmount || transaction.amount) }}
        </div>
        <div v-if="transaction.uniqueCode" class="text-[10px] text-emerald-600 font-medium tabular-nums font-mono">
          +{{ transaction.uniqueCode }} unik
        </div>
      </div>
    </div>

    <!-- BOTTOM ROW: ACTIONS & TIME REMAINING -->
    <div class="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap text-xs">
      <!-- PENDING COUNTDOWN -->
      <div v-if="timeRemaining && !timeRemaining.isExpired" class="flex items-center">
        <span
          :class="[
            'inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full border',
            timeRemaining.isUrgent
              ? 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse font-bold'
              : 'bg-slate-50 text-slate-600 border-slate-200'
          ]"
        >
          <Clock :size="10" />
          <span>{{ timeRemaining.formatted }}</span>
        </span>
      </div>
      <div v-else class="text-[10px] text-slate-400 font-mono">
        ID: {{ transaction.id.slice(0, 12) }}...
      </div>

      <!-- QUICK ACTION BUTTONS -->
      <div class="flex items-center gap-1.5 ml-auto">
        <a
          :href="`/checkout/${transaction.id}`"
          target="_blank"
          class="btn btn-secondary !py-1 !px-2 !text-[11px] text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 rounded-md"
        >
          <span>Checkout</span>
          <ExternalLink :size="10" />
        </a>

        <button
          v-if="transaction.status === 'PENDING'"
          @click="emit('simulatePaid', transaction.id)"
          class="btn btn-primary !py-1 !px-2 !text-[11px] inline-flex items-center gap-1 rounded-md shadow-xs active:scale-95"
          title="Simulasi Bayar Otomatis"
        >
          <Zap :size="10" />
          <span>Simulasi Bayar</span>
        </button>
      </div>
    </div>
  </div>
</template>
