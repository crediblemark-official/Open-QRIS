<script setup lang="ts">
import { Store, Link2, RefreshCw } from 'lucide-vue-next';

defineProps<{
  storeName: string;
  isAdmin: boolean;
  tenants: any[];
  selectedTenantId: string;
}>();

const emit = defineEmits<{
  (e: 'update:selectedTenantId', id: string): void;
  (e: 'openPaymentLink'): void;
  (e: 'refresh'): void;
}>();
</script>

<template>
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-6 py-3 bg-white border-b border-slate-200/90">
    <div class="flex items-center gap-2 flex-wrap">
      <div class="w-6 h-6 rounded bg-amber-100 border border-amber-200 flex items-center justify-center shrink-0">
        <Store :size="13" class="text-amber-700" />
      </div>
      <span class="text-sm font-bold text-slate-900 tracking-tight">
        {{ storeName }}
      </span>
      <span 
        :class="[
          'px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded border',
          isAdmin 
            ? 'bg-slate-100 border-slate-200 text-slate-700' 
            : 'bg-amber-50 border-amber-200 text-amber-700'
        ]"
      >
        {{ isAdmin ? 'Preview Toko (Admin)' : 'Merchant' }}
      </span>

      <!-- MULTI-STORE SELECTOR (ADMIN ONLY) -->
      <div v-if="isAdmin && tenants.length > 1" class="flex items-center gap-1.5 ml-2">
        <span class="text-xs text-slate-500 font-medium">Pilih Toko:</span>
        <select 
          :value="selectedTenantId"
          @change="emit('update:selectedTenantId', ($event.target as HTMLSelectElement).value)"
          class="text-xs border border-slate-200 rounded px-2 py-1 bg-white font-medium text-slate-700 focus:outline-none focus:border-red-500 cursor-pointer shadow-2xs"
        >
          <option v-for="t in tenants" :key="t.id" :value="t.id">{{ t.name }}</option>
        </select>
      </div>
    </div>

    <div class="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-100">
      <button 
        @click="emit('openPaymentLink')" 
        class="btn btn-primary btn-sm flex-1 sm:flex-initial cursor-pointer shadow-xs !py-2 sm:!py-1.5"
      >
        <Link2 :size="14" />
        <span>Buat Payment Link</span>
      </button>

      <button 
        @click="emit('refresh')" 
        class="p-2 sm:p-1.5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer border border-slate-200 sm:border-transparent shrink-0" 
        title="Refresh Data"
      >
        <RefreshCw :size="15" />
      </button>
    </div>
  </div>
</template>
