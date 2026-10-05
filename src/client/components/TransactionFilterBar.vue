<script setup lang="ts">
import { ref, watch } from 'vue';
import { Search, X, Download, Link2, Plus } from 'lucide-vue-next';
import type { DateRange, TransactionStatus } from '../types';

const props = withDefaults(defineProps<{
  searchQuery: string;
  statusFilter: TransactionStatus | 'ALL';
  dateFilter: DateRange;
  enableDateFilter?: boolean;
  showTenantColumn?: boolean;
  totalCount: number;
  paidCount: number;
  pendingCount: number;
  expiredCount: number;
  showPlaygroundButton?: boolean;
}>(), {
  enableDateFilter: true,
  showTenantColumn: false,
  showPlaygroundButton: false,
});

const emit = defineEmits<{
  (e: 'update:searchQuery', value: string): void;
  (e: 'update:statusFilter', value: TransactionStatus | 'ALL'): void;
  (e: 'update:dateFilter', value: DateRange): void;
  (e: 'exportCsv'): void;
  (e: 'openPaymentLink'): void;
  (e: 'openPlayground'): void;
}>();

const localSearch = ref(props.searchQuery);

watch(() => props.searchQuery, (newVal) => {
  localSearch.value = newVal;
});

const handleSearchInput = () => {
  emit('update:searchQuery', localSearch.value);
};

const clearSearch = () => {
  localSearch.value = '';
  emit('update:searchQuery', '');
};

const setStatus = (status: TransactionStatus | 'ALL') => {
  emit('update:statusFilter', status);
};

const setDateRange = (range: DateRange) => {
  emit('update:dateFilter', range);
};
</script>

<template>
  <div class="flex flex-col w-full bg-white border-b border-slate-200/80">
    <!-- 1. DESKTOP VIEW (sm and above: Clean 2-Tier Row) -->
    <div class="hidden sm:flex sm:flex-col sm:divide-y sm:divide-slate-100">
      <!-- Desktop Row 1: Status Filter Pills (Left) & Action Buttons (Right) -->
      <div class="px-4 py-3 flex items-center justify-between gap-3">
        <!-- Status Filter Pills -->
        <div class="flex items-center gap-1.5 overflow-x-auto scrollbar-none flex-nowrap py-0.5">
          <button
            :class="[
              'px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5',
              statusFilter === 'ALL'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            ]"
            @click="setStatus('ALL')"
          >
            <span>Semua</span>
            <span
              :class="[
                'px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold leading-none',
                statusFilter === 'ALL' ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-600'
              ]"
            >
              {{ totalCount }}
            </span>
          </button>

          <button
            :class="[
              'px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5',
              statusFilter === 'PAID'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            ]"
            @click="setStatus('PAID')"
          >
            <span class="w-1.5 h-1.5 rounded-full" :class="statusFilter === 'PAID' ? 'bg-white' : 'bg-emerald-500'"></span>
            <span>Lunas</span>
            <span
              :class="[
                'px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold leading-none',
                statusFilter === 'PAID' ? 'bg-emerald-700 text-emerald-100' : 'bg-emerald-50 text-emerald-700'
              ]"
            >
              {{ paidCount }}
            </span>
          </button>

          <button
            :class="[
              'px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5',
              statusFilter === 'PENDING'
                ? 'bg-amber-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            ]"
            @click="setStatus('PENDING')"
          >
            <span class="w-1.5 h-1.5 rounded-full" :class="statusFilter === 'PENDING' ? 'bg-white' : 'bg-amber-500'"></span>
            <span>Menunggu</span>
            <span
              :class="[
                'px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold leading-none',
                statusFilter === 'PENDING' ? 'bg-amber-700 text-amber-100' : 'bg-amber-50 text-amber-700'
              ]"
            >
              {{ pendingCount }}
            </span>
          </button>

          <button
            v-if="expiredCount > 0"
            :class="[
              'px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5',
              statusFilter === 'EXPIRED'
                ? 'bg-rose-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            ]"
            @click="setStatus('EXPIRED')"
          >
            <span class="w-1.5 h-1.5 rounded-full" :class="statusFilter === 'EXPIRED' ? 'bg-white' : 'bg-rose-500'"></span>
            <span>Kadaluarsa</span>
            <span
              :class="[
                'px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold leading-none',
                statusFilter === 'EXPIRED' ? 'bg-rose-700 text-rose-100' : 'bg-rose-50 text-rose-700'
              ]"
            >
              {{ expiredCount }}
            </span>
          </button>
        </div>

        <!-- Action Buttons Desktop -->
        <div class="flex items-center gap-2 shrink-0">
          <button
            @click="emit('exportCsv')"
            class="btn btn-secondary btn-sm cursor-pointer shadow-2xs inline-flex items-center gap-1.5"
            title="Export CSV"
          >
            <Download :size="13" />
            <span>Export CSV</span>
          </button>

          <button
            @click="emit('openPaymentLink')"
            class="btn btn-primary btn-sm cursor-pointer shadow-xs inline-flex items-center gap-1.5 !bg-[#d71920] hover:!bg-[#b9141a]"
            title="Buat Payment Link QRIS Instan"
          >
            <Link2 :size="13" />
            <span>Buat Payment Link</span>
          </button>

          <button
            v-if="showPlaygroundButton"
            @click="emit('openPlayground')"
            class="btn btn-secondary btn-sm cursor-pointer shadow-2xs inline-flex items-center gap-1"
            title="Buka Playground Simulator"
          >
            <Plus :size="13" />
            <span>Simulator</span>
          </button>
        </div>
      </div>

      <!-- Desktop Row 2: Search Input & Date Range -->
      <div class="px-4 py-2 bg-slate-50/50 flex items-center justify-between gap-3">
        <div class="relative w-72 lg:w-80">
          <Search :size="13" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            v-model="localSearch"
            :placeholder="showTenantColumn ? 'Cari order, tenant, invoice...' : 'Cari nomor order, ID, pelanggan...'"
            class="w-full pl-8 pr-7 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#d71920] focus:border-[#d71920] transition shadow-2xs"
            @input="handleSearchInput"
          />
          <button
            v-if="localSearch"
            @click="clearSearch"
            class="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
          >
            <X :size="12" />
          </button>
        </div>

        <div v-if="enableDateFilter" class="flex items-center gap-1.5 text-[11px]">
          <span class="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Periode:</span>
          <div class="inline-flex rounded-lg border border-slate-200/90 p-0.5 bg-white shadow-2xs">
            <button
              :class="[
                'px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer whitespace-nowrap',
                dateFilter === 'ALL' ? 'bg-slate-900 font-bold text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              ]"
              @click="setDateRange('ALL')"
            >
              Semua
            </button>
            <button
              :class="[
                'px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer whitespace-nowrap',
                dateFilter === 'TODAY' ? 'bg-slate-900 font-bold text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              ]"
              @click="setDateRange('TODAY')"
            >
              Hari Ini
            </button>
            <button
              :class="[
                'px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer whitespace-nowrap',
                dateFilter === '7D' ? 'bg-slate-900 font-bold text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              ]"
              @click="setDateRange('7D')"
            >
              7 Hari
            </button>
            <button
              :class="[
                'px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer whitespace-nowrap',
                dateFilter === '30D' ? 'bg-slate-900 font-bold text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              ]"
              @click="setDateRange('30D')"
            >
              30 Hari
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 2. MOBILE DEDICATED LAYOUT (< sm, Clean, Compact, Zero Awkward Wrapping) -->
    <div class="sm:hidden p-3 flex flex-col gap-2.5 bg-white">
      <!-- Mobile Row 1: Status Filter Pills (Horizontal Scrollable) -->
      <div class="flex items-center gap-1.5 overflow-x-auto scrollbar-none flex-nowrap pb-0.5 -mx-1 px-1">
        <button
          :class="[
            'px-2.5 py-1 text-xs font-semibold rounded-lg transition cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1',
            statusFilter === 'ALL'
              ? 'bg-slate-900 text-white shadow-2xs'
              : 'text-slate-600 bg-slate-100 hover:bg-slate-200/70'
          ]"
          @click="setStatus('ALL')"
        >
          <span>Semua</span>
          <span :class="['px-1 rounded-full text-[10px] font-mono font-bold', statusFilter === 'ALL' ? 'bg-slate-800 text-slate-200' : 'text-slate-500']">{{ totalCount }}</span>
        </button>

        <button
          :class="[
            'px-2.5 py-1 text-xs font-semibold rounded-lg transition cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1',
            statusFilter === 'PAID'
              ? 'bg-emerald-600 text-white shadow-2xs'
              : 'text-slate-600 bg-slate-100 hover:bg-slate-200/70'
          ]"
          @click="setStatus('PAID')"
        >
          <span class="w-1.5 h-1.5 rounded-full" :class="statusFilter === 'PAID' ? 'bg-white' : 'bg-emerald-500'"></span>
          <span>Lunas</span>
          <span :class="['px-1 rounded-full text-[10px] font-mono font-bold', statusFilter === 'PAID' ? 'bg-emerald-700 text-emerald-100' : 'text-emerald-700']">{{ paidCount }}</span>
        </button>

        <button
          :class="[
            'px-2.5 py-1 text-xs font-semibold rounded-lg transition cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1',
            statusFilter === 'PENDING'
              ? 'bg-amber-600 text-white shadow-2xs'
              : 'text-slate-600 bg-slate-100 hover:bg-slate-200/70'
          ]"
          @click="setStatus('PENDING')"
        >
          <span class="w-1.5 h-1.5 rounded-full" :class="statusFilter === 'PENDING' ? 'bg-white' : 'bg-amber-500'"></span>
          <span>Menunggu</span>
          <span :class="['px-1 rounded-full text-[10px] font-mono font-bold', statusFilter === 'PENDING' ? 'bg-amber-700 text-amber-100' : 'text-amber-700']">{{ pendingCount }}</span>
        </button>

        <button
          v-if="expiredCount > 0"
          :class="[
            'px-2.5 py-1 text-xs font-semibold rounded-lg transition cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1',
            statusFilter === 'EXPIRED'
              ? 'bg-rose-600 text-white shadow-2xs'
              : 'text-slate-600 bg-slate-100 hover:bg-slate-200/70'
          ]"
          @click="setStatus('EXPIRED')"
        >
          <span class="w-1.5 h-1.5 rounded-full" :class="statusFilter === 'EXPIRED' ? 'bg-white' : 'bg-rose-500'"></span>
          <span>Kadaluarsa</span>
          <span :class="['px-1 rounded-full text-[10px] font-mono font-bold', statusFilter === 'EXPIRED' ? 'bg-rose-700 text-rose-100' : 'text-rose-700']">{{ expiredCount }}</span>
        </button>
      </div>

      <!-- Mobile Row 2: Search Input & Action Buttons (Aligned Together) -->
      <div class="flex items-center gap-2">
        <div class="relative flex-1 min-w-0">
          <Search :size="13" class="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            v-model="localSearch"
            placeholder="Cari transaksi..."
            class="w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-[#d71920] focus:border-[#d71920] transition shadow-2xs"
            @input="handleSearchInput"
          />
          <button
            v-if="localSearch"
            @click="clearSearch"
            class="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
          >
            <X :size="12" />
          </button>
        </div>

        <button
          @click="emit('openPaymentLink')"
          class="btn btn-primary btn-sm cursor-pointer shadow-xs shrink-0 !py-1.5 !px-2.5 !bg-[#d71920] hover:!bg-[#b9141a] flex items-center gap-1 text-xs"
          title="Buat Payment Link"
        >
          <Link2 :size="13" />
          <span>Buat Link</span>
        </button>

        <button
          @click="emit('exportCsv')"
          class="btn btn-secondary btn-sm cursor-pointer shadow-2xs shrink-0 !p-1.5"
          title="Export CSV"
        >
          <Download :size="14" />
        </button>
      </div>

      <!-- Mobile Row 3: Periode (Horizontal Scrollable) -->
      <div v-if="enableDateFilter" class="flex items-center gap-1.5 overflow-x-auto scrollbar-none flex-nowrap -mx-1 px-1 pt-0.5 text-xs">
        <span class="text-slate-400 text-[10px] uppercase font-bold tracking-wider shrink-0">Periode:</span>
        <button
          :class="[
            'px-2 py-0.5 rounded text-[11px] font-medium transition cursor-pointer shrink-0',
            dateFilter === 'ALL'
              ? 'bg-slate-900 font-bold text-white shadow-2xs'
              : 'text-slate-600 bg-slate-50 border border-slate-200/60 hover:bg-slate-100'
          ]"
          @click="setDateRange('ALL')"
        >
          Semua
        </button>
        <button
          :class="[
            'px-2 py-0.5 rounded text-[11px] font-medium transition cursor-pointer shrink-0',
            dateFilter === 'TODAY'
              ? 'bg-slate-900 font-bold text-white shadow-2xs'
              : 'text-slate-600 bg-slate-50 border border-slate-200/60 hover:bg-slate-100'
          ]"
          @click="setDateRange('TODAY')"
        >
          Hari Ini
        </button>
        <button
          :class="[
            'px-2 py-0.5 rounded text-[11px] font-medium transition cursor-pointer shrink-0',
            dateFilter === '7D'
              ? 'bg-slate-900 font-bold text-white shadow-2xs'
              : 'text-slate-600 bg-slate-50 border border-slate-200/60 hover:bg-slate-100'
          ]"
          @click="setDateRange('7D')"
        >
          7 Hari
        </button>
        <button
          :class="[
            'px-2 py-0.5 rounded text-[11px] font-medium transition cursor-pointer shrink-0',
            dateFilter === '30D'
              ? 'bg-slate-900 font-bold text-white shadow-2xs'
              : 'text-slate-600 bg-slate-50 border border-slate-200/60 hover:bg-slate-100'
          ]"
          @click="setDateRange('30D')"
        >
          30 Hari
        </button>
      </div>
    </div>
  </div>
</template>
