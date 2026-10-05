<script setup lang="ts">
import { ref, computed } from 'vue';
import { Plus, Building2, Smartphone, Send, CreditCard, RefreshCw } from 'lucide-vue-next';
import type { Tenant } from '../types';
import MetricCard from '../components/MetricCard.vue';
import AppsTable from '../components/saas/AppsTable.vue';
import PairingModal from '../components/saas/PairingModal.vue';
import SettingsModal from '../components/saas/SettingsModal.vue';

const props = defineProps<{
  tenants: Tenant[];
}>();

const emit = defineEmits<{
  (e: 'openModal'): void;
  (e: 'deleteApp', id: string): void;
  (e: 'copy', text: string, id: string): void;
  (e: 'refresh'): void;
}>();

// Search and Filter State
const searchQuery = ref('');
const statusFilter = ref<'ALL' | 'ONLINE' | 'TELEGRAM' | 'DEDICATED' | 'MASTER'>('ALL');

// Pairing Modal State
const pairingApp = ref<Tenant | null>(null);

// Settings / Telegram Modal State
const settingsApp = ref<Tenant | null>(null);
const settingsModalRef = ref<InstanceType<typeof SettingsModal> | null>(null);

// Summary metrics
const totalAppsCount = computed(() => props.tenants.length);
const onlineListenerCount = computed(() => {
  return props.tenants.filter((a) => {
    if (!a.deviceLastSeen) return false;
    const diffMs = Date.now() - new Date(a.deviceLastSeen).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    return diffMins <= 15;
  }).length;
});
const telegramActiveCount = computed(() => {
  return props.tenants.filter((a) => !!a.telegramChatId).length;
});
const dedicatedQrisCount = computed(() => {
  return props.tenants.filter((a) => !!a.staticQRIS).length;
});
const masterQrisCount = computed(() => {
  return props.tenants.filter((a) => !a.staticQRIS).length;
});

// Modal handlers
const openPairingModal = (app: Tenant) => {
  pairingApp.value = app;
};

const closePairingModal = () => {
  pairingApp.value = null;
};

const openSettingsModal = (app: Tenant) => {
  settingsApp.value = app;
};

const closeSettingsModal = () => {
  settingsApp.value = null;
};

// Test Telegram
const handleTestTelegram = async (data: { botToken: string; chatId: string }) => {
  if (!settingsApp.value) return;

  const token = localStorage.getItem('qris_admin_token') || '';
  try {
    const res = await fetch('/v1/merchant/telegram-test', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        bot_token: data.botToken,
        chat_id: data.chatId,
      }),
    });
    const result = await res.json();

    // Update state modal lewat ref komponen (selector DOM [data-settings-modal] tidak pernah ada)
    const modal = settingsModalRef.value;
    if (modal) {
      modal.setTestingTelegram(false);
      if (res.ok && result.success) {
        modal.setTelegramTestSuccess('Pesan tes berhasil dikirim! Silakan periksa Telegram Anda.');
      } else {
        modal.setTelegramTestError(result.message || 'Gagal mengirim pesan ke Telegram');
      }
    }
  } catch (e) {
    const modal = settingsModalRef.value;
    if (modal) {
      modal.setTestingTelegram(false);
      modal.setTelegramTestError('Gagal mengirim pesan tes. Periksa koneksi Anda.');
    }
  }
};

// Save Settings
const handleSaveSettings = async (data: {
  name: string;
  webhookUrl: string;
  staticQRIS: string;
  telegramBotToken: string;
  telegramChatId: string;
}) => {
  if (!settingsApp.value) return;

  const token = localStorage.getItem('qris_admin_token') || '';
  const res = await fetch(`/v1/apps/${settingsApp.value.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      name: data.name,
      webhook_url: data.webhookUrl,
      static_qris: data.staticQRIS || undefined,
      telegram_bot_token: data.telegramBotToken || undefined,
      telegram_chat_id: data.telegramChatId || undefined,
    }),
  });
  const result = await res.json();
  if (res.ok && result.success) {
    closeSettingsModal();
    emit('refresh');
  } else {
    alert(result.message || 'Gagal menyimpan pengaturan toko');
  }
};
</script>

<template>
  <div class="flex flex-col">
    <!-- HEADER ACTION BAR -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-6 py-3 bg-white border-b border-slate-200/90">
      <div class="flex items-center gap-2">
        <div class="w-6 h-6 rounded bg-red-100 border border-red-200 flex items-center justify-center shrink-0">
          <Building2 :size="13" class="text-[#d71920]" />
        </div>
        <span class="text-sm font-bold text-slate-900 tracking-tight">SaaS Clients & Mitra Platform</span>
        <span class="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded border bg-slate-100 border-slate-200 text-slate-700">
          {{ totalAppsCount }} Mitra
        </span>
      </div>

      <div class="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
        <button @click="emit('openModal')" class="btn btn-primary btn-sm cursor-pointer shadow-xs !py-2 sm:!py-1.5 flex-1 sm:flex-initial">
          <Plus :size="13" />
          <span>Tambah Client App</span>
        </button>
        <button @click="emit('refresh')" class="p-2 sm:p-1.5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer border border-slate-200 sm:border-transparent shrink-0" title="Refresh Data">
          <RefreshCw :size="14" />
        </button>
      </div>
    </div>

    <!-- PRIMARY METRIC STATS CARD GRID (CONNECTED TABLE GRID - 2 COLS MOBILE, 4 COLS DESKTOP) -->
    <div class="border-b border-slate-200/90 divide-y divide-slate-200/90 bg-white overflow-hidden">
      <div class="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-slate-200/90">
        <MetricCard
          label="Total Mitra"
          :value="`${totalAppsCount} Apps`"
          subtitle="Mitra terdaftar"
          :icon="Building2"
          :badge="{ text: 'TOTAL', variant: 'blue' }"
        />
        <MetricCard
          label="HP Listener"
          :value="`${onlineListenerCount} Online`"
          :subtitle="`${tenants.length - onlineListenerCount} offline / siaga`"
          :icon="Smartphone"
          :badge="{ text: onlineListenerCount > 0 ? 'ONLINE' : 'STANDBY', variant: onlineListenerCount > 0 ? 'emerald' : 'slate' }"
        />
        <MetricCard
          label="Bot Telegram"
          :value="`${telegramActiveCount} Aktif`"
          subtitle="Notifikasi real-time"
          :icon="Send"
          :badge="{ text: telegramActiveCount > 0 ? 'AKTIF' : 'OFF', variant: telegramActiveCount > 0 ? 'emerald' : 'slate' }"
        />
        <MetricCard
          label="QRIS Settlement"
          :value="`${dedicatedQrisCount} Dedicated`"
          :subtitle="`${masterQrisCount} pakai Master Platform`"
          :icon="CreditCard"
          :badge="{ text: 'SETTLEMENT', variant: 'rose' }"
        />
      </div>

      <!-- 2. APPS TABLE -->
      <AppsTable
        :tenants="tenants"
        v-model:searchQuery="searchQuery"
        v-model:statusFilter="statusFilter"
        @openSettings="openSettingsModal"
        @openPairing="openPairingModal"
        @delete="emit('deleteApp', $event)"
        @copy="emit('copy', $event, $event)"
      />
    </div>

    <!-- Pairing Modal -->
    <PairingModal
      :app="pairingApp"
      @close="closePairingModal"
    />

    <!-- Settings Modal -->
    <SettingsModal
      ref="settingsModalRef"
      :app="settingsApp"
      @close="closeSettingsModal"
      @save="handleSaveSettings"
      @testTelegram="handleTestTelegram"
    />
  </div>
</template>
