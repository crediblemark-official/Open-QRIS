<script setup lang="ts">
import { computed, ref } from 'vue';
import { 
  CreditCard, 
  Building2, 
  Layers, 
  Link2, 
  RefreshCw, 
  Activity 
} from 'lucide-vue-next';
import { formatRupiah } from '../utils/formatters';
import MetricCard from '../components/MetricCard.vue';
import PaymentLinkModal from '../components/PaymentLinkModal.vue';
import PlatformStatsRibbon from '../components/PlatformStatsRibbon.vue';
import type { Charge, Tenant } from '../types';

const props = defineProps<{
  transactions: Charge[];
  tenants: Tenant[];
  authToken?: string;
}>();

const emit = defineEmits<{
  (e: 'navigate', tab: 'dashboard' | 'playground' | 'qris' | 'apps' | 'listener' | 'docs' | 'webhooks' | 'transactions'): void;
  (e: 'simulatePaid', id: string): void;
  (e: 'refresh'): void;
}>();

// Modal State
const showPaymentLinkModal = ref(false);
const selectedTenantId = ref(props.tenants[0]?.id || '');

// Primary Platform Metrics
const totalVolume = computed(() => {
  return props.transactions
    .filter((t) => t.status === 'PAID')
    .reduce((acc, curr) => acc + (curr.totalAmount || curr.amount), 0);
});

const paidCount = computed(() => {
  return props.transactions.filter((t) => t.status === 'PAID').length;
});

const pendingCount = computed(() => {
  return props.transactions.filter((t) => t.status === 'PENDING').length;
});

const expiredCount = computed(() => {
  return props.transactions.filter((t) => t.status === 'EXPIRED').length;
});

const conversionRate = computed(() => {
  const total = props.transactions.length;
  if (total === 0) return 0;
  return Math.round((paidCount.value / total) * 100);
});

const expiredRate = computed(() => {
  const total = props.transactions.length;
  if (total === 0) return 0;
  return Math.round((expiredCount.value / total) * 100);
});

const volumeLast7Days = computed(() => {
  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 3600 * 1000;
  return props.transactions
    .filter((t) => t.status === 'PAID' && new Date(t.createdAt).getTime() >= sevenDaysAgo)
    .reduce((acc, curr) => acc + (curr.totalAmount || curr.amount), 0);
});
</script>

<template>
  <div class="flex flex-col">
    <!-- PRIMARY AGGREGATE METRICS & ANALYTICS RIBBON (CONNECTED TABLE GRID) -->
    <div class="border-b border-slate-200/90 divide-y divide-slate-200/90 bg-white overflow-hidden">
      <div class="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-slate-200/90">
        <MetricCard 
          label="Volume Lunas" 
          :value="formatRupiah(totalVolume)" 
          :subtitle="`${paidCount} transaksi berhasil`" 
          :badge="{ text: 'PAID', variant: 'emerald' }" 
          :icon="CreditCard" 
        />

        <MetricCard 
          label="Menunggu Bayar" 
          :value="`${pendingCount} Invoice`" 
          subtitle="Validasi unik aktif" 
          :badge="{ text: 'PENDING', variant: 'amber' }" 
          :icon="Layers" 
        />

        <MetricCard 
          label="SaaS Clients" 
          :value="`${tenants.length} Mitra`" 
          subtitle="Apps terintegrasi" 
          :badge="{ text: 'ACTIVE', variant: 'blue' }" 
          :icon="Building2" 
        />

        <MetricCard 
          label="Conversion Rate" 
          :value="`${conversionRate}%`" 
          :subtitle="`${expiredCount} kadaluarsa (${expiredRate}%)`" 
          :badge="{ text: `${paidCount}/${transactions.length}`, variant: 'slate' }" 
          :icon="Activity" 
        />
      </div>

      <PlatformStatsRibbon
        :standalone="false"
        :volumeLast7Days="volumeLast7Days"
        :conversionRate="conversionRate"
        :expiredRate="expiredRate"
        compliance="ASPI / EMVCo / CRC16"
      />
    </div>


    <!-- 5. PAYMENT LINK GENERATOR MODAL (MULTI-TENANT ADMIN) -->
    <PaymentLinkModal
      v-if="showPaymentLinkModal"
      :isOpen="showPaymentLinkModal"
      :tenants="tenants"
      :defaultTenantId="selectedTenantId"
      :isAdmin="true"
      :authToken="authToken"
      @close="showPaymentLinkModal = false"
      @created="emit('refresh')"
      @toast="emit('refresh')"
    />
  </div>
</template>
