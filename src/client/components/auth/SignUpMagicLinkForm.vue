<script setup lang="ts">
import { ref } from 'vue';
import { Mail, Loader2, AlertCircle, ArrowLeft } from 'lucide-vue-next';

const props = defineProps<{
  email: string;
  emailError: string;
  isLoading: boolean;
  otpState: { nonce: string } | null;
  otpCode: string;
  otpError: string;
  isOtpLoading: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:email', value: string): void;
  (e: 'update:otpCode', value: string): void;
  (e: 'submitMagicLink'): void;
  (e: 'submitOtp'): void;
  (e: 'back'): void;
}>();

const localEmail = ref(props.email);
const localOtpCode = ref(props.otpCode);

const handleMagicLinkSubmit = () => {
  emit('update:email', localEmail.value);
  emit('submitMagicLink');
};

const handleOtpSubmit = () => {
  emit('update:otpCode', localOtpCode.value);
  emit('submitOtp');
};
</script>

<template>
  <div class="space-y-3">
    <!-- OTP Form -->
    <div v-if="otpState" class="space-y-3">
      <div class="text-center pb-1">
        <div class="inline-flex w-8 h-8 rounded-full bg-red-50 border border-red-200 items-center justify-center mb-1.5">
          <Mail :size="16" class="text-[#d71920]" />
        </div>
        <h3 class="text-xs font-bold text-slate-900">Masukkan Kode OTP</h3>
        <p class="text-[11px] text-slate-500 mt-0.5">
          Kode dikirim ke <span class="text-slate-800 font-medium">{{ email }}</span>
        </p>
      </div>

      <div>
        <label for="otp" class="block text-xs font-medium text-slate-700 mb-1">
          Kode 6-Digit Email
        </label>
        <input
          id="otp"
          v-model="localOtpCode"
          type="text"
          maxlength="6"
          placeholder="123456"
          autofocus
          class="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-md text-center text-lg font-mono tracking-widest text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#d71920] focus:bg-white transition"
          @keyup.enter="handleOtpSubmit"
        />
        <p v-if="otpError" class="text-[11px] text-rose-600 mt-1 flex items-center gap-1">
          <AlertCircle :size="11" />
          <span>{{ otpError }}</span>
        </p>
      </div>

      <div class="flex gap-2 pt-1">
        <button
          type="button"
          @click="emit('back')"
          :disabled="isOtpLoading"
          class="flex-1 h-9 px-2 rounded-md bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1 transition cursor-pointer"
        >
          <ArrowLeft :size="13" />
          <span>Kembali</span>
        </button>

        <button
          type="button"
          @click="handleOtpSubmit"
          :disabled="isOtpLoading || localOtpCode.length < 6"
          class="flex-2 h-9 px-3 rounded-md bg-[#d71920] hover:bg-[#b9141a] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50"
        >
          <Loader2 v-if="isOtpLoading" :size="13" class="animate-spin" />
          <span>Verifikasi</span>
        </button>
      </div>
    </div>

    <!-- Magic Link Form -->
    <div v-else class="space-y-3">
      <div>
        <label class="block text-xs font-medium text-slate-700 mb-1">Email</label>
        <div class="relative">
          <input
            v-model="localEmail"
            type="email"
            placeholder="nama@email.com"
            required
            class="w-full h-9 px-3 pl-8 bg-slate-50 border border-slate-300 rounded-md text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#d71920] focus:bg-white transition"
          />
          <Mail :size="13" class="absolute left-2.5 top-2.5 text-slate-400" />
        </div>
        <p v-if="emailError" class="text-[11px] text-rose-600 mt-1 flex items-center gap-1">
          <AlertCircle :size="11" />
          <span>{{ emailError }}</span>
        </p>
      </div>

      <button
        type="button"
        @click="handleMagicLinkSubmit"
        :disabled="isLoading"
        class="w-full h-9 rounded-md bg-[#d71920] hover:bg-[#b9141a] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50"
      >
        <Loader2 v-if="isLoading" :size="13" class="animate-spin" />
        <span>Kirim Magic Link</span>
      </button>
    </div>
  </div>
</template>
