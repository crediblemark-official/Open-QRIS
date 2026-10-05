<script setup lang="ts">
import { ref, computed } from 'vue';
import { CreditCard, Loader2, AlertCircle, Check, ExternalLink } from 'lucide-vue-next';

const props = defineProps<{
  currentUser: any;
  paymentsReady: boolean;
  userHasProducts: boolean;
  teamsWithProducts: any[];
  selectedPaymentTarget: string;
  paymentCustomerBilling: any;
  paymentCustomerProducts: any[];
  paymentCustomerInvoices: any[];
  isLoading: boolean;
}>();

const emit = defineEmits<{
  (e: 'updatePaymentMethod'): void;
  (e: 'cancelSubscription', product: any): void;
  (e: 'selectTarget', target: string): void;
  (e: 'toast', msg: string): void;
}>();

const isUpdatingPayment = ref(false);

const shouldShowPayments = computed(() => {
  return props.paymentsReady && (props.userHasProducts || props.teamsWithProducts.length > 0);
});

const handleUpdatePayment = async () => {
  isUpdatingPayment.value = true;
  try {
    emit('updatePaymentMethod');
  } finally {
    isUpdatingPayment.value = false;
  }
};

const handleCancelSubscription = async (product: any) => {
  if (!confirm(`Batalkan langganan '${product.displayName}'?`)) return;
  emit('cancelSubscription', product);
};

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const formatCurrency = (amount: number, currency: string = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount / 100);
};
</script>

<template>
  <div v-if="shouldShowPayments" class="space-y-6">
    <div>
      <h3 class="text-sm font-bold text-slate-900 flex items-center gap-2">
        <CreditCard :size="16" class="text-slate-400" />
        Payments & Billing
      </h3>
      <p class="text-xs text-slate-500 mt-1">Kelola langganan dan metode pembayaran</p>
    </div>

    <!-- Payment target selector -->
    <div v-if="teamsWithProducts.length > 0" class="space-y-2">
      <label class="block text-xs font-medium text-slate-700">Billing Target</label>
      <select
        :value="selectedPaymentTarget"
        @change="emit('selectTarget', ($event.target as HTMLSelectElement).value)"
        class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        <option value="user">Personal Account</option>
        <option v-for="team in teamsWithProducts" :key="team.id" :value="team.id">
          {{ team.displayName }}
        </option>
      </select>
    </div>

    <!-- Payment method -->
    <div v-if="paymentCustomerBilling" class="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
      <div class="flex items-center justify-between">
        <span class="text-xs font-medium text-slate-700">Payment Method</span>
        <button
          @click="handleUpdatePayment"
          :disabled="isUpdatingPayment"
          class="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
        >
          <Loader2 v-if="isUpdatingPayment" :size="12" class="animate-spin" />
          Update
        </button>
      </div>
      <div v-if="paymentCustomerBilling.paymentMethod" class="flex items-center gap-2">
        <CreditCard :size="14" class="text-slate-400" />
        <span class="text-sm text-slate-900">
          {{ paymentCustomerBilling.paymentMethod.brand }} **** {{ paymentCustomerBilling.paymentMethod.last4 }}
        </span>
      </div>
      <div v-else class="text-xs text-slate-500">
        No payment method on file
      </div>
    </div>

    <!-- Products/Subscriptions -->
    <div v-if="paymentCustomerProducts.length > 0" class="space-y-2">
      <h4 class="text-xs font-medium text-slate-700">Active Subscriptions</h4>
      <div
        v-for="product in paymentCustomerProducts"
        :key="product.id"
        class="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200"
      >
        <div>
          <div class="text-sm font-medium text-slate-900">{{ product.displayName }}</div>
          <div class="text-[11px] text-slate-500">
            {{ formatCurrency(product.amount, product.currency) }} / {{ product.interval }}
          </div>
        </div>
        <button
          @click="handleCancelSubscription(product)"
          class="text-xs text-rose-600 hover:text-rose-700 font-medium"
        >
          Cancel
        </button>
      </div>
    </div>

    <!-- Invoices -->
    <div v-if="paymentCustomerInvoices.length > 0" class="space-y-2">
      <h4 class="text-xs font-medium text-slate-700">Recent Invoices</h4>
      <div
        v-for="invoice in paymentCustomerInvoices"
        :key="invoice.id"
        class="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200"
      >
        <div>
          <div class="text-sm font-medium text-slate-900">
            {{ formatCurrency(invoice.amount, invoice.currency) }}
          </div>
          <div class="text-[11px] text-slate-500">
            {{ formatDate(invoice.createdAt) }}
          </div>
        </div>
        <span
          :class="[
            'text-[10px] px-1.5 py-0.5 rounded-full font-medium',
            invoice.status === 'paid'
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-amber-100 text-amber-700'
          ]"
        >
          {{ invoice.status }}
        </span>
      </div>
    </div>

    <div v-if="isLoading" class="text-center py-8 text-slate-400">
      <Loader2 :size="32" class="mx-auto mb-2 animate-spin opacity-50" />
      <p class="text-sm">Memuat data pembayaran...</p>
    </div>
  </div>
</template>
