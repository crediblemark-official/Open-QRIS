<script setup lang="ts">
import { Loader2, KeyRound } from 'lucide-vue-next';

const props = defineProps<{
  providers: Array<{ id: string; name: string }>;
  loadingProvider: string | null;
  passkeyEnabled: boolean;
  passkeyLoading: boolean;
}>();

const emit = defineEmits<{
  (e: 'oauthSignIn', providerId: string): void;
  (e: 'passkeySignIn'): void;
}>();

const handleOAuthSignIn = (providerId: string) => {
  emit('oauthSignIn', providerId);
};

const handlePasskeySignIn = () => {
  emit('passkeySignIn');
};
</script>

<template>
  <div class="space-y-2">
    <template v-for="provider in providers" :key="provider.id">
      <button
        v-if="provider.id === 'google'"
        type="button"
        @click="handleOAuthSignIn('google')"
        :disabled="!!loadingProvider || passkeyLoading"
        class="w-full h-9 px-3 rounded-md bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 text-xs font-semibold flex items-center justify-center gap-2.5 transition cursor-pointer disabled:opacity-50 shadow-2xs"
      >
        <Loader2 v-if="loadingProvider === 'google'" :size="14" class="animate-spin text-slate-600" />
        <svg v-else class="w-4 h-4 shrink-0" viewBox="0 0 24 24">
          <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z"/>
          <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"/>
          <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15s.7 5.3 1.9 7.7l3.7-2.9z"/>
          <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z"/>
        </svg>
        <span>Lanjutkan dengan Google</span>
      </button>

      <button
        v-else
        type="button"
        @click="handleOAuthSignIn(provider.id)"
        :disabled="!!loadingProvider || passkeyLoading"
        class="w-full h-9 px-3 rounded-md bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
      >
        <Loader2 v-if="loadingProvider === provider.id" :size="14" class="animate-spin" />
        <KeyRound v-else :size="14" />
        <span class="capitalize">Lanjutkan dengan {{ provider.id }}</span>
      </button>
    </template>

    <button
      v-if="passkeyEnabled"
      type="button"
      @click="handlePasskeySignIn"
      :disabled="!!loadingProvider || passkeyLoading"
      class="w-full h-9 px-3 rounded-md bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
    >
      <Loader2 v-if="passkeyLoading" :size="14" class="animate-spin" />
      <KeyRound v-else :size="14" />
      <span>Masuk dengan Passkey</span>
    </button>
  </div>
</template>
