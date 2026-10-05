<script setup lang="ts">
import { Zap, X } from 'lucide-vue-next';
import type { Tenant } from '../types';
import MerchantNav from './sidebar/MerchantNav.vue';
import AdminNav from './sidebar/AdminNav.vue';
import SidebarFooter from './sidebar/SidebarFooter.vue';

withDefaults(defineProps<{
  activeTab: string;
  isMerchantMode: boolean;
  currentUser: any;
  tenants: Tenant[];
  defaultStaticQRIS?: string;
  isMobileDrawerOpen?: boolean;
}>(), {
  isMobileDrawerOpen: false,
});

const emit = defineEmits<{
  (e: 'selectTab', tab: string): void;
  (e: 'closeMobileDrawer'): void;
}>();

const handleSelectTab = (tab: string) => {
  emit('selectTab', tab);
  emit('closeMobileDrawer');
};
</script>

<template>
  <!-- DESKTOP STATIC SIDEBAR (md and above) -->
  <aside class="hidden md:flex w-64 bg-slate-50/80 border-r border-slate-200/80 flex-col shrink-0 select-none sticky top-0 h-screen overflow-y-auto">
    <!-- BRAND HEADER -->
    <div class="h-16 px-4 flex items-center justify-between border-b border-slate-200/80 bg-white">
      <div class="flex items-center gap-3 min-w-0">
        <div class="w-8 h-8 rounded-lg bg-[#d71920] flex items-center justify-center text-white shrink-0 shadow-xs">
          <Zap :size="16" class="text-white fill-white/20" />
        </div>
        <div class="min-w-0">
          <div class="font-bold text-sm tracking-tight text-slate-900 leading-tight">OpenQRIS</div>
          <div class="text-[11px] text-slate-500 font-medium leading-none mt-0.5 truncate">
            {{ isMerchantMode ? 'Merchant Portal' : 'Platform Gateway' }}
          </div>
        </div>
      </div>
      <span
        :class="[
          'px-2 py-0.5 text-[10px] font-semibold tracking-wide rounded-full border shrink-0',
          isMerchantMode
            ? (currentUser?.role === 'admin' ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-amber-50 text-amber-700 border-amber-200')
            : 'bg-red-50 text-red-700 border-red-200'
        ]"
      >
        {{ isMerchantMode ? (currentUser?.role === 'admin' ? 'Preview' : 'Merchant') : 'Admin' }}
      </span>
    </div>

    <!-- NAVIGATION -->
    <MerchantNav
      v-if="isMerchantMode"
      :activeTab="activeTab"
      :tenants="tenants"
      :defaultStaticQRIS="defaultStaticQRIS"
      @selectTab="emit('selectTab', $event)"
    />

    <AdminNav
      v-else
      :activeTab="activeTab"
      :tenants="tenants"
      @selectTab="emit('selectTab', $event)"
    />

    <!-- SIDEBAR FOOTER -->
    <SidebarFooter
      :isMerchantMode="isMerchantMode"
      :currentUser="currentUser"
      :tenants="tenants"
    />
  </aside>

  <!-- MOBILE SLIDE-OVER DRAWER (below md) -->
  <teleport to="body">
    <div
      v-if="isMobileDrawerOpen"
      class="fixed inset-0 z-50 md:hidden flex"
      role="dialog"
      aria-modal="true"
    >
      <!-- Backdrop -->
      <div 
        @click="emit('closeMobileDrawer')" 
        class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
      ></div>

      <!-- Slide-over Content -->
      <div class="relative w-4/5 max-w-xs bg-white h-full flex flex-col shadow-2xl z-10 animate-in slide-in-from-left duration-200">
        <!-- Header with Close Button -->
        <div class="h-16 px-4 flex items-center justify-between border-b border-slate-200 bg-white">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-lg bg-[#d71920] flex items-center justify-center text-white shrink-0 shadow-xs">
              <Zap :size="16" class="text-white fill-white/20" />
            </div>
            <div>
              <div class="font-bold text-sm tracking-tight text-slate-900 leading-tight">OpenQRIS</div>
              <div class="text-[11px] text-slate-500 font-medium leading-none mt-0.5">
                {{ isMerchantMode ? 'Merchant Portal' : 'Platform Gateway' }}
              </div>
            </div>
          </div>

          <button 
            @click="emit('closeMobileDrawer')"
            class="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
            aria-label="Tutup Menu"
          >
            <X :size="18" />
          </button>
        </div>

        <!-- Navigation Links inside Drawer -->
        <div class="flex-1 overflow-y-auto">
          <MerchantNav
            v-if="isMerchantMode"
            :activeTab="activeTab"
            :tenants="tenants"
            :defaultStaticQRIS="defaultStaticQRIS"
            @selectTab="handleSelectTab($event)"
          />

          <AdminNav
            v-else
            :activeTab="activeTab"
            :tenants="tenants"
            @selectTab="handleSelectTab($event)"
          />
        </div>

        <!-- Mobile Drawer Footer -->
        <div class="border-t border-slate-200 p-2 bg-slate-50">
          <SidebarFooter
            :isMerchantMode="isMerchantMode"
            :currentUser="currentUser"
            :tenants="tenants"
          />
        </div>
      </div>
    </div>
  </teleport>
</template>
