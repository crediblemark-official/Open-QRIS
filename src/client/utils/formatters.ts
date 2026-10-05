/**
 * OpenQRIS Shared Formatters & Utilities (DRY)
 */

export function formatRupiah(num: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(num || 0);
}

export function formatTime(dateStr: string): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// Note: copyText function telah dipindahkan ke composables/useClipboard.ts
// Gunakan useClipboard composable untuk clipboard functionality yang lebih lengkap

export function formatDateTime(dateStr: string): string {
  if (!dateStr) return '-';
  return `${formatDate(dateStr)}, ${formatTime(dateStr)}`;
}

export function normalizeWhatsappPhone(phone: string): string {
  if (!phone) return '';
  let cleaned = phone.replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+62')) {
    cleaned = '62' + cleaned.slice(3);
  } else if (cleaned.startsWith('08')) {
    cleaned = '628' + cleaned.slice(2);
  } else if (cleaned.startsWith('8')) {
    cleaned = '628' + cleaned.slice(1);
  } else if (!cleaned.startsWith('62') && cleaned.length >= 7) {
    cleaned = '62' + cleaned;
  }
  return cleaned.replace(/[^\d]/g, '');
}

export function getInvoiceTimeRemaining(expiresAt: string, currentTimestamp?: number): {
  isExpired: boolean;
  isUrgent: boolean;
  minutes: number;
  seconds: number;
  formatted: string;
  text: string;
} {
  if (!expiresAt) {
    return { isExpired: true, isUrgent: false, minutes: 0, seconds: 0, formatted: 'Expired', text: 'Expired' };
  }
  const now = currentTimestamp || Date.now();
  const diffMs = new Date(expiresAt).getTime() - now;
  if (diffMs <= 0) {
    return { isExpired: true, isUrgent: false, minutes: 0, seconds: 0, formatted: 'Expired', text: 'Expired' };
  }
  const minutes = Math.floor(diffMs / 60000);
  const seconds = Math.floor((diffMs % 60000) / 1000);
  const isUrgent = minutes < 5;
  const formatted = `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
  return { isExpired: false, isUrgent, minutes, seconds, formatted, text: formatted };
}

