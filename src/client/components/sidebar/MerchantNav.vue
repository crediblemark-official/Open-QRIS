<script setup lang="ts">
import {
  Store,
  CreditCard,
  Key,
  Smartphone,
  Webhook,
  BookOpen,
  Settings as SettingsIcon
} from 'lucide-vue-next';
import type { Tenant } from '../../types';

defineProps<{
  activeTab: string;
  tenants: Tenant[];
  defaultStaticQRIS?: string;
}>();

const emit = defineEmits<{
  (e: 'selectTab', tab: string): void;
}>();
</script>

<template>
  <nav class="p-3 flex flex-col gap-1 flex-1 overflow-y-auto">
    <!-- SECTION: TOKO SAYA -->
    <div class="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2.5 pt-2 pb-1">
      Toko Saya
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
      <Store
        :size="16"
        :class="activeTab === 'dashboard' ? 'text-[#d71920]' : 'text-slate-400 group-hover:text-slate-600 transition-colors'"
      />
      <span class="truncate">Dashboard Toko</span>
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
      <span class="truncate">Transaksi</span>
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
      <span class="truncate">QRIS Toko Saya</span>
      <span
        v-if="!tenants?.[0]?.staticQRIS && !defaultStaticQRIS"
        class="ml-auto w-2 h-2 rounded-full bg-amber-500 ring-2 ring-amber-100 shrink-0"
        title="QRIS Toko belum diset"
      ></span>
    </button>

    <button
      :class="[
        'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition cursor-pointer text-left group',
        activeTab === 'apps'
          ? 'bg-white text-slate-900 font-semibold shadow-xs border border-slate-200/90'
          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 border border-transparent'
      ]"
      @click="emit('selectTab', 'apps')"
    >
      <Key
        :size="16"
        :class="activeTab === 'apps' ? 'text-[#d71920]' : 'text-slate-400 group-hover:text-slate-600 transition-colors'"
      />
      <span class="truncate">API Key & Webhook</span>
    </button>

    <!-- SECTION: OPERASIONAL -->
    <div class="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2.5 pt-4 pb-1">
      Operasional
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
      <span class="truncate">Notifikasi HP Toko</span>
      <span class="ml-auto text-[9px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded shrink-0">
        BETA
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
      <span class="truncate">Riwayat Webhook</span>
    </button>

    <!-- SECTION: BANTUAN & AKUN -->
    <div class="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2.5 pt-4 pb-1">
      Bantuan & Akun
    </div>

    <button
      :class="[
        'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition cursor-pointer text-left group',
        activeTab === 'docs'
          ? 'bg-white text-slate-900 font-semibold shadow-xs border border-slate-200/90'
          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 border border-transparent'
      ]"
      @click="emit('selectTab', 'docs')"
    >
      <BookOpen
        :size="16"
        :class="activeTab === 'docs' ? 'text-[#d71920]' : 'text-slate-400 group-hover:text-slate-600 transition-colors'"
      />
      <span class="truncate">Panduan Integrasi</span>
    </button>

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
      <span class="truncate">Pengaturan Akun</span>
    </button>
  </nav>
</template>

<script lang="ts">
import { Receipt } from 'lucide-vue-next';
export default {
  components: { Receipt }
};
</script>
