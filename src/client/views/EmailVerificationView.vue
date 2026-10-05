<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { Mail, CheckCircle2, AlertCircle, Loader2, ArrowRight, Home, RefreshCw, LogOut } from 'lucide-vue-next';
import { hexclaveClientApp } from '../lib/hexclave';

const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
const verificationCode = ref(searchParams.get('code') || '');

// Status: 'verifying' | 'success' | 'error' | 'pending_check'
const status = ref<'verifying' | 'success' | 'error' | 'pending_check'>('verifying');
const errorMessage = ref('');
const currentUser = ref<any>(null);
const isResending = ref(false);
const resendSuccess = ref(false);

const verifyCode = async () => {
  if (!verificationCode.value) {
    status.value = 'pending_check';
    await checkCurrentUserStatus();
    return;
  }

  status.value = 'verifying';
  errorMessage.value = '';

  try {
    const res = await hexclaveClientApp.verifyEmail(verificationCode.value);
    if (res && (res as any).status === 'error') {
      status.value = 'error';
      errorMessage.value = (res as any).error?.humanReadableMessage || 'Kode verifikasi email tidak valid atau telah kedaluwarsa.';
    } else {
      status.value = 'success';
      setTimeout(async () => {
        try {
          await hexclaveClientApp.redirectToHome();
        } catch {
          window.location.href = '/dashboard';
        }
      }, 2500);
    }
  } catch (err: any) {
    status.value = 'error';
    errorMessage.value = err?.message || 'Kode verifikasi tidak valid atau telah kedaluwarsa.';
  }
};

const checkCurrentUserStatus = async () => {
  try {
    const u = await hexclaveClientApp.getUser();
    currentUser.value = u;
    if (u?.primaryEmailVerified) {
      status.value = 'success';
    } else {
      status.value = 'pending_check';
    }
  } catch {
    status.value = 'pending_check';
  }
};

const resendVerification = async () => {
  if (isResending.value) return;
  isResending.value = true;
  resendSuccess.value = false;
  errorMessage.value = '';

  try {
    const u = currentUser.value || (await hexclaveClientApp.getUser());
    if (u) {
      const channels = await u.listContactChannels();
      const primaryEmailChannel = channels.find((c: any) => c.type === 'email' && c.isPrimary) || channels.find((c: any) => c.type === 'email');
      if (primaryEmailChannel) {
        await primaryEmailChannel.sendVerificationEmail();
        resendSuccess.value = true;
      } else {
        await u.sendVerificationEmail();
        resendSuccess.value = true;
      }
    } else {
      errorMessage.value = 'Silakan masuk terlebih dahulu untuk mengirim ulang verifikasi email.';
    }
  } catch (err: any) {
    errorMessage.value = err?.message || 'Gagal mengirim ulang email verifikasi.';
  } finally {
    isResending.value = false;
  }
};

const goHome = async () => {
  try {
    await hexclaveClientApp.redirectToHome();
  } catch {
    window.location.href = '/dashboard';
  }
};

const handleSignOut = async () => {
  try {
    const u = currentUser.value || (await hexclaveClientApp.getUser());
    if (u) await u.signOut();
    localStorage.removeItem('qris_admin_token');
    await hexclaveClientApp.redirectToSignIn();
  } catch {
    window.location.href = '/login';
  }
};

onMounted(() => {
  verifyCode();
});
</script>

<template>
  <div class="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 py-12 antialiased selection:bg-red-500 selection:text-white">
    <!-- Brand Header -->
    <div class="mb-6 flex flex-col items-center text-center">
      <div class="w-10 h-10 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-center text-[#d71920] mb-3">
        <Mail :size="20" />
      </div>
      <h1 class="text-xl font-bold text-slate-900 tracking-tight">Verifikasi Alamat Email</h1>
      <p class="text-xs text-slate-500 mt-1">Konfirmasi Identitas Akun OpenQRIS Gateway</p>
    </div>

    <!-- Main Card -->
    <div class="w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden p-6 sm:p-8">
      <!-- 1. VERIFYING SPINNER STATE -->
      <div v-if="status === 'verifying'" class="py-8 text-center flex flex-col items-center justify-center">
        <Loader2 :size="28" class="animate-spin text-[#d71920] mb-3" />
        <h2 class="text-sm font-bold text-slate-900">Memverifikasi Tautan...</h2>
        <p class="text-xs text-slate-500 mt-1">Mohon tunggu sebentar selagi kami mengonfirmasi kode verifikasi Anda.</p>
      </div>

      <!-- 2. SUCCESS STATE -->
      <div v-else-if="status === 'success'" class="text-center py-4">
        <div class="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto mb-3">
          <CheckCircle2 :size="24" />
        </div>
        <h2 class="text-base font-bold text-slate-900">Email Berhasil Diverifikasi!</h2>
        <p class="text-xs text-slate-600 mt-2 leading-relaxed">
          Terima kasih. Alamat email Anda telah diverifikasi secara resmi. Akun Anda kini aktif dan siap digunakan.
        </p>

        <div class="mt-6 pt-5 border-t border-slate-100">
          <button 
            type="button"
            @click="goHome"
            class="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition cursor-pointer shadow-xs"
          >
            <span>Buka Dashboard Utama</span>
            <ArrowRight :size="14" />
          </button>
        </div>
      </div>

      <!-- 3. ERROR STATE -->
      <div v-else-if="status === 'error'" class="text-center py-4">
        <div class="w-12 h-12 rounded-full bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto mb-3">
          <AlertCircle :size="24" />
        </div>
        <h2 class="text-base font-bold text-slate-900">Verifikasi Gagal</h2>
        <p class="text-xs text-slate-600 mt-2 leading-relaxed">
          {{ errorMessage || 'Tautan verifikasi tidak valid atau telah kedaluwarsa.' }}
        </p>

        <div class="mt-6 pt-5 border-t border-slate-100 flex flex-col gap-2">
          <button 
            type="button"
            @click="resendVerification"
            :disabled="isResending"
            class="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg bg-[#d71920] text-white hover:bg-red-700 transition cursor-pointer disabled:opacity-50 shadow-xs"
          >
            <Loader2 v-if="isResending" :size="14" class="animate-spin" />
            <RefreshCw v-else :size="14" />
            <span>Kirim Ulang Tautan Verifikasi</span>
          </button>

          <button 
            type="button"
            @click="goHome"
            class="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg transition cursor-pointer"
          >
            <Home :size="14" />
            <span>Kembali ke Beranda</span>
          </button>
        </div>

        <p v-if="resendSuccess" class="text-xs text-emerald-600 font-medium mt-3">
          Tautan baru telah dikirimkan ke kotak masuk Anda.
        </p>
      </div>

      <!-- 4. PENDING CHECK (No code, waiting for verification) -->
      <div v-else class="text-center py-4">
        <div class="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto mb-3">
          <Mail :size="24" />
        </div>
        <h2 class="text-base font-bold text-slate-900">Cek Kotak Masuk Anda</h2>
        <p class="text-xs text-slate-600 mt-2 leading-relaxed">
          Silakan buka email Anda 
          <span v-if="currentUser?.primaryEmail" class="font-bold text-slate-900">({{ currentUser.primaryEmail }})</span>
          dan klik tautan verifikasi yang telah kami kirimkan.
        </p>

        <div class="mt-6 pt-5 border-t border-slate-100 flex flex-col gap-2">
          <button 
            type="button"
            @click="resendVerification"
            :disabled="isResending"
            class="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg bg-[#d71920] text-white hover:bg-red-700 transition cursor-pointer disabled:opacity-50 shadow-xs"
          >
            <Loader2 v-if="isResending" :size="14" class="animate-spin" />
            <RefreshCw v-else :size="14" />
            <span>Kirim Ulang Email Verifikasi</span>
          </button>

          <button 
            type="button"
            @click="handleSignOut"
            class="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg transition cursor-pointer"
          >
            <LogOut :size="14" />
            <span>Keluar Akun</span>
          </button>
        </div>

        <p v-if="resendSuccess" class="text-xs text-emerald-600 font-medium mt-3">
          Tautan verifikasi baru berhasil dikirim ke email Anda!
        </p>
      </div>
    </div>

    <!-- Footnote -->
    <div class="mt-6 text-center text-[11px] text-slate-400">
      OpenQRIS Gateway Auth • Didukung oleh Hexclave v1
    </div>
  </div>
</template>
