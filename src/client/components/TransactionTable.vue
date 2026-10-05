<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { QrCode, Link2 } from 'lucide-vue-next';
import { exportToCsv } from '../utils/csv';
import type { Charge, DateRange, TransactionStatus, TransactionQueryParams, TransactionServerFetch } from '../types';
import TransactionFilterBar from './TransactionFilterBar.vue';
import TransactionPagination from './TransactionPagination.vue';
import TransactionTableRow from './TransactionTableRow.vue';
import TransactionCardMobile from './TransactionCardMobile.vue';

const props = withDefaults(defineProps<{
  transactions: Charge[];
  showTenantColumn?: boolean;
  title?: string;
  subtitle?: string;
  enableDateFilter?: boolean;
  initialPageSize?: number;
  showPlaygroundButton?: boolean;
  // B12: jika disediakan, filtering & pagination dijalankan di server (bukan load semua di browser)
  serverFetch?: TransactionServerFetch;
}>(), {
  showTenantColumn: false,
  title: 'Riwayat Transaksi',
  subtitle: 'Daftar transaksi QRIS dinamis',
  enableDateFilter: true,
  initialPageSize: 15,
  showPlaygroundButton: false
});

const emit = defineEmits<{
  (e: 'simulatePaid', id: string): void;
  (e: 'openPaymentLink'): void;
  (e: 'openPlayground'): void;
  (e: 'refresh'): void;
}>();

const searchQuery = ref('');
const statusFilter = ref<TransactionStatus | 'ALL'>('ALL');
const dateFilter = ref<DateRange>('ALL');
const currentPage = ref(1);
const pageSize = ref(props.initialPageSize);

// ===== Server mode (B12) =====
const isServerMode = computed(() => typeof props.serverFetch === 'function');
const serverItems = ref<Charge[]>([]);
const serverPagination = ref({ page: 1, limit: props.initialPageSize, total: 0, totalPages: 1 });
const serverCounts = ref<Record<string, number> | null>(null);
const serverFetched = ref(false);
const serverLoading = ref(false);
let lastRequestKey = '';
let searchDebounce: ReturnType<typeof setTimeout> | null = null;

const buildParams = (page: number): TransactionQueryParams => ({
  search: searchQuery.value.trim() || undefined,
  status: statusFilter.value,
  dateRange: props.enableDateFilter ? dateFilter.value : undefined,
  page,
  limit: pageSize.value,
});

const loadServerData = async (page: number, force = false) => {
  if (!props.serverFetch) return;
  const key = JSON.stringify(buildParams(page));
  if (!force && serverFetched.value && key === lastRequestKey) return;
  lastRequestKey = key;
  serverLoading.value = true;
  try {
    const res = await props.serverFetch(buildParams(page));
    serverItems.value = res.items;
    serverPagination.value = { page: res.pagination.page, limit: res.pagination.limit, total: res.pagination.total, totalPages: res.pagination.totalPages };
    if (res.counts) serverCounts.value = res.counts;
    serverFetched.value = true;
  } catch (e) {
    console.error('Gagal memuat transaksi dari server', e);
  } finally {
    serverLoading.value = false;
  }
};

// Live ticker for countdown calculations
const currentTime = ref(Date.now());
let timerInterval: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
  if (isServerMode.value) loadServerData(1);
  timerInterval = setInterval(() => {
    currentTime.value = Date.now();
  }, 1000);
});

onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval);
});

// Counts for filter pills (server: counts dari API; legacy: dihitung dari data yang termuat)
const totalCount = computed(() => {
  if (isServerMode.value) return serverPagination.value.total;
  return props.transactions.length;
});
const paidCount = computed(() => {
  if (isServerMode.value) return serverCounts.value?.PAID ?? 0;
  return props.transactions.filter(t => t.status === 'PAID').length;
});
const pendingCount = computed(() => {
  if (isServerMode.value) return serverCounts.value?.PENDING ?? 0;
  return props.transactions.filter(t => t.status === 'PENDING').length;
});
const expiredCount = computed(() => {
  if (isServerMode.value) return serverCounts.value?.EXPIRED ?? 0;
  return props.transactions.filter(t => t.status === 'EXPIRED').length;
});

// Filtered transactions
const filteredTransactions = computed(() => {
  const now = Date.now();
  return props.transactions.filter((tx) => {
    // 1. Status Filter
    if (statusFilter.value !== 'ALL' && tx.status !== statusFilter.value) {
      return false;
    }

    // 2. Date Filter
    if (props.enableDateFilter && dateFilter.value !== 'ALL') {
      const txTime = new Date(tx.createdAt).getTime();
      const diffHours = (now - txTime) / (1000 * 3600);
      if (dateFilter.value === 'TODAY' && diffHours > 24) return false;
      if (dateFilter.value === '7D' && diffHours > 24 * 7) return false;
      if (dateFilter.value === '30D' && diffHours > 24 * 30) return false;
    }

    // 3. Search Query
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase().trim();
      const matchOrder = tx.orderId?.toLowerCase().includes(q);
      const matchId = tx.id?.toLowerCase().includes(q);
      const matchTenant = tx.tenantName?.toLowerCase().includes(q);
      const matchCust = tx.customerName?.toLowerCase().includes(q);
      return matchOrder || matchId || matchTenant || matchCust;
    }

    return true;
  });
});

// Pagination (legacy client-side)
const legacyTotalPages = computed(() => Math.max(1, Math.ceil(filteredTransactions.value.length / pageSize.value)));

const paginatedTransactions = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return filteredTransactions.value.slice(start, start + pageSize.value);
});

// Output yang ditampilkan template (server mode -> hasil server; selain itu -> client-side)
const totalPages = computed(() => (isServerMode.value ? serverPagination.value.totalPages : legacyTotalPages.value));
const totalFilteredCount = computed(() => (isServerMode.value ? serverPagination.value.total : filteredTransactions.value.length));
const displayTransactions = computed<Charge[]>(() => (isServerMode.value ? serverItems.value : paginatedTransactions.value));
const showEmptyState = computed(() => displayTransactions.value.length === 0 && (serverFetched.value || !isServerMode.value));

const goToPage = (p: number) => {
  if (p < 1 || p > totalPages.value) return;
  currentPage.value = p;
};

// Reset page + reload server saat filter berubah
watch([statusFilter, dateFilter], () => {
  currentPage.value = 1;
  if (isServerMode.value) loadServerData(1);
});

// Pencarian di-debounce lalu reload dari server
watch(searchQuery, () => {
  currentPage.value = 1;
  if (searchDebounce) clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => {
    if (isServerMode.value) loadServerData(1);
  }, 350);
});

// Halaman berubah -> minta halaman berikutnya ke server
watch(currentPage, (p) => {
  if (isServerMode.value) loadServerData(p);
});

// Parent me-refresh data (mis. setelah simulasi bayar) -> muat ulang server
watch(() => props.transactions, () => {
  if (isServerMode.value && serverFetched.value) loadServerData(currentPage.value, true);
});

// Export CSV (server mode: ambil maksimal 200 baris terbaru sesuai filter dari server)
const handleExportCsv = async () => {
  let exportSource = filteredTransactions.value;
  if (isServerMode.value && props.serverFetch) {
    try {
      const res = await props.serverFetch({ ...buildParams(1), limit: 200 });
      exportSource = res.items;
    } catch (e) {
      console.error('Export CSV: gagal memuat dari server, memakai data yang sudah termuat', e);
    }
  }

  const headers = props.showTenantColumn
    ? ['ID Transaksi', 'Nomor Order', 'SaaS Tenant', 'Pelanggan', 'Nominal Pokok', 'Kode Unik', 'Total Bayar', 'Status', 'Waktu Dibuat', 'Waktu Lunas']
    : ['ID Transaksi', 'Nomor Order', 'Pelanggan', 'Total Bayar', 'Status', 'Waktu Dibuat', 'Waktu Lunas'];

  const rows = exportSource.map(tx => {
    if (props.showTenantColumn) {
      return [
        tx.id,
        tx.orderId,
        tx.tenantName || tx.tenantId || '-',
        tx.customerName || '-',
        tx.amount,
        tx.uniqueCode || 0,
        tx.totalAmount || tx.amount,
        tx.status,
        tx.createdAt,
        tx.paidAt || '-'
      ];
    }
    return [
      tx.id,
      tx.orderId,
      tx.customerName || '-',
      tx.totalAmount || tx.amount,
      tx.status,
      tx.createdAt,
      tx.paidAt || '-'
    ];
  });

  const filename = `transaksi-${props.showTenantColumn ? 'platform' : 'toko'}-${new Date().toISOString().slice(0, 10)}.csv`;
  exportToCsv(filename, headers, rows);
};
</script>

<template>
  <div>
    <!-- UNIFIED TABLE CONTAINER -->
    <div class="border-b border-slate-200/90 divide-y divide-slate-200/90 bg-white overflow-hidden">
      <!-- 1. INTEGRATED FILTER & ACTIONS TOOLBAR -->
      <TransactionFilterBar
        v-model:searchQuery="searchQuery"
        v-model:statusFilter="statusFilter"
        v-model:dateFilter="dateFilter"
        :enableDateFilter="enableDateFilter"
        :showTenantColumn="showTenantColumn"
        :totalCount="totalCount"
        :paidCount="paidCount"
        :pendingCount="pendingCount"
        :expiredCount="expiredCount"
        :showPlaygroundButton="showPlaygroundButton"
        @exportCsv="handleExportCsv"
        @openPaymentLink="emit('openPaymentLink')"
        @openPlayground="emit('openPlayground')"
      />

      <!-- EMPTY STATE -->
      <div v-if="showEmptyState" class="py-16 text-center border-b border-slate-200">
        <QrCode :size="32" class="text-slate-300 mx-auto mb-2" />
        <p class="text-sm text-slate-700 font-semibold">Tidak ada transaksi ditemukan</p>
        <p class="text-xs text-slate-500 mt-0.5">
          {{ searchQuery ? 'Tidak ada data yang cocok dengan pencarian Anda.' : 'Belum ada transaksi pada filter periode ini.' }}
        </p>
        <button
          v-if="!searchQuery"
          @click="emit('openPaymentLink')"
          class="btn btn-primary btn-sm mt-4 cursor-pointer"
        >
          <Link2 :size="13" />
          <span>Buat Payment Link Sekarang</span>
        </button>
      </div>

      <!-- MOBILE CARD LIST VIEW (visible below md) -->
      <div v-else class="block md:hidden divide-y divide-slate-100 bg-white">
        <TransactionCardMobile
          v-for="tx in displayTransactions"
          :key="tx.id"
          :transaction="tx"
          :showTenantColumn="showTenantColumn"
          :currentTime="currentTime"
          @simulatePaid="emit('simulatePaid', $event)"
        />
      </div>

      <!-- DESKTOP TABLE VIEW (visible on md and above) -->
      <div v-if="!showEmptyState" class="hidden md:block overflow-x-auto">
        <table class="w-full text-left border-collapse text-xs">
          <thead>
            <tr class="border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500 bg-slate-50/80">
              <th class="py-3 px-3.5 whitespace-nowrap min-w-[120px]">Invoice</th>
              <th class="py-3 px-3.5 whitespace-nowrap min-w-[130px]">ID Transaksi</th>
              <th v-if="showTenantColumn" class="py-3 px-3.5 whitespace-nowrap min-w-[140px]">SaaS Tenant</th>
              <th class="py-3 px-3.5 whitespace-nowrap min-w-[130px]">Pelanggan</th>
              <th v-if="!showTenantColumn" class="py-3 px-3.5 whitespace-nowrap min-w-[130px]">Kontak</th>
              <th class="py-3 px-3.5 whitespace-nowrap min-w-[120px]">Total Transfer</th>
              <th class="py-3 px-3.5 whitespace-nowrap min-w-[80px]">Kode Unik</th>
              <th class="py-3 px-3.5 whitespace-nowrap min-w-[110px]">Status</th>
              <th class="py-3 px-3.5 whitespace-nowrap min-w-[150px]">Waktu Transaksi</th>
              <th class="py-3 px-3.5 text-right whitespace-nowrap min-w-[80px]">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 text-slate-700">
            <TransactionTableRow
              v-for="tx in displayTransactions"
              :key="tx.id"
              :transaction="tx"
              :showTenantColumn="showTenantColumn"
              :currentTime="currentTime"
              @simulatePaid="emit('simulatePaid', $event)"
            />
          </tbody>
        </table>
      </div>

      <!-- 3. PAGINATION FOOTER ROW -->
      <TransactionPagination
        v-if="!showEmptyState"
        :currentPage="currentPage"
        :totalPages="totalPages"
        :filteredCount="totalFilteredCount"
        :pageSize="pageSize"
        @goToPage="goToPage"
      />
    </div>
  </div>
</template>
