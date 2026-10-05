<script setup lang="ts">
import { ref } from 'vue';
import { Store, Loader2, AlertCircle } from 'lucide-vue-next';

const props = defineProps<{
  name: string;
  storeName: string;
  webhookUrl: string;
  isLoading: boolean;
  error: string;
}>();

const emit = defineEmits<{
  (e: 'update:name', value: string): void;
  (e: 'update:storeName', value: string): void;
  (e: 'update:webhookUrl', value: string): void;
  (e: 'submit'): void;
}>();

const localName = ref(props.name);
const localStoreName = ref(props.storeName);
const localWebhookUrl = ref(props.webhookUrl);

const handleSubmit = () => {
  emit('update:name', localName.value);
  emit('update:storeName', localStoreName.value);
  emit('update:webhookUrl', localWebhookUrl.value);
  emit('submit');
};
</script>

<template>
  <div class="space-y-3.5">
    <div class="form-group">
      <label class="form-label">Nama Pemilik</label>
      <input
        v-model="localName"
        type="text"
        class="form-input text-xs"
        placeholder="Nama lengkap Anda"
      />
    </div>

    <div class="form-group">
      <label class="form-label">Nama Bisnis / Toko <span class="text-red-500">*</span></label>
      <input
        v-model="localStoreName"
        type="text"
        class="form-input text-xs"
        placeholder="Contoh: Toko Kopi Senja"
        required
      />
      <p class="text-[10px] text-slate-400 mt-0.5">Nama ini akan tampil di halaman checkout pelanggan Anda</p>
    </div>

    <div class="form-group">
      <label class="form-label">Webhook Callback URL (Opsional)</label>
      <input
        v-model="localWebhookUrl"
        type="url"
        class="form-input font-mono text-xs"
        placeholder="https://domainanda.com/api/webhook/qris"
      />
      <p class="text-[10px] text-slate-400 mt-0.5">URL ini akan menerima notifikasi pembayaran otomatis</p>
    </div>

    <div v-if="error" class="p-2.5 rounded-md bg-red-50 border border-red-200 flex items-start gap-1.5 text-xs text-red-700">
      <AlertCircle :size="14" class="mt-0.5 shrink-0" />
      <span>{{ error }}</span>
    </div>

    <button
      type="submit"
      :disabled="isLoading"
      class="w-full h-9 rounded-md bg-[#d71920] hover:bg-red-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50"
    >
      <Loader2 v-if="isLoading" :size="14" class="animate-spin" />
      <Store v-else :size="14" />
      <span>{{ isLoading ? 'Mendaftarkan Toko...' : 'Daftarkan Toko & Mulai' }}</span>
    </button>
  </div>
</template>
