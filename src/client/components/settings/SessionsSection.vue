<script setup lang="ts">
import { ref } from 'vue';
import { Laptop, Trash2, Loader2, AlertCircle } from 'lucide-vue-next';

const props = defineProps<{
  currentUser: any;
  activeSessions: any[];
  isLoading: boolean;
}>();

const emit = defineEmits<{
  (e: 'revoke', sessionId: string): void;
  (e: 'revokeAll'): void;
  (e: 'toast', msg: string): void;
}>();

const revokingSessionId = ref<string | null>(null);

const handleRevoke = async (sessionId: string) => {
  revokingSessionId.value = sessionId;
  try {
    emit('revoke', sessionId);
  } finally {
    revokingSessionId.value = null;
  }
};

const handleRevokeAll = async () => {
  emit('revokeAll');
};

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};
</script>

<template>
  <div class="space-y-6">
    <div>
      <h3 class="text-sm font-bold text-slate-900 flex items-center gap-2">
        <Laptop :size="16" class="text-slate-400" />
        Active Sessions
      </h3>
      <p class="text-xs text-slate-500 mt-1">Kelola perangkat yang sedang masuk ke akun Anda</p>
    </div>

    <div class="flex items-center justify-between">
      <span class="text-xs text-slate-500">
        {{ activeSessions.length }} sesi aktif
      </span>
      <button
        v-if="activeSessions.length > 1"
        @click="handleRevokeAll"
        :disabled="isLoading"
        class="px-3 py-1.5 text-xs font-medium text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition flex items-center gap-1"
      >
        <Trash2 :size="12" />
        Cabut Semua Sesi Lain
      </button>
    </div>

    <div class="space-y-2">
      <div
        v-for="session in activeSessions"
        :key="session.id"
        class="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200"
      >
        <div class="flex items-center gap-3 min-w-0">
          <div class="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center shrink-0">
            <Laptop :size="14" class="text-slate-500" />
          </div>
          <div class="min-w-0">
            <div class="text-sm font-medium text-slate-900 truncate">
              {{ session.device || 'Unknown Device' }}
            </div>
            <div class="text-[11px] text-slate-500">
              {{ session.ip || 'Unknown IP' }} · {{ formatDate(session.createdAt) }}
            </div>
          </div>
        </div>

        <div class="flex items-center gap-2 shrink-0">
          <span
            v-if="session.isCurrentSession"
            class="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-emerald-100 text-emerald-700"
          >
            Current
          </span>
          <button
            v-else
            @click="handleRevoke(session.id)"
            :disabled="revokingSessionId === session.id"
            class="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
            title="Cabut sesi"
          >
            <Loader2 v-if="revokingSessionId === session.id" :size="14" class="animate-spin" />
            <Trash2 v-else :size="14" />
          </button>
        </div>
      </div>

      <div v-if="activeSessions.length === 0 && !isLoading" class="text-center py-8 text-slate-400">
        <Laptop :size="32" class="mx-auto mb-2 opacity-50" />
        <p class="text-sm">Tidak ada sesi aktif</p>
      </div>

      <div v-if="isLoading" class="text-center py-8 text-slate-400">
        <Loader2 :size="32" class="mx-auto mb-2 animate-spin opacity-50" />
        <p class="text-sm">Memuat sesi...</p>
      </div>
    </div>
  </div>
</template>
