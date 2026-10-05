<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import {
  AlertCircle,
  Loader2,
  CheckCircle2,
  ShieldCheck,
  ArrowLeft,
  LogOut,
  Home,
  UserPlus,
  Store
} from 'lucide-vue-next';
import { hexclaveClientApp } from '../lib/hexclave';
import SignUpForm from '../components/auth/SignUpForm.vue';
import MerchantSetupForm from '../components/auth/MerchantSetupForm.vue';
import SignUpMagicLinkForm from '../components/auth/SignUpMagicLinkForm.vue';
import OAuthButtons from '../components/auth/OAuthButtons.vue';

const emit = defineEmits<{
  (e: 'signUpSuccess', token: string): void;
}>();

// User & Session States
const currentUser = ref<any>(null);
const isAlreadySignedIn = ref(false);
const isRedirecting = ref(false);

// Project Configuration State
const project = ref<any>(null);
const isLoadingProject = ref(true);

// Merchant Store Setup
const showMerchantSetup = ref(false);
const merchantHexclaveToken = ref('');
const merchantSetupForm = ref({
  storeName: '',
  webhookUrl: '',
  name: '',
});
const merchantSetupLoading = ref(false);
const merchantSetupError = ref('');

// Forms & Tab Selection
const activeTab = ref<'credential' | 'magic-link'>('credential');

// Credential Form
const credentialForm = ref({
  email: '',
  password: '',
  passwordRepeat: '',
});
const credentialLoading = ref(false);
const emailError = ref('');
const passwordError = ref('');
const passwordRepeatError = ref('');

// Magic Link Form & OTP State
const magicEmail = ref('');
const magicEmailError = ref('');
const magicLinkLoading = ref(false);
const otpState = ref<{ nonce: string } | null>(null);
const otpCode = ref('');
const otpError = ref('');
const otpLoading = ref(false);

// OAuth & Global States
const oauthLoadingProvider = ref<string | null>(null);
const globalError = ref('');

// Computed Auth Capabilities
const oauthProviders = computed(() => project.value?.config?.oauthProviders || []);
const hasOAuthProviders = computed(() => oauthProviders.value.length > 0);
const hasCredential = computed(() => !!project.value?.config?.credentialEnabled);
const hasMagicLink = computed(() => !!project.value?.config?.magicLinkEnabled);
const signUpEnabled = computed(() => project.value?.config?.signUpEnabled ?? true);

const showSeparator = computed(() =>
  (hasCredential.value || hasMagicLink.value) && hasOAuthProviders.value
);

const hasAnyAuthMethod = computed(() =>
  hasOAuthProviders.value || hasCredential.value || hasMagicLink.value
);

// Password strength & requirement validation
const getPasswordError = (pwd: string): string | null => {
  if (!pwd) return 'Kata sandi wajib diisi';
  if (pwd.length < 8) return 'Kata sandi harus minimal 8 karakter';
  return null;
};

// Tukar raw Hexclave token dengan JWT resmi OpenQRIS Gateway
const exchangeHexclaveToken = async (rawToken: string): Promise<string | null> => {
  try {
    const res = await fetch('/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ access_token: rawToken }),
    });
    const data = await res.json();
    if (res.ok && data.success && data.token) {
      return data.token;
    }
  } catch (err) {}
  return null;
};

/**
 * Alur setelah Hexclave signup/login berhasil:
 * 1. Coba tukar token → jika role admin → langsung masuk dashboard
 * 2. Jika gagal tukar (belum terdaftar di lokal) → tampilkan form profil toko
 */
const handlePostSignup = async () => {
  const rawToken = await hexclaveClientApp.getAccessToken();
  if (!rawToken) {
    globalError.value = 'Tidak bisa mendapatkan token akses. Silakan coba lagi.';
    return;
  }

  const gatewayJwt = await exchangeHexclaveToken(rawToken);
  if (gatewayJwt) {
    localStorage.setItem('qris_admin_token', gatewayJwt);
    emit('signUpSuccess', gatewayJwt);
    return;
  }

  const user = await hexclaveClientApp.getUser();
  merchantHexclaveToken.value = rawToken;
  merchantSetupForm.value.name = (user as any)?.displayName || '';
  merchantSetupForm.value.storeName = '';
  merchantSetupForm.value.webhookUrl = '';
  merchantSetupError.value = '';
  showMerchantSetup.value = true;
};

/** Submit form profil toko → /v1/auth/register → dapat JWT merchant */
const handleMerchantSetupSubmit = async () => {
  merchantSetupError.value = '';
  const storeName = merchantSetupForm.value.storeName.trim();
  if (!storeName) {
    merchantSetupError.value = 'Nama bisnis / toko wajib diisi';
    return;
  }

  merchantSetupLoading.value = true;
  try {
    const res = await fetch('/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        access_token: merchantHexclaveToken.value,
        store_name: storeName,
        name: merchantSetupForm.value.name.trim() || undefined,
        webhook_url: merchantSetupForm.value.webhookUrl.trim() || undefined,
      }),
    });
    const data = await res.json();
    if (res.ok && data.success && data.token) {
      localStorage.setItem('qris_admin_token', data.token);
      emit('signUpSuccess', data.token);
    } else {
      merchantSetupError.value = data.message || 'Gagal mendaftarkan toko. Silakan coba lagi.';
    }
  } catch (err: any) {
    merchantSetupError.value = err?.message || 'Terjadi kesalahan koneksi ke server';
  } finally {
    merchantSetupLoading.value = false;
  }
};

// Inisialisasi
const initSignUp = async () => {
  isLoadingProject.value = true;
  globalError.value = '';

  try {
    const user = await hexclaveClientApp.getUser({ includeRestricted: true });
    if (user) {
      currentUser.value = user;
      isAlreadySignedIn.value = true;

      if (user.isRestricted) {
        isRedirecting.value = true;
        await hexclaveClientApp.redirectToOnboarding({ replace: true });
        return;
      } else {
        isRedirecting.value = true;
        await handlePostSignup();
        return;
      }
    }
  } catch (err) {
    // Belum login
  }

  try {
    const projectData = await hexclaveClientApp.getProject();
    if (projectData) {
      project.value = projectData;
      if (projectData.config?.credentialEnabled) {
        activeTab.value = 'credential';
      } else if (projectData.config?.magicLinkEnabled) {
        activeTab.value = 'magic-link';
      }
    }
  } catch (err) {
    console.warn('Gagal memuat konfigurasi proyek Hexclave, menggunakan fallback default.', err);
    project.value = {
      config: {
        signUpEnabled: true,
        credentialEnabled: true,
        magicLinkEnabled: false,
        oauthProviders: [{ id: 'google' }],
      }
    };
  } finally {
    isLoadingProject.value = false;
  }
};

// Actions
const handleGoHome = async () => {
  await hexclaveClientApp.redirectToHome();
};

const handleSignOut = async () => {
  localStorage.removeItem('qris_admin_token');
  await hexclaveClientApp.redirectToSignOut();
};

const handleSignIn = async () => {
  await hexclaveClientApp.redirectToSignIn();
};

const handleOAuthSignIn = async (providerId: string) => {
  globalError.value = '';
  oauthLoadingProvider.value = providerId;
  try {
    await hexclaveClientApp.signInWithOAuth(providerId);
  } catch (err: any) {
    globalError.value = err?.message || `Gagal memulai registrasi dengan ${providerId}`;
    oauthLoadingProvider.value = null;
  }
};

const handleCredentialSubmit = async () => {
  emailError.value = '';
  passwordError.value = '';
  passwordRepeatError.value = '';
  globalError.value = '';

  const email = credentialForm.value.email.trim();
  const password = credentialForm.value.password;
  const passwordRepeat = credentialForm.value.passwordRepeat;

  if (!email) {
    emailError.value = 'Email wajib diisi';
    return;
  }

  const pwdErr = getPasswordError(password);
  if (pwdErr) {
    passwordError.value = pwdErr;
    return;
  }

  if (password !== passwordRepeat) {
    passwordRepeatError.value = 'Kata sandi dan konfirmasi kata sandi tidak cocok';
    return;
  }

  credentialLoading.value = true;
  try {
    const result = await hexclaveClientApp.signUpWithCredential({
      email,
      password,
    });

    if (result.status === 'error') {
      emailError.value = result.error?.humanReadableMessage || result.error?.message || 'Pendaftaran gagal';
      return;
    }

    await handlePostSignup();
  } catch (err: any) {
    emailError.value = err?.message || 'Terjadi kesalahan saat pendaftaran akun';
  } finally {
    credentialLoading.value = false;
  }
};

const handleMagicLinkSubmit = async () => {
  magicEmailError.value = '';
  globalError.value = '';

  const email = magicEmail.value.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    magicEmailError.value = 'Masukkan format alamat email yang valid';
    return;
  }

  magicLinkLoading.value = true;
  try {
    const result = await hexclaveClientApp.sendMagicLinkEmail(email);
    if (result.status === 'error') {
      magicEmailError.value = result.error?.humanReadableMessage || result.error?.message || 'Gagal mengirim email verifikasi';
      return;
    }

    otpState.value = { nonce: result.data.nonce };
    otpCode.value = '';
    otpError.value = '';
  } catch (err: any) {
    magicEmailError.value = err?.message || 'Terjadi kesalahan saat memproses Magic Link';
  } finally {
    magicLinkLoading.value = false;
  }
};

const handleOtpSubmit = async () => {
  if (!otpState.value) return;
  otpError.value = '';
  globalError.value = '';

  const code = otpCode.value.trim();
  if (code.length < 6) {
    otpError.value = 'Harap masukkan 6 digit kode OTP verifikasi';
    return;
  }

  otpLoading.value = true;
  try {
    const result = await hexclaveClientApp.signInWithMagicLink(code + otpState.value.nonce);
    if (result.status === 'error') {
      otpError.value = result.error?.humanReadableMessage || result.error?.message || 'Kode OTP salah atau telah kadaluarsa';
      return;
    }

    await handlePostSignup();
  } catch (err: any) {
    otpError.value = err?.message || 'Gagal memverifikasi kode OTP';
  } finally {
    otpLoading.value = false;
  }
};

onMounted(() => {
  initSignUp();
});
</script>

<template>
  <div class="min-h-screen w-full flex items-center justify-center bg-slate-50 px-4 py-8 select-none font-sans text-slate-900">
    <div class="w-full max-w-sm">
      <!-- Brand Header -->
      <div class="text-center mb-5">
        <div class="inline-flex w-10 h-10 rounded-lg bg-[#d71920] text-white items-center justify-center mb-2 shadow-sm">
          <ShieldCheck :size="20" />
        </div>
        <h1 class="text-lg font-bold tracking-tight text-slate-900">OpenQRIS Gateway</h1>
        <p class="text-xs text-slate-500 mt-0.5">Buat Akun Merchant atau Administrator</p>
      </div>

      <!-- STATE 1: USER SUDAH LOGIN -->
      <div v-if="isAlreadySignedIn" class="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
        <div class="text-center py-2">
          <div class="inline-flex w-10 h-10 rounded-full bg-emerald-50 border border-emerald-200 items-center justify-center mb-2.5">
            <CheckCircle2 :size="20" class="text-emerald-600" />
          </div>
          <h2 class="text-sm font-bold text-slate-900">Anda Sudah Masuk</h2>
          <p class="text-xs text-slate-500 mt-0.5">
            Terhubung sebagai <span class="text-slate-800 font-semibold">{{ currentUser?.displayName || currentUser?.primaryEmail || 'Pengguna' }}</span>
          </p>

          <div v-if="isRedirecting" class="mt-3 flex items-center justify-center gap-1.5 text-xs text-[#d71920]">
            <Loader2 :size="13" class="animate-spin" />
            <span>Sedang mengarahkan ke halaman tujuan...</span>
          </div>

          <div class="mt-5 flex gap-2">
            <button
              type="button"
              @click="handleGoHome"
              class="flex-1 h-8 px-2.5 rounded-md bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-medium flex items-center justify-center gap-1 transition cursor-pointer"
            >
              <Home :size="13" />
              <span>Beranda</span>
            </button>

            <button
              type="button"
              @click="handleSignOut"
              class="flex-1 h-8 px-2.5 rounded-md bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-medium flex items-center justify-center gap-1 transition cursor-pointer"
            >
              <LogOut :size="13" />
              <span>Keluar</span>
            </button>
          </div>
        </div>
      </div>

      <!-- STATE 1.5: MERCHANT STORE SETUP -->
      <div v-else-if="showMerchantSetup" class="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
        <div class="pb-3 mb-4 border-b border-slate-200">
          <div class="flex items-center gap-2">
            <div class="w-7 h-7 rounded-md bg-amber-100 border border-amber-200 flex items-center justify-center">
              <Store :size="14" class="text-amber-700" />
            </div>
            <div>
              <h2 class="text-sm font-bold text-slate-900">Lengkapi Profil Toko</h2>
              <p class="text-[11px] text-slate-500">Langkah terakhir sebelum mulai menerima pembayaran QRIS</p>
            </div>
          </div>
        </div>

        <MerchantSetupForm
          v-model:name="merchantSetupForm.name"
          v-model:storeName="merchantSetupForm.storeName"
          v-model:webhookUrl="merchantSetupForm.webhookUrl"
          :isLoading="merchantSetupLoading"
          :error="merchantSetupError"
          @submit="handleMerchantSetupSubmit"
        />
      </div>

      <!-- STATE 2: SIGN UP SCREEN -->
      <div v-else class="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
        <div class="pb-3 mb-4 border-b border-slate-200">
          <div class="flex items-center justify-between">
            <h2 class="text-sm font-bold text-slate-900">Buat Akun Baru</h2>
            <span class="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
              <CheckCircle2 :size="11" />
              <span>Hexclave v1</span>
            </span>
          </div>
          <p class="text-xs text-slate-500 mt-1">
            Sudah memiliki akun?
            <a
              href="#"
              @click.prevent="handleSignIn"
              class="text-[#d71920] hover:text-red-800 font-semibold ml-0.5 underline transition"
            >
              Masuk di sini
            </a>
          </p>
        </div>

        <!-- Global Error -->
        <div v-if="globalError" class="mb-3 flex items-center gap-1.5 p-2 rounded bg-rose-50 border border-rose-200 text-rose-700 text-xs">
          <AlertCircle :size="13" class="shrink-0" />
          <span>{{ globalError }}</span>
        </div>

        <!-- Loader -->
        <div v-if="isLoadingProject" class="py-8 flex flex-col items-center justify-center gap-2">
          <Loader2 :size="20" class="animate-spin text-[#d71920]" />
          <span class="text-xs text-slate-500 font-medium">Memuat konfigurasi...</span>
        </div>

        <!-- SIGN UP DISABLED -->
        <div v-else-if="!signUpEnabled" class="py-6 text-center">
          <div class="inline-flex w-9 h-9 rounded-full bg-amber-50 border border-amber-200 items-center justify-center mb-2">
            <AlertCircle :size="18" class="text-amber-600" />
          </div>
          <h3 class="text-xs font-bold text-slate-800">Pendaftaran Dinonaktifkan</h3>
          <p class="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto">
            Pendaftaran akun baru saat ini tidak diizinkan oleh administrator sistem.
          </p>
          <button
            type="button"
            @click="handleSignIn"
            class="mt-4 w-full h-8.5 rounded-md bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 text-xs font-semibold transition cursor-pointer"
          >
            Kembali ke Halaman Masuk
          </button>
        </div>

        <!-- OTP FORM -->
        <SignUpMagicLinkForm
          v-else-if="otpState"
          v-model:email="magicEmail"
          v-model:otpCode="otpCode"
          :emailError="magicEmailError"
          :isLoading="magicLinkLoading"
          :otpState="otpState"
          :otpError="otpError"
          :isOtpLoading="otpLoading"
          @submitOtp="handleOtpSubmit"
          @back="otpState = null"
        />

        <!-- NORMAL SIGN UP FLOW -->
        <div v-else class="space-y-3.5">
          <!-- OAuth -->
          <OAuthButtons
            v-if="hasOAuthProviders"
            :providers="oauthProviders"
            :loadingProvider="oauthLoadingProvider"
            :passkeyEnabled="false"
            :passkeyLoading="false"
            @oauthSignIn="handleOAuthSignIn"
          />

          <!-- Separator -->
          <div v-if="showSeparator" class="relative my-3 flex items-center justify-center">
            <div class="absolute inset-0 flex items-center"><div class="w-full border-t border-slate-200"></div></div>
            <span class="relative bg-white px-2 text-[10px] text-slate-400 uppercase tracking-wider font-semibold">atau daftar dengan</span>
          </div>

          <!-- Tab Selector -->
          <div v-if="hasCredential && hasMagicLink" class="grid grid-cols-2 p-0.5 bg-slate-100 border border-slate-200 rounded-md">
            <button
              type="button"
              @click="activeTab = 'credential'"
              :class="['h-7 text-xs font-semibold rounded transition cursor-pointer', activeTab === 'credential' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800']"
            >
              Email & Sandi
            </button>
            <button
              type="button"
              @click="activeTab = 'magic-link'"
              :class="['h-7 text-xs font-semibold rounded transition cursor-pointer', activeTab === 'magic-link' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800']"
            >
              Magic Link (OTP)
            </button>
          </div>

          <!-- Magic Link Form -->
          <SignUpMagicLinkForm
            v-if="hasMagicLink && activeTab === 'magic-link'"
            v-model:email="magicEmail"
            v-model:otpCode="otpCode"
            :emailError="magicEmailError"
            :isLoading="magicLinkLoading"
            :otpState="otpState"
            :otpError="otpError"
            :isOtpLoading="otpLoading"
            @submitMagicLink="handleMagicLinkSubmit"
            @submitOtp="handleOtpSubmit"
            @back="otpState = null"
          />

          <!-- Credential Form -->
          <SignUpForm
            v-else-if="hasCredential"
            v-model:email="credentialForm.email"
            v-model:password="credentialForm.password"
            v-model:passwordRepeat="credentialForm.passwordRepeat"
            :emailError="emailError"
            :passwordError="passwordError"
            :passwordRepeatError="passwordRepeatError"
            :isLoading="credentialLoading"
            @submit="handleCredentialSubmit"
          />
        </div>
      </div>
    </div>
  </div>
</template>
