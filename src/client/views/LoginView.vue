<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import {
  AlertCircle,
  Loader2,
  CheckCircle2,
  ShieldCheck,
  ArrowLeft,
  Lock,
  LogOut,
  Home,
  LayoutDashboard
} from 'lucide-vue-next';
import { hexclaveClientApp } from '../lib/hexclave';
import LoginForm from '../components/auth/LoginForm.vue';
import RegisterForm from '../components/auth/RegisterForm.vue';
import MagicLinkForm from '../components/auth/MagicLinkForm.vue';
import OAuthButtons from '../components/auth/OAuthButtons.vue';

const emit = defineEmits<{
  (e: 'loginSuccess', token: string): void;
}>();

// Auth Mode: 'signin' | 'register'
const authMode = ref<'signin' | 'register'>('signin');

// User & Session States
const currentUser = ref<any>(null);
const isAlreadySignedIn = ref(false);
const isRestrictedUser = ref(false);
const isRedirecting = ref(false);

// Project Configuration State
const project = ref<any>(null);
const isLoadingProject = ref(true);

// Forms & Tab Selection (Login)
const activeTab = ref<'credential' | 'magic-link'>('credential');
const credentialForm = ref({ email: '', password: '' });
const credentialLoading = ref(false);
const emailError = ref('');
const credentialGeneralError = ref('');

// Forms for Merchant Registration
const registerForm = ref({
  name: '',
  storeName: '',
  email: '',
  password: '',
  webhookUrl: '',
});
const registerLoading = ref(false);
const registerError = ref('');

const magicEmail = ref('');
const magicEmailError = ref('');
const magicLinkLoading = ref(false);
const otpState = ref<{ nonce: string } | null>(null);
const otpCode = ref('');
const otpError = ref('');
const otpLoading = ref(false);

const oauthLoadingProvider = ref<string | null>(null);
const passkeyLoading = ref(false);
const globalError = ref('');

// Computed Auth Capabilities from Hexclave Project Config
const oauthProviders = computed(() => project.value?.config?.oauthProviders || []);
const hasOAuthProviders = computed(() => oauthProviders.value.length > 0);
const hasPasskey = computed(() => !!project.value?.config?.passkeyEnabled);
const hasCredential = computed(() => true);
const hasMagicLink = computed(() => !!project.value?.config?.magicLinkEnabled);

const showSeparator = computed(() =>
  (hasCredential.value || hasMagicLink.value) && (hasOAuthProviders.value || hasPasskey.value)
);

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
    globalError.value = data.message || 'Sesi otentikasi tidak dapat divalidasi oleke gateway.';
  } catch (err: any) {
    globalError.value = 'Gagal menghubungi server otentikasi gateway.';
  }
  return null;
};

// Cek token dari URL params (callback OAuth)
const checkUrlTokens = async () => {
  try {
    const url = new URL(window.location.href);
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash || url.search);

    const accessToken = params.get('access_token') || params.get('token');
    if (accessToken) {
      window.history.replaceState({}, document.title, window.location.pathname);
      const gatewayJwt = await exchangeHexclaveToken(accessToken);
      if (gatewayJwt) {
        localStorage.setItem('qris_admin_token', gatewayJwt);
        emit('loginSuccess', gatewayJwt);
      }
    }
  } catch (e) {
    console.error('Failed parsing URL tokens', e);
  }
};

// Inisialisasi: Periksa status user dan konfigurasi proyek Hexclave
const initAuth = async () => {
  isLoadingProject.value = true;
  globalError.value = '';

  try {
    const user = await hexclaveClientApp.getUser({ includeRestricted: true });
    if (user) {
      currentUser.value = user;
      isAlreadySignedIn.value = true;
      isRestrictedUser.value = !!user.isRestricted;

      if (user.isRestricted) {
        isRedirecting.value = true;
        await hexclaveClientApp.redirectToOnboarding({ replace: true });
        return;
      } else {
        const rawToken = await hexclaveClientApp.getAccessToken();
        if (rawToken) {
          const gatewayJwt = await exchangeHexclaveToken(rawToken);
          if (gatewayJwt) {
            localStorage.setItem('qris_admin_token', gatewayJwt);
            emit('loginSuccess', gatewayJwt);
            return;
          }
          window.location.href = '/sign-up';
          return;
        }
      }
    }
  } catch (err) {}

  try {
    const projectData = await hexclaveClientApp.getProject();
    if (projectData) {
      project.value = projectData;
    }
  } catch (err) {
    project.value = {
      config: {
        signUpEnabled: true,
        credentialEnabled: true,
        magicLinkEnabled: false,
        passkeyEnabled: false,
        oauthProviders: [],
      }
    };
  } finally {
    isLoadingProject.value = false;
  }
};

const handleEnterDashboard = async () => {
  const token = await hexclaveClientApp.getAccessToken();
  if (token) {
    const gatewayJwt = await exchangeHexclaveToken(token);
    if (gatewayJwt) {
      localStorage.setItem('qris_admin_token', gatewayJwt);
      emit('loginSuccess', gatewayJwt);
      return;
    }
    window.location.href = '/sign-up';
    return;
  }
  await hexclaveClientApp.redirectToHome();
};

const handleSignOut = async () => {
  localStorage.removeItem('qris_admin_token');
  await hexclaveClientApp.redirectToSignOut();
};

const handleGoHome = async () => {
  await hexclaveClientApp.redirectToHome();
};

const handleForgotPassword = async () => {
  await hexclaveClientApp.redirectToForgotPassword();
};

const handleOAuthSignIn = async (providerId: string) => {
  globalError.value = '';
  oauthLoadingProvider.value = providerId;
  try {
    await hexclaveClientApp.signInWithOAuth(providerId);
  } catch (err: any) {
    globalError.value = err?.message || `Gagal memulai login dengan ${providerId}`;
    oauthLoadingProvider.value = null;
  }
};

const handlePasskeySignIn = async () => {
  globalError.value = '';
  passkeyLoading.value = true;
  try {
    const result = await hexclaveClientApp.signInWithPasskey();
    if (result && result.status === 'error') {
      globalError.value = result.error?.humanReadableMessage || result.error?.message || 'Autentikasi Passkey gagal atau dibatalkan.';
      return;
    }
    const token = await hexclaveClientApp.getAccessToken();
    if (token) {
      const gatewayJwt = await exchangeHexclaveToken(token);
      if (gatewayJwt) {
        localStorage.setItem('qris_admin_token', gatewayJwt);
        emit('loginSuccess', gatewayJwt);
        return;
      }
      window.location.href = '/sign-up';
      return;
    }
  } catch (err: any) {
    globalError.value = err?.message || 'Gagal memulai otentikasi Passkey.';
  } finally {
    passkeyLoading.value = false;
  }
};

// Action: Email & Password Sign In (Merchant Lokal & Hexclave)
const handleCredentialSubmit = async () => {
  emailError.value = '';
  credentialGeneralError.value = '';
  globalError.value = '';

  const email = credentialForm.value.email.trim();
  const password = credentialForm.value.password;

  if (!email) {
    emailError.value = 'Email wajib diisi';
    return;
  }
  if (!password) {
    credentialGeneralError.value = 'Kata sandi wajib diisi';
    return;
  }

  credentialLoading.value = true;
  try {
    // 1. Coba login ke API Gateway OpenQRIS (Akun Merchant & Lokal)
    const localRes = await fetch('/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const localData = await localRes.json();
    if (localRes.ok && localData.success && localData.token) {
      localStorage.setItem('qris_admin_token', localData.token);
      emit('loginSuccess', localData.token);
      return;
    }

    // 2. Jika tidak ada di gateway lokal, coba autentikasi via Hexclave
    const result = await hexclaveClientApp.signInWithCredential({ email, password });
    if (result.status === 'error') {
      emailError.value = localData.message || result.error?.humanReadableMessage || result.error?.message || 'Email atau kata sandi tidak cocok';
      return;
    }

    const token = await hexclaveClientApp.getAccessToken();
    if (token) {
      const gatewayJwt = await exchangeHexclaveToken(token);
      if (gatewayJwt) {
        localStorage.setItem('qris_admin_token', gatewayJwt);
        emit('loginSuccess', gatewayJwt);
        return;
      }
      window.location.href = '/sign-up';
      return;
    }
  } catch (err: any) {
    emailError.value = err?.message || 'Gagal melakukan login kredensial';
  } finally {
    credentialLoading.value = false;
  }
};

// Action: Register Merchant Mandiri (Self-Service)
const handleRegisterSubmit = async () => {
  registerError.value = '';

  const { name, storeName, email, password, webhookUrl } = registerForm.value;

  if (!name.trim()) {
    registerError.value = 'Nama lengkap wajib diisi';
    return;
  }
  if (!storeName.trim()) {
    registerError.value = 'Nama bisnis / toko wajib diisi';
    return;
  }
  if (!email.trim() || !email.includes('@')) {
    registerError.value = 'Format alamat email tidak valid';
    return;
  }
  if (!password || password.length < 6) {
    registerError.value = 'Kata sandi minimal 6 karakter';
    return;
  }

  registerLoading.value = true;
  try {
    const res = await fetch('/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.trim(),
        store_name: storeName.trim(),
        email: email.trim(),
        password,
        webhook_url: webhookUrl.trim() || undefined,
      }),
    });
    const data = await res.json();
    if (res.ok && data.success && data.token) {
      localStorage.setItem('qris_admin_token', data.token);
      emit('loginSuccess', data.token);
      return;
    }
    registerError.value = data.message || 'Pendaftaran akun merchant gagal';
  } catch (err: any) {
    registerError.value = 'Gagal menghubungi server OpenQRIS Gateway';
  } finally {
    registerLoading.value = false;
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
      magicEmailError.value = result.error?.humanReadableMessage || result.error?.message || 'Gagal mengirim email login';
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
    otpError.value = 'Harap masukkan 6 digit kode verifikasi OTP';
    return;
  }

  otpLoading.value = true;
  try {
    const result = await hexclaveClientApp.signInWithMagicLink(code + otpState.value.nonce);
    if (result.status === 'error') {
      otpError.value = result.error?.humanReadableMessage || result.error?.message || 'Kode OTP salah atau telah kadaluarsa';
      return;
    }

    const token = await hexclaveClientApp.getAccessToken();
    if (token) {
      const gatewayJwt = await exchangeHexclaveToken(token);
      if (gatewayJwt) {
        localStorage.setItem('qris_admin_token', gatewayJwt);
        emit('loginSuccess', gatewayJwt);
        return;
      }
      window.location.href = '/sign-up';
      return;
    }
  } catch (err: any) {
    otpError.value = err?.message || 'Gagal memverifikasi kode OTP';
  } finally {
    otpLoading.value = false;
  }
};

onMounted(() => {
  initAuth();
  checkUrlTokens();
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
        <p class="text-xs text-slate-500 mt-0.5">Payment Gateway Mandiri untuk Bisnis & SaaS</p>
      </div>

      <!-- STATE 1: USER SUDAH LOGIN (ALREADY SIGNED IN) -->
      <div v-if="isAlreadySignedIn" class="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
        <div class="text-center py-2">
          <div class="inline-flex w-10 h-10 rounded-full bg-emerald-50 border border-emerald-200 items-center justify-center mb-2.5">
            <CheckCircle2 :size="20" class="text-emerald-600" />
          </div>
          <h2 class="text-sm font-bold text-slate-900">Anda Sudah Masuk</h2>
          <p class="text-xs text-slate-500 mt-0.5">
            Terhubung sebagai <span class="text-slate-800 font-semibold">{{ currentUser?.displayName || currentUser?.primaryEmail || 'Administrator' }}</span>
          </p>

          <div v-if="isRedirecting" class="mt-3 flex items-center justify-center gap-1.5 text-xs text-[#d71920]">
            <Loader2 :size="13" class="animate-spin" />
            <span>Sedang mengarahkan ke dashboard...</span>
          </div>

          <div class="mt-5 space-y-2">
            <button
              type="button"
              @click="handleEnterDashboard"
              class="w-full h-9 px-3 rounded-md bg-[#d71920] hover:bg-[#b9141a] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <LayoutDashboard :size="14" />
              <span>Buka Dashboard Gateway</span>
            </button>

            <div class="flex gap-2">
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
      </div>

      <!-- STATE 2: AUTH PORTAL (MASUK / DAFTAR MERCHANT) -->
      <div v-else class="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
        <!-- MODE SELECTOR: MASUK VS DAFTAR MERCHANT -->
        <div class="grid grid-cols-2 p-0.5 bg-slate-100 border border-slate-200 rounded-md mb-4">
          <button
            type="button"
            @click="authMode = 'signin'"
            :class="['h-8 text-xs font-semibold rounded transition cursor-pointer', authMode === 'signin' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800']"
          >
            Masuk Akun
          </button>
          <button
            type="button"
            @click="authMode = 'register'"
            :class="['h-8 text-xs font-semibold rounded transition cursor-pointer', authMode === 'register' ? 'bg-white text-[#d71920] shadow-xs' : 'text-slate-500 hover:text-slate-800']"
          >
            Daftar Merchant
          </button>
        </div>

        <!-- Global Error Notification -->
        <div v-if="globalError || registerError" class="mb-3 flex items-center gap-1.5 p-2 rounded bg-rose-50 border border-rose-200 text-rose-700 text-xs">
          <AlertCircle :size="13" class="shrink-0" />
          <span>{{ globalError || registerError }}</span>
        </div>

        <!-- Loader saat mengambil konfigurasi -->
        <div v-if="isLoadingProject" class="py-8 flex flex-col items-center justify-center gap-2">
          <Loader2 :size="20" class="animate-spin text-[#d71920]" />
          <span class="text-xs text-slate-500 font-medium">Memuat sistem gateway...</span>
        </div>

        <!-- SUB-FLOW 1: FORM PENDAFTARAN MERCHANT MANDIRI -->
        <RegisterForm
          v-else-if="authMode === 'register'"
          v-model:name="registerForm.name"
          v-model:storeName="registerForm.storeName"
          v-model:email="registerForm.email"
          v-model:password="registerForm.password"
          v-model:webhookUrl="registerForm.webhookUrl"
          :isLoading="registerLoading"
          :error="registerError"
          @submit="handleRegisterSubmit"
          @switchToSignIn="authMode = 'signin'"
        />

        <!-- SUB-FLOW 2: LOGIN AKUN -->
        <div v-else>
          <!-- OAuth & Passkey Buttons -->
          <OAuthButtons
            v-if="hasOAuthProviders || hasPasskey"
            :providers="oauthProviders"
            :loadingProvider="oauthLoadingProvider"
            :passkeyEnabled="hasPasskey"
            :passkeyLoading="passkeyLoading"
            @oauthSignIn="handleOAuthSignIn"
            @passkeySignIn="handlePasskeySignIn"
          />

          <!-- Separator -->
          <div v-if="showSeparator" class="flex items-center gap-3 my-4">
            <div class="flex-1 h-px bg-slate-200"></div>
            <span class="text-[10px] text-slate-400 uppercase">atau</span>
            <div class="flex-1 h-px bg-slate-200"></div>
          </div>

          <!-- Tab Selector -->
          <div v-if="hasCredential && hasMagicLink" class="flex gap-2 mb-4">
            <button
              @click="activeTab = 'credential'"
              :class="['flex-1 h-8 text-xs font-semibold rounded transition cursor-pointer', activeTab === 'credential' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200']"
            >
              Email & Password
            </button>
            <button
              @click="activeTab = 'magic-link'"
              :class="['flex-1 h-8 text-xs font-semibold rounded transition cursor-pointer', activeTab === 'magic-link' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200']"
            >
              Magic Link
            </button>
          </div>

          <!-- Magic Link Form -->
          <MagicLinkForm
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

          <!-- Credential Login Form -->
          <LoginForm
            v-else
            v-model:email="credentialForm.email"
            v-model:password="credentialForm.password"
            :emailError="emailError"
            :generalError="credentialGeneralError"
            :isLoading="credentialLoading"
            @submit="handleCredentialSubmit"
          />

          <!-- Forgot Password -->
          <div class="mt-3 text-center">
            <button
              @click="handleForgotPassword"
              class="text-[11px] text-slate-500 hover:text-[#d71920] hover:underline cursor-pointer"
            >
              Lupa kata sandi?
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
