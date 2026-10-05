import { ref } from 'vue';

/**
 * Reusable clipboard composable with managed timeouts and tracking ID support.
 */
export function useClipboard(timeout = 2000) {
  const copiedId = ref<string | null>(null);
  const isCopied = ref(false);

  const copy = async (text: string, id?: string): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(text);
      if (id) {
        copiedId.value = id;
      }
      isCopied.value = true;
      setTimeout(() => {
        if (id && copiedId.value === id) {
          copiedId.value = null;
        }
        isCopied.value = false;
      }, timeout);
      return true;
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      return false;
    }
  };

  return {
    copiedId,
    isCopied,
    copy,
  };
}
