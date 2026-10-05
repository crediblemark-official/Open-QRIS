<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { 
  TrendingUp, 
  Clock, 
  CreditCard, 
  QrCode 
} from 'lucide-vue-next';
import { formatRupiah } from '../utils/formatters';
import MetricCard from '../components/MetricCard.vue';
import PaymentLinkModal from '../components/PaymentLinkModal.vue';
import ApiKeyCard from '../components/ApiKeyCard.vue';
import TenantQrisCard from '../components/TenantQrisCard.vue';
import StoreHeader from '../components/StoreHeader.vue';
import type { Charge, Tenant, User } from '../types';

const props = defineProps<{
  transactions: Charge[];
  tenants: Tenant[];
  currentUser?: User | null;
  authToken?: string;
}>();

const emit = defineEmits<{
  (e: 'navigate', tab: 'dashboard' | 'qris' | 'apps' | 'listener' | 'playground' | 'docs' | 'settings' | 'transactions'): void;
  (e: 'simulatePaid', id: string): void;
  (e: 'refresh'): void;
  (e: 'toast', msg: string): void;
}>();

// Selected Tenant for Admin Preview
const selectedTenantId = ref(props.tenants?.[0]?.id || '');

watch(() => props.tenants, (newTenants) => {
  if (newTenants && newTenants.length > 0 && (!selectedTenantId.value || !newTenants.find(t => t.id === selectedTenantId.value))) {
    selectedTenantId.value = newTenants[0].id;
  }
}, { immediate: true });

const myTenant = computed(() => {
  if (props.currentUser?.role === 'merchant') {
    return props.currentUser?.tenant || props.tenants?.[0] || null;
  }
  return props.tenants?.find(t => t.id === selectedTenantId.value) || props.tenants?.[0] || null;
});

const tenantTransactions = computed(() => {
  if (props.currentUser?.role === 'merchant') {
    return props.transactions;
  }
  if (!myTenant.value) return props.transactions;
  return props.transactions.filter(t => t.tenantId === myTenant.value.id || (t as any).tenant_id === myTenant.value.id);
});

// Metrics
const totalVolume = computed(() =>
  tenantTransactions.value.filter(t => t.status === 'PAID').reduce((a, c) => a + (c.totalAmount || c.amount), 0)
);
const paidCount = computed(() => tenantTransactions.value.filter(t => t.status === 'PAID').length);
const pendingCount = computed(() => tenantTransactions.value.filter(t => t.status === 'PENDING').length);
const todayVolume = computed(() => {
  const now = Date.now();
  return tenantTransactions.value
    .filter(t => t.status === 'PAID' && (now - new Date(t.createdAt).getTime()) < 86400000)
    .reduce((a, c) => a + (c.totalAmount || c.amount), 0);
});

// Payment Link Modal State
const showPaymentLinkModal = ref(false);
</script>

<template>
  <div class="flex flex-col">
    <!-- 1. STORE PROFILE HEADER -->
    <StoreHeader
      :storeName="myTenant?.name || currentUser?.name || 'Toko Anda'"
      :isAdmin="currentUser?.role === 'admin'"
      :tenants="tenants"
      :selectedTenantId="selectedTenantId"
      @update:selectedTenantId="selectedTenantId = $event"
      @openPaymentLink="showPaymentLinkModal = true"
      @refresh="emit('refresh')"
    />

    <!-- 2. PRIMARY METRICS & OPERATIONAL GRID (CONNECTED TABLE-LIKE STRUCTURE) -->
    <div class="border-b border-slate-200/90 divide-y divide-slate-200/90 bg-white overflow-hidden">
      <!-- ROW 1: 4 PRIMARY METRIC CELLS (2 COLUMNS ON MOBILE, 4 COLUMNS ON DESKTOP) -->
      <div class="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-slate-200/90">
        <MetricCard
          label="Total Pemasukan"
          :value="formatRupiah(totalVolume)"
          :subtitle="`${paidCount} transaksi lunas`"
          :icon="TrendingUp"
          :badge="{ text: 'Semua Waktu', variant: 'emerald' }"
        />
        <MetricCard
          label="Hari Ini"
          :value="formatRupiah(todayVolume)"
          subtitle="Pemasukan 24 jam terakhir"
          :icon="Clock"
          :badge="{ text: '24 Jam', variant: 'blue' }"
        />
        <MetricCard
          label="Menunggu Bayar"
          :value="`${pendingCount} order`"
          subtitle="Belum terbayar"
          :icon="CreditCard"
          :badge="{ text: 'Pending', variant: 'amber' }"
        />
        <MetricCard
          label="Total Order"
          :value="`${tenantTransactions.length} order`"
          subtitle="Semua status"
          :icon="QrCode"
          :badge="{ text: 'Total', variant: 'slate' }"
        />
      </div>

      <!-- ROW 2: OPERATIONAL CELLS (2 COLUMNS SEOLAH KAYAK BARIS TABEL) -->
      <div class="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-200/90" v-if="myTenant">
        <ApiKeyCard
          :tenant="myTenant"
          @manage="emit('navigate', 'apps')"
          @toast="emit('toast', $event)"
        />

        <TenantQrisCard
          :tenant="myTenant"
          @navigate="emit('navigate', $event)"
        />
      </div>
    </div>


    <!-- 5. PAYMENT LINK GENERATOR MODAL -->
    <PaymentLinkModal
      v-if="showPaymentLinkModal"
      :isOpen="showPaymentLinkModal"
      :tenants="tenants"
      :defaultTenantId="myTenant?.id"
      :isAdmin="false"
      :authToken="authToken"
      @close="showPaymentLinkModal = false"
      @created="emit('refresh')"
      @toast="emit('toast', $event)"
    />
  </div>
</template>
