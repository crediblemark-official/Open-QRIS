<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { Mail, ArrowLeft, Loader2, CheckCircle2, AlertCircle, KeyRound, ShieldAlert } from 'lucide-vue-next';
import { hexclaveClientApp } from '../lib/hexclave';

const emit = defineEmits<{
  (e: 'backToSignIn'): void;
}>();

const email = ref('');
const emailError = ref('');
const isSubmitting = ref(false);
const isSuccess = ref(false);
const globalError = ref('');
const projectConfig = ref<any>(null);
const isLoadingProject = ref(true);

const hasCredential = computed(() => {
  return projectConfig.value?.config?.credentialEnabled ?? true;
});

const validateEmail = (val: string): boolean => {
  if (!val.trim()) {
    emailError.value = 'Email wajib diisi';
    return false;
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(val.trim())) {
    emailError.value = 'Format email tidak valid';
    return false;
  }
  emailError.value = '';
  return true;
};

const handleSendEmail = async () => {
  if (!validateEmail(email.value)) return;

  isSubmitting.value = true;
  globalError.value = '';

  try {
    const res = await hexclaveClientApp.sendForgotPasswordEmail(email.value.trim());
    if (res && (res as any).status === 'error') {
      globalError.value = (res as any).error?.humanReadableMessage || 'Gagal mengirim email reset kata sandi.';
    } else {
      isSuccess.value = true;
    }
  } catch (err: any) {
    globalError.value = err?.message || 'Terjadi kesalahan sistem saat mengirim instruksi reset kata sandi.';
  } finally {
    isSubmitting.value = false;
  }
};

const goToSignIn = async () => {
  try {
    await hexclaveClientApp.redirectToSignIn();
  } catch {
    window.location.href = '/login';
  }
};

onMounted(async () => {
  try {
    const p = await hexclaveClientApp.getProject();
    projectConfig.value = p;
  } catch (err) {
  } finally {
    isLoadingProject.value = false;
  }
});
</script>

<template>
  <div class="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 py-12 antialiased selection:bg-red-500 selection:text-white">
    <!-- Brand Header -->
    <div class="mb-6 flex flex-col items-center text-center">
      <div class="w-10 h-10 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-center text-[#d71920] mb-3">
        <KeyRound :size="20" />
      </div>
      <h1 class="text-xl font-bold text-slate-900 tracking-tight">Lupa Kata Sandi</h1>
      <p class="text-xs text-slate-500 mt-1">Pemulihan Akun OpenQRIS Gateway</p>
    </div>

    <!-- Main Card -->
    <div class="w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden p-6 sm:p-8">
      <!-- Loading Project Config -->
      <div v-if="isLoadingProject" class="py-10 flex flex-col items-center justify-center gap-2">
        <Loader2 :size="20" class="animate-spin text-[#d71920]" />
        <span class="text-xs text-slate-500 font-medium">Memuat konfigurasi keamanan...</span>
      </div>

      <!-- Credential Sign-In Disabled State -->
      <div v-else-if="!hasCredential" class="text-center py-4">
        <div class="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto mb-3">
          <ShieldAlert :size="24" />
        </div>
        <h2 class="text-sm font-bold text-slate-900">Fitur Kata Sandi Tidak Aktif</h2>
        <p class="text-xs text-slate-600 mt-1.5 leading-relaxed">
          Otentikasi dengan kata sandi saat ini dinonaktifkan pada proyek ini. Silakan gunakan metode masuk lain seperti OAuth atau Magic Link.
        </p>
        <button 
          @click="goToSignIn"
          class="mt-5 w-full flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition cursor-pointer"
        >
          <ArrowLeft :size="14" />
          <span>Kembali ke Halaman Masuk</span>
        </button>
      </div>

      <!-- Success State -->
      <div v-else-if="isSuccess" class="text-center py-4">
        <div class="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto mb-3">
          <CheckCircle2 :size="24" />
        </div>
        <h2 class="text-base font-bold text-slate-900">Periksa Kotak Masuk Anda</h2>
        <p class="text-xs text-slate-600 mt-2 leading-relaxed">
          Tautan untuk mereset kata sandi telah dikirim ke <span class="font-bold text-slate-900">{{ email }}</span> jika alamat tersebut terdaftar.
        </p>

        <div class="mt-6 pt-5 border-t border-slate-100 flex flex-col gap-2">
          <button 
            type="button"
            @click="isSuccess = false"
            class="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg transition cursor-pointer"
          >
            <Mail :size="14" />
            <span>Kirim Ulang ke Email Lain</span>
          </button>
          <button 
            type="button"
            @click="goToSignIn"
            class="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
          >
            <ArrowLeft :size="14" />
            <span>Kembali ke Halaman Masuk</span>
          </button>
        </div>
      </div>

      <!-- Input Email Form -->
      <form v-else @submit.prevent="handleSendEmail">
        <p class="text-xs text-slate-600 mb-5 leading-relaxed">
          Masukkan alamat email yang terdaftar. Kami akan mengirimkan instruksi dan tautan verifikasi untuk membuat kata sandi baru.
        </p>

        <!-- Global Error -->
        <div v-if="globalError" class="mb-4 flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800">
          <AlertCircle :size="15" class="text-rose-600 shrink-0 mt-0.5" />
          <span>{{ globalError }}</span>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1.5">Alamat Email</label>
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Mail :size="15" />
            </div>
            <input 
              v-model="email"
              type="email"
              placeholder="nama@perusahaan.com"
              :disabled="isSubmitting"
              @input="emailError = ''"
              :class="[
                'w-full pl-9 pr-3 py-2 text-xs rounded-lg border bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#d71920] focus:border-transparent transition shadow-xs',
                emailError ? 'border-rose-300' : 'border-slate-300'
              ]"
            />
          </div>
          <span v-if="emailError" class="text-[11px] text-rose-600 mt-1 block">{{ emailError }}</span>
        </div>

        <button 
          type="submit"
          :disabled="isSubmitting"
          class="mt-5 w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg bg-[#d71920] text-white hover:bg-red-700 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
        >
          <Loader2 v-if="isSubmitting" :size="14" class="animate-spin" />
          <span v-else>Kirim Tautan Reset</span>
        </button>

        <div class="mt-5 pt-4 border-t border-slate-100 text-center">
          <button 
            type="button"
            @click="goToSignIn"
            class="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 transition cursor-pointer"
          >
            <ArrowLeft :size="13" />
            <span>Kembali ke Halaman Masuk</span>
          </button>
        </div>
      </form>
    </div>

    <!-- Footnote -->
    <div class="mt-6 text-center text-[11px] text-slate-400">
      OpenQRIS Gateway Auth • Didukung oleh Hexclave v1
    </div>
  </div>
</template>
