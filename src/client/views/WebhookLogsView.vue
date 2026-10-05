<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import {
  Webhook,
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  Building2
} from 'lucide-vue-next';
import type { WebhookLog, User, Tenant } from '../types';
import LogsTable from '../components/webhook/LogsTable.vue';
import LogDetailModal from '../components/webhook/LogDetailModal.vue';

const props = defineProps<{
  currentUser?: User | null;
  tenants?: Tenant[];
}>();

const emit = defineEmits<{
  (e: 'toast', msg: string): void;
  (e: 'navigate', tab: string): void;
}>();

// State
const logs = ref<WebhookLog[]>([]);
const isLoading = ref(false);
const searchQuery = ref('');
const statusFilter = ref<'ALL' | 'SUCCESS' | 'FAILED'>('ALL');
const selectedTenantId = ref('ALL');
const page = ref(1);
const limit = ref(25);
const total = ref(0);
const totalPages = ref(1);

// Detail Modal
const activeModalLog = ref<WebhookLog | null>(null);
const isResendingId = ref<string | null>(null);

const isMerchant = computed(() => props.currentUser?.role === 'merchant');

// Stats metrics
const successCount = computed(() => logs.value.filter((l) => l.status === 'SUCCESS').length);
const failedCount = computed(() => logs.value.filter((l) => l.status === 'FAILED').length);
const successRate = computed(() => {
  if (logs.value.length === 0) return 100;
  return Math.round((successCount.value / logs.value.length) * 100);
});

const fetchLogs = async () => {
  isLoading.value = true;
  try {
    const token = localStorage.getItem('qris_admin_token') || '';
    const params = new URLSearchParams();
    params.set('page', String(page.value));
    params.set('limit', String(limit.value));

    if (searchQuery.value.trim()) {
      params.set('search', searchQuery.value.trim());
    }
    if (statusFilter.value !== 'ALL') {
      params.set('status', statusFilter.value);
    }
    if (selectedTenantId.value !== 'ALL') {
      params.set('tenant_id', selectedTenantId.value);
    }

    const res = await fetch(`/v1/webhook-logs?${params.toString()}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    const json = await res.json();
    if (json.success) {
      if (json.pagination) {
        logs.value = json.data || [];
        total.value = json.pagination.total;
        totalPages.value = json.pagination.totalPages;
      } else {
        logs.value = json.data || [];
        total.value = logs.value.length;
        totalPages.value = Math.max(1, Math.ceil(total.value / limit.value));
      }
    } else {
      emit('toast', json.message || 'Gagal memuat log webhook');
    }
  } catch (err: any) {
    emit('toast', err.message || 'Koneksi ke gateway gagal');
  } finally {
    isLoading.value = false;
  }
};

const handleSearch = () => {
  page.value = 1;
  fetchLogs();
};

const handleStatusChange = (status: 'ALL' | 'SUCCESS' | 'FAILED') => {
  statusFilter.value = status;
  page.value = 1;
  fetchLogs();
};

const handleTenantChange = () => {
  page.value = 1;
  fetchLogs();
};

const goToPage = (p: number) => {
  if (p < 1 || p > totalPages.value) return;
  page.value = p;
  fetchLogs();
};

const resendWebhook = async (log: WebhookLog) => {
  isResendingId.value = log.id;
  try {
    const token = localStorage.getItem('qris_admin_token') || '';
    const res = await fetch(`/v1/webhooks/resend/${log.chargeId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    const json = await res.json();
    if (json.success) {
      emit('toast', `Webhook untuk order ${log.orderId} berhasil dikirim ulang!`);
      if (activeModalLog.value && activeModalLog.value.id === log.id) {
        activeModalLog.value.status = 'SUCCESS';
        activeModalLog.value.statusCode = 200;
      }
      fetchLogs();
    } else {
      emit('toast', json.message || 'Kirim ulang webhook gagal. Periksa endpoint tenant.');
      fetchLogs();
    }
  } catch (err: any) {
    emit('toast', err.message || 'Gagal mengirim ulang webhook');
  } finally {
    isResendingId.value = null;
  }
};

const viewDetail = (log: WebhookLog) => {
  activeModalLog.value = log;
};

const closeModal = () => {
  activeModalLog.value = null;
};

onMounted(() => {
  fetchLogs();
});
</script>

<template>
  <div class="flex flex-col">
    <!-- UNIFIED MASTER TABLE CONTAINER -->
    <div class="border-b border-slate-200/90 divide-y divide-slate-200/90 bg-white overflow-hidden">
      <!-- 1. METRICS OVERVIEW CELLS -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200/90">
        <div class="p-5 bg-white flex flex-col justify-between h-full">
          <div class="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Total Pengiriman</span>
            <Webhook :size="14" class="text-slate-400" />
          </div>
          <div class="mt-2 flex items-baseline gap-2">
            <span class="text-2xl font-bold font-mono text-slate-900">{{ total }}</span>
            <span class="text-[11px] text-slate-500">kali terpicu</span>
          </div>
        </div>

        <div class="p-5 bg-white flex flex-col justify-between h-full">
          <div class="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Terkirim Sukses</span>
            <CheckCircle2 :size="14" class="text-emerald-500" />
          </div>
          <div class="mt-2 flex items-baseline gap-2">
            <span class="text-2xl font-bold font-mono text-emerald-600">{{ successCount }}</span>
            <span class="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
              {{ successRate }}% rasio
            </span>
          </div>
        </div>

        <div class="p-5 bg-white flex flex-col justify-between h-full">
          <div class="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Gagal / Timeout</span>
            <XCircle :size="14" class="text-rose-500" />
          </div>
          <div class="mt-2 flex items-baseline gap-2">
            <span class="text-2xl font-bold font-mono text-rose-600">{{ failedCount }}</span>
            <span v-if="failedCount > 0" class="text-[11px] font-medium text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
              Perlu dicek
            </span>
            <span v-else class="text-[11px] text-slate-400">Zero error</span>
          </div>
        </div>

        <div class="p-5 bg-white flex flex-col justify-between h-full">
          <div class="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Scope Pengguna</span>
            <Building2 :size="14" class="text-blue-500" />
          </div>
          <div class="mt-2 flex items-baseline gap-2">
            <span class="text-sm font-bold text-slate-800">
              {{ isMerchant ? 'Toko Anda' : 'Platform Multi-Tenant' }}
            </span>
          </div>
          <div class="text-[11px] text-slate-500 mt-1">
            {{ isMerchant ? 'Terisolasi ke webhook toko Anda' : 'Monitoring seluruh klien SaaS' }}
          </div>
        </div>
      </div>

      <!-- 2. FILTER & SEARCH TOOLBAR -->
      <div class="p-3 bg-slate-50/50 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div class="flex flex-wrap items-center gap-2">
          <!-- Status filter buttons -->
          <div class="inline-flex rounded-md border border-slate-200/90 p-0.5 bg-white text-xs font-medium shadow-2xs">
            <button
              :class="['px-2.5 py-1 rounded transition cursor-pointer', statusFilter === 'ALL' ? 'bg-slate-900 font-bold text-white shadow-xs' : 'text-slate-600 hover:text-slate-900']"
              @click="handleStatusChange('ALL')"
            >
              Semua ({{ total }})
            </button>
            <button
              :class="['px-2.5 py-1 rounded transition cursor-pointer flex items-center gap-1', statusFilter === 'SUCCESS' ? 'bg-emerald-600 font-bold text-white shadow-xs' : 'text-slate-600 hover:text-slate-900']"
              @click="handleStatusChange('SUCCESS')"
            >
              <span class="w-1.5 h-1.5 rounded-full" :class="statusFilter === 'SUCCESS' ? 'bg-white' : 'bg-emerald-500'"></span>
              Sukses
            </button>
            <button
              :class="['px-2.5 py-1 rounded transition cursor-pointer flex items-center gap-1', statusFilter === 'FAILED' ? 'bg-rose-600 font-bold text-white shadow-xs' : 'text-slate-600 hover:text-slate-900']"
              @click="handleStatusChange('FAILED')"
            >
              <span class="w-1.5 h-1.5 rounded-full" :class="statusFilter === 'FAILED' ? 'bg-white' : 'bg-rose-500'"></span>
              Gagal
            </button>
          </div>

          <!-- Tenant Filter Dropdown for Admin -->
          <div v-if="!isMerchant && props.tenants && props.tenants.length > 0" class="flex items-center gap-1.5">
            <select
              v-model="selectedTenantId"
              class="text-xs px-2.5 py-1.5 rounded-md border border-slate-200 bg-white text-slate-700 focus:outline-none focus:border-[#d71920]"
              @change="handleTenantChange"
            >
              <option value="ALL">Semua SaaS Client</option>
              <option v-for="t in props.tenants" :key="t.id" :value="t.id">{{ t.name }}</option>
            </select>
          </div>
        </div>

        <!-- Search Input & Refresh Button -->
        <div class="flex items-center gap-2 w-full md:w-auto">
          <div class="relative flex-1 md:w-72">
            <Search :size="13" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Cari Order ID, Charge, URL..."
              class="w-full text-xs pl-8 pr-3 py-1.5 rounded-md border border-slate-200 bg-white placeholder-slate-400 focus:outline-none focus:border-[#d71920]"
              @keydown.enter="handleSearch"
            />
          </div>

          <button
            class="btn btn-secondary btn-sm text-xs flex items-center gap-1.5 cursor-pointer shadow-xs bg-white shrink-0"
            :disabled="isLoading"
            @click="fetchLogs"
          >
            <RefreshCw :size="13" :class="{'animate-spin': isLoading}" />
            <span>{{ isLoading ? 'Memuat...' : 'Refresh' }}</span>
          </button>
        </div>
      </div>

      <!-- 3. DATA TABLE BODY -->
      <LogsTable
        :logs="logs"
        :isLoading="isLoading"
        :isMerchant="isMerchant"
        :tenants="tenants"
        @viewDetail="viewDetail"
        @resend="resendWebhook"
      />

      <!-- 4. PAGINATION FOOTER ROW -->
      <div class="p-3 bg-slate-50/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
        <div>
          Menampilkan <span class="font-bold text-slate-800">{{ logs.length }}</span> dari <span class="font-bold text-slate-800">{{ total }}</span> log webhook
        </div>

        <div class="flex items-center gap-1.5">
          <button
            class="btn btn-secondary !py-1 !px-2 text-xs flex items-center gap-1 cursor-pointer bg-white"
            :disabled="page <= 1 || isLoading"
            @click="goToPage(page - 1)"
          >
            <ChevronLeft :size="13" />
            <span>Sebelumnya</span>
          </button>

          <span class="px-2 text-xs font-mono text-slate-700">
            Halaman {{ page }} / {{ totalPages }}
          </span>

          <button
            class="btn btn-secondary !py-1 !px-2 text-xs flex items-center gap-1 cursor-pointer bg-white"
            :disabled="page >= totalPages || isLoading"
            @click="goToPage(page + 1)"
          >
            <span>Selanjutnya</span>
            <ChevronRight :size="13" />
          </button>
        </div>
      </div>
    </div>

    <!-- Detail Modal -->
    <LogDetailModal
      :log="activeModalLog"
      @close="closeModal"
      @resend="resendWebhook"
    />
  </div>
</template>

<script lang="ts">
import { ChevronLeft, ChevronRight } from 'lucide-vue-next';
export default {
  components: { ChevronLeft, ChevronRight }
};
</script>
