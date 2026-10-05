<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import {
  ShieldCheck,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Settings,
  Edit,
  ExternalLink,
  Filter
} from 'lucide-vue-next';
import { formatDateTime } from '../utils/formatters';
import type { AuditLog, User, Tenant } from '../types';

const props = defineProps<{
  currentUser?: User | null;
  tenants?: Tenant[];
}>();

const emit = defineEmits<{
  (e: 'toast', msg: string): void;
  (e: 'navigate', tab: string): void;
}>();

// State
const logs = ref<any[]>([]);
const isLoading = ref(false);
const searchQuery = ref('');
const actionFilter = ref<'ALL' | 'CREATE_PAYMENT_LINK' | 'DELETE_TENANT' | 'UPDATE_SETTINGS' | 'UPDATE_TENANT'>('ALL');
const page = ref(1);
const limit = ref(25);
const total = ref(0);
const totalPages = ref(1);

// Stats metrics
const totalActions = computed(() => logs.value.length);
const createLinkCount = computed(() => logs.value.filter((l) => l.action === 'CREATE_PAYMENT_LINK').length);
const deleteCount = computed(() => logs.value.filter((l) => l.action === 'DELETE_TENANT').length);
const updateCount = computed(() => logs.value.filter((l) => l.action === 'UPDATE_SETTINGS' || l.action === 'UPDATE_TENANT').length);

const getTenantName = (tenantId: string) => {
  if (!props.tenants) return tenantId;
  const t = props.tenants.find((item) => item.id === tenantId);
  return t ? t.name : tenantId;
};

const getActionIcon = (action: string) => {
  switch (action) {
    case 'CREATE_PAYMENT_LINK': return CheckCircle2;
    case 'DELETE_TENANT': return Trash2;
    case 'UPDATE_SETTINGS': return Settings;
    case 'UPDATE_TENANT': return Edit;
    default: return AlertCircle;
  }
};

const getActionColor = (action: string) => {
  switch (action) {
    case 'CREATE_PAYMENT_LINK': return 'emerald';
    case 'DELETE_TENANT': return 'rose';
    case 'UPDATE_SETTINGS': return 'blue';
    case 'UPDATE_TENANT': return 'amber';
    default: return 'slate';
  }
};

const getActionLabel = (action: string) => {
  switch (action) {
    case 'CREATE_PAYMENT_LINK': return 'Buat Payment Link';
    case 'DELETE_TENANT': return 'Hapus Tenant';
    case 'UPDATE_SETTINGS': return 'Update Settings';
    case 'UPDATE_TENANT': return 'Update Tenant';
    default: return action;
  }
};

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
    if (actionFilter.value !== 'ALL') {
      params.set('action', actionFilter.value);
    }

    const res = await fetch(`/v1/audit-logs?${params.toString()}`, {
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
      emit('toast', json.message || 'Gagal memuat log audit');
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

const handleActionChange = () => {
  page.value = 1;
  fetchLogs();
};

const goToPage = (p: number) => {
  if (p < 1 || p > totalPages.value) return;
  page.value = p;
  fetchLogs();
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
            <span>Total Aksi</span>
            <ShieldCheck :size="14" class="text-slate-400" />
          </div>
          <div class="mt-2 flex items-baseline gap-2">
            <span class="text-2xl font-bold font-mono text-slate-900">{{ total }}</span>
            <span class="text-[11px] text-slate-500">aksi tercatat</span>
          </div>
        </div>

        <div class="p-5 bg-white flex flex-col justify-between h-full">
          <div class="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Payment Link</span>
            <CheckCircle2 :size="14" class="text-emerald-500" />
          </div>
          <div class="mt-2 flex items-baseline gap-2">
            <span class="text-2xl font-bold font-mono text-emerald-600">{{ createLinkCount }}</span>
            <span class="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
              dibuat
            </span>
          </div>
        </div>

        <div class="p-5 bg-white flex flex-col justify-between h-full">
          <div class="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Hapus Tenant</span>
            <Trash2 :size="14" class="text-rose-500" />
          </div>
          <div class="mt-2 flex items-baseline gap-2">
            <span class="text-2xl font-bold font-mono text-rose-600">{{ deleteCount }}</span>
            <span v-if="deleteCount > 0" class="text-[11px] font-medium text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
              perlu review
            </span>
            <span v-else class="text-[11px] text-slate-400">aman</span>
          </div>
        </div>

        <div class="p-5 bg-white flex flex-col justify-between h-full">
          <div class="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Update Config</span>
            <Settings :size="14" class="text-blue-500" />
          </div>
          <div class="mt-2 flex items-baseline gap-2">
            <span class="text-2xl font-bold font-mono text-blue-600">{{ updateCount }}</span>
            <span class="text-[11px] text-slate-500">perubahan</span>
          </div>
        </div>
      </div>

      <!-- 2. FILTER & SEARCH TOOLBAR -->
      <div class="p-3 bg-slate-50/50 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div class="flex flex-wrap items-center gap-2">
          <!-- Action filter buttons -->
          <div class="inline-flex rounded-md border border-slate-200/90 p-0.5 bg-white text-xs font-medium shadow-2xs">
            <button
              :class="['px-2.5 py-1 rounded transition cursor-pointer', actionFilter === 'ALL' ? 'bg-slate-900 font-bold text-white shadow-xs' : 'text-slate-600 hover:text-slate-900']"
              @click="handleActionChange"
            >
              Semua
            </button>
            <button
              :class="['px-2.5 py-1 rounded transition cursor-pointer flex items-center gap-1', actionFilter === 'CREATE_PAYMENT_LINK' ? 'bg-emerald-600 font-bold text-white shadow-xs' : 'text-slate-600 hover:text-slate-900']"
              @click="actionFilter = 'CREATE_PAYMENT_LINK'; handleActionChange()"
            >
              <span class="w-1.5 h-1.5 rounded-full" :class="actionFilter === 'CREATE_PAYMENT_LINK' ? 'bg-white' : 'bg-emerald-500'"></span>
              Payment Link
            </button>
            <button
              :class="['px-2.5 py-1 rounded transition cursor-pointer flex items-center gap-1', actionFilter === 'DELETE_TENANT' ? 'bg-rose-600 font-bold text-white shadow-xs' : 'text-slate-600 hover:text-slate-900']"
              @click="actionFilter = 'DELETE_TENANT'; handleActionChange()"
            >
              <span class="w-1.5 h-1.5 rounded-full" :class="actionFilter === 'DELETE_TENANT' ? 'bg-white' : 'bg-rose-500'"></span>
              Hapus
            </button>
            <button
              :class="['px-2.5 py-1 rounded transition cursor-pointer flex items-center gap-1', actionFilter === 'UPDATE_SETTINGS' ? 'bg-blue-600 font-bold text-white shadow-xs' : 'text-slate-600 hover:text-slate-900']"
              @click="actionFilter = 'UPDATE_SETTINGS'; handleActionChange()"
            >
              <span class="w-1.5 h-1.5 rounded-full" :class="actionFilter === 'UPDATE_SETTINGS' ? 'bg-white' : 'bg-blue-500'"></span>
              Settings
            </button>
          </div>
        </div>

        <!-- Search Input & Refresh Button -->
        <div class="flex items-center gap-2 w-full md:w-auto">
          <div class="relative flex-1 md:w-72">
            <Search :size="13" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Cari user, email, action..."
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
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead class="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
            <tr>
              <th class="py-2.5 px-4">Action</th>
              <th class="py-2.5 px-4">User</th>
              <th class="py-2.5 px-4">Target Tenant</th>
              <th class="py-2.5 px-4">Details</th>
              <th class="py-2.5 px-4">IP Address</th>
              <th class="py-2.5 px-4">Waktu</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-if="isLoading" class="text-slate-400">
              <td colspan="6" class="py-8 text-center">
                <div class="flex items-center justify-center gap-2">
                  <RefreshCw :size="16" class="animate-spin text-[#d71920]" />
                  <span>Memuat data log audit...</span>
                </div>
              </td>
            </tr>

            <tr v-else-if="logs.length === 0" class="text-slate-400">
              <td colspan="6" class="py-12 text-center">
                <div class="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
                  <ShieldCheck :size="24" />
                </div>
                <div class="font-bold text-slate-700 text-sm">Belum Ada Log Audit</div>
                <p class="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Aksi platform owner akan tercatat di sini untuk keperluan audit dan keamanan.
                </p>
              </td>
            </tr>

            <tr
              v-for="log in logs"
              :key="log.id"
              class="hover:bg-slate-50/80 transition"
            >
              <!-- ACTION -->
              <td class="py-3 px-4">
                <div class="flex items-center gap-2">
                  <component
                    :is="getActionIcon(log.action)"
                    :size="14"
                    :class="`text-${getActionColor(log.action)}-600`"
                  />
                  <div>
                    <div class="font-medium text-slate-800">{{ getActionLabel(log.action) }}</div>
                    <div class="text-[10px] font-mono text-slate-400">{{ log.action }}</div>
                  </div>
                </div>
              </td>

              <!-- USER -->
              <td class="py-3 px-4">
                <div class="font-medium text-slate-800">{{ log.userEmail }}</div>
                <div class="text-[10px] font-mono text-slate-400">{{ log.userId }}</div>
              </td>

              <!-- TARGET TENANT -->
              <td class="py-3 px-4">
                <div v-if="log.targetTenantName" class="font-medium text-slate-800">
                  {{ log.targetTenantName }}
                </div>
                <div v-else class="text-slate-400">-</div>
                <div v-if="log.targetTenantId" class="text-[10px] font-mono text-slate-400">
                  {{ log.targetTenantId }}
                </div>
              </td>

              <!-- DETAILS -->
              <td class="py-3 px-4">
                <div v-if="log.details" class="text-[11px] text-slate-600 max-w-[200px] truncate" :title="JSON.stringify(log.details)">
                  {{ typeof log.details === 'object' ? JSON.stringify(log.details) : log.details }}
                </div>
                <div v-else class="text-slate-400">-</div>
              </td>

              <!-- IP ADDRESS -->
              <td class="py-3 px-4">
                <span class="font-mono text-[11px] text-slate-600">{{ log.ipAddress || '-' }}</span>
              </td>

              <!-- WAKTU -->
              <td class="py-3 px-4 text-slate-600 text-[11px] whitespace-nowrap">
                {{ formatDateTime(log.createdAt) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 4. PAGINATION FOOTER ROW -->
      <div class="p-3 bg-slate-50/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
        <div>
          Menampilkan <span class="font-bold text-slate-800">{{ logs.length }}</span> dari <span class="font-bold text-slate-800">{{ total }}</span> log audit
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
  </div>
</template>
