<script setup lang="ts">
import { ref } from 'vue';
import { ShieldCheck, Key, Fingerprint, QrCode, Loader2, Copy, Check, AlertCircle, Mail } from 'lucide-vue-next';
import QRCode from 'qrcode';
import { generateRandomSecret, uint8ArrayToBase32, verifyTOTP } from '../../utils/totp';

const props = defineProps<{
  currentUser: any;
}>();

const emit = defineEmits<{
  (e: 'updatePassword', data: { oldPassword?: string; newPassword: string }): void;
  (e: 'registerPasskey'): void;
  (e: 'disablePasskey'): void;
  (e: 'toggleOtp', enable: boolean): void;
  (e: 'setupMfa'): void;
  (e: 'confirmMfa', code: string): void;
  (e: 'disableMfa'): void;
  (e: 'toast', msg: string): void;
}>();

// Password
const oldPassword = ref('');
const newPassword = ref('');
const newPasswordRepeat = ref('');
const passwordError = ref('');
const isSavingPassword = ref(false);

// Passkey
const isPasskeyWorking = ref(false);

// OTP
const isOtpWorking = ref(false);

// MFA
const generatedSecret = ref<Uint8Array | null>(null);
const qrCodeDataUrl = ref<string | null>(null);
const mfaVerificationCode = ref('');
const mfaError = ref('');
const isMfaWorking = ref(false);

const getPasswordError = (pwd: string): string | null => {
  if (!pwd) return 'Kata sandi wajib diisi';
  if (pwd.length < 8) return 'Kata sandi minimal 8 karakter';
  return null;
};

const handleSavePassword = async () => {
  passwordError.value = '';
  const err = getPasswordError(newPassword.value);
  if (err) {
    passwordError.value = err;
    return;
  }
  if (newPassword.value !== newPasswordRepeat.value) {
    passwordError.value = 'Pengulangan kata sandi tidak cocok';
    return;
  }
  isSavingPassword.value = true;
  try {
    emit('updatePassword', {
      oldPassword: props.currentUser.hasPassword ? oldPassword.value : undefined,
      newPassword: newPassword.value,
    });
    oldPassword.value = '';
    newPassword.value = '';
    newPasswordRepeat.value = '';
  } finally {
    isSavingPassword.value = false;
  }
};

const handleRegisterPasskey = async () => {
  isPasskeyWorking.value = true;
  try {
    emit('registerPasskey');
  } finally {
    isPasskeyWorking.value = false;
  }
};

const handleDisablePasskey = async () => {
  isPasskeyWorking.value = true;
  try {
    emit('disablePasskey');
  } finally {
    isPasskeyWorking.value = false;
  }
};

const handleToggleOtp = async (enable: boolean) => {
  isOtpWorking.value = true;
  try {
    emit('toggleOtp', enable);
  } finally {
    isOtpWorking.value = false;
  }
};

const handleStartMfaSetup = async () => {
  const secret = generateRandomSecret(20);
  generatedSecret.value = secret;
  mfaVerificationCode.value = '';
  mfaError.value = '';

  const base32Secret = uint8ArrayToBase32(secret);
  const emailVal = props.currentUser?.primaryEmail || 'user';
  const otpAuthUrl = `otpauth://totp/OpenQRIS:${encodeURIComponent(emailVal)}?secret=${base32Secret}&issuer=OpenQRIS`;

  try {
    qrCodeDataUrl.value = await QRCode.toDataURL(otpAuthUrl, { margin: 1, width: 180 });
  } catch {
    qrCodeDataUrl.value = null;
  }
};

const handleConfirmMfaSetup = async () => {
  if (!generatedSecret.value || !mfaVerificationCode.value) return;
  isMfaWorking.value = true;
  mfaError.value = '';
  try {
    emit('confirmMfa', mfaVerificationCode.value);
    generatedSecret.value = null;
    qrCodeDataUrl.value = null;
    mfaVerificationCode.value = '';
  } finally {
    isMfaWorking.value = false;
  }
};

const handleDisableMfa = async () => {
  isMfaWorking.value = true;
  try {
    emit('disableMfa');
  } finally {
    isMfaWorking.value = false;
  }
};
</script>

<template>
  <div class="space-y-8">
    <!-- Password -->
    <div class="space-y-4">
      <h3 class="text-sm font-bold text-slate-900 flex items-center gap-2">
        <Key :size="16" class="text-slate-400" />
        Password
      </h3>

      <div v-if="currentUser?.hasPassword" class="space-y-3">
        <div>
          <label class="block text-xs font-medium text-slate-700 mb-1">Current Password</label>
          <input
            v-model="oldPassword"
            type="password"
            class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Masukkan password saat ini"
          />
        </div>
      </div>

      <div class="space-y-3">
        <div>
          <label class="block text-xs font-medium text-slate-700 mb-1">New Password</label>
          <input
            v-model="newPassword"
            type="password"
            class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Minimal 8 karakter"
          />
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-700 mb-1">Repeat New Password</label>
          <input
            v-model="newPasswordRepeat"
            type="password"
            class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Ulangi password baru"
          />
        </div>
      </div>

      <div v-if="passwordError" class="text-xs text-rose-600 flex items-center gap-1">
        <AlertCircle :size="12" />
        {{ passwordError }}
      </div>

      <button
        @click="handleSavePassword"
        :disabled="isSavingPassword"
        class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
      >
        <Loader2 v-if="isSavingPassword" :size="14" class="animate-spin" />
        {{ currentUser?.hasPassword ? 'Update Password' : 'Set Password' }}
      </button>
    </div>

    <!-- Passkey -->
    <div class="space-y-4">
      <h3 class="text-sm font-bold text-slate-900 flex items-center gap-2">
        <Fingerprint :size="16" class="text-slate-400" />
        Passkey
      </h3>

      <p class="text-xs text-slate-500">
        Passkey memungkinkan Anda masuk tanpa password menggunakan biometrik atau keamanan perangkat.
      </p>

      <div class="flex items-center gap-3">
        <button
          v-if="!currentUser?.passkeyAuthEnabled"
          @click="handleRegisterPasskey"
          :disabled="isPasskeyWorking"
          class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <Loader2 v-if="isPasskeyWorking" :size="14" class="animate-spin" />
          Register Passkey
        </button>
        <button
          v-else
          @click="handleDisablePasskey"
          :disabled="isPasskeyWorking"
          class="px-4 py-2 bg-rose-600 text-white text-sm font-medium rounded-lg hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <Loader2 v-if="isPasskeyWorking" :size="14" class="animate-spin" />
          Disable Passkey
        </button>

        <span
          v-if="currentUser?.passkeyAuthEnabled"
          class="text-xs text-emerald-600 flex items-center gap-1"
        >
          <Check :size="12" />
          Passkey aktif
        </span>
      </div>
    </div>

    <!-- OTP Magic Link -->
    <div class="space-y-4">
      <h3 class="text-sm font-bold text-slate-900 flex items-center gap-2">
        <Mail :size="16" class="text-slate-400" />
        OTP Magic Link
      </h3>

      <p class="text-xs text-slate-500">
        Masuk menggunakan link magic yang dikirim ke email Anda.
      </p>

      <div class="flex items-center gap-3">
        <button
          v-if="!currentUser?.otpAuthEnabled"
          @click="handleToggleOtp(true)"
          :disabled="isOtpWorking"
          class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <Loader2 v-if="isOtpWorking" :size="14" class="animate-spin" />
          Enable OTP
        </button>
        <button
          v-else
          @click="handleToggleOtp(false)"
          :disabled="isOtpWorking"
          class="px-4 py-2 bg-rose-600 text-white text-sm font-medium rounded-lg hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <Loader2 v-if="isOtpWorking" :size="14" class="animate-spin" />
          Disable OTP
        </button>

        <span
          v-if="currentUser?.otpAuthEnabled"
          class="text-xs text-emerald-600 flex items-center gap-1"
        >
          <Check :size="12" />
          OTP aktif
        </span>
      </div>
    </div>

    <!-- MFA (TOTP) -->
    <div class="space-y-4">
      <h3 class="text-sm font-bold text-slate-900 flex items-center gap-2">
        <QrCode :size="16" class="text-slate-400" />
        Multi-Factor Authentication (MFA)
      </h3>

      <p class="text-xs text-slate-500">
        Tambahkan lapisan keamanan extra dengan authenticator app (TOTP).
      </p>

      <!-- MFA Setup -->
      <div v-if="!currentUser?.totpMultiFactorSecret && !generatedSecret" class="flex items-center gap-3">
        <button
          @click="handleStartMfaSetup"
          class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <QrCode :size="14" />
          Setup MFA
        </button>
      </div>

      <!-- MFA QR Code -->
      <div v-if="generatedSecret && qrCodeDataUrl" class="space-y-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
        <div class="flex justify-center">
          <img :src="qrCodeDataUrl" alt="MFA QR Code" class="w-48 h-48" />
        </div>
        <p class="text-xs text-slate-500 text-center">
          Scan QR code ini dengan authenticator app (Google Authenticator, Authy, dll)
        </p>
        <div>
          <label class="block text-xs font-medium text-slate-700 mb-1">Verification Code</label>
          <input
            v-model="mfaVerificationCode"
            type="text"
            maxlength="6"
            class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="000000"
          />
        </div>
        <div v-if="mfaError" class="text-xs text-rose-600 flex items-center gap-1">
          <AlertCircle :size="12" />
          {{ mfaError }}
        </div>
        <button
          @click="handleConfirmMfaSetup"
          :disabled="isMfaWorking || !mfaVerificationCode"
          class="w-full px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Loader2 v-if="isMfaWorking" :size="14" class="animate-spin" />
          Verify & Enable MFA
        </button>
      </div>

      <!-- MFA Active -->
      <div v-if="currentUser?.totpMultiFactorSecret" class="flex items-center gap-3">
        <span class="text-xs text-emerald-600 flex items-center gap-1">
          <Check :size="12" />
          MFA aktif
        </span>
        <button
          @click="handleDisableMfa"
          :disabled="isMfaWorking"
          class="px-4 py-2 bg-rose-600 text-white text-sm font-medium rounded-lg hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <Loader2 v-if="isMfaWorking" :size="14" class="animate-spin" />
          Disable MFA
        </button>
      </div>
    </div>
  </div>
</template>
