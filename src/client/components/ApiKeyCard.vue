<script setup lang="ts">
import { ref } from 'vue';
import { Key, Copy, Check, Eye, EyeOff, ArrowUpRight } from 'lucide-vue-next';
import { useClipboard } from '../composables/useClipboard';

const props = withDefaults(
  defineProps<{
    tenant: any;
    title?: string;
    manageLabel?: string;
    showManageButton?: boolean;
  }>(),
  {
    title: 'API Key Toko',
    manageLabel: 'Kelola',
    showManageButton: true,
  }
);

const emit = defineEmits<{
  (e: 'manage'): void;
  (e: 'toast', msg: string): void;
}>();

const { copiedId, copy } = useClipboard();
const revealKey = ref(false);

const handleCopy = async (text: string, id: string) => {
  const ok = await copy(text, id);
  if (ok) emit('toast', 'Berhasil disalin ke clipboard!');
};
</script>

<template>
  <div v-if="tenant" class="p-4 sm:p-5 bg-white flex flex-col justify-between h-full min-w-0">
    <div class="flex items-center justify-between mb-3 pb-3 border-b border-slate-100">
      <div class="flex items-center gap-1.5">
        <Key :size="14" class="text-slate-500" />
        <span class="text-xs font-bold text-slate-800">{{ title }}</span>
      </div>
      <button 
        v-if="showManageButton"
        @click="emit('manage')" 
        class="text-[10px] text-red-600 hover:underline flex items-center gap-0.5 cursor-pointer font-medium"
      >
        <span>{{ manageLabel }}</span>
        <ArrowUpRight :size="11" />
      </button>
    </div>

    <div class="space-y-2.5">
      <!-- Public Key / App ID -->
      <div>
        <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
          Public Key (App ID)
        </div>
        <div class="flex items-center gap-1.5">
          <code class="flex-1 text-[11px] font-mono bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-slate-700 truncate">
            {{ tenant.publicKey || tenant.id }}
          </code>
          <button 
            @click="handleCopy(tenant.publicKey || tenant.id, 'pub')" 
            class="shrink-0 p-1.5 rounded border border-slate-200 hover:bg-slate-100 cursor-pointer"
            title="Salin Public Key"
          >
            <component 
              :is="copiedId === 'pub' ? Check : Copy" 
              :size="13" 
              :class="copiedId === 'pub' ? 'text-emerald-600' : 'text-slate-500'" 
            />
          </button>
        </div>
      </div>

      <!-- Secret Key with Reveal Toggle -->
      <div>
        <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
          Secret Key
        </div>
        <div class="flex items-center gap-1.5">
          <code class="flex-1 text-[11px] font-mono bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-slate-700 truncate">
            {{ revealKey ? tenant.secretKey : '•'.repeat(Math.min(tenant.secretKey?.length || 32, 40)) }}
          </code>
          <button 
            @click="revealKey = !revealKey" 
            class="shrink-0 p-1.5 rounded border border-slate-200 hover:bg-slate-100 cursor-pointer"
            :title="revealKey ? 'Sembunyikan Secret Key' : 'Tampilkan Secret Key'"
          >
            <component :is="revealKey ? EyeOff : Eye" :size="13" class="text-slate-500" />
          </button>
          <button 
            @click="handleCopy(tenant.secretKey, 'sec')" 
            class="shrink-0 p-1.5 rounded border border-slate-200 hover:bg-slate-100 cursor-pointer"
            title="Salin Secret Key"
          >
            <component 
              :is="copiedId === 'sec' ? Check : Copy" 
              :size="13" 
              :class="copiedId === 'sec' ? 'text-emerald-600' : 'text-slate-500'" 
            />
          </button>
        </div>
      </div>

      <!-- Webhook URL -->
      <div>
        <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
          Webhook URL Anda
        </div>
        <div class="flex items-center gap-1.5">
          <code class="flex-1 text-[11px] font-mono bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-slate-700 truncate">
            {{ tenant.webhookUrl || 'Belum dikonfigurasi' }}
          </code>
          <button 
            v-if="tenant.webhookUrl" 
            @click="handleCopy(tenant.webhookUrl, 'wh')" 
            class="shrink-0 p-1.5 rounded border border-slate-200 hover:bg-slate-100 cursor-pointer"
            title="Salin Webhook URL"
          >
            <component 
              :is="copiedId === 'wh' ? Check : Copy" 
              :size="13" 
              :class="copiedId === 'wh' ? 'text-emerald-600' : 'text-slate-500'" 
            />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
