<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { AlertCircle, AlertTriangle, ArrowLeft, Home, LogIn, RefreshCw, ShieldAlert } from 'lucide-vue-next';
import { hexclaveClientApp } from '../lib/hexclave';
import { KnownError, KnownErrors } from '@hexclave/shared';

// Parse query params from URL
const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
const errorCode = searchParams.get('errorCode');
const rawMessage = searchParams.get('message');
const rawDetails = searchParams.get('details');

type ErrorCardType = 
  | 'unknown'
  | 'oauth_already_connected'
  | 'user_already_connected'
  | 'oauth_access_denied'
  | 'known';

const cardType = ref<ErrorCardType>('unknown');
const parsedError = ref<KnownError | null>(null);

const parseError = () => {
  if (!errorCode || !rawMessage) {
    cardType.value = 'unknown';
    return;
  }

  try {
    let detailsObj = {};
    if (rawDetails) {
      try {
        detailsObj = JSON.parse(rawDetails);
      } catch (e) {
        detailsObj = {};
      }
    }

    const err = KnownError.fromJson({
      code: errorCode,
      message: rawMessage,
      details: detailsObj,
    });

    parsedError.value = err;

    if (KnownErrors.OAuthConnectionAlreadyConnectedToAnotherUser.isInstance(err)) {
      cardType.value = 'oauth_already_connected';
    } else if (KnownErrors.UserAlreadyConnectedToAnotherOAuthConnection.isInstance(err)) {
      cardType.value = 'user_already_connected';
    } else if (KnownErrors.OAuthProviderAccessDenied.isInstance(err)) {
      cardType.value = 'oauth_access_denied';
    } else {
      cardType.value = 'known';
    }
  } catch (e) {
    cardType.value = 'unknown';
  }
};

const goHome = async () => {
  try {
    await hexclaveClientApp.redirectToHome();
  } catch {
    window.location.href = '/';
  }
};

const goToSignIn = async () => {
  try {
    await hexclaveClientApp.redirectToSignIn();
  } catch {
    window.location.href = '/login';
  }
};

onMounted(() => {
  parseError();
});
</script>

<template>
  <div class="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 py-12 antialiased selection:bg-red-500 selection:text-white">
    <!-- Brand Header -->
    <div class="mb-6 flex flex-col items-center text-center">
      <div class="w-10 h-10 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-center text-[#d71920] mb-3">
        <ShieldAlert :size="20" />
      </div>
      <h1 class="text-xl font-bold text-slate-900 tracking-tight">OpenQRIS Security & Auth</h1>
      <p class="text-xs text-slate-500 mt-1">Status Penanganan Kesalahan Otentikasi Hexclave</p>
    </div>

    <!-- Error Box (Border-separated, Clean Light Aesthetic) -->
    <div class="w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
      <!-- 1. UNKNOWN ERROR FALLBACK -->
      <div v-if="cardType === 'unknown'" class="p-6 text-center">
        <div class="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center mx-auto mb-4">
          <AlertCircle :size="24" />
        </div>
        <h2 class="text-base font-bold text-slate-900">Terjadi Kesalahan yang Tidak Diketahui</h2>
        <p class="text-xs text-slate-600 mt-2 leading-relaxed">
          Parameter kesalahan tidak lengkap atau tidak valid. Silakan coba kembali atau hubungi administrator jika masalah terus berlanjut.
        </p>

        <div class="mt-6 pt-4 border-t border-slate-100 flex flex-col sm:flex-row gap-2">
          <button 
            @click="goHome"
            class="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <Home :size="14" />
            <span>Kembali ke Beranda</span>
          </button>
          <button 
            @click="goToSignIn"
            class="flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition cursor-pointer"
          >
            <LogIn :size="14" />
            <span>Masuk Kembali</span>
          </button>
        </div>
      </div>

      <!-- 2. OAUTH CONNECTION ALREADY CONNECTED TO ANOTHER USER -->
      <div v-else-if="cardType === 'oauth_already_connected'" class="p-6 text-center">
        <div class="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle :size="24" />
        </div>
        <h2 class="text-base font-bold text-slate-900">Gagal Menghubungkan Akun</h2>
        <p class="text-xs text-slate-600 mt-2 leading-relaxed">
          Akun pihak ketiga (OAuth) ini sudah terhubung dengan pengguna lain di sistem. Anda tidak dapat menautkannya ke dua akun yang berbeda.
        </p>

        <div class="mt-6 pt-4 border-t border-slate-100 flex justify-center">
          <button 
            @click="goHome"
            class="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <Home :size="14" />
            <span>Kembali ke Beranda</span>
          </button>
        </div>
      </div>

      <!-- 3. USER ALREADY CONNECTED TO ANOTHER OAUTH CONNECTION -->
      <div v-else-if="cardType === 'user_already_connected'" class="p-6 text-center">
        <div class="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle :size="24" />
        </div>
        <h2 class="text-base font-bold text-slate-900">Gagal Menghubungkan Akun</h2>
        <p class="text-xs text-slate-600 mt-2 leading-relaxed">
          Akun Anda sudah memiliki tautan ke penyedia OAuth yang bersangkutan.
        </p>

        <div class="mt-6 pt-4 border-t border-slate-100 flex justify-center">
          <button 
            @click="goHome"
            class="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <Home :size="14" />
            <span>Kembali ke Beranda</span>
          </button>
        </div>
      </div>

      <!-- 4. OAUTH PROVIDER ACCESS DENIED -->
      <div v-else-if="cardType === 'oauth_access_denied'" class="p-6 text-center">
        <div class="w-12 h-12 rounded-full bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto mb-4">
          <AlertCircle :size="24" />
        </div>
        <h2 class="text-base font-bold text-slate-900">Akses Penyedia OAuth Ditolak</h2>
        <p class="text-xs text-slate-600 mt-2 leading-relaxed">
          Permintaan otorisasi dibatalkan atau izin akses ditolak oleh penyedia akun eksternal. Silakan ulangi proses masuk jika ini tidak disengaja.
        </p>

        <div class="mt-6 pt-4 border-t border-slate-100 flex flex-col sm:flex-row gap-2">
          <button 
            @click="goToSignIn"
            class="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-[#d71920] text-white hover:bg-red-700 transition cursor-pointer shadow-xs"
          >
            <LogIn :size="14" />
            <span>Masuk Kembali</span>
          </button>
          <button 
            @click="goHome"
            class="flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition cursor-pointer"
          >
            <Home :size="14" />
            <span>Ke Beranda</span>
          </button>
        </div>
      </div>

      <!-- 5. GENERIC KNOWN ERROR CARD -->
      <div v-else class="p-6">
        <div class="flex items-start gap-3">
          <div class="w-9 h-9 rounded-lg bg-red-50 border border-red-200 text-red-600 flex items-center justify-center shrink-0 mt-0.5">
            <AlertCircle :size="18" />
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between gap-2">
              <h2 class="text-sm font-bold text-slate-900">Terjadi Kesalahan Sistem</h2>
              <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                {{ (parsedError as any)?.errorCode || errorCode }}
              </span>
            </div>
            <p class="text-xs text-slate-600 mt-1.5 leading-relaxed">
              {{ parsedError?.humanReadableMessage || rawMessage }}
            </p>
          </div>
        </div>

        <!-- Optional details block if available -->
        <div v-if="(parsedError as any)?.details && Object.keys((parsedError as any).details).length > 0" class="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-lg">
          <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Rincian Teknis</span>
          <pre class="text-[10px] font-mono text-slate-700 overflow-x-auto whitespace-pre-wrap">{{ JSON.stringify((parsedError as any).details, null, 2) }}</pre>
        </div>

        <div class="mt-6 pt-4 border-t border-slate-100 flex flex-col sm:flex-row gap-2">
          <button 
            @click="goToSignIn"
            class="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <LogIn :size="14" />
            <span>Coba Masuk Lagi</span>
          </button>
          <button 
            @click="goHome"
            class="flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition cursor-pointer"
          >
            <Home :size="14" />
            <span>Kembali ke Beranda</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Footer Security Note -->
    <div class="mt-6 text-center text-[11px] text-slate-400 flex items-center gap-1.5">
      <span>OpenQRIS Gateway</span>
      <span>•</span>
      <span>Otentikasi Aman Hexclave v1</span>
    </div>
  </div>
</template>
