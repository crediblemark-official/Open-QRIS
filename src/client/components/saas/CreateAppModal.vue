<script setup lang="ts">
import { ref, watch } from 'vue';

const props = defineProps<{
  show: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'create', data: { name: string; webhook: string; staticQRIS?: string }): void;
}>();

const name = ref('');
const webhook = ref('');
const staticQRIS = ref('');

watch(() => props.show, (newVal) => {
  if (!newVal) {
    name.value = '';
    webhook.value = '';
    staticQRIS.value = '';
  }
});

const handleClose = () => {
  emit('close');
};

const handleSubmit = () => {
  if (!name.value.trim() || !webhook.value.trim()) return;
  emit('create', {
    name: name.value.trim(),
    webhook: webhook.value.trim(),
    staticQRIS: staticQRIS.value.trim() || undefined,
  });
};
</script>

<template>
  <div v-if="show" class="modal-backdrop">
    <div class="modal-box">
      <div class="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
        <h3 class="text-sm font-bold text-slate-900">Tambah SaaS Client Baru</h3>
        <span class="text-[11px] font-mono text-slate-500">API Integration</span>
      </div>

      <div class="form-group">
        <label class="form-label">Nama Aplikasi / Toko</label>
        <input 
          v-model="name" 
          class="form-input" 
          placeholder="Contoh: Toko Kopi Senja" 
          @keyup.enter="handleSubmit"
        />
      </div>

      <div class="form-group">
        <label class="form-label">Webhook Callback URL</label>
        <input 
          v-model="webhook" 
          class="form-input font-mono text-xs" 
          placeholder="https://domainanda.com/api/webhook/qris" 
          @keyup.enter="handleSubmit"
        />
      </div>

      <div class="form-group">
        <label class="form-label">Custom Dedicated QRIS (Opsional)</label>
        <textarea 
          v-model="staticQRIS" 
          class="form-input font-mono text-xs" 
          rows="2" 
          placeholder="Kosongkan untuk memakai Master QRIS default platform"
        ></textarea>
      </div>

      <div class="flex gap-2 justify-end mt-5 pt-3 border-t border-slate-200">
        <button type="button" @click="handleClose" class="btn btn-secondary btn-sm cursor-pointer">Batal</button>
        <button type="button" @click="handleSubmit" class="btn btn-primary btn-sm cursor-pointer">Simpan Client</button>
      </div>
    </div>
  </div>
</template>
