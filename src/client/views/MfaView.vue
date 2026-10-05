<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue';
import { ShieldCheck, AlertCircle, Loader2, ArrowLeft, CheckCircle2, KeyRound } from 'lucide-vue-next';
import { hexclaveClientApp } from '../lib/hexclave';
import { KnownErrors } from '@hexclave/shared';

const emit = defineEmits<{
  (e: 'mfaSuccess', token?: string): void;
}>();

// State machine: 'idle' | 'verifying' | 'verified' | 'error'
const state = ref<'idle' | 'verifying' | 'verified' | 'error'>('idle');
const errorMessage = ref<string | null>(null);

// OTP Slots (6 digits)
const otpDigits = ref<string[]>(['', '', '', '', '', '']);
const inputRefs = ref<HTMLInputElement[]>([]);

const otpValue = computed(() => otpDigits.value.join(''));

const attemptCode = ref<string | null>(null);

onMounted(() => {
  if (typeof window !== 'undefined') {
    attemptCode.value = 
      window.sessionStorage.getItem('hexclave_mfa_attempt_code') ?? 
      window.sessionStorage.getItem('stack_mfa_attempt_code');
  }

  // Focus first input
  nextTick(() => {
    if (inputRefs.value[0]) {
      inputRefs.value[0].focus();
    }
  });
});

const handleInput = (index: number, event: Event) => {
  const target = event.target as HTMLInputElement;
  const val = target.value.replace(/[^0-9]/g, '').slice(-1);
  otpDigits.value[index] = val;
  errorMessage.value = null;

  if (val && index < 5) {
    inputRefs.value[index + 1]?.focus();
  }

  if (otpValue.value.length === 6) {
    void submitMfa();
  }
};

const handleKeyDown = (index: number, event: KeyboardEvent) => {
  if (event.key === 'Backspace' && !otpDigits.value[index] && index > 0) {
    inputRefs.value[index - 1]?.focus();
  }
};

const handlePaste = (event: ClipboardEvent) => {
  event.preventDefault();
  const pasteData = event.clipboardData?.getData('text') || '';
  const cleanData = pasteData.replace(/[^0-9]/g, '').slice(0, 6);
  if (!cleanData) return;

  for (let i = 0; i < 6; i++) {
    otpDigits.value[i] = cleanData[i] || '';
  }

  if (cleanData.length === 6) {
    void submitMfa();
  } else {
    inputRefs.value[cleanData.length]?.focus();
  }
};

const submitMfa = async () => {
  if (!attemptCode.value) {
    state.value = 'error';
    errorMessage.value = 'Kode percobaan MFA tidak ditemukan di sesi browser. Silakan mulai masuk kembali.';
    return;
  }

  if (otpValue.value.length !== 6 || state.value === 'verifying' || state.value === 'verified') {
    return;
  }

  state.value = 'verifying';
  errorMessage.value = null;

  try {
    const result = await hexclaveClientApp.signInWithMfa(otpValue.value, attemptCode.value, { noRedirect: true });

    if (result.status === 'ok') {
      if (typeof window !== 'undefined') {
        window.sessionStorage.removeItem('hexclave_mfa_attempt_code');
        window.sessionStorage.removeItem('stack_mfa_attempt_code');
      }

      state.value = 'verified';

      // Also exchange with local gateway if needed
      try {
        const token = await hexclaveClientApp.getAccessToken();
        if (token) {
          const res = await fetch('/v1/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ access_token: token }),
          });
          const data = await res.json();
          if (res.ok && data.success && data.token) {
            localStorage.setItem('qris_admin_token', data.token);
            emit('mfaSuccess', data.token);
          }
        }
      } catch (err) {}

      setTimeout(async () => {
        try {
          await hexclaveClientApp.redirectToAfterSignIn();
        } catch {
          window.location.href = '/dashboard';
        }
      }, 1000);
    } else if (KnownErrors.InvalidTotpCode.isInstance(result.error)) {
      state.value = 'error';
      errorMessage.value = 'Kode TOTP tidak valid. Silakan periksa aplikasi authenticator Anda dan coba lagi.';
      otpDigits.value = ['', '', '', '', '', ''];
      nextTick(() => inputRefs.value[0]?.focus());
    } else {
      state.value = 'error';
      errorMessage.value = (result.error as any)?.humanReadableMessage || 'Verifikasi MFA gagal. Silakan coba kembali.';
      otpDigits.value = ['', '', '', '', '', ''];
      nextTick(() => inputRefs.value[0]?.focus());
    }
  } catch (err: any) {
    state.value = 'error';
    errorMessage.value = err?.message || 'Terjadi kesalahan sistem saat memverifikasi kode autentikasi.';
  }
};

const cancelMfa = async () => {
  if (typeof window !== 'undefined') {
    window.sessionStorage.removeItem('hexclave_mfa_attempt_code');
    window.sessionStorage.removeItem('stack_mfa_attempt_code');
  }
  try {
    await hexclaveClientApp.redirectToSignIn();
  } catch {
    window.location.href = '/login';
  }
};
</script>

<template>
  <div class="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 py-12 antialiased selection:bg-red-500 selection:text-white">
    <!-- Brand Header -->
    <div class="mb-6 flex flex-col items-center text-center">
      <div class="w-10 h-10 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-center text-[#d71920] mb-3">
        <ShieldCheck :size="20" />
      </div>
      <h1 class="text-xl font-bold text-slate-900 tracking-tight">Verifikasi Dua Langkah</h1>
      <p class="text-xs text-slate-500 mt-1">Multi-Factor Authentication (MFA)</p>
    </div>

    <!-- Main Card -->
    <div class="w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden p-6 sm:p-8">
      <!-- Missing Attempt Code Warning -->
      <div v-if="!attemptCode" class="text-center py-4">
        <div class="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto mb-3">
          <AlertCircle :size="24" />
        </div>
        <h2 class="text-sm font-bold text-slate-900">Sesi MFA Tidak Aktif</h2>
        <p class="text-xs text-slate-600 mt-1.5 leading-relaxed">
          Tidak ditemukan kode percobaan MFA di sesi browser. Silakan masuk terlebih dahulu dengan email dan kata sandi Anda.
        </p>
        <button 
          @click="cancelMfa"
          class="mt-5 w-full flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition cursor-pointer"
        >
          <ArrowLeft :size="14" />
          <span>Kembali ke Halaman Masuk</span>
        </button>
      </div>

      <!-- Active MFA Flow -->
      <div v-else>
        <div class="text-center mb-6">
          <h2 class="text-base font-bold text-slate-900">Masukkan Kode Otentikasi</h2>
          <p class="text-xs text-slate-500 mt-1">
            Buka aplikasi authenticator Anda (seperti Google Authenticator atau Authy) dan masukkan 6 digit kode yang ditampilkan.
          </p>
        </div>

        <!-- OTP 6-Digit Group Input -->
        <div class="flex justify-center gap-2 sm:gap-2.5 my-6" @paste="handlePaste">
          <input 
            v-for="(digit, idx) in otpDigits"
            :key="idx"
            :ref="el => { if (el) inputRefs[idx] = el as HTMLInputElement }"
            type="text"
            inputmode="numeric"
            pattern="[0-9]*"
            maxlength="1"
            :value="digit"
            :disabled="state === 'verifying' || state === 'verified'"
            @input="handleInput(idx, $event)"
            @keydown="handleKeyDown(idx, $event)"
            class="w-11 h-13 sm:w-12 sm:h-14 text-center text-xl font-bold font-mono rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#d71920] focus:border-transparent transition disabled:bg-slate-50 disabled:text-slate-400 shadow-xs"
          />
        </div>

        <!-- State Feedback Messages -->
        <div v-if="state === 'verifying'" class="flex items-center justify-center gap-2 p-3 bg-slate-50 rounded-lg text-xs text-slate-700 font-medium">
          <Loader2 :size="15" class="animate-spin text-[#d71920]" />
          <span>Memverifikasi kode autentikasi...</span>
        </div>

        <div v-else-if="state === 'verified'" class="flex items-center justify-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 font-medium">
          <CheckCircle2 :size="15" class="text-emerald-600" />
          <span>Verifikasi berhasil! Mengalihkan ke dashboard...</span>
        </div>

        <div v-else-if="errorMessage" class="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800">
          <AlertCircle :size="15" class="text-rose-600 shrink-0 mt-0.5" />
          <span>{{ errorMessage }}</span>
        </div>

        <!-- Action Buttons -->
        <div class="mt-6 pt-5 border-t border-slate-100 flex flex-col gap-2">
          <button 
            @click="submitMfa"
            :disabled="otpValue.length !== 6 || state === 'verifying' || state === 'verified'"
            class="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg bg-[#d71920] text-white hover:bg-red-700 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
          >
            <Loader2 v-if="state === 'verifying'" :size="14" class="animate-spin" />
            <KeyRound v-else :size="14" />
            <span>Verifikasi & Lanjutkan</span>
          </button>

          <button 
            type="button"
            @click="cancelMfa"
            :disabled="state === 'verifying'"
            class="w-full flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition cursor-pointer"
          >
            <ArrowLeft :size="13" />
            <span>Batalkan dan Kembali Masuk</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Security Footnote -->
    <div class="mt-6 text-center text-[11px] text-slate-400">
      Perlindungan Keamanan Tingkat Lanjut • Hexclave TOTP Engine
    </div>
  </div>
</template>
