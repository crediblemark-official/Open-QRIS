<script setup lang="ts">
import { 
  Store, 
  Receipt, 
  QrCode, 
  Key, 
  Menu, 
  Layers, 
  Building2 
} from 'lucide-vue-next';

defineProps<{
  activeTab: string;
  isMerchantMode: boolean;
  currentUser?: any;
}>();

const emit = defineEmits<{
  (e: 'selectTab', tab: string): void;
  (e: 'toggleDrawer'): void;
}>();
</script>

<template>
  <nav class="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-4px_16px_rgba(0,0,0,0.04)] px-2 py-1.5 safe-area-pb">
    <div class="flex items-center justify-around max-w-lg mx-auto">
      <!-- MERCHANT NAV -->
      <template v-if="isMerchantMode">
        <button
          @click="emit('selectTab', 'dashboard')"
          :class="[
            'flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition cursor-pointer',
            activeTab === 'dashboard' 
              ? 'text-[#d71920] font-bold' 
              : 'text-slate-500 hover:text-slate-800 font-medium'
          ]"
        >
          <div :class="['p-1 rounded-lg transition', activeTab === 'dashboard' ? 'bg-red-50 text-[#d71920]' : '']">
            <Store :size="18" />
          </div>
          <span class="text-[10px] mt-0.5 leading-none">Dashboard</span>
        </button>

        <button
          @click="emit('selectTab', 'transactions')"
          :class="[
            'flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition cursor-pointer',
            activeTab === 'transactions' 
              ? 'text-[#d71920] font-bold' 
              : 'text-slate-500 hover:text-slate-800 font-medium'
          ]"
        >
          <div :class="['p-1 rounded-lg transition', activeTab === 'transactions' ? 'bg-red-50 text-[#d71920]' : '']">
            <Receipt :size="18" />
          </div>
          <span class="text-[10px] mt-0.5 leading-none">Transaksi</span>
        </button>

        <button
          @click="emit('selectTab', 'qris')"
          :class="[
            'flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition cursor-pointer',
            activeTab === 'qris' 
              ? 'text-[#d71920] font-bold' 
              : 'text-slate-500 hover:text-slate-800 font-medium'
          ]"
        >
          <div :class="['p-1 rounded-lg transition', activeTab === 'qris' ? 'bg-red-50 text-[#d71920]' : '']">
            <QrCode :size="18" />
          </div>
          <span class="text-[10px] mt-0.5 leading-none">QRIS Toko</span>
        </button>

        <button
          @click="emit('selectTab', 'apps')"
          :class="[
            'flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition cursor-pointer',
            activeTab === 'apps' 
              ? 'text-[#d71920] font-bold' 
              : 'text-slate-500 hover:text-slate-800 font-medium'
          ]"
        >
          <div :class="['p-1 rounded-lg transition', activeTab === 'apps' ? 'bg-red-50 text-[#d71920]' : '']">
            <Key :size="18" />
          </div>
          <span class="text-[10px] mt-0.5 leading-none">API & Webhook</span>
        </button>

        <button
          @click="emit('toggleDrawer')"
          class="flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl text-slate-500 hover:text-slate-800 font-medium transition cursor-pointer"
        >
          <div class="p-1 rounded-lg hover:bg-slate-100">
            <Menu :size="18" />
          </div>
          <span class="text-[10px] mt-0.5 leading-none">Lainnya</span>
        </button>
      </template>

      <!-- ADMIN NAV -->
      <template v-else>
        <button
          @click="emit('selectTab', 'dashboard')"
          :class="[
            'flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition cursor-pointer',
            activeTab === 'dashboard' 
              ? 'text-[#d71920] font-bold' 
              : 'text-slate-500 hover:text-slate-800 font-medium'
          ]"
        >
          <div :class="['p-1 rounded-lg transition', activeTab === 'dashboard' ? 'bg-red-50 text-[#d71920]' : '']">
            <Layers :size="18" />
          </div>
          <span class="text-[10px] mt-0.5 leading-none">Control Panel</span>
        </button>

        <button
          @click="emit('selectTab', 'transactions')"
          :class="[
            'flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition cursor-pointer',
            activeTab === 'transactions' 
              ? 'text-[#d71920] font-bold' 
              : 'text-slate-500 hover:text-slate-800 font-medium'
          ]"
        >
          <div :class="['p-1 rounded-lg transition', activeTab === 'transactions' ? 'bg-red-50 text-[#d71920]' : '']">
            <Receipt :size="18" />
          </div>
          <span class="text-[10px] mt-0.5 leading-none">Transaksi</span>
        </button>

        <button
          @click="emit('selectTab', 'apps')"
          :class="[
            'flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition cursor-pointer',
            activeTab === 'apps' 
              ? 'text-[#d71920] font-bold' 
              : 'text-slate-500 hover:text-slate-800 font-medium'
          ]"
        >
          <div :class="['p-1 rounded-lg transition', activeTab === 'apps' ? 'bg-red-50 text-[#d71920]' : '']">
            <Building2 :size="18" />
          </div>
          <span class="text-[10px] mt-0.5 leading-none">SaaS Clients</span>
        </button>

        <button
          @click="emit('selectTab', 'qris')"
          :class="[
            'flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition cursor-pointer',
            activeTab === 'qris' 
              ? 'text-[#d71920] font-bold' 
              : 'text-slate-500 hover:text-slate-800 font-medium'
          ]"
        >
          <div :class="['p-1 rounded-lg transition', activeTab === 'qris' ? 'bg-red-50 text-[#d71920]' : '']">
            <QrCode :size="18" />
          </div>
          <span class="text-[10px] mt-0.5 leading-none">Master QRIS</span>
        </button>

        <button
          @click="emit('toggleDrawer')"
          class="flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl text-slate-500 hover:text-slate-800 font-medium transition cursor-pointer"
        >
          <div class="p-1 rounded-lg hover:bg-slate-100">
            <Menu :size="18" />
          </div>
          <span class="text-[10px] mt-0.5 leading-none">Lainnya</span>
        </button>
      </template>
    </div>
  </nav>
</template>
