import { ref } from 'vue';

const toastMessage = ref('');
let toastTimer: ReturnType<typeof setTimeout> | null = null;

export function useToast() {
  const showToast = (msg: string) => {
    toastMessage.value = msg;
    if (toastTimer) {
      clearTimeout(toastTimer);
    }
    toastTimer = setTimeout(() => {
      toastMessage.value = '';
      toastTimer = null;
    }, 3000);
  };

  return {
    toastMessage,
    showToast,
  };
}
