<script setup lang="ts">
import { ref } from 'vue';
import { User, Store, Mail, Lock, Globe, Loader2 } from 'lucide-vue-next';

const props = defineProps<{
  name: string;
  storeName: string;
  email: string;
  password: string;
  webhookUrl: string;
  isLoading: boolean;
  error: string;
}>();

const emit = defineEmits<{
  (e: 'update:name', value: string): void;
  (e: 'update:storeName', value: string): void;
  (e: 'update:email', value: string): void;
  (e: 'update:password', value: string): void;
  (e: 'update:webhookUrl', value: string): void;
  (e: 'submit'): void;
  (e: 'switchToSignIn'): void;
}>();

const localName = ref(props.name);
const localStoreName = ref(props.storeName);
const localEmail = ref(props.email);
const localPassword = ref(props.password);
const localWebhookUrl = ref(props.webhookUrl);

const handleSubmit = () => {
  emit('update:name', localName.value);
  emit('update:storeName', localStoreName.value);
  emit('update:email', localEmail.value);
  emit('update:password', localPassword.value);
  emit('update:webhookUrl', localWebhookUrl.value);
  emit('submit');
};
</script>

<template>
  <div class="space-y-3">
    <div class="pb-1 border-b border-slate-100">
      <h2 class="text-xs font-bold text-slate-900">Registrasi Merchant Baru</h2>
      <p class="text-[11px] text-slate-500 mt-0.5">Mulai terima pembayaran QRIS otomatis untuk toko Anda</p>
    </div>

    <form @submit.prevent="handleSubmit" class="space-y-2.5">
      <div>
        <label class="block text-[11px] font-medium text-slate-700 mb-1">Nama Lengkap</label>
        <div class="relative">
          <input
            v-model="localName"
            type="text"
            placeholder="Contoh: Budi Santoso"
            required
            class="w-full h-8.5 px-3 pl-8 bg-slate-50 border border-slate-300 rounded-md text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#d71920] focus:bg-white transition"
          />
          <User :size="13" class="absolute left-2.5 top-2.5 text-slate-400" />
        </div>
      </div>

      <div>
        <label class="block text-[11px] font-medium text-slate-700 mb-1">Nama Bisnis / Toko</label>
        <div class="relative">
          <input
            v-model="localStoreName"
            type="text"
            placeholder="Contoh: Toko Kopi Senja"
            required
            class="w-full h-8.5 px-3 pl-8 bg-slate-50 border border-slate-300 rounded-md text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#d71920] focus:bg-white transition"
          />
          <Store :size="13" class="absolute left-2.5 top-2.5 text-slate-400" />
        </div>
      </div>

      <div>
        <label class="block text-[11px] font-medium text-slate-700 mb-1">Email Bisnis</label>
        <div class="relative">
          <input
            v-model="localEmail"
            type="email"
            placeholder="budi@kopisenja.id"
            required
            class="w-full h-8.5 px-3 pl-8 bg-slate-50 border border-slate-300 rounded-md text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#d71920] focus:bg-white transition"
          />
          <Mail :size="13" class="absolute left-2.5 top-2.5 text-slate-400" />
        </div>
      </div>

      <div>
        <label class="block text-[11px] font-medium text-slate-700 mb-1">Kata Sandi (Min. 6 Karakter)</label>
        <div class="relative">
          <input
            v-model="localPassword"
            type="password"
            placeholder="••••••••"
            required
            minlength="6"
            class="w-full h-8.5 px-3 pl-8 bg-slate-50 border border-slate-300 rounded-md text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#d71920] focus:bg-white transition"
          />
          <Lock :size="13" class="absolute left-2.5 top-2.5 text-slate-400" />
        </div>
      </div>

      <div>
        <label class="block text-[11px] font-medium text-slate-700 mb-1">Webhook Callback URL (Opsional)</label>
        <div class="relative">
          <input
            v-model="localWebhookUrl"
            type="url"
            placeholder="https://tokoanda.com/api/webhook"
            class="w-full h-8.5 px-3 pl-8 bg-slate-50 border border-slate-300 rounded-md text-xs font-mono text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#d71920] focus:bg-white transition"
          />
          <Globe :size="13" class="absolute left-2.5 top-2.5 text-slate-400" />
        </div>
      </div>

      <div v-if="error" class="text-[11px] text-rose-600 flex items-center gap-1">
        <AlertCircle :size="11" />
        <span>{{ error }}</span>
      </div>

      <button
        type="submit"
        :disabled="isLoading"
        class="w-full h-9 mt-2 rounded-md bg-[#d71920] hover:bg-[#b9141a] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50"
      >
        <Loader2 v-if="isLoading" :size="13" class="animate-spin" />
        <span>Daftarkan Akun Toko Sekarang</span>
      </button>
    </form>

    <p class="text-[11px] text-slate-400 text-center pt-2 border-t border-slate-100">
      Sudah punya akun?
      <button @click="emit('switchToSignIn')" class="text-[#d71920] font-semibold hover:underline cursor-pointer">
        Masuk di sini
      </button>
    </p>
  </div>
</template>
