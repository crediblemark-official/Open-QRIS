<script setup lang="ts">
import { 
  QrCode, 
  ArrowUpRight, 
  CheckCircle2, 
  AlertCircle, 
  Smartphone 
} from 'lucide-vue-next';

defineProps<{
  tenant: any;
}>();

const emit = defineEmits<{
  (e: 'navigate', tab: string): void;
}>();
</script>

<template>
  <div class="p-4 sm:p-5 bg-white flex flex-col justify-between h-full min-w-0">
    <div class="flex items-center justify-between mb-3 pb-3 border-b border-slate-100">
      <div class="flex items-center gap-1.5">
        <QrCode :size="14" class="text-slate-500" />
        <span class="text-xs font-bold text-slate-800">Status QRIS Toko</span>
      </div>
      <button 
        @click="emit('navigate', 'qris')" 
        class="text-[10px] text-red-600 hover:text-red-700 hover:underline flex items-center gap-0.5 cursor-pointer font-medium"
      >
        <span>Kelola QRIS</span>
        <ArrowUpRight :size="11" />
      </button>
    </div>

    <!-- ACTIVE QRIS STATE -->
    <div v-if="tenant?.staticQRIS" class="space-y-3">
      <div class="flex items-center gap-2.5 p-2.5 bg-emerald-50 border border-emerald-200 rounded-md">
        <CheckCircle2 :size="16" class="text-emerald-600 shrink-0" />
        <div>
          <div class="text-xs font-bold text-emerald-800">QRIS Toko Aktif</div>
          <div class="text-[10px] text-emerald-700 mt-0.5">Pembayaran pelanggan masuk langsung ke rekening Anda</div>
        </div>
      </div>
      <div class="text-[10px] font-mono text-slate-500 bg-slate-50 border border-slate-200 rounded p-2 truncate">
        {{ tenant.staticQRIS.slice(0, 60) }}...
      </div>
    </div>

    <!-- EMPTY QRIS STATE -->
    <div v-else class="space-y-3">
      <div class="flex items-center gap-2.5 p-2.5 bg-amber-50 border border-amber-200 rounded-md">
        <AlertCircle :size="16" class="text-amber-600 shrink-0" />
        <div>
          <div class="text-xs font-bold text-amber-800">Belum Ada QRIS Toko</div>
          <div class="text-[10px] text-amber-700 mt-0.5">Saat ini menggunakan Master QRIS platform default</div>
        </div>
      </div>
      <button 
        @click="emit('navigate', 'qris')" 
        class="btn btn-primary btn-sm w-full justify-center cursor-pointer shadow-xs"
      >
        <QrCode :size="13" />
        <span>Upload QRIS Toko Saya</span>
      </button>
    </div>

    <!-- NOTIFIKASI HP SHORTCUT -->
    <div class="mt-3 pt-3 border-t border-slate-200/80">
      <div class="flex items-center gap-1.5 mb-1.5">
        <Smartphone :size="12" class="text-slate-400" />
        <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Listener Notif HP</span>
      </div>
      <button 
        @click="emit('navigate', 'listener')" 
        class="btn btn-secondary btn-sm w-full justify-center cursor-pointer"
      >
        <span>Atur Notifikasi HP</span>
        <ArrowUpRight :size="11" />
      </button>
    </div>
  </div>
</template>
