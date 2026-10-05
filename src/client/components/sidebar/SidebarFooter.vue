<script setup lang="ts">
import { ExternalLink } from 'lucide-vue-next';
import type { Tenant } from '../../types';

defineProps<{
  isMerchantMode: boolean;
  currentUser: any;
  tenants: Tenant[];
}>();
</script>

<template>
  <div class="p-3 border-t border-slate-200/80 bg-white flex flex-col gap-2">
    <!-- MERCHANT STORE STATUS -->
    <div
      v-if="isMerchantMode"
      class="flex items-center justify-between px-2.5 py-1.5 text-xs text-slate-600 font-medium bg-slate-50/80 rounded-md border border-slate-200/60"
    >
      <div class="flex items-center gap-2 min-w-0">
        <span class="relative flex h-2 w-2 shrink-0">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span class="text-[11px] font-medium text-slate-700 truncate">Toko Aktif</span>
      </div>
      <span class="text-[10px] text-slate-500 font-mono font-semibold truncate max-w-[100px]">
        {{ tenants?.[0]?.name || 'Toko Anda' }}
      </span>
    </div>

    <!-- PLATFORM GATEWAY STATUS -->
    <div v-else class="flex flex-col gap-1.5">
      <div class="flex items-center justify-between px-2.5 py-1.5 text-xs text-slate-600 font-medium bg-slate-50/80 rounded-md border border-slate-200/60">
        <div class="flex items-center gap-2">
          <span class="relative flex h-2 w-2 shrink-0">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span class="text-[11px] font-medium text-slate-700">Gateway Engine</span>
        </div>
        <span class="text-[10px] text-emerald-600 font-mono font-bold">Online</span>
      </div>

      <a
        href="/swagger"
        target="_blank"
        class="flex items-center justify-between text-[11px] text-slate-500 hover:text-[#d71920] px-2 py-1 transition rounded hover:bg-slate-50"
      >
        <span>OpenAPI Swagger</span>
        <ExternalLink :size="12" />
      </a>
    </div>
  </div>
</template>
