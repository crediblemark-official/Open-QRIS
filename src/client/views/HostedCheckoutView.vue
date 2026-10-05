<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { 
  RefreshCw, 
  CheckCircle2, 
  Clock, 
  Zap, 
  ShieldCheck, 
  Copy, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  AlertTriangle,
  Printer,
  Share2,
  Store,
  Receipt,
  Lock,
  ArrowRight,
  ExternalLink,
  CreditCard,
  QrCode,
  CheckCircle
} from 'lucide-vue-next';
import confetti from 'canvas-confetti';
import { formatRupiah, formatDateTime, formatDate, formatTime } from '../utils/formatters';
import OfficialQrisCard from '../components/OfficialQrisCard.vue';

const props = defineProps<{
  chargeId: string;
}>();

const checkoutCharge = ref<any>(null);
const checkoutLoading = ref(true);
const checkoutRemainingSeconds = ref(0);
const copiedAmount = ref(false);
const copiedInvoice = ref(false);
const copiedChargeId = ref(false);
const copiedReceipt = ref(false);
const activeTab = ref<'ewallet' | 'm-banking'>('ewallet');
let checkoutInterval: any = null;
// Tombol Simulasi Bayar hanya muncul jika server mengaktifkan SANDBOX_MODE
const showSimulate = ref(false);
const simulateError = ref('');

const loadCheckout = async () => {
  if (!props.chargeId) return;
  checkoutLoading.value = true;
  try {
    const res = await fetch(`/v1/charges/${props.chargeId}`);
    const json = await res.json();
    if (json.status === 'success') {
      checkoutCharge.value = json.data;
      showSimulate.value = json.data.sandbox === true;
      updateCheckoutTimer();
      if (checkoutCharge.value.status === 'PENDING') {
        startPollingCheckout();
      }
    }
  } catch (err) {
    console.error('Checkout error', err);
  } finally {
    checkoutLoading.value = false;
  }
};

const updateCheckoutTimer = () => {
  if (!checkoutCharge.value) return;
  const diff = new Date(checkoutCharge.value.expiresAt).getTime() - Date.now();
  checkoutRemainingSeconds.value = Math.max(0, Math.floor(diff / 1000));
};

const startPollingCheckout = () => {
  if (checkoutInterval) clearInterval(checkoutInterval);
  checkoutInterval = setInterval(async () => {
    updateCheckoutTimer();
    if (checkoutRemainingSeconds.value <= 0) {
      clearInterval(checkoutInterval);
      if (checkoutCharge.value.status === 'PENDING') {
        checkoutCharge.value.status = 'EXPIRED';
      }
      return;
    }

    try {
      const res = await fetch(`/v1/charges/${props.chargeId}`);
      const json = await res.json();
      if (json.status === 'success' && json.data.status === 'PAID') {
        checkoutCharge.value = json.data;
        clearInterval(checkoutInterval);
        confetti({ particleCount: 120, spread: 80, origin: { y: 0.5 } });
      }
    } catch (e) {
      console.error(e);
    }
  }, 2500);
};

const onSimulatePaid = async () => {
  simulateError.value = '';
  try {
    const res = await fetch(`/v1/charges/${props.chargeId}/simulate-paid`, {
      method: 'POST',
    });
    const json = await res.json();
    if (json.success) {
      confetti({ particleCount: 100, spread: 80, origin: { y: 0.5 } });
      checkoutCharge.value.status = 'PAID';
      checkoutCharge.value.paidAt = new Date().toISOString();
      if (checkoutInterval) clearInterval(checkoutInterval);
    } else {
      simulateError.value = json.message || 'Gagal menyimulasikan pembayaran';
    }
  } catch (e) {
    simulateError.value = 'Gagal menyimulasikan pembayaran';
  }
};

const copyAmount = async () => {
  if (!checkoutCharge.value) return;
  await navigator.clipboard.writeText(checkoutCharge.value.totalAmount.toString());
  copiedAmount.value = true;
  setTimeout(() => (copiedAmount.value = false), 2000);
};

const copyInvoice = async () => {
  if (!checkoutCharge.value) return;
  await navigator.clipboard.writeText(checkoutCharge.value.orderId);
  copiedInvoice.value = true;
  setTimeout(() => (copiedInvoice.value = false), 2000);
};

const copyChargeId = async () => {
  if (!checkoutCharge.value) return;
  await navigator.clipboard.writeText(checkoutCharge.value.id);
  copiedChargeId.value = true;
  setTimeout(() => (copiedChargeId.value = false), 2000);
};

const copyReceiptText = async () => {
  if (!checkoutCharge.value) return;
  const timeStr = checkoutCharge.value.paidAt 
    ? formatDateTime(checkoutCharge.value.paidAt) 
    : formatDateTime(checkoutCharge.value.createdAt);
  const text = `*BUKTI PEMBAYARAN QRIS — OPENQRIS*
----------------------------------------
Merchant: ${checkoutCharge.value.tenantName}
Nomor Order: ${checkoutCharge.value.orderId}
Pelanggan: ${checkoutCharge.value.customerName || '-'}
ID Transaksi: ${checkoutCharge.value.id}
----------------------------------------
Nominal Pokok: ${formatRupiah(checkoutCharge.value.amount)}
Kode Unik: +${checkoutCharge.value.uniqueCode || 0}
TOTAL BAYAR: ${formatRupiah(checkoutCharge.value.totalAmount)}
STATUS: LUNAS / TERVERIFIKASI
Waktu Lunas: ${timeStr}
----------------------------------------
Terverifikasi resmi via OpenQRIS Realtime Settlement.`;

  await navigator.clipboard.writeText(text);
  copiedReceipt.value = true;
  setTimeout(() => (copiedReceipt.value = false), 2000);
};

const printReceipt = () => {
  window.print();
};

const formattedCountdown = computed(() => {
  const m = Math.floor(checkoutRemainingSeconds.value / 60);
  const s = checkoutRemainingSeconds.value % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
});

const isNearExpiry = computed(() => {
  return checkoutRemainingSeconds.value < 300;
});

onMounted(() => {
  loadCheckout();
});

onUnmounted(() => {
  if (checkoutInterval) clearInterval(checkoutInterval);
});
</script>

<template>
  <div class="checkout-page-root min-h-screen bg-white sm:bg-slate-50 text-slate-900 relative selection:bg-red-500 selection:text-white flex flex-col items-center justify-center p-0 sm:p-6">
    <!-- SUBTLE BACKGROUND AMBIENT GLOW -->
    <div class="pointer-events-none absolute inset-0 overflow-hidden print:hidden hidden sm:block">
      <div class="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[360px] bg-red-500/5 blur-[100px] rounded-full"></div>
      <div class="absolute top-1/3 left-1/4 w-[500px] h-[300px] bg-emerald-500/5 blur-[120px] rounded-full"></div>
      <div class="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:24px_24px] opacity-30"></div>
    </div>

    <!-- MAIN CONTENT AREA -->
    <main class="relative z-10 w-full max-w-4xl flex flex-col items-center justify-center sm:my-auto">
      <!-- LOADING STATE -->
      <div v-if="checkoutLoading" class="flex flex-col items-center gap-3 py-24 text-center">
        <div class="w-12 h-12 rounded-2xl bg-white border border-slate-200 shadow-md flex items-center justify-center">
          <RefreshCw class="animate-spin text-[#d71920]" :size="24" />
        </div>
        <h3 class="text-sm font-bold text-slate-800">Menyiapkan Sesi Pembayaran...</h3>
        <p class="text-xs text-slate-400 max-w-xs">Menghubungkan ke gateway pembayaran dan memverifikasi data tagihan QRIS.</p>
      </div>

      <!-- NOT FOUND STATE -->
      <div v-else-if="!checkoutCharge" class="p-8 max-w-md w-full text-center border-0 sm:border border-slate-200/90 rounded-none sm:rounded-2xl bg-white shadow-none sm:shadow-xl shadow-slate-200/50">
        <div class="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3 border border-rose-200">
          <AlertTriangle :size="24" />
        </div>
        <h3 class="text-base font-bold text-slate-900 mb-1">Tagihan Tidak Ditemukan</h3>
        <p class="text-xs text-slate-500 leading-relaxed">ID transaksi tidak valid, dibatalkan, atau telah dihapus dari sistem gateway.</p>
      </div>

      <!-- EXPIRED STATE -->
      <div v-else-if="checkoutCharge.status === 'EXPIRED'" class="p-8 max-w-md w-full text-center border-0 sm:border border-slate-200/90 rounded-none sm:rounded-2xl bg-white shadow-none sm:shadow-xl shadow-slate-200/50">
        <div class="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3 border border-amber-200">
          <Clock :size="24" />
        </div>
        <h3 class="text-base font-bold text-slate-900 mb-1">Tagihan Telah Kadaluarsa</h3>
        <p class="text-xs text-slate-500 leading-relaxed mb-4">
          Batas waktu pembayaran untuk order <span class="font-mono text-slate-900 font-bold bg-slate-100 px-1.5 py-0.5 rounded">{{ checkoutCharge.orderId }}</span> telah melewati batas toleransi 15 menit.
        </p>
        <div class="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
          <div class="font-semibold text-slate-800">Apa yang harus dilakukan?</div>
          <div class="text-[11px] text-slate-500">Silakan kembali ke merchant toko untuk checkout ulang dan mendapatkan kode pembayaran baru.</div>
        </div>
      </div>

      <!-- ========================================== -->
      <!-- 3. PAID RECEIPT STATE (AUTHENTIC FINTECH)   -->
      <!-- ========================================== -->
      <div v-else-if="checkoutCharge.status === 'PAID'" class="w-full sm:max-w-lg animate-in fade-in zoom-in-95 duration-200 min-h-screen sm:min-h-0 flex flex-col justify-center">
        <!-- THE DIGITAL RECEIPT CARD -->
        <div class="receipt-card bg-white rounded-none sm:rounded-3xl border-0 sm:border border-slate-200/90 shadow-none sm:shadow-2xl shadow-slate-300/40 overflow-hidden relative w-full flex-1 sm:flex-none">
          <!-- TOP EMERALD ACCENT BAR -->
          <div class="h-2 w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600"></div>

          <!-- SUCCESS HERO BANNER -->
          <div class="pt-7 sm:pt-8 pb-4 sm:pb-5 px-4 sm:px-8 flex flex-col items-center text-center bg-gradient-to-b from-emerald-50/40 via-white to-white">
            <!-- CHECKMARK CIRCLE -->
            <div class="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shadow-xs mb-3">
              <Check :size="26" class="stroke-[3]" />
            </div>

            <!-- STATUS PILL -->
            <div class="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-[11px] font-bold uppercase tracking-wider mb-2 shadow-2xs">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span>Pembayaran Sukses</span>
            </div>

            <!-- GRAND TOTAL AMOUNT -->
            <h2 class="text-3xl sm:text-4xl font-black font-mono text-slate-900 tracking-tight leading-tight mb-1">
              {{ formatRupiah(checkoutCharge.totalAmount) }}
            </h2>

            <!-- SUBTITLE -->
            <p class="text-xs text-slate-400 font-medium">
              Terverifikasi otomatis dalam hitungan detik via OpenQRIS Engine
            </p>
          </div>

          <!-- FINTECH TICKET CUTOUT & DASHED TEAR LINE -->
          <div class="relative flex items-center px-4 my-2">
            <div class="hidden sm:block absolute -left-3 w-6 h-6 rounded-full bg-slate-50 border border-slate-200/90 shadow-inner"></div>
            <div class="w-full border-t-2 border-dashed border-slate-200/90"></div>
            <div class="hidden sm:block absolute -right-3 w-6 h-6 rounded-full bg-slate-50 border border-slate-200/90 shadow-inner"></div>
          </div>

          <!-- RECEIPT DETAILS BODY -->
          <div class="p-4 sm:p-6 space-y-3 text-xs">
            <!-- MERCHANT & CUSTOMER CARD -->
            <div class="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3">
              <div class="flex items-center gap-2.5">
                <div class="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-[#d71920] font-black text-xs shadow-2xs shrink-0">
                  <Store :size="16" />
                </div>
                <div>
                  <span class="text-[9px] uppercase font-bold text-slate-400 tracking-wider block">Merchant Toko</span>
                  <span class="font-extrabold text-slate-900 text-xs leading-tight block">{{ checkoutCharge.tenantName }}</span>
                </div>
              </div>
              <div v-if="checkoutCharge.customerName" class="text-right">
                <span class="text-[9px] uppercase font-bold text-slate-400 tracking-wider block">Pelanggan</span>
                <span class="font-semibold text-slate-800 text-xs block">{{ checkoutCharge.customerName }}</span>
              </div>
            </div>

            <!-- FINANCIAL BREAKDOWN (BORDERED CONTAINER) -->
            <div class="p-3 rounded-xl bg-slate-50/60 border border-slate-200/90 flex flex-col gap-1">
              <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400 pb-1 mb-0.5 border-b border-slate-200/70 flex items-center gap-1.5">
                <Receipt :size="11" />
                <span>Rincian Pembayaran</span>
              </div>

              <div class="flex justify-between items-center text-slate-600 leading-normal py-0.5">
                <span>Nominal Pokok</span>
                <span class="font-mono font-medium text-slate-800">{{ formatRupiah(checkoutCharge.amount) }}</span>
              </div>

              <div v-if="checkoutCharge.uniqueCode" class="flex justify-between items-center text-slate-600 leading-normal py-0.5">
                <div class="flex items-center gap-1.5">
                  <span>Kode Unik Verifikasi</span>
                  <span class="text-[9px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-mono font-bold border border-emerald-200 leading-none">
                    Otomatis
                  </span>
                </div>
                <span class="font-mono font-bold text-emerald-700">+{{ formatRupiah(checkoutCharge.uniqueCode) }}</span>
              </div>

              <div class="flex justify-between items-center pt-1.5 mt-0.5 border-t border-slate-200/90 font-bold text-slate-900 leading-normal">
                <span>Total Ditransfer</span>
                <span class="font-mono font-black text-emerald-700 text-sm sm:text-base">{{ formatRupiah(checkoutCharge.totalAmount) }}</span>
              </div>
            </div>

            <!-- TRANSACTION METADATA TABLE -->
            <div class="divide-y divide-slate-100 border-t border-b border-slate-200/80">
              <div class="py-1 flex justify-between items-center leading-normal">
                <span class="text-slate-400 font-medium">Nomor Order / Invoice</span>
                <div class="flex items-center gap-1.5">
                  <span class="font-mono font-bold text-slate-900">{{ checkoutCharge.orderId }}</span>
                  <button 
                    @click="copyInvoice" 
                    class="p-0.5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                    title="Salin Nomor Order"
                  >
                    <component :is="copiedInvoice ? Check : Copy" :size="11" :class="copiedInvoice ? 'text-emerald-600' : ''" />
                  </button>
                </div>
              </div>

              <div class="py-1 flex justify-between items-center leading-normal">
                <span class="text-slate-400 font-medium">ID Transaksi OpenQRIS</span>
                <div class="flex items-center gap-1.5">
                  <span class="font-mono text-[11px] text-slate-600">{{ checkoutCharge.id }}</span>
                  <button 
                    @click="copyChargeId" 
                    class="p-0.5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                    title="Salin ID Transaksi"
                  >
                    <component :is="copiedChargeId ? Check : Copy" :size="11" :class="copiedChargeId ? 'text-emerald-600' : ''" />
                  </button>
                </div>
              </div>

              <div class="py-1 flex justify-between items-center leading-normal">
                <span class="text-slate-400 font-medium">Metode Pembayaran</span>
                <span class="font-semibold text-slate-800 flex items-center gap-1">
                  <QrCode :size="12" class="text-red-600" />
                  <span>QRIS Dinamis ASPI</span>
                </span>
              </div>

              <div class="py-1 flex justify-between items-center leading-normal">
                <span class="text-slate-400 font-medium">Waktu Transaksi</span>
                <span class="font-mono text-slate-700 text-[11px]">
                  {{ formatDateTime(checkoutCharge.paidAt || checkoutCharge.createdAt) }}
                </span>
              </div>
            </div>

            <!-- DIGITAL TRUST WATERMARK -->
            <div class="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between text-[10px] text-slate-500">
              <div class="flex items-center gap-2">
                <ShieldCheck :size="14" class="text-emerald-600 shrink-0" />
                <span>Transaksi sah terverifikasi resmi oleh QRIS Gateway Engine.</span>
              </div>
              <span class="font-mono text-[9px] font-bold text-slate-400 uppercase tracking-wider shrink-0">SETTLED</span>
            </div>

            <!-- ACTION BUTTONS -->
            <div class="pt-1 flex flex-col sm:flex-row gap-2 print:hidden">
              <button 
                @click="printReceipt" 
                class="flex-1 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-sm active:scale-98"
              >
                <Printer :size="14" />
                <span>Cetak / Simpan PDF</span>
              </button>

              <button 
                @click="copyReceiptText" 
                class="py-2.5 px-4 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-2xs active:scale-98"
                title="Salin format ringkas untuk dibagikan ke WhatsApp"
              >
                <component :is="copiedReceipt ? Check : Share2" :size="14" :class="copiedReceipt ? 'text-emerald-600' : 'text-slate-600'" />
                <span>{{ copiedReceipt ? 'Tersalin!' : 'Bagikan Struk' }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- ========================================== -->
      <!-- 4. PENDING CHECKOUT STATE (ACTIVE QRIS)    -->
      <!-- ========================================== -->
      <div v-else class="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-in fade-in duration-200 p-4 sm:p-0">
        <!-- LEFT COLUMN: OFFICIAL QRIS CARD -->
        <div class="lg:col-span-5 flex flex-col items-center">
          <div class="w-full max-w-[340px] drop-shadow-xl">
            <OfficialQrisCard 
              :merchantName="checkoutCharge.tenantName"
              :orderId="checkoutCharge.orderId"
              :qrDataUrl="checkoutCharge.qrDataUrl"
              :totalAmount="checkoutCharge.totalAmount"
              :uniqueCode="checkoutCharge.uniqueCode"
              :showDownload="true"
            />
          </div>
          <p class="text-[11px] text-slate-400 text-center mt-3 max-w-xs font-medium">
            Pindai menggunakan aplikasi e-wallet atau mobile banking apa saja yang mendukung QRIS.
          </p>
        </div>

        <!-- RIGHT COLUMN: PAYMENT DETAILS & INSTRUCTIONS -->
        <div class="lg:col-span-7 bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-lg sm:shadow-xl p-4 sm:p-7 flex flex-col justify-between">
          <div class="space-y-5">
            <!-- STATUS & COUNTDOWN HEADER -->
            <div class="flex items-center justify-between pb-4 border-b border-slate-100">
              <div class="flex items-center gap-2">
                <span class="relative flex h-2.5 w-2.5">
                  <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <div>
                  <h3 class="text-xs font-extrabold text-slate-900 leading-none">Menunggu Pembayaran</h3>
                  <span class="text-[10px] text-slate-400">Verifikasi otomatis aktif</span>
                </div>
              </div>

              <!-- COUNTDOWN TIMER BADGE -->
              <div 
                :class="[
                  'flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold border transition',
                  isNearExpiry 
                    ? 'bg-rose-50 border-rose-200 text-rose-700 animate-pulse' 
                    : 'bg-amber-50 border-amber-200 text-amber-800'
                ]"
              >
                <Clock :size="13" />
                <span>{{ formattedCountdown }}</span>
              </div>
            </div>

            <!-- EXACT AMOUNT CALLOUT (CRITICAL FINANCIAL BOX) -->
            <div class="p-4 rounded-2xl bg-gradient-to-br from-red-50/70 via-rose-50/40 to-slate-50 border border-red-200/80 shadow-xs relative overflow-hidden">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <div class="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-red-700">
                    <AlertTriangle :size="12" />
                    <span>Wajib Transfer Persis:</span>
                  </div>
                  <div class="text-2xl sm:text-3xl font-black font-mono text-slate-900 mt-1 tracking-tight">
                    {{ formatRupiah(checkoutCharge.totalAmount) }}
                  </div>
                  <div class="text-[11px] text-slate-600 mt-1 flex items-center gap-1.5">
                    <span>Termasuk</span>
                    <span class="font-bold text-red-700 font-mono px-1 py-0.2 rounded bg-red-100/80 border border-red-200">
                      {{ checkoutCharge.uniqueCode }}
                    </span>
                    <span>kode unik verifikasi</span>
                  </div>
                </div>

                <button 
                  @click="copyAmount" 
                  class="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs active:scale-95 shrink-0"
                >
                  <component :is="copiedAmount ? Check : Copy" :size="12" />
                  <span>{{ copiedAmount ? 'Tersalin!' : 'Salin Nominal' }}</span>
                </button>
              </div>

              <div class="mt-3 pt-2.5 border-t border-red-200/60 text-[10px] text-red-800/80 leading-relaxed font-medium">
                ⚠️ Mohon tidak membulatkan nominal agar sistem dapat mencocokkan transfer Anda secara otomatis tanpa bukti bayar manual.
              </div>
            </div>

            <!-- ORDER SUMMARY SUMMARY -->
            <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-100 divide-y divide-slate-200/70 text-xs">
              <div class="pb-2 flex justify-between items-center text-slate-600">
                <span>Nomor Order:</span>
                <div class="flex items-center gap-1 font-mono font-bold text-slate-900">
                  <span>{{ checkoutCharge.orderId }}</span>
                  <button @click="copyInvoice" class="text-slate-400 hover:text-slate-700 cursor-pointer p-0.5" title="Salin Invoice">
                    <component :is="copiedInvoice ? Check : Copy" :size="11" />
                  </button>
                </div>
              </div>

              <div class="pt-2 flex justify-between items-center text-slate-600">
                <span>Toko Merchant:</span>
                <span class="font-semibold text-slate-900">{{ checkoutCharge.tenantName }}</span>
              </div>
            </div>

            <!-- PAYMENT GUIDES (TABS) -->
            <div class="space-y-3 pt-1">
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-slate-800">Petunjuk Pembayaran</span>
                <div class="flex p-0.5 rounded-lg bg-slate-100 text-[11px] font-semibold">
                  <button 
                    @click="activeTab = 'ewallet'"
                    :class="['px-2.5 py-1 rounded-md transition cursor-pointer', activeTab === 'ewallet' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800']"
                  >
                    E-Wallet
                  </button>
                  <button 
                    @click="activeTab = 'm-banking'"
                    :class="['px-2.5 py-1 rounded-md transition cursor-pointer', activeTab === 'm-banking' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800']"
                  >
                    M-Banking
                  </button>
                </div>
              </div>

              <!-- E-WALLET STEPS -->
              <div v-if="activeTab === 'ewallet'" class="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200 text-xs space-y-2 text-slate-600 leading-relaxed">
                <div class="flex items-start gap-2">
                  <span class="w-4 h-4 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
                  <span>Buka aplikasi <strong>GoPay, DANA, OVO, atau ShopeePay</strong> di ponsel Anda.</span>
                </div>
                <div class="flex items-start gap-2">
                  <span class="w-4 h-4 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
                  <span>Pilih menu <strong>Bayar</strong> atau ikon <strong>Scan QRIS</strong>.</span>
                </div>
                <div class="flex items-start gap-2">
                  <span class="w-4 h-4 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
                  <span>Arahkan kamera ke kode QR di layar dan konfirmasi nominal pembayaran.</span>
                </div>
              </div>

              <!-- M-BANKING STEPS -->
              <div v-else class="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200 text-xs space-y-2 text-slate-600 leading-relaxed">
                <div class="flex items-start gap-2">
                  <span class="w-4 h-4 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
                  <span>Buka aplikasi mobile banking Anda (<strong>BCA mobile, Livin by Mandiri, BRImo, BNI Mobile</strong>).</span>
                </div>
                <div class="flex items-start gap-2">
                  <span class="w-4 h-4 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
                  <span>Pilih tombol <strong>QRIS</strong> pada navigasi utama aplikasi bank.</span>
                </div>
                <div class="flex items-start gap-2">
                  <span class="w-4 h-4 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
                  <span>Scan kode QR di samping dan selesaikan transaksi dengan PIN Anda.</span>
                </div>
              </div>
            </div>
          </div>

          <!-- DEMO / TEST SIMULATOR BANNER (hanya saat SANDBOX_MODE aktif di server) -->
          <div v-if="showSimulate" class="mt-6 pt-4 border-t border-slate-100">
            <div class="p-2.5 rounded-xl bg-slate-100/80 border border-slate-200 flex items-center justify-between gap-2">
              <div class="flex items-center gap-2 text-[11px] text-slate-500">
                <Zap :size="13" class="text-amber-500 shrink-0" />
                <span>Uji coba alur pembayaran di lingkungan sandbox?</span>
              </div>
              <button 
                @click="onSimulatePaid" 
                class="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 text-[11px] font-bold transition cursor-pointer shadow-2xs hover:border-amber-400 shrink-0 active:scale-95"
              >
                Simulasi Bayar
              </button>
            </div>
            <p v-if="simulateError" class="mt-1.5 text-[11px] text-rose-600">{{ simulateError }}</p>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
@media print {
  /* Print Optimization: Clean Receipt Output */
  body, .checkout-page-root {
    background: white !important;
    padding: 0 !important;
    margin: 0 !important;
  }
  .receipt-card {
    border: none !important;
    box-shadow: none !important;
    max-width: 100% !important;
    width: 100% !important;
  }
}
</style>
