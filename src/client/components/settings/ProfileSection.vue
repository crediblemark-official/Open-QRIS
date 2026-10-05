<script setup lang="ts">
import { ref } from 'vue';
import { User, Loader2 } from 'lucide-vue-next';

const props = defineProps<{
  currentUser: any;
  isLoading: boolean;
}>();

const emit = defineEmits<{
  (e: 'save', data: { displayName: string; profileImageUrl: string }): void;
  (e: 'toast', msg: string): void;
}>();

const displayName = ref(props.currentUser?.displayName || '');
const profileImageUrl = ref(props.currentUser?.profileImageUrl || '');
const isSaving = ref(false);

const handleSave = async () => {
  isSaving.value = true;
  try {
    emit('save', {
      displayName: displayName.value.trim(),
      profileImageUrl: profileImageUrl.value.trim(),
    });
  } finally {
    isSaving.value = false;
  }
};
</script>

<template>
  <div class="space-y-6">
    <div>
      <h3 class="text-sm font-bold text-slate-900 flex items-center gap-2">
        <User :size="16" class="text-slate-400" />
        My Profile
      </h3>
      <p class="text-xs text-slate-500 mt-1">Kelola informasi profil akun Anda</p>
    </div>

    <div class="space-y-4">
      <div>
        <label class="block text-xs font-medium text-slate-700 mb-1">Display Name</label>
        <input
          v-model="displayName"
          type="text"
          class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Nama tampilan Anda"
        />
      </div>

      <div>
        <label class="block text-xs font-medium text-slate-700 mb-1">Profile Image URL</label>
        <input
          v-model="profileImageUrl"
          type="url"
          class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="https://example.com/avatar.jpg"
        />
      </div>

      <button
        @click="handleSave"
        :disabled="isSaving || isLoading"
        class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
      >
        <Loader2 v-if="isSaving" :size="14" class="animate-spin" />
        {{ isSaving ? 'Menyimpan...' : 'Simpan Profil' }}
      </button>
    </div>
  </div>
</template>
