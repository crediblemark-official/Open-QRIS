<script setup lang="ts">
import { ref, watch } from 'vue';
import { Link2, X, CheckCircle2, Copy, Check, Send, ExternalLink, Building2 } from 'lucide-vue-next';
import { formatRupiah, normalizeWhatsappPhone } from '../utils/formatters';
import { useClipboard } from '../composables/useClipboard';
import type { Tenant } from '../types';

const props = withDefaults(
  defineProps<{
    isOpen: boolean;
    tenants?: Tenant[];
    defaultTenantId?: string;
    isAdmin?: boolean;
    authToken?: string;
  }>(),
  {
    tenants: () => [],
    defaultTenantId: '',
    isAdmin: false,
    authToken: '',
  }
);

const emit = defineEmits<{
  (e: 'update:isOpen', value: boolean): void;
  (e: 'close'): void;
  (e: 'created', data: any): void;
  (e: 'toast', msg: string): void;
}>();

const { copiedId, copy } = useClipboard();

const orderTitle = ref('');
const orderAmount = ref<number | null>(50000);
const customerName = ref('');
const customerWhatsapp = ref('');
const selectedTenantId = ref(props.defaultTenantId || props.tenants[0]?.id || '');
const isSubmittingLink = ref(false);
const generatedLinkResult = ref<any | null>(null);

// Reset form when modal opens
watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      orderTitle.value = '';
      orderAmount.value = 50000;
      customerName.value = '';
      customerWhatsapp.value = '';
      selectedTenantId.value = props.defaultTenantId || props.tenants[0]?.id || '';
      generatedLinkResult.value = null;
    }
  }
);

const closeModal = () => {
  emit('update:isOpen', false);
  emit('close');
};

const handleCopyLink = async () => {
  if (!generatedLinkResult.value?.checkout_url) return;
  const ok = await copy(generatedLinkResult.value.checkout_url, 'pl-copy');
  if (ok) emit('toast', 'Link pembayaran berhasil disalin!');
};

const submitPaymentLink = async () => {
  if (!orderAmount.value || orderAmount.value < 1000) {
    emit('toast', 'Nominal minimal pembayaran adalah Rp 1.000');
    return;
  }

  if (props.isAdmin && props.tenants.length > 0 && !selectedTenantId.value) {
    selectedTenantId.value = props.tenants[0].id;
  }

  isSubmittingLink.value = true;
  try {
    const token = props.authToken || (typeof window !== 'undefined' ? localStorage.getItem('qris_admin_token') : '') || '';
    const activeTenant = props.tenants.find((t) => t.id === selectedTenantId.value) || props.tenants[0];

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    } else if (activeTenant?.secretKey) {
      headers['Authorization'] = `Bearer ${activeTenant.secretKey}`;
    }

    const cleanPhone = normalizeWhatsappPhone(customerWhatsapp.value.trim());

    const bodyPayload: Record<string, any> = {
      order_id: orderTitle.value.trim() || `ORDER-${Date.now().toString().slice(-6)}`,
      amount: orderAmount.value,
      customer_name: customerName.value.trim() || undefined,
      customer_email: cleanPhone ? `${cleanPhone}@wa.customer` : undefined,
    };

    if (props.isAdmin && selectedTenantId.value) {
      bodyPayload.tenant_id = selectedTenantId.value;
    }

    const res = await fetch('/v1/charges', {
      method: 'POST',
      headers,
      body: JSON.stringify(bodyPayload),
    });

    const json = await res.json();
    if (json.status === 'success' && json.data) {
      generatedLinkResult.value = json.data;
      emit('created', json.data);
      emit('toast', 'Payment link QRIS berhasil dibuat!');
    } else {
      emit('toast', json.message || 'Gagal membuat payment link');
    }
  } catch (err: any) {
    emit('toast', err.message || 'Gagal koneksi ke server gateway');
  } finally {
    isSubmittingLink.value = false;
  }
};

const getWhatsappUrl = () => {
  if (!generatedLinkResult.value) return '#';
  const phone = normalizeWhatsappPhone(customerWhatsapp.value.trim());
  const msg = encodeURIComponent(
    `Halo ${customerName.value || 'Kak'}, berikut link pembayaran QRIS untuk pesanan *${generatedLinkResult.value.order_id}*:\n\n` +
    `Total: Rp ${generatedLinkResult.value.total_amount?.toLocaleString('id-ID')}\n` +
    `Link: ${generatedLinkResult.value.checkout_url}\n\nSilakan scan QRIS dan transfer tepat hingga 3 digit terakhir agar otomatis terverifikasi. Terima kasih!`
  );
  return phone ? `https://wa.me/${phone}?text=${msg}` : `https://wa.me/?text=${msg}`;
};
</script>

<template>
  <div v-if="isOpen" class="modal-backdrop" @click.self="closeModal">
    <div class="modal-box max-w-md animate-in fade-in zoom-in-95 duration-150">
      <div class="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
        <div>
          <h3 class="text-sm font-bold text-slate-900">Buat Payment Link QRIS Instan</h3>
          <p class="text-xs text-slate-500">Kirim tautan tagihan langsung ke pelanggan atau WhatsApp</p>
        </div>
        <button @click="closeModal" class="p-1 rounded text-slate-400 hover:text-slate-700 cursor-pointer">
          <X :size="16" />
        </button>
      </div>

      <!-- FORM STATE -->
      <div v-if="!generatedLinkResult" class="space-y-3.5">
        <div v-if="isAdmin && tenants.length > 0" class="form-group">
          <label class="form-label flex items-center gap-1.5">
            <Building2 :size="12" class="text-slate-400" />
            <span>Pilih SaaS Tenant / Merchant</span>
          </label>
          <select v-model="selectedTenantId" class="form-select text-xs">
            <option v-for="t in tenants" :key="t.id" :value="t.id">
              {{ t.name }} ({{ t.id }})
            </option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Judul Pesanan / Deskripsi Barang</label>
          <input
            v-model="orderTitle"
            class="form-input text-xs"
            placeholder="Contoh: Kemeja Flanel Hitam XL"
            @keyup.enter="submitPaymentLink"
          />
        </div>

        <div class="form-group">
          <label class="form-label">Nominal Pembayaran (Rp)</label>
          <input
            v-model.number="orderAmount"
            type="number"
            step="1000"
            class="form-input font-mono text-sm font-bold"
            placeholder="50000"
            @keyup.enter="submitPaymentLink"
          />
        </div>

        <div class="grid grid-cols-2 gap-2">
          <div class="form-group">
            <label class="form-label">Nama Pembeli (Opsional)</label>
            <input v-model="customerName" class="form-input text-xs" placeholder="Kak Andi" />
          </div>
          <div class="form-group">
            <label class="form-label">WhatsApp Pembeli (Opsional)</label>
            <input v-model="customerWhatsapp" class="form-input font-mono text-xs" placeholder="08123456789" />
          </div>
        </div>

        <div class="pt-3 border-t border-slate-200 flex justify-end gap-2 mt-4">
          <button @click="closeModal" class="btn btn-secondary btn-sm cursor-pointer">Batal</button>
          <button
            @click="submitPaymentLink"
            :disabled="isSubmittingLink"
            class="btn btn-primary btn-sm flex items-center gap-1.5 cursor-pointer"
          >
            <Link2 :size="13" />
            <span>{{ isSubmittingLink ? 'Membuat Link...' : 'Generate Link Sekarang' }}</span>
          </button>
        </div>
      </div>

      <!-- SUCCESS RESULT STATE -->
      <div v-else class="space-y-4">
        <div class="p-3 bg-emerald-50 border border-emerald-200 rounded-md">
          <div class="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
            <CheckCircle2 :size="14" />
            <span>Payment Link Siap Dibagikan!</span>
          </div>
          <p class="text-[11px] text-emerald-700 mt-1">
            Pelanggan Anda cukup membuka link ini untuk langsung melihat QRIS dinamis dan melakukan pembayaran.
          </p>
        </div>

        <div>
          <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            URL Pembayaran Checkout
          </label>
          <div class="flex items-center gap-1.5">
            <input
              readonly
              :value="generatedLinkResult.checkout_url"
              class="form-input font-mono text-xs bg-slate-50 text-slate-900 select-all"
            />
            <button
              @click="handleCopyLink"
              class="btn btn-primary btn-sm shrink-0 cursor-pointer"
            >
              <component :is="copiedId === 'pl-copy' ? Check : Copy" :size="13" />
              <span>Salin</span>
            </button>
          </div>
        </div>

        <div class="flex justify-between items-center py-2 px-3 bg-slate-50 border border-slate-200 rounded text-xs">
          <span class="text-slate-600 font-medium">Total Termasuk Kode Unik:</span>
          <span class="font-mono font-bold text-slate-900 text-sm">
            {{ formatRupiah(generatedLinkResult.total_amount) }}
          </span>
        </div>

        <div class="flex gap-2">
          <a
            :href="getWhatsappUrl()"
            target="_blank"
            class="flex-1 btn btn-secondary btn-sm flex items-center justify-center gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700 border-emerald-600"
          >
            <Send :size="13" />
            <span>Kirim via WhatsApp</span>
          </a>
          <a
            :href="generatedLinkResult.checkout_url"
            target="_blank"
            class="btn btn-secondary btn-sm flex items-center gap-1"
          >
            <ExternalLink :size="13" />
            <span>Buka</span>
          </a>
        </div>

        <div class="pt-3 border-t border-slate-200 flex justify-end">
          <button @click="closeModal" class="btn btn-secondary btn-sm cursor-pointer">Tutup</button>
        </div>
      </div>
    </div>
  </div>
</template>
