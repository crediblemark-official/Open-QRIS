<script setup lang="ts">
import type { Component } from 'vue';

defineProps<{
  label: string;
  value: string | number;
  subtitle?: string;
  icon?: Component;
  badge?: {
    text: string;
    variant?: 'emerald' | 'amber' | 'rose' | 'slate' | 'blue';
  };
}>();
</script>

<template>
  <div class="p-3.5 sm:p-5 bg-white flex flex-col justify-between min-w-0">
    <div class="min-w-0">
      <div class="flex items-center justify-between gap-1">
        <span class="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 truncate">{{ label }}</span>
        <component v-if="icon" :is="icon" :size="14" class="text-slate-400 shrink-0" />
      </div>
      <div class="text-lg sm:text-2xl font-extrabold font-mono text-slate-900 mt-1.5 sm:mt-2 mb-0.5 tracking-tight truncate">
        {{ value }}
      </div>
    </div>
    <div class="mt-1.5 sm:mt-2 flex items-center justify-between text-[10px] sm:text-[11px] gap-1">
      <span v-if="subtitle" class="text-slate-500 truncate">{{ subtitle }}</span>
      <span 
        v-if="badge" 
        :class="[
          'px-1.5 py-0.5 rounded font-medium border text-[10px]',
          badge.variant === 'emerald' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
          badge.variant === 'amber' ? 'bg-amber-50 text-amber-700 border-amber-200' :
          badge.variant === 'rose' ? 'bg-rose-50 text-rose-700 border-rose-200' :
          badge.variant === 'blue' ? 'bg-blue-50 text-blue-700 border-blue-200' :
          'bg-slate-100 text-slate-700 border-slate-200'
        ]"
      >
        {{ badge.text }}
      </span>
    </div>
  </div>
</template>
