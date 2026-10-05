<script setup lang="ts">
import { ref } from 'vue';
import { Bell, Loader2 } from 'lucide-vue-next';

const props = defineProps<{
  currentUser: any;
  notificationCategories: any[];
  isLoading: boolean;
}>();

const emit = defineEmits<{
  (e: 'toggle', category: any, enabled: boolean): void;
  (e: 'toast', msg: string): void;
}>();

const togglingCategoryId = ref<string | null>(null);

const handleToggle = async (category: any, enabled: boolean) => {
  if (!category.canDisable && !enabled) return;
  togglingCategoryId.value = category.id;
  try {
    emit('toggle', category, enabled);
  } finally {
    togglingCategoryId.value = null;
  }
};
</script>

<template>
  <div class="space-y-6">
    <div>
      <h3 class="text-sm font-bold text-slate-900 flex items-center gap-2">
        <Bell :size="16" class="text-slate-400" />
        Notification Preferences
      </h3>
      <p class="text-xs text-slate-500 mt-1">Kelola preferensi notifikasi email Anda</p>
    </div>

    <div class="space-y-2">
      <div
        v-for="category in notificationCategories"
        :key="category.id"
        class="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200"
      >
        <div class="min-w-0">
          <div class="text-sm font-medium text-slate-900">{{ category.name }}</div>
          <div v-if="category.description" class="text-[11px] text-slate-500">
            {{ category.description }}
          </div>
        </div>

        <div class="flex items-center gap-2 shrink-0">
          <button
            v-if="togglingCategoryId === category.id"
            disabled
            class="p-1.5 text-slate-400"
          >
            <Loader2 :size="14" class="animate-spin" />
          </button>
          <label
            v-else
            class="relative inline-flex items-center cursor-pointer"
            :class="{ 'opacity-50 cursor-not-allowed': !category.canDisable && !category.enabled }"
          >
            <input
              type="checkbox"
              :checked="category.enabled"
              @change="handleToggle(category, ($event.target as HTMLInputElement).checked)"
              class="sr-only peer"
              :disabled="!category.canDisable && !category.enabled"
            />
            <div class="w-9 h-5 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
      </div>

      <div v-if="notificationCategories.length === 0 && !isLoading" class="text-center py-8 text-slate-400">
        <Bell :size="32" class="mx-auto mb-2 opacity-50" />
        <p class="text-sm">Tidak ada kategori notifikasi</p>
      </div>

      <div v-if="isLoading" class="text-center py-8 text-slate-400">
        <Loader2 :size="32" class="mx-auto mb-2 animate-spin opacity-50" />
        <p class="text-sm">Memuat preferensi notifikasi...</p>
      </div>
    </div>
  </div>
</template>
