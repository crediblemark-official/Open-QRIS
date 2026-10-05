<script setup lang="ts">
import { ref } from 'vue';
import { 
  Layers, 
  Store, 
  ShieldCheck, 
  User, 
  LogOut, 
  RefreshCw,
  PanelLeftClose,
  PanelLeft,
  Zap,
  Key,
  Smartphone,
  Webhook,
  BookOpen,
  CreditCard,
  Building2,
  Terminal,
  Receipt,
  Menu
} from 'lucide-vue-next';

const props = withDefaults(defineProps<{
  title: string;
  currentUser: any;
  isMerchantMode: boolean;
  masterQRISInfo: any;
  tenants: any[];
  isFullWidthMode?: boolean;
  activeTab?: string;
}>(), {
  isFullWidthMode: false,
  activeTab: 'dashboard'
});

const emit = defineEmits<{
  (e: 'switchContext', target: 'merchant' | 'admin'): void;
  (e: 'switchTab', tab: string): void;
  (e: 'toggleFullWidth'): void;
  (e: 'toggleDrawer'): void;
  (e: 'refresh'): void;
  (e: 'logout'): void;
}>();

const isRefreshing = ref(false);

const handleRefresh = async () => {
  isRefreshing.value = true;
  emit('refresh');
  setTimeout(() => {
    isRefreshing.value = false;
  }, 600);
};
</script>

<template>
  <header class="border-b border-slate-200/80 bg-white select-none sticky top-0 z-30 shadow-2xs">
    <!-- TOP HEADER BAR -->
    <div class="h-14 flex items-center justify-between px-4 sm:px-6">
      <div class="flex items-center gap-2.5 sm:gap-3 min-w-0">
        <!-- FULL WIDTH BRAND LOGO -->
        <div v-if="isFullWidthMode" class="flex items-center gap-2 mr-1 pr-3 border-r border-slate-200">
          <div class="w-7 h-7 rounded-lg bg-[#d71920] flex items-center justify-center text-white shrink-0 shadow-xs">
            <Zap :size="15" class="text-white fill-white/20" />
          </div>
          <div class="min-w-0 hidden sm:block">
            <div class="font-bold text-xs tracking-tight text-slate-900 leading-tight">OpenQRIS</div>
            <div class="text-[10px] text-slate-500 font-medium leading-none truncate">
              {{ isMerchantMode ? 'Merchant Portal' : 'Platform Gateway' }}
            </div>
          </div>
        </div>

        <!-- MOBILE MENU BUTTON (HAMBURGER) -->
        <button 
          @click="emit('toggleDrawer')"
          class="md:hidden flex items-center justify-center p-1.5 text-slate-700 hover:text-slate-950 hover:bg-slate-100 rounded-md border border-slate-200 transition cursor-pointer shrink-0"
          title="Buka Menu Navigasi"
          aria-label="Buka Menu"
        >
          <Menu :size="18" />
        </button>

        <!-- FULL WIDTH / SIDEBAR TOGGLE BUTTON (DESKTOP ONLY) -->
        <button 
          @click="emit('toggleFullWidth')"
          :class="[
            'hidden md:flex items-center gap-1.5 px-2 py-1 text-xs font-semibold rounded-md border transition cursor-pointer shadow-2xs shrink-0',
            isFullWidthMode 
              ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100' 
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
          ]"
          :title="isFullWidthMode ? 'Beralih ke Tampilan Sidebar' : 'Beralih ke Tampilan Penuh (Full Width)'"
        >
          <component :is="isFullWidthMode ? PanelLeft : PanelLeftClose" :size="13" />
          <span>{{ isFullWidthMode ? 'Sidebar' : 'Full Width' }}</span>
        </button>

        <!-- PAGE TITLE -->
        <h1 class="text-xs sm:text-sm font-bold text-slate-900 tracking-tight truncate ml-0.5">
          {{ title }}
        </h1>

        <!-- CONTEXT SWITCHER BUTTON FOR ADMIN USER -->
        <div v-if="currentUser?.role === 'admin'" class="hidden md:flex items-center gap-1.5 pl-3 border-l border-slate-200/80">
          <button
            v-if="isMerchantMode"
            @click="emit('switchContext', 'admin')"
            class="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-md transition shadow-xs cursor-pointer"
            title="Beralih ke Platform Admin Control Panel (/panel)"
          >
            <Layers :size="13" />
            <span>Buka Panel Admin (/panel)</span>
          </button>
          <button
            v-else
            @click="emit('switchContext', 'merchant')"
            class="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-md transition shadow-xs cursor-pointer"
            title="Beralih ke Dashboard Toko Merchant (/dashboard)"
          >
            <Store :size="13" />
            <span>Buka Dashboard Toko (/dashboard)</span>
          </button>
        </div>
      </div>

      <div class="flex items-center gap-2 sm:gap-3 shrink-0">
        <!-- MERCHANT / GATEWAY STATUS -->
        <div 
          :class="[
            'hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium border', 
            (masterQRISInfo || currentUser?.tenant?.staticQRIS) 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
              : 'bg-amber-50 border-amber-200 text-amber-800'
          ]"
        >
          <span 
            :class="[
              'w-1.5 h-1.5 rounded-full', 
              (masterQRISInfo || currentUser?.tenant?.staticQRIS) ? 'bg-emerald-500' : 'bg-amber-500'
            ]"
          ></span>
          <span class="max-w-[140px] truncate">
            {{ isMerchantMode ? (tenants?.[0]?.name || currentUser?.tenant?.name || 'Toko Anda') : (masterQRISInfo ? masterQRISInfo.merchantName : 'Belum Ada Master QRIS') }}
          </span>
        </div>

        <!-- USER ROLE BADGE & ACTIONS -->
        <div class="flex items-center gap-1 pl-2 border-l border-slate-200/80">
          <div 
            v-if="currentUser?.role === 'merchant'" 
            class="flex items-center gap-1 px-2 py-1 bg-amber-50 border border-amber-200 rounded text-amber-800 text-xs font-medium"
          >
            <Store :size="13" />
            <span>Merchant</span>
          </div>
          <div 
            v-else 
            class="flex items-center gap-1 px-2 py-1 bg-slate-100 border border-slate-200 rounded text-slate-700 text-xs font-medium"
          >
            <ShieldCheck :size="13" />
            <span>Admin</span>
          </div>

          <button 
            @click="emit('switchTab', 'settings')" 
            class="flex items-center gap-1 px-2 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded text-slate-700 text-xs font-medium transition cursor-pointer"
            title="Buka Pengaturan Akun"
          >
            <User :size="13" />
            <span class="hidden sm:inline">Akun</span>
          </button>

          <button 
            @click="emit('logout')" 
            class="p-1.5 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer" 
            title="Logout Sesi"
          >
            <LogOut :size="14" />
          </button>
        </div>

        <!-- REFRESH BUTTON WITH SPIN ANIMATION -->
        <button 
          @click="handleRefresh" 
          :class="[
            'p-1.5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer',
            isRefreshing ? 'text-slate-900 bg-slate-100' : ''
          ]"
          title="Refresh Data"
        >
          <RefreshCw :size="14" :class="isRefreshing ? 'animate-spin text-red-600' : ''" />
        </button>
      </div>
    </div>

    <!-- HORIZONTAL TABS SUB-BAR (WHEN IN FULL-WIDTH MODE) -->
    <div v-if="isFullWidthMode" class="px-4 sm:px-6 py-1.5 bg-slate-50/70 border-t border-slate-200/80 flex items-center gap-1 overflow-x-auto">
      <!-- Merchant tabs -->
      <template v-if="isMerchantMode">
        <button 
          :class="['px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shrink-0', activeTab === 'dashboard' ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60']"
          @click="emit('switchTab', 'dashboard')"
        >
          <Store :size="13" />
          <span>Dashboard Toko</span>
        </button>
        <button 
          :class="['px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shrink-0', activeTab === 'transactions' ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60']"
          @click="emit('switchTab', 'transactions')"
        >
          <Receipt :size="13" />
          <span>Transaksi</span>
        </button>
        <button 
          :class="['px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shrink-0', activeTab === 'qris' ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60']"
          @click="emit('switchTab', 'qris')"
        >
          <CreditCard :size="13" />
          <span>QRIS Toko</span>
        </button>
        <button 
          :class="['px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shrink-0', activeTab === 'apps' ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60']"
          @click="emit('switchTab', 'apps')"
        >
          <Key :size="13" />
          <span>API Key & Webhook</span>
        </button>
        <button 
          :class="['px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shrink-0', activeTab === 'listener' ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60']"
          @click="emit('switchTab', 'listener')"
        >
          <Smartphone :size="13" />
          <span>Notifikasi HP</span>
          <span class="ml-1 text-[9px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded shrink-0">
            BETA
          </span>
        </button>
        <button 
          :class="['px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shrink-0', activeTab === 'webhooks' ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60']"
          @click="emit('switchTab', 'webhooks')"
        >
          <Webhook :size="13" />
          <span>Riwayat Webhook</span>
        </button>
        <button 
          :class="['px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shrink-0', activeTab === 'docs' ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60']"
          @click="emit('switchTab', 'docs')"
        >
          <BookOpen :size="13" />
          <span>Panduan</span>
        </button>
      </template>

      <!-- Platform Admin tabs -->
      <template v-else>
        <button 
          :class="['px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shrink-0', activeTab === 'dashboard' ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60']"
          @click="emit('switchTab', 'dashboard')"
        >
          <Layers :size="13" />
          <span>Control Panel</span>
        </button>
        <button 
          :class="['px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shrink-0', activeTab === 'transactions' ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60']"
          @click="emit('switchTab', 'transactions')"
        >
          <Receipt :size="13" />
          <span>Transaksi</span>
        </button>
        <button 
          :class="['px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shrink-0', activeTab === 'apps' ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60']"
          @click="emit('switchTab', 'apps')"
        >
          <Building2 :size="13" />
          <span>SaaS Clients</span>
          <span class="text-[10px] font-mono px-1 py-0.2 bg-slate-200 text-slate-800 rounded font-semibold ml-0.5">{{ tenants.length }}</span>
        </button>
        <button 
          :class="['px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shrink-0', activeTab === 'webhooks' ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60']"
          @click="emit('switchTab', 'webhooks')"
        >
          <Webhook :size="13" />
          <span>Riwayat Webhook</span>
        </button>
        <button 
          :class="['px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shrink-0', activeTab === 'qris' ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60']"
          @click="emit('switchTab', 'qris')"
        >
          <CreditCard :size="13" />
          <span>Master QRIS</span>
        </button>
        <button 
          :class="['px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shrink-0', activeTab === 'listener' ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60']"
          @click="emit('switchTab', 'listener')"
        >
          <Smartphone :size="13" />
          <span>HP Listener</span>
          <span class="ml-1 text-[9px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded shrink-0">
            BETA
          </span>
        </button>
        <button 
          :class="['px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shrink-0', activeTab === 'playground' ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60']"
          @click="emit('switchTab', 'playground')"
        >
          <Terminal :size="13" />
          <span>Simulator</span>
          <span class="ml-1 text-[9px] font-mono font-medium text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded shrink-0">
            DEV
          </span>
        </button>
        <button 
          :class="['px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shrink-0', activeTab === 'docs' ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60']"
          @click="emit('switchTab', 'docs')"
        >
          <BookOpen :size="13" />
          <span>API Docs</span>
        </button>
      </template>
    </div>
  </header>
</template>
