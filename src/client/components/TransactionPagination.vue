<script setup lang="ts">
import { computed } from 'vue';
import { ChevronLeft, ChevronRight } from 'lucide-vue-next';

const props = defineProps<{
  currentPage: number;
  totalPages: number;
  filteredCount: number;
  pageSize: number;
}>();

const emit = defineEmits<{
  (e: 'goToPage', page: number): void;
}>();

const goToPage = (page: number) => {
  if (page < 1 || page > props.totalPages) return;
  emit('goToPage', page);
};

const startItem = computed(() => {
  return ((props.currentPage - 1) * props.pageSize) + 1;
});

const endItem = computed(() => {
  return Math.min(props.currentPage * props.pageSize, props.filteredCount);
});
</script>

<template>
  <div class="p-3 bg-slate-50/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
    <div>
      Menampilkan
      <span class="font-bold text-slate-800">{{ startItem }}</span> -
      <span class="font-bold text-slate-800">{{ endItem }}</span> dari
      <span class="font-bold text-slate-800">{{ filteredCount }}</span> order
    </div>

    <div class="flex items-center gap-1.5">
      <button
        @click="goToPage(currentPage - 1)"
        :disabled="currentPage === 1"
        class="p-1.5 rounded border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition bg-white"
        title="Halaman Sebelumnya"
      >
        <ChevronLeft :size="14" />
      </button>

      <span class="px-2 text-xs font-mono font-medium">
        {{ currentPage }} / {{ totalPages }}
      </span>

      <button
        @click="goToPage(currentPage + 1)"
        :disabled="currentPage === totalPages"
        class="p-1.5 rounded border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition bg-white"
        title="Halaman Selanjutnya"
      >
        <ChevronRight :size="14" />
      </button>
    </div>
  </div>
</template>
