<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { Lock, Eye, EyeOff, ArrowLeft, Loader2, CheckCircle2, AlertCircle, KeyRound, AlertTriangle } from 'lucide-vue-next';
import { hexclaveClientApp } from '../lib/hexclave';

const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
const resetCode = ref(searchParams.get('code') || '');

const password = ref('');
const passwordRepeat = ref('');
const showPassword = ref(false);
const showPasswordRepeat = ref(false);

const passwordError = ref('');
const passwordRepeatError = ref('');
const globalError = ref('');
const isSubmitting = ref(false);
const isSuccess = ref(false);

const getPasswordError = (pwd: string): string | null => {
  if (!pwd) return 'Kata sandi baru wajib diisi';
  if (pwd.length < 8) return 'Kata sandi minimal 8 karakter';
  return null;
};

const handleResetPassword = async () => {
  passwordError.value = '';
  passwordRepeatError.value = '';
  globalError.value = '';

  const err = getPasswordError(password.value);
  if (err) {
    passwordError.value = err;
    return;
  }

  if (password.value !== passwordRepeat.value) {
    passwordRepeatError.value = 'Konfirmasi kata sandi tidak cocok';
    return;
  }

  if (!resetCode.value) {
    globalError.value = 'Kode reset kata sandi tidak ditemukan atau sudah kedaluwarsa.';
    return;
  }

  isSubmitting.value = true;

  try {
    const res = await hexclaveClientApp.resetPassword({
      code: resetCode.value,
      password: password.value,
    });

    if (res && (res as any).status === 'error') {
      globalError.value = (res as any).error?.humanReadableMessage || 'Gagal mengatur ulang kata sandi.';
    } else {
      isSuccess.value = true;
      setTimeout(async () => {
        try {
          await hexclaveClientApp.redirectToSignIn();
        } catch {
          window.location.href = '/login';
        }
      }, 2500);
    }
  } catch (err: any) {
    globalError.value = err?.message || 'Kode reset tidak valid atau telah kedaluwarsa. Silakan minta tautan baru.';
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

const goToForgotPassword = async () => {
  try {
    await hexclaveClientApp.redirectToForgotPassword();
  } catch {
    window.location.href = '/forgot-password';
  }
};
</script>

<template>
  <div class="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 py-12 antialiased selection:bg-red-500 selection:text-white">
    <!-- Brand Header -->
    <div class="mb-6 flex flex-col items-center text-center">
      <div class="w-10 h-10 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-center text-[#d71920] mb-3">
        <Lock :size="20" />
      </div>
      <h1 class="text-xl font-bold text-slate-900 tracking-tight">Atur Ulang Kata Sandi</h1>
      <p class="text-xs text-slate-500 mt-1">Buat Kata Sandi Baru untuk Akun OpenQRIS Anda</p>
    </div>

    <!-- Main Card -->
    <div class="w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden p-6 sm:p-8">
      <!-- Missing Code State -->
      <div v-if="!resetCode" class="text-center py-4">
        <div class="w-12 h-12 rounded-full bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto mb-3">
          <AlertTriangle :size="24" />
        </div>
        <h2 class="text-base font-bold text-slate-900">Tautan Tidak Valid</h2>
        <p class="text-xs text-slate-600 mt-2 leading-relaxed">
          Tautan pemulihan kata sandi tidak menyertakan kode verifikasi yang valid. Silakan ajukan permintaan lupa kata sandi baru.
        </p>

        <div class="mt-6 pt-5 border-t border-slate-100 flex flex-col gap-2">
          <button 
            type="button"
            @click="goToForgotPassword"
            class="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg bg-[#d71920] text-white hover:bg-red-700 transition cursor-pointer shadow-xs"
          >
            <KeyRound :size="14" />
            <span>Minta Tautan Reset Baru</span>
          </button>
          <button 
            type="button"
            @click="goToSignIn"
            class="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg transition cursor-pointer"
          >
            <ArrowLeft :size="14" />
            <span>Kembali ke Halaman Masuk</span>
          </button>
        </div>
      </div>

      <!-- Success State -->
      <div v-else-if="isSuccess" class="text-center py-4">
        <div class="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto mb-3">
          <CheckCircle2 :size="24" />
        </div>
        <h2 class="text-base font-bold text-slate-900">Kata Sandi Berhasil Diperbarui</h2>
        <p class="text-xs text-slate-600 mt-2 leading-relaxed">
          Kata sandi baru Anda telah aktif. Anda akan dialihkan ke halaman masuk secara otomatis dalam beberapa detik.
        </p>

        <div class="mt-6 pt-5 border-t border-slate-100">
          <button 
            type="button"
            @click="goToSignIn"
            class="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition cursor-pointer shadow-xs"
          >
            <ArrowLeft :size="14" />
            <span>Masuk Sekarang</span>
          </button>
        </div>
      </div>

      <!-- Reset Password Form -->
      <form v-else @submit.prevent="handleResetPassword" class="space-y-4">
        <!-- Global Error -->
        <div v-if="globalError" class="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800">
          <AlertCircle :size="15" class="text-rose-600 shrink-0 mt-0.5" />
          <span>{{ globalError }}</span>
        </div>

        <!-- New Password Input -->
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">Kata Sandi Baru</label>
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Lock :size="15" />
            </div>
            <input 
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              placeholder="Minimal 8 karakter"
              :disabled="isSubmitting"
              @input="passwordError = ''"
              :class="[
                'w-full pl-9 pr-9 py-2 text-xs rounded-lg border bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#d71920] focus:border-transparent transition shadow-xs',
                passwordError ? 'border-rose-300' : 'border-slate-300'
              ]"
            />
            <button 
              type="button"
              @click="showPassword = !showPassword"
              class="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
            >
              <EyeOff v-if="showPassword" :size="14" />
              <Eye v-else :size="14" />
            </button>
          </div>
          <span v-if="passwordError" class="text-[11px] text-rose-600 mt-1 block">{{ passwordError }}</span>
        </div>

        <!-- Confirm Password Input -->
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">Ulangi Kata Sandi Baru</label>
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Lock :size="15" />
            </div>
            <input 
              v-model="passwordRepeat"
              :type="showPasswordRepeat ? 'text' : 'password'"
              placeholder="Ulangi kata sandi yang sama"
              :disabled="isSubmitting"
              @input="passwordRepeatError = ''"
              :class="[
                'w-full pl-9 pr-9 py-2 text-xs rounded-lg border bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#d71920] focus:border-transparent transition shadow-xs',
                passwordRepeatError ? 'border-rose-300' : 'border-slate-300'
              ]"
            />
            <button 
              type="button"
              @click="showPasswordRepeat = !showPasswordRepeat"
              class="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
            >
              <EyeOff v-if="showPasswordRepeat" :size="14" />
              <Eye v-else :size="14" />
            </button>
          </div>
          <span v-if="passwordRepeatError" class="text-[11px] text-rose-600 mt-1 block">{{ passwordRepeatError }}</span>
        </div>

        <button 
          type="submit"
          :disabled="isSubmitting"
          class="mt-2 w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg bg-[#d71920] text-white hover:bg-red-700 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
        >
          <Loader2 v-if="isSubmitting" :size="14" class="animate-spin" />
          <span v-else>Simpan Kata Sandi Baru</span>
        </button>

        <div class="pt-3 border-t border-slate-100 text-center">
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
