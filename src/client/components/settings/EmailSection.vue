<script setup lang="ts">
import { ref, computed } from 'vue';
import { Mail, Plus, Trash2, Check, Loader2, AlertCircle } from 'lucide-vue-next';

const props = defineProps<{
  currentUser: any;
  contactChannels: any[];
}>();

const emit = defineEmits<{
  (e: 'add', email: string): void;
  (e: 'delete', channel: any): void;
  (e: 'setPrimary', channel: any): void;
  (e: 'toggleAuth', channel: any, enable: boolean): void;
  (e: 'sendVerification', channel: any): void;
  (e: 'toast', msg: string): void;
}>();

const newEmail = ref('');
const isAdding = ref(false);
const loadingId = ref<string | null>(null);

const emailChannels = computed(() => {
  return props.contactChannels.filter((c: any) => c.type === 'email');
});

const handleAdd = async () => {
  if (!newEmail.value.trim()) return;
  isAdding.value = true;
  try {
    emit('add', newEmail.value.trim());
    newEmail.value = '';
  } finally {
    isAdding.value = false;
  }
};

const handleAction = async (action: string, channel: any) => {
  loadingId.value = channel.id;
  try {
    switch (action) {
      case 'delete':
        emit('delete', channel);
        break;
      case 'setPrimary':
        emit('setPrimary', channel);
        break;
      case 'enableAuth':
        emit('toggleAuth', channel, true);
        break;
      case 'disableAuth':
        emit('toggleAuth', channel, false);
        break;
      case 'sendVerification':
        emit('sendVerification', channel);
        break;
    }
  } finally {
    loadingId.value = null;
  }
};
</script>

<template>
  <div class="space-y-6">
    <div>
      <h3 class="text-sm font-bold text-slate-900 flex items-center gap-2">
        <Mail :size="16" class="text-slate-400" />
        Email Addresses
      </h3>
      <p class="text-xs text-slate-500 mt-1">Kelola alamat email untuk autentikasi dan notifikasi</p>
    </div>

    <!-- Add new email -->
    <div class="flex gap-2">
      <input
        v-model="newEmail"
        type="email"
        class="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        placeholder="email@baru.com"
        @keyup.enter="handleAdd"
      />
      <button
        @click="handleAdd"
        :disabled="isAdding || !newEmail.trim()"
        class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
      >
        <Plus :size="14" />
        Tambah
      </button>
    </div>

    <!-- Email list -->
    <div class="space-y-2">
      <div
        v-for="channel in emailChannels"
        :key="channel.id"
        class="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200"
      >
        <div class="flex items-center gap-3 min-w-0">
          <div class="flex-1 min-w-0">
            <div class="text-sm font-medium text-slate-900 truncate">{{ channel.value }}</div>
            <div class="flex items-center gap-2 mt-0.5">
              <span
                :class="[
                  'text-[10px] px-1.5 py-0.5 rounded-full font-medium',
                  channel.isVerified
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-amber-100 text-amber-700'
                ]"
              >
                {{ channel.isVerified ? 'Verified' : 'Unverified' }}
              </span>
              <span
                v-if="channel.isPrimary"
                class="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-blue-100 text-blue-700"
              >
                Primary
              </span>
              <span
                v-if="channel.usedForAuth"
                class="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-purple-100 text-purple-700"
              >
                Sign-in
              </span>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-1 shrink-0">
          <button
            v-if="!channel.isVerified"
            @click="handleAction('sendVerification', channel)"
            :disabled="loadingId === channel.id"
            class="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
            title="Kirim email verifikasi"
          >
            <Loader2 v-if="loadingId === channel.id" :size="14" class="animate-spin" />
            <Mail v-else :size="14" />
          </button>

          <button
            v-if="!channel.isPrimary"
            @click="handleAction('setPrimary', channel)"
            :disabled="loadingId === channel.id"
            class="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
            title="Jadikan email utama"
          >
            <Check :size="14" />
          </button>

          <button
            v-if="channel.usedForAuth"
            @click="handleAction('disableAuth', channel)"
            :disabled="loadingId === channel.id"
            class="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
            title="Nonaktifkan untuk sign-in"
          >
            <AlertCircle :size="14" />
          </button>
          <button
            v-else
            @click="handleAction('enableAuth', channel)"
            :disabled="loadingId === channel.id"
            class="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
            title="Aktifkan untuk sign-in"
          >
            <Check :size="14" />
          </button>

          <button
            v-if="!channel.isPrimary"
            @click="handleAction('delete', channel)"
            :disabled="loadingId === channel.id"
            class="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
            title="Hapus email"
          >
            <Trash2 :size="14" />
          </button>
        </div>
      </div>

      <div v-if="emailChannels.length === 0" class="text-center py-8 text-slate-400">
        <Mail :size="32" class="mx-auto mb-2 opacity-50" />
        <p class="text-sm">Belum ada email terdaftar</p>
      </div>
    </div>
  </div>
</template>
