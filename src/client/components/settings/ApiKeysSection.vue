<script setup lang="ts">
import { ref } from 'vue';
import { Key, Plus, Trash2, Loader2, Copy, Check, AlertCircle } from 'lucide-vue-next';
import { useClipboard } from '../../composables/useClipboard';

const props = defineProps<{
  currentUser: any;
  projectConfig: any;
  apiKeys: any[];
  isLoading: boolean;
}>();

const emit = defineEmits<{
  (e: 'create', description: string): void;
  (e: 'revoke', key: any): void;
  (e: 'toast', msg: string): void;
}>();

const { copy } = useClipboard();
const newDescription = ref('');
const isCreating = ref(false);
const newlyCreatedKey = ref<any>(null);

const handleCreate = async () => {
  isCreating.value = true;
  try {
    emit('create', newDescription.value.trim() || 'User API Key');
    newDescription.value = '';
  } finally {
    isCreating.value = false;
  }
};

const handleRevoke = async (key: any) => {
  if (!confirm('Revoke kunci API ini? Aplikasi yang menggunakannya akan kehilangan akses.')) return;
  emit('revoke', key);
};

const handleCopyKey = async () => {
  if (newlyCreatedKey.value) {
    const ok = await copy(newlyCreatedKey.value.value, 'new-key');
    if (ok) emit('toast', 'Kunci disalin!');
  }
};
</script>

<template>
  <div class="space-y-6">
    <div>
      <h3 class="text-sm font-bold text-slate-900 flex items-center gap-2">
        <Key :size="16" class="text-slate-400" />
        API Keys
      </h3>
      <p class="text-xs text-slate-500 mt-1">Buat dan kelola kunci API untuk integrasi aplikasi</p>
    </div>

    <!-- Create new key -->
    <div class="space-y-3">
      <div class="flex gap-2">
        <input
          v-model="newDescription"
          type="text"
          class="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Deskripsi kunci (misal: Production API)"
          @keyup.enter="handleCreate"
        />
        <button
          @click="handleCreate"
          :disabled="isCreating"
          class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <Loader2 v-if="isCreating" :size="14" class="animate-spin" />
          <Plus v-else :size="14" />
          Buat
        </button>
      </div>
    </div>

    <!-- Newly created key -->
    <div v-if="newlyCreatedKey" class="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-3">
      <div class="flex items-center gap-2 text-amber-800">
        <AlertCircle :size="14" />
        <span class="text-xs font-bold">Kunci Baru Dibuat — Salin Sekarang!</span>
      </div>
      <p class="text-[11px] text-amber-700">
        Kunci ini hanya akan ditampilkan sekali. Simpan di tempat yang aman.
      </p>
      <div class="flex items-center gap-2">
        <code class="flex-1 text-xs font-mono bg-white p-2 rounded border border-amber-200 text-slate-900 select-all">
          {{ newlyCreatedKey.value }}
        </code>
        <button
          @click="handleCopyKey"
          class="p-2 text-amber-700 hover:bg-amber-100 rounded-lg transition"
          title="Salin kunci"
        >
          <Check v-if="copiedId === 'new-key'" :size="14" class="text-emerald-600" />
          <Copy v-else :size="14" />
        </button>
      </div>
    </div>

    <!-- API Keys list -->
    <div class="space-y-2">
      <div
        v-for="key in apiKeys"
        :key="key.id"
        class="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200"
      >
        <div class="min-w-0">
          <div class="text-sm font-medium text-slate-900">{{ key.description || 'API Key' }}</div>
          <div class="text-[11px] text-slate-500 font-mono">
            {{ key.value?.substring(0, 8) }}...{{ key.value?.substring(key.value.length - 4) }}
          </div>
        </div>

        <div class="flex items-center gap-2 shrink-0">
          <span
            :class="[
              'text-[10px] px-1.5 py-0.5 rounded-full font-medium',
              key.status === 'active'
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-slate-100 text-slate-600'
            ]"
          >
            {{ key.status }}
          </span>
          <button
            @click="handleRevoke(key)"
            class="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
            title="Revoke kunci"
          >
            <Trash2 :size="14" />
          </button>
        </div>
      </div>

      <div v-if="apiKeys.length === 0 && !isLoading" class="text-center py-8 text-slate-400">
        <Key :size="32" class="mx-auto mb-2 opacity-50" />
        <p class="text-sm">Belum ada API key</p>
      </div>

      <div v-if="isLoading" class="text-center py-8 text-slate-400">
        <Loader2 :size="32" class="mx-auto mb-2 animate-spin opacity-50" />
        <p class="text-sm">Memuat API keys...</p>
      </div>
    </div>
  </div>
</template>
