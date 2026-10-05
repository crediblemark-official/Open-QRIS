<script setup lang="ts">
import {
  Layers,
  Receipt,
  Building2,
  Webhook,
  CreditCard,
  Smartphone,
  Terminal,
  Code2,
  Settings as SettingsIcon
} from 'lucide-vue-next';
import type { Tenant } from '../../types';

defineProps<{
  activeTab: string;
  tenants: Tenant[];
}>();

const emit = defineEmits<{
  (e: 'selectTab', tab: string): void;
}>();
</script>

<template>
  <nav class="p-3 flex flex-col gap-1 flex-1 overflow-y-auto">
    <!-- SECTION: PLATFORM CONTROL -->
    <div class="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2.5 pt-2 pb-1">
      Platform Control
    </div>

    <button
      :class="[
        'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition cursor-pointer text-left group',
        activeTab === 'dashboard'
          ? 'bg-white text-slate-900 font-semibold shadow-xs border border-slate-200/90'
          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 border border-transparent'
      ]"
      @click="emit('selectTab', 'dashboard')"
    >
      <Layers
        :size="16"
        :class="activeTab === 'dashboard' ? 'text-[#d71920]' : 'text-slate-400 group-hover:text-slate-600 transition-colors'"
      />
      <span class="truncate">Platform Control Panel</span>
    </button>

    <button
      :class="[
        'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition cursor-pointer text-left group',
        activeTab === 'transactions'
          ? 'bg-white text-slate-900 font-semibold shadow-xs border border-slate-200/90'
          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 border border-transparent'
      ]"
      @click="emit('selectTab', 'transactions')"
    >
      <Receipt
        :size="16"
        :class="activeTab === 'transactions' ? 'text-[#d71920]' : 'text-slate-400 group-hover:text-slate-600 transition-colors'"
      />
      <span class="truncate">Transaksi Global</span>
    </button>

    <!-- SECTION: MANAJEMEN MITRA -->
    <div class="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2.5 pt-4 pb-1">
      Manajemen Mitra
    </div>

    <button
      :class="[
        'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition cursor-pointer text-left group',
        activeTab === 'apps'
          ? 'bg-white text-slate-900 font-semibold shadow-xs border border-slate-200/90'
          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 border border-transparent'
      ]"
      @click="emit('selectTab', 'apps')"
    >
      <Building2
        :size="16"
        :class="activeTab === 'apps' ? 'text-[#d71920]' : 'text-slate-400 group-hover:text-slate-600 transition-colors'"
      />
      <span class="truncate">SaaS Clients (Mitra)</span>
      <span class="ml-auto text-[10px] font-mono font-medium bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-slate-700 shrink-0">
        {{ tenants.length }}
      </span>
    </button>

    <button
      :class="[
        'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition cursor-pointer text-left group',
        activeTab === 'webhooks'
          ? 'bg-white text-slate-900 font-semibold shadow-xs border border-slate-200/90'
          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 border border-transparent'
      ]"
      @click="emit('selectTab', 'webhooks')"
    >
      <Webhook
        :size="16"
        :class="activeTab === 'webhooks' ? 'text-[#d71920]' : 'text-slate-400 group-hover:text-slate-600 transition-colors'"
      />
      <span class="truncate">Webhook Delivery Queue</span>
    </button>

    <button
      :class="[
        'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition cursor-pointer text-left group',
        activeTab === 'qris'
          ? 'bg-white text-slate-900 font-semibold shadow-xs border border-slate-200/90'
          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 border border-transparent'
      ]"
      @click="emit('selectTab', 'qris')"
    >
      <CreditCard
        :size="16"
        :class="activeTab === 'qris' ? 'text-[#d71920]' : 'text-slate-400 group-hover:text-slate-600 transition-colors'"
      />
      <span class="truncate">Master QRIS Platform</span>
    </button>

    <!-- SECTION: OPERASIONAL GATEWAY -->
    <div class="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2.5 pt-4 pb-1">
      Operasional Gateway
    </div>

    <button
      :class="[
        'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition cursor-pointer text-left group',
        activeTab === 'listener'
          ? 'bg-white text-slate-900 font-semibold shadow-xs border border-slate-200/90'
          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 border border-transparent'
      ]"
      @click="emit('selectTab', 'listener')"
    >
      <Smartphone
        :size="16"
        :class="activeTab === 'listener' ? 'text-[#d71920]' : 'text-slate-400 group-hover:text-slate-600 transition-colors'"
      />
      <span class="truncate">Central HP Listeners</span>
      <span class="ml-auto text-[9px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded shrink-0">
        BETA
      </span>
    </button>

    <button
      :class="[
        'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition cursor-pointer text-left group',
        activeTab === 'playground'
          ? 'bg-white text-slate-900 font-semibold shadow-xs border border-slate-200/90'
          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 border border-transparent'
      ]"
      @click="emit('selectTab', 'playground')"
    >
      <Terminal
        :size="16"
        :class="activeTab === 'playground' ? 'text-[#d71920]' : 'text-slate-400 group-hover:text-slate-600 transition-colors'"
      />
      <span class="truncate">Playground Simulator</span>
      <span class="ml-auto text-[9px] font-mono font-medium text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded shrink-0">
        DEV
      </span>
    </button>

    <button
      :class="[
        'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition cursor-pointer text-left group',
        activeTab === 'docs'
          ? 'bg-white text-slate-900 font-semibold shadow-xs border border-slate-200/90'
          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 border border-transparent'
      ]"
      @click="emit('selectTab', 'docs')"
    >
      <Code2
        :size="16"
        :class="activeTab === 'docs' ? 'text-[#d71920]' : 'text-slate-400 group-hover:text-slate-600 transition-colors'"
      />
      <span class="truncate">REST API & Specs</span>
    </button>

    <!-- SECTION: SISTEM -->
    <div class="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2.5 pt-4 pb-1">
      Sistem
    </div>

    <button
      :class="[
        'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition cursor-pointer text-left group',
        activeTab === 'settings'
          ? 'bg-white text-slate-900 font-semibold shadow-xs border border-slate-200/90'
          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 border border-transparent'
      ]"
      @click="emit('selectTab', 'settings')"
    >
      <SettingsIcon
        :size="16"
        :class="activeTab === 'settings' ? 'text-[#d71920]' : 'text-slate-400 group-hover:text-slate-600 transition-colors'"
      />
      <span class="truncate">Gateway Settings</span>
    </button>
  </nav>
</template>
