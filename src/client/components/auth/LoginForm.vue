<script setup lang="ts">
import { ref } from 'vue';
import { Mail, Lock, Loader2, AlertCircle } from 'lucide-vue-next';

const props = defineProps<{
  email: string;
  password: string;
  emailError: string;
  generalError: string;
  isLoading: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:email', value: string): void;
  (e: 'update:password', value: string): void;
  (e: 'submit'): void;
}>();

const localEmail = ref(props.email);
const localPassword = ref(props.password);

const handleSubmit = () => {
  emit('update:email', localEmail.value);
  emit('update:password', localPassword.value);
  emit('submit');
};
</script>

<template>
  <form @submit.prevent="handleSubmit" class="space-y-3">
    <div>
      <label class="block text-[11px] font-medium text-slate-700 mb-1">Email</label>
      <div class="relative">
        <input
          v-model="localEmail"
          type="email"
          placeholder="nama@bisnis.com"
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

    <div>
      <label class="block text-[11px] font-medium text-slate-700 mb-1">Kata Sandi</label>
      <div class="relative">
        <input
          v-model="localPassword"
          type="password"
          placeholder="••••••••"
          required
          class="w-full h-9 px-3 pl-8 bg-slate-50 border border-slate-300 rounded-md text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#d71920] focus:bg-white transition"
        />
        <Lock :size="13" class="absolute left-2.5 top-2.5 text-slate-400" />
      </div>
    </div>

    <div v-if="generalError" class="text-[11px] text-rose-600 flex items-center gap-1">
      <AlertCircle :size="11" />
      <span>{{ generalError }}</span>
    </div>

    <button
      type="submit"
      :disabled="isLoading"
      class="w-full h-9 rounded-md bg-[#d71920] hover:bg-[#b9141a] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50"
    >
      <Loader2 v-if="isLoading" :size="13" class="animate-spin" />
      <span>Masuk ke Dashboard</span>
    </button>
  </form>
</template>
