<script setup lang="ts">
import { ref, computed } from 'vue';
import {
  Building2,
  Eye,
  EyeOff,
  Copy,
  Check,
  QrCode,
  Smartphone,
  Settings,
  Trash2,
  Search,
  X
} from 'lucide-vue-next';
import { formatDate } from '../../utils/formatters';
import type { Tenant } from '../../types';

const props = defineProps<{
  tenants: Tenant[];
  searchQuery: string;
  statusFilter: 'ALL' | 'ONLINE' | 'TELEGRAM' | 'DEDICATED' | 'MASTER';
}>();

const emit = defineEmits<{
  (e: 'update:searchQuery', value: string): void;
  (e: 'update:statusFilter', value: 'ALL' | 'ONLINE' | 'TELEGRAM' | 'DEDICATED' | 'MASTER'): void;
  (e: 'openSettings', app: Tenant): void;
  (e: 'openPairing', app: Tenant): void;
  (e: 'delete', id: string): void;
  (e: 'copy', text: string, id: string): void;
}>();

const revealedKeys = ref<Record<string, boolean>>({});
const copiedKeyId = ref<string | null>(null);

const getDeviceStatus = (app: Tenant) => {
  if (!app.deviceLastSeen) {
    return { status: 'UNKNOWN', label: 'Belum Terhubung', color: 'bg-slate-100 text-slate-500 border-slate-200', dot: 'bg-slate-400' };
  }
  const diffMs = Date.now() - new Date(app.deviceLastSeen).getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins <= 15) {
    const batt = app.deviceBattery ? ` · ${app.deviceBattery}%${app.deviceIsCharging ? '⚡' : ''}` : '';
    return { status: 'ONLINE', label: `Online${batt}`, color: 'bg-emerald-50 text-emerald-800 border-emerald-200', dot: 'bg-emerald-500' };
  }
  if (diffMins <= 60) {
    return { status: 'IDLE', label: `Idle (${diffMins}m lalu)`, color: 'bg-amber-50 text-amber-800 border-amber-200', dot: 'bg-amber-500' };
  }
  const hours = Math.floor(diffMins / 60);
  return { status: 'OFFLINE', label: `Offline (${hours > 24 ? Math.floor(hours / 24) + 'h lalu' : hours + 'j lalu'})`, color: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500' };
};

const filteredApps = computed(() => {
  return props.tenants.filter((app) => {
    if (props.statusFilter === 'ONLINE') {
      const status = getDeviceStatus(app);
      if (status.status !== 'ONLINE') return false;
    } else if (props.statusFilter === 'TELEGRAM') {
      if (!app.telegramChatId) return false;
    } else if (props.statusFilter === 'DEDICATED') {
      if (!app.staticQRIS) return false;
    } else if (props.statusFilter === 'MASTER') {
      if (app.staticQRIS) return false;
    }

    if (props.searchQuery.trim()) {
      const q = props.searchQuery.toLowerCase().trim();
      const matchName = app.name?.toLowerCase().includes(q);
      const matchId = app.id?.toLowerCase().includes(q);
      const matchWebhook = app.webhookUrl?.toLowerCase().includes(q);
      const matchPk = app.publicKey?.toLowerCase().includes(q);
      const matchChatId = app.telegramChatId?.toString().toLowerCase().includes(q);
      if (!matchName && !matchId && !matchWebhook && !matchPk && !matchChatId) return false;
    }

    return true;
  });
});

const handleCopy = async (text: string, id: string) => {
  await navigator.clipboard.writeText(text);
  copiedKeyId.value = id;
  setTimeout(() => {
    if (copiedKeyId.value === id) copiedKeyId.value = null;
  }, 2000);
  emit('copy', text, id);
};

const toggleRevealKey = (id: string) => {
  revealedKeys.value[id] = !revealedKeys.value[id];
};
</script>

<template>
  <div>
    <!-- Filter & Search Toolbar -->
    <div class="p-3 bg-white flex flex-col md:flex-row items-center justify-between gap-3">
      <div class="flex items-center gap-2">
        <div class="inline-flex rounded-md border border-slate-200/90 p-0.5 bg-white text-xs font-medium shadow-2xs">
          <button
            :class="['px-2.5 py-1 rounded transition cursor-pointer', statusFilter === 'ALL' ? 'bg-slate-900 font-bold text-white shadow-xs' : 'text-slate-600 hover:text-slate-900']"
            @click="emit('update:statusFilter', 'ALL')"
          >
            Semua
          </button>
          <button
            :class="['px-2.5 py-1 rounded transition cursor-pointer flex items-center gap-1', statusFilter === 'ONLINE' ? 'bg-emerald-600 font-bold text-white shadow-xs' : 'text-slate-600 hover:text-slate-900']"
            @click="emit('update:statusFilter', 'ONLINE')"
          >
            <span class="w-1.5 h-1.5 rounded-full" :class="statusFilter === 'ONLINE' ? 'bg-white' : 'bg-emerald-500'"></span>
            Online
          </button>
          <button
            :class="['px-2.5 py-1 rounded transition cursor-pointer flex items-center gap-1', statusFilter === 'TELEGRAM' ? 'bg-sky-600 font-bold text-white shadow-xs' : 'text-slate-600 hover:text-slate-900']"
            @click="emit('update:statusFilter', 'TELEGRAM')"
          >
            <span class="w-1.5 h-1.5 rounded-full" :class="statusFilter === 'TELEGRAM' ? 'bg-white' : 'bg-sky-500'"></span>
            Telegram
          </button>
          <button
            :class="['px-2.5 py-1 rounded transition cursor-pointer flex items-center gap-1', statusFilter === 'DEDICATED' ? 'bg-violet-600 font-bold text-white shadow-xs' : 'text-slate-600 hover:text-slate-900']"
            @click="emit('update:statusFilter', 'DEDICATED')"
          >
            <span class="w-1.5 h-1.5 rounded-full" :class="statusFilter === 'DEDICATED' ? 'bg-white' : 'bg-violet-500'"></span>
            Dedicated
          </button>
          <button
            :class="['px-2.5 py-1 rounded transition cursor-pointer flex items-center gap-1', statusFilter === 'MASTER' ? 'bg-slate-600 font-bold text-white shadow-xs' : 'text-slate-600 hover:text-slate-900']"
            @click="emit('update:statusFilter', 'MASTER')"
          >
            <span class="w-1.5 h-1.5 rounded-full" :class="statusFilter === 'MASTER' ? 'bg-white' : 'bg-slate-500'"></span>
            Master
          </button>
        </div>
      </div>

      <div class="relative w-full md:w-72">
        <Search :size="13" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          :value="searchQuery"
          @input="emit('update:searchQuery', ($event.target as HTMLInputElement).value)"
          type="text"
          placeholder="Cari nama, ID, webhook..."
          class="w-full text-xs pl-8 pr-3 py-1.5 rounded-md border border-slate-200 bg-white placeholder-slate-400 focus:outline-none focus:border-[#d71920]"
        />
      </div>
    </div>

    <!-- Apps Table -->
    <div class="overflow-x-auto">
      <table class="w-full text-left text-xs">
        <thead class="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
          <tr>
            <th class="py-2.5 px-4">App / Tenant</th>
            <th class="py-2.5 px-4">Public Key</th>
            <th class="py-2.5 px-4">Device Status</th>
            <th class="py-2.5 px-4">QRIS</th>
            <th class="py-2.5 px-4">Telegram</th>
            <th class="py-2.5 px-4 text-right">Aksi</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <tr v-if="filteredApps.length === 0" class="text-slate-400">
            <td colspan="6" class="py-12 text-center">
              <div class="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
                <Building2 :size="24" />
              </div>
              <div class="font-bold text-slate-700 text-sm">Tidak ada aplikasi ditemukan</div>
              <p class="text-xs text-slate-400 mt-1">Coba ubah filter atau kata kunci pencarian</p>
            </td>
          </tr>

          <tr
            v-for="app in filteredApps"
            :key="app.id"
            class="hover:bg-slate-50/80 transition"
          >
            <!-- App Info -->
            <td class="py-3 px-4">
              <div class="flex items-center gap-2">
                <div class="w-7 h-7 rounded-md bg-slate-100 flex items-center justify-center shrink-0">
                  <Building2 :size="14" class="text-slate-500" />
                </div>
                <div class="min-w-0">
                  <div class="font-medium text-slate-900 truncate">{{ app.name }}</div>
                  <div class="text-[10px] font-mono text-slate-400 truncate">{{ app.id }}</div>
                </div>
              </div>
            </td>

            <!-- Public Key -->
            <td class="py-3 px-4">
              <div class="flex items-center gap-1.5">
                <code class="text-[11px] font-mono text-slate-600 truncate max-w-[120px]">
                  {{ revealedKeys[app.id] ? app.publicKey : app.publicKey?.substring(0, 12) + '...' }}
                </code>
                <button
                  @click="toggleRevealKey(app.id)"
                  class="text-slate-400 hover:text-slate-600 p-0.5"
                  :title="revealedKeys[app.id] ? 'Sembunyikan' : 'Tampilkan'"
                >
                  <Eye v-if="!revealedKeys[app.id]" :size="12" />
                  <EyeOff v-else :size="12" />
                </button>
                <button
                  @click="handleCopy(app.publicKey, `pk-${app.id}`)"
                  class="text-slate-400 hover:text-slate-600 p-0.5"
                  title="Salin Public Key"
                >
                  <Check v-if="copiedKeyId === `pk-${app.id}`" :size="12" class="text-emerald-600" />
                  <Copy v-else :size="12" />
                </button>
              </div>
            </td>

            <!-- Device Status -->
            <td class="py-3 px-4">
              <span
                :class="[
                  'inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium border',
                  getDeviceStatus(app).color
                ]"
              >
                <span :class="['w-1.5 h-1.5 rounded-full', getDeviceStatus(app).dot]"></span>
                {{ getDeviceStatus(app).label }}
              </span>
            </td>

            <!-- QRIS -->
            <td class="py-3 px-4">
              <span
                v-if="app.staticQRIS"
                class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-violet-50 text-violet-700 border border-violet-200"
              >
                <QrCode :size="11" />
                Dedicated
              </span>
              <span
                v-else
                class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200"
              >
                Master
              </span>
            </td>

            <!-- Telegram -->
            <td class="py-3 px-4">
              <span
                v-if="app.telegramChatId"
                class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-sky-50 text-sky-700 border border-sky-200"
              >
                <Check :size="11" />
                Aktif
              </span>
              <span
                v-else
                class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-500 border border-slate-200"
              >
                <X :size="11" />
                Nonaktif
              </span>
            </td>

            <!-- Actions -->
            <td class="py-3 px-4 text-right">
              <div class="flex items-center justify-end gap-1">
                <button
                  @click="emit('openPairing', app)"
                  class="p-1.5 rounded-md hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition cursor-pointer"
                  title="Pairing HP Listener"
                >
                  <Smartphone :size="14" />
                </button>
                <button
                  @click="emit('openSettings', app)"
                  class="p-1.5 rounded-md hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition cursor-pointer"
                  title="Pengaturan & Telegram"
                >
                  <Settings :size="14" />
                </button>
                <button
                  @click="emit('delete', app.id)"
                  class="p-1.5 rounded-md hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                  title="Hapus App"
                >
                  <Trash2 :size="14" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
