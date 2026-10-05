<script setup lang="ts">
import { ref } from 'vue';
import { Mail, Lock, Loader2, AlertCircle } from 'lucide-vue-next';

const props = defineProps<{
  email: string;
  password: string;
  passwordRepeat: string;
  emailError: string;
  passwordError: string;
  passwordRepeatError: string;
  isLoading: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:email', value: string): void;
  (e: 'update:password', value: string): void;
  (e: 'update:passwordRepeat', value: string): void;
  (e: 'submit'): void;
}>();

const localEmail = ref(props.email);
const localPassword = ref(props.password);
const localPasswordRepeat = ref(props.passwordRepeat);

const handleSubmit = () => {
  emit('update:email', localEmail.value);
  emit('update:password', localPassword.value);
  emit('update:passwordRepeat', localPasswordRepeat.value);
  emit('submit');
};
</script>

<template>
  <form @submit.prevent="handleSubmit" class="space-y-3">
    <div>
      <label for="email" class="block text-xs font-medium text-slate-700 mb-1">Email</label>
      <div class="relative">
        <input
          id="email"
          v-model="localEmail"
          type="email"
          autocomplete="email"
          placeholder="nama@email.com"
          class="w-full h-9 px-3 pl-8 bg-slate-50 border rounded-md text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white transition"
          :class="emailError ? 'border-rose-500 focus:border-rose-500' : 'border-slate-300 focus:border-[#d71920]'"
        />
        <Mail :size="13" class="absolute left-2.5 top-2.5 text-slate-400" />
      </div>
      <p v-if="emailError" class="text-[11px] text-rose-600 mt-1 flex items-center gap-1">
        <AlertCircle :size="11" />
        <span>{{ emailError }}</span>
      </p>
    </div>

    <div>
      <label for="password" class="block text-xs font-medium text-slate-700 mb-1">Kata Sandi</label>
      <div class="relative">
        <input
          id="password"
          v-model="localPassword"
          type="password"
          autocomplete="new-password"
          placeholder="Minimal 8 karakter"
          class="w-full h-9 px-3 pl-8 bg-slate-50 border rounded-md text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white transition"
          :class="passwordError ? 'border-rose-500 focus:border-rose-500' : 'border-slate-300 focus:border-[#d71920]'"
        />
        <Lock :size="13" class="absolute left-2.5 top-2.5 text-slate-400" />
      </div>
      <p v-if="passwordError" class="text-[11px] text-rose-600 mt-1 flex items-center gap-1">
        <AlertCircle :size="11" />
        <span>{{ passwordError }}</span>
      </p>
    </div>

    <div>
      <label for="password-repeat" class="block text-xs font-medium text-slate-700 mb-1">Ulangi Kata Sandi</label>
      <div class="relative">
        <input
          id="password-repeat"
          v-model="localPasswordRepeat"
          type="password"
          autocomplete="new-password"
          placeholder="Ulangi kata sandi"
          class="w-full h-9 px-3 pl-8 bg-slate-50 border rounded-md text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white transition"
          :class="passwordRepeatError ? 'border-rose-500 focus:border-rose-500' : 'border-slate-300 focus:border-[#d71920]'"
        />
        <Lock :size="13" class="absolute left-2.5 top-2.5 text-slate-400" />
      </div>
      <p v-if="passwordRepeatError" class="text-[11px] text-rose-600 mt-1 flex items-center gap-1">
        <AlertCircle :size="11" />
        <span>{{ passwordRepeatError }}</span>
      </p>
    </div>

    <button
      type="submit"
      :disabled="isLoading"
      class="w-full h-9 rounded-md bg-[#d71920] hover:bg-[#b9141a] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50"
    >
      <Loader2 v-if="isLoading" :size="13" class="animate-spin" />
      <span>Buat Akun</span>
    </button>
  </form>
</template>
