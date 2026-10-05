<script setup lang="ts">
import { Download, Check, ShieldCheck, QrCode } from 'lucide-vue-next';
import { ref } from 'vue';
import { formatRupiah } from '../utils/formatters';

const props = defineProps<{
  merchantName?: string;
  orderId?: string;
  qrDataUrl: string;
  totalAmount: number;
  uniqueCode?: number;
  nmid?: string;
  showDownload?: boolean;
}>();

const downloaded = ref(false);

const handleDownload = () => {
  if (!props.qrDataUrl) return;
  const link = document.createElement('a');
  link.href = props.qrDataUrl;
  link.download = `QRIS-${props.orderId || 'PAYMENT'}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  downloaded.value = true;
  setTimeout(() => (downloaded.value = false), 2000);
};
</script>

<template>
  <div class="official-qris-card bg-white border border-slate-200/90 rounded-2xl overflow-hidden text-center shadow-xl shadow-slate-200/60 select-none">
    <!-- QRIS NATIONAL HEADER -->
    <div class="official-qris-header bg-gradient-to-r from-[#d71920] to-[#b91c1c] px-4 py-3 relative overflow-hidden text-center text-white">
      <div class="absolute -right-6 -bottom-6 w-20 h-20 bg-white/10 rounded-full blur-xl pointer-events-none"></div>
      <div class="official-qris-logo-text flex items-center justify-center gap-1.5 font-black tracking-widest text-lg leading-none">
        <span>QRIS</span>
      </div>
      <div class="official-qris-sub-logo flex items-center justify-center gap-1 text-[9px] font-bold text-white/90 tracking-wider mt-1">
        <ShieldCheck :size="11" />
        <span>PEMBAYARAN DIGITAL STANDAR NASIONAL</span>
      </div>
    </div>

    <!-- MERCHANT INFO -->
    <div class="official-qris-merchant border-b border-slate-100 py-3 px-4 bg-slate-50/50">
      <div class="official-merchant-name text-slate-900 font-extrabold text-sm tracking-tight truncate" :title="merchantName">
        {{ merchantName || 'OPENQRIS MERCHANT STORE' }}
      </div>
      <div class="official-merchant-nmid text-[10px] font-mono font-bold text-slate-400 mt-0.5">
        {{ orderId ? `ORDER: ${orderId}` : (nmid ? `NMID: ${nmid}` : 'NMID : ID1020000000000') }}
      </div>
    </div>

    <!-- QR CONTAINER WITH CORNER TARGETS -->
    <div class="official-qris-qr-container relative p-5 flex justify-center items-center bg-white">
      <div class="relative p-2.5 bg-white rounded-2xl border border-slate-200 shadow-xs">
        <!-- Corner Targets for Scanner Framing -->
        <span class="absolute top-1.5 left-1.5 w-3.5 h-3.5 border-t-2 border-l-2 border-red-500 rounded-tl pointer-events-none"></span>
        <span class="absolute top-1.5 right-1.5 w-3.5 h-3.5 border-t-2 border-r-2 border-red-500 rounded-tr pointer-events-none"></span>
        <span class="absolute bottom-1.5 left-1.5 w-3.5 h-3.5 border-b-2 border-l-2 border-red-500 rounded-bl pointer-events-none"></span>
        <span class="absolute bottom-1.5 right-1.5 w-3.5 h-3.5 border-b-2 border-r-2 border-red-500 rounded-br pointer-events-none"></span>

        <img :src="qrDataUrl" alt="QRIS Code" class="w-[210px] h-[210px] block select-none rounded-lg" />
      </div>
    </div>

    <!-- AMOUNT BAR (LOCKED NOMINAL) -->
    <div class="official-qris-amount-bar mx-4 mb-3 p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
      <div class="official-amount-label text-[10px] font-bold text-slate-400 uppercase tracking-wider">
        Total Pembayaran Terkunci
      </div>
      <div class="official-amount-number text-xl font-black text-slate-900 font-mono tracking-tight mt-0.5">
        {{ formatRupiah(totalAmount) }}
      </div>
      <div v-if="uniqueCode" class="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] font-bold text-emerald-700">
        <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
        <span>Termasuk {{ uniqueCode }} kode unik verifikasi</span>
      </div>
    </div>

    <!-- DOWNLOAD ACTION -->
    <div v-if="showDownload !== false && qrDataUrl" class="px-4 pb-3">
      <button 
        type="button" 
        @click="handleDownload" 
        class="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer border border-slate-200 shadow-2xs active:scale-98"
      >
        <component :is="downloaded ? Check : Download" :size="13" :class="downloaded ? 'text-emerald-600' : 'text-slate-600'" />
        <span>{{ downloaded ? 'QR Berhasil Disimpan!' : 'Unduh Gambar QRIS' }}</span>
      </button>
    </div>

    <!-- FOOTER WITH ALL MAJOR APPS -->
    <div class="official-qris-footer border-t border-dashed border-slate-200 py-2.5 px-4 text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-center gap-1.5 flex-wrap bg-slate-50/50">
      <span>BCA</span> • <span>Mandiri</span> • <span>BRI</span> • <span>BNI</span> • <span>GoPay</span> • <span>OVO</span> • <span>DANA</span> • <span>ShopeePay</span>
    </div>
  </div>
</template>
