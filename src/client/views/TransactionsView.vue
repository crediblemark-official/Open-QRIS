<script setup lang="ts">
import { ref, computed } from 'vue';
import TransactionTable from '../components/TransactionTable.vue';
import PaymentLinkModal from '../components/PaymentLinkModal.vue';
import type { Charge, Tenant, User, TransactionServerFetch } from '../types';

const props = defineProps<{
  transactions: Charge[];
  tenants: Tenant[];
  currentUser?: User | null;
  isMerchantMode: boolean;
  authToken?: string;
  serverFetch?: TransactionServerFetch;
}>();

const emit = defineEmits<{
  (e: 'navigate', tab: string): void;
  (e: 'simulatePaid', id: string): void;
  (e: 'refresh'): void;
  (e: 'toast', msg: string): void;
}>();

const showPaymentLinkModal = ref(false);

// Admin platform (bukan mode merchant) melihat semua tenant + kolom tenant
const isPlatformView = computed(() => !props.isMerchantMode);
const defaultTenantId = computed(() => props.currentUser?.tenant?.id || props.tenants?.[0]?.id || '');
</script>

<template>
  <div>
    <TransactionTable
      :transactions="transactions"
      :serverFetch="serverFetch"
      :showTenantColumn="isPlatformView"
      :enableDateFilter="true"
      :initialPageSize="25"
      :showPlaygroundButton="isPlatformView"
      @simulatePaid="emit('simulatePaid', $event)"
      @openPaymentLink="showPaymentLinkModal = true"
      @openPlayground="emit('navigate', 'playground')"
      @refresh="emit('refresh')"
    />

    <PaymentLinkModal
      v-if="showPaymentLinkModal"
      :isOpen="showPaymentLinkModal"
      :tenants="tenants"
      :defaultTenantId="defaultTenantId"
      :isAdmin="isPlatformView"
      :authToken="authToken"
      @close="showPaymentLinkModal = false"
      @created="emit('refresh')"
      @toast="emit('toast', $event)"
    />
  </div>
</template>
