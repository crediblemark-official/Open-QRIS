<script setup lang="ts">
import { ref } from 'vue';
import { 
  Terminal, 
  Zap, 
  ExternalLink, 
  RefreshCw, 
  Copy, 
  Check, 
  Code2, 
  Sparkles
} from 'lucide-vue-next';
import OfficialQrisCard from '../components/OfficialQrisCard.vue';
import { formatRupiah } from '../utils/formatters';

const props = defineProps<{
  tenants: any[];
  settings: any;
}>();

const emit = defineEmits<{
  (e: 'navigate', tab: 'qris'): void;
  (e: 'toast', msg: string): void;
  (e: 'refresh'): void;
}>();

const playAppId = ref(props.tenants.length > 0 ? props.tenants[0].id : '');
const playOrderId = ref(`INV-${Date.now().toString().slice(-6)}`);
const playAmount = ref(25000);
const playCustomerName = ref('Budi Santoso');
const playGenerating = ref(false);
const playCurrentCharge = ref<any>(null);
const showJsonPayload = ref(false);
const copiedCheckout = ref(false);

const generateNewOrderId = () => {
  playOrderId.value = `INV-${Math.floor(100000 + Math.random() * 900000)}`;
};

const onGenerate = async () => {
  const selectedTenant = props.tenants.find((t) => t.id === playAppId.value);
  if (!selectedTenant) {
    emit('toast', 'Pilih aplikasi SaaS terlebih dahulu');
    return;
  }
  if (!props.settings.defaultStaticQRIS && !selectedTenant.staticQRIS) {
    emit('toast', 'Master QRIS belum diatur. Upload QRIS di tab Master QRIS.');
    emit('navigate', 'qris');
    return;
  }

  playGenerating.value = true;
  try {
    const res = await fetch('/v1/charges', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${selectedTenant.secretKey}`,
      },
      body: JSON.stringify({
        order_id: playOrderId.value,
        amount: Number(playAmount.value),
        customer_name: playCustomerName.value,
      }),
    });
    const json = await res.json();
    if (json.status === 'success') {
      playCurrentCharge.value = json.data;
      emit('refresh');
      emit('toast', 'QRIS Dinamis berhasil dibuat!');
    } else {
      emit('toast', json.message || 'Gagal membuat QRIS');
    }
  } catch (err) {
    emit('toast', 'Terjadi kesalahan koneksi');
  } finally {
    playGenerating.value = false;
  }
};

const onSimulatePaid = async (chargeId: string) => {
  try {
    const token = localStorage.getItem('qris_admin_token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const res = await fetch(`/v1/charges/${chargeId}/simulate-paid`, {
      method: 'POST',
      headers,
    });
    const json = await res.json();
    if (json.success) {
      if (playCurrentCharge.value && playCurrentCharge.value.charge_id === chargeId) {
        playCurrentCharge.value.status = 'PAID';
      }
      emit('refresh');
      emit('toast', 'Pembayaran berhasil diverifikasi! Webhook terkirim.');
    } else {
      emit('toast', json.message || 'Gagal simulasi bayar');
    }
  } catch (err) {
    emit('toast', 'Gagal simulasi bayar');
  }
};

const copyCheckoutUrl = async () => {
  if (!playCurrentCharge.value?.checkout_url) return;
  await navigator.clipboard.writeText(playCurrentCharge.value.checkout_url);
  copiedCheckout.value = true;
  setTimeout(() => (copiedCheckout.value = false), 2000);
};
</script>

<template>
  <div class="border-b border-slate-200/90 divide-y lg:divide-y-0 lg:divide-x divide-slate-200/90 bg-white grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
    <!-- FORM CONFIGURATION -->
    <div class="lg:col-span-6 p-6 bg-white flex flex-col justify-between">
      <div>
        <div class="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div class="flex items-center gap-2">
            <Terminal :size="15" class="text-slate-600" />
            <span class="text-xs font-bold text-slate-800 uppercase tracking-wider">Simulator Dynamic QRIS</span>
          </div>
          <span class="text-xs px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 font-medium">
            Sandbox Mode
          </span>
        </div>

        <div class="space-y-4">
          <!-- SAAS TENANT SELECTION -->
          <div class="form-group mb-0">
            <label class="form-label">Pilih SaaS Tenant</label>
            <select v-model="playAppId" class="form-input">
              <option v-for="app in tenants" :key="app.id" :value="app.id">
                {{ app.name }} ({{ app.id }})
              </option>
            </select>
          </div>

          <!-- ORDER ID -->
          <div class="form-group mb-0">
            <div class="flex items-center justify-between mb-1">
              <label class="form-label mb-0">Invoice / Order ID</label>
              <button 
                type="button" 
                @click="generateNewOrderId" 
                class="text-[11px] text-[#d71920] hover:text-red-800 flex items-center gap-1 cursor-pointer font-medium"
              >
                <RefreshCw :size="11" />
                <span>Acak Nomor Baru</span>
              </button>
            </div>
            <input v-model="playOrderId" class="form-input font-mono text-sm" />
          </div>

          <!-- NOMINAL + PRESETS -->
          <div class="form-group mb-0">
            <div class="flex items-center justify-between mb-1">
              <label class="form-label mb-0">Nominal Transfer (Rupiah)</label>
              <span class="font-mono text-xs font-bold text-slate-900">{{ formatRupiah(playAmount) }}</span>
            </div>
            <input v-model.number="playAmount" type="number" step="1000" class="form-input font-mono text-sm" />
            
            <!-- Preset Pills -->
            <div class="flex gap-1 mt-2 flex-wrap">
              <button 
                v-for="amt in [10000, 25000, 50000, 100000, 250000]" 
                :key="amt"
                type="button"
                :class="['px-2 py-0.5 rounded border text-xs font-mono font-medium transition cursor-pointer', playAmount === amt ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100']"
                @click="playAmount = amt"
              >
                {{ amt >= 1000 ? `${amt / 1000}k` : amt }}
              </button>
            </div>
          </div>

          <!-- CUSTOMER NAME -->
          <div class="form-group mb-0">
            <label class="form-label">Nama Pelanggan (Opsional)</label>
            <input v-model="playCustomerName" class="form-input" placeholder="Contoh: Budi Santoso" />
          </div>

          <!-- GENERATE BUTTON -->
          <button 
            @click="onGenerate" 
            :disabled="playGenerating" 
            class="btn btn-primary w-full mt-2 cursor-pointer h-9 text-xs font-bold"
          >
            <Sparkles :size="14" />
            <span>{{ playGenerating ? 'Membuat QRIS...' : 'Generate Dynamic QRIS' }}</span>
          </button>
        </div>
      </div>

      <!-- JSON VIEW TOGGLE -->
      <div>
        <div class="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
          <button 
            @click="showJsonPayload = !showJsonPayload" 
            class="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1.5 cursor-pointer font-medium"
          >
            <Code2 :size="13" />
            <span>{{ showJsonPayload ? 'Sembunyikan Raw JSON' : 'Lihat Payload JSON Response' }}</span>
          </button>
        </div>

        <div v-if="showJsonPayload && playCurrentCharge" class="mt-3">
          <pre class="code-editor text-[11px]"><code>{{ JSON.stringify(playCurrentCharge, null, 2) }}</code></pre>
        </div>
      </div>
    </div>

    <!-- PREVIEW AREA (OFFICIAL QRIS CARD) -->
    <div class="lg:col-span-6 p-6 bg-slate-50/40 flex flex-col items-center justify-center min-h-[420px]">
      <div v-if="!playCurrentCharge" class="text-center py-12 text-slate-400">
        <Terminal :size="32" class="mx-auto mb-2 text-slate-300" />
        <p class="text-xs font-semibold text-slate-700">Preview QRIS Dinamis</p>
        <p class="text-[11px] text-slate-500 mt-0.5">Tentukan nominal di formulir sebelah kiri lalu klik tombol Generate.</p>
      </div>

      <div v-else class="w-full flex flex-col items-center">
        <div class="mb-3 flex items-center gap-1.5">
          <span :class="['w-2 h-2 rounded-full', playCurrentCharge.status === 'PAID' ? 'bg-emerald-500' : 'bg-amber-500']"></span>
          <span class="text-xs font-mono font-bold" :class="playCurrentCharge.status === 'PAID' ? 'text-emerald-700' : 'text-amber-700'">
            STATUS: {{ playCurrentCharge.status }}
          </span>
        </div>

        <OfficialQrisCard 
          :merchantName="playCurrentCharge.tenant_name"
          :orderId="playCurrentCharge.order_id"
          :qrDataUrl="playCurrentCharge.qr_data_url"
          :totalAmount="playCurrentCharge.total_amount"
          :uniqueCode="playCurrentCharge.unique_code"
          :showDownload="true"
        />

        <!-- QUICK ACTIONS BAR -->
        <div class="flex gap-2 mt-4 w-full max-w-[310px]">
          <a 
            :href="playCurrentCharge.checkout_url" 
            target="_blank" 
            class="flex-1 btn btn-secondary btn-sm flex items-center justify-center gap-1.5"
          >
            <ExternalLink :size="13" />
            <span>Checkout</span>
          </a>

          <button 
            @click="copyCheckoutUrl" 
            class="btn btn-secondary btn-sm px-2.5" 
            title="Salin Link Checkout"
          >
            <component :is="copiedCheckout ? Check : Copy" :size="13" />
          </button>

          <button 
            v-if="playCurrentCharge.status === 'PENDING'"
            @click="onSimulatePaid(playCurrentCharge.charge_id)" 
            class="flex-1 btn btn-success btn-sm cursor-pointer"
          >
            <Zap :size="13" />
            <span>Bayar (Test)</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
