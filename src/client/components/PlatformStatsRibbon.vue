<script setup lang="ts">
import { TrendingUp, Percent, Clock, ShieldCheck } from 'lucide-vue-next';
import { formatRupiah } from '../utils/formatters';

withDefaults(defineProps<{
  volumeLast7Days: number;
  conversionRate: number;
  expiredRate: number;
  compliance?: string;
  standalone?: boolean;
}>(), {
  compliance: 'ASPI / EMVCo / CRC16',
  standalone: true
});
</script>

<template>
  <div 
    class="p-3.5 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3 text-xs"
    :class="standalone ? 'border border-slate-200/80 rounded-lg shadow-xs' : ''"
  >
    <!-- Volume 7 Days -->
    <div class="flex items-center gap-2">
      <div class="w-6 h-6 rounded-md bg-emerald-100/70 border border-emerald-200 flex items-center justify-center shrink-0">
        <TrendingUp :size="13" class="text-emerald-700" />
      </div>
      <div>
        <span class="text-slate-500 font-medium mr-1.5">Volume 7 Hari:</span>
        <span class="font-mono font-bold text-slate-900 tabular-nums">{{ formatRupiah(volumeLast7Days) }}</span>
      </div>
    </div>

    <!-- Conversion Rate -->
    <div class="flex items-center gap-2">
      <div class="w-6 h-6 rounded-md bg-blue-100/70 border border-blue-200 flex items-center justify-center shrink-0">
        <Percent :size="13" class="text-blue-700" />
      </div>
      <div>
        <span class="text-slate-500 font-medium mr-1.5">Conversion:</span>
        <span class="font-mono font-bold text-slate-900 tabular-nums">{{ conversionRate }}%</span>
      </div>
    </div>

    <!-- Expired Rate -->
    <div class="flex items-center gap-2">
      <div class="w-6 h-6 rounded-md bg-amber-100/70 border border-amber-200 flex items-center justify-center shrink-0">
        <Clock :size="13" class="text-amber-700" />
      </div>
      <div>
        <span class="text-slate-500 font-medium mr-1.5">Expired Rate:</span>
        <span class="font-mono font-bold text-slate-900 tabular-nums">{{ expiredRate }}%</span>
      </div>
    </div>

    <!-- Compliance Badge -->
    <div class="flex items-center gap-2">
      <div class="w-6 h-6 rounded-md bg-emerald-100/70 border border-emerald-200 flex items-center justify-center shrink-0">
        <ShieldCheck :size="13" class="text-emerald-700" />
      </div>
      <div>
        <span class="text-slate-500 font-medium mr-1.5">Compliance:</span>
        <span class="font-bold text-slate-900">{{ compliance }}</span>
      </div>
    </div>
  </div>
</template>
