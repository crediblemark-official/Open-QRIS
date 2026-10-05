<script setup lang="ts">
import { ref, watch } from 'vue';
import { X, Settings, Bell, Send, Loader2, CheckCircle2, AlertCircle } from 'lucide-vue-next';
import type { Tenant } from '../../types';

const props = defineProps<{
  app: Tenant | null;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'save', data: {
    name: string;
    webhookUrl: string;
    staticQRIS: string;
    telegramBotToken: string;
    telegramChatId: string;
  }): void;
  (e: 'testTelegram', data: { botToken: string; chatId: string }): void;
}>();

const editForm = ref({
  name: '',
  webhookUrl: '',
  staticQRIS: '',
  telegramBotToken: '',
  telegramChatId: '',
});
const saving = ref(false);
const testingTelegram = ref(false);
const telegramTestSuccess = ref<string | null>(null);
const telegramTestError = ref<string | null>(null);

watch(() => props.app, (app) => {
  if (app) {
    editForm.value = {
      name: app.name || '',
      webhookUrl: app.webhookUrl || '',
      staticQRIS: app.staticQRIS || '',
      telegramBotToken: app.telegramBotToken || '',
      telegramChatId: app.telegramChatId || '',
    };
    telegramTestSuccess.value = null;
    telegramTestError.value = null;
  }
}, { immediate: true });

const handleTestTelegram = () => {
  if (!editForm.value.telegramBotToken || !editForm.value.telegramChatId) {
    telegramTestError.value = 'Isi Bot Token dan Chat ID Telegram terlebih dahulu';
    return;
  }

  testingTelegram.value = true;
  telegramTestSuccess.value = null;
  telegramTestError.value = null;

  emit('testTelegram', {
    botToken: editForm.value.telegramBotToken.trim(),
    chatId: editForm.value.telegramChatId.trim(),
  });
};

const handleSave = () => {
  saving.value = true;
  emit('save', {
    name: editForm.value.name.trim(),
    webhookUrl: editForm.value.webhookUrl.trim(),
    staticQRIS: editForm.value.staticQRIS.trim(),
    telegramBotToken: editForm.value.telegramBotToken.trim(),
    telegramChatId: editForm.value.telegramChatId.trim(),
  });
};

const setTestingTelegram = (value: boolean) => {
  testingTelegram.value = value;
};

const setTelegramTestSuccess = (value: string | null) => {
  telegramTestSuccess.value = value;
};

const setTelegramTestError = (value: string | null) => {
  telegramTestError.value = value;
};

const setSaving = (value: boolean) => {
  saving.value = value;
};

defineExpose({
  setTestingTelegram,
  setTelegramTestSuccess,
  setTelegramTestError,
  setSaving,
});
</script>

<template>
  <div v-if="app" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs" @click.self="emit('close')">
    <div class="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
      <!-- Header -->
      <div class="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
        <div class="flex items-center gap-2">
          <div class="w-7 h-7 rounded-md bg-slate-100 text-slate-600 border border-slate-200 flex items-center justify-center">
            <Settings :size="14" />
          </div>
          <div>
            <h3 class="text-sm font-bold text-slate-900">Pengaturan App</h3>
            <div class="text-[11px] text-slate-500">{{ app.name }}</div>
          </div>
        </div>
        <button @click="emit('close')" class="text-slate-400 hover:text-slate-600 p-1 rounded-md">
          <X :size="16" />
        </button>
      </div>

      <!-- Body -->
      <div class="p-5 space-y-4 overflow-y-auto flex-1">
        <!-- Basic Settings -->
        <div class="space-y-3">
          <h4 class="text-xs font-bold text-slate-700 uppercase tracking-wider">Dasar</h4>

          <div>
            <label class="block text-[11px] font-medium text-slate-700 mb-1">Nama App / Toko</label>
            <input
              v-model="editForm.name"
              type="text"
              class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Nama toko atau aplikasi"
            />
          </div>

          <div>
            <label class="block text-[11px] font-medium text-slate-700 mb-1">Webhook URL</label>
            <input
              v-model="editForm.webhookUrl"
              type="url"
              class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://domain.com/api/webhook"
            />
          </div>

          <div>
            <label class="block text-[11px] font-medium text-slate-700 mb-1">Dedicated QRIS (Opsional)</label>
            <textarea
              v-model="editForm.staticQRIS"
              rows="2"
              class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Kosongkan untuk menggunakan Master QRIS platform"
            ></textarea>
          </div>
        </div>

        <!-- Telegram Settings -->
        <div class="space-y-3 pt-3 border-t border-slate-200">
          <h4 class="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Bell :size="12" />
            Notifikasi Telegram
          </h4>

          <div>
            <label class="block text-[11px] font-medium text-slate-700 mb-1">Bot Token</label>
            <input
              v-model="editForm.telegramBotToken"
              type="text"
              class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
            />
          </div>

          <div>
            <label class="block text-[11px] font-medium text-slate-700 mb-1">Chat ID</label>
            <input
              v-model="editForm.telegramChatId"
              type="text"
              class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="-1001234567890"
            />
          </div>

          <button
            @click="handleTestTelegram"
            :disabled="testingTelegram"
            class="w-full h-8 px-3 rounded-md bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-700 text-xs font-medium flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50"
          >
            <Loader2 v-if="testingTelegram" :size="13" class="animate-spin" />
            <Send v-else :size="13" />
            <span>Test Kirim Pesan</span>
          </button>

          <div v-if="telegramTestSuccess" class="p-2.5 rounded-md bg-emerald-50 border border-emerald-200 flex items-start gap-1.5 text-xs text-emerald-700">
            <CheckCircle2 :size="14" class="mt-0.5 shrink-0" />
            <span>{{ telegramTestSuccess }}</span>
          </div>

          <div v-if="telegramTestError" class="p-2.5 rounded-md bg-rose-50 border border-rose-200 flex items-start gap-1.5 text-xs text-rose-700">
            <AlertCircle :size="14" class="mt-0.5 shrink-0" />
            <span>{{ telegramTestError }}</span>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="p-4 border-t border-slate-200 flex items-center justify-end gap-2 bg-slate-50">
        <button
          @click="emit('close')"
          class="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition cursor-pointer"
        >
          Batal
        </button>
        <button
          @click="handleSave"
          :disabled="saving"
          class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <Loader2 v-if="saving" :size="14" class="animate-spin" />
          Simpan Pengaturan
        </button>
      </div>
    </div>
  </div>
</template>
