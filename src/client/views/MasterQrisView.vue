<script setup lang="ts">
import { ref } from 'vue';
import { 
  UploadCloud, 
  Check, 
  ShieldCheck, 
  Copy, 
  CheckCircle2, 
  QrCode,
  Tag,
  ChevronDown,
  ChevronUp
} from 'lucide-vue-next';
import jsQR from 'jsqr';
import { useClipboard } from '../composables/useClipboard';

const props = defineProps<{
  rawQRISInput: string;
  masterQRISInfo: any;
  isMerchant?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:rawQRISInput', val: string): void;
  (e: 'decode', qris: string): void;
  (e: 'save'): void;
  (e: 'toast', msg: string): void;
}>();

const qrisInputMode = ref<'upload' | 'text'>('upload');
const isDragging = ref(false);
const previewImage = ref<string | null>(null);
const { isCopied: copiedRaw, copy } = useClipboard();
const isInspectorExpanded = ref(false);

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
const handleTextareaInput = (val: string) => {
  emit('update:rawQRISInput', val);
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    emit('decode', val);
  }, 300);
};

const handleFile = (file: File) => {
  if (!file || !file.type.startsWith('image/')) {
    emit('toast', 'Pilih file gambar (PNG atau JPG)');
    return;
  }

  const reader = new FileReader();
  reader.onload = (event) => {
    previewImage.value = event.target?.result as string;
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imgData.data, imgData.width, imgData.height);
      if (code && code.data) {
        emit('update:rawQRISInput', code.data);
        emit('decode', code.data);
        emit('toast', 'QR Code DANA berhasil dipindai & didekode!');
      } else {
        emit('toast', 'QR Code tidak terdeteksi. Pastikan gambar tidak buram.');
      }
    };
    img.src = event.target?.result as string;
  };
  reader.readAsDataURL(file);
};

const onFileUpload = (e: Event) => {
  const target = e.target as HTMLInputElement;
  if (!target.files || target.files.length === 0) return;
  handleFile(target.files[0]);
};

const onDrop = (e: DragEvent) => {
  isDragging.value = false;
  if (e.dataTransfer && e.dataTransfer.files.length > 0) {
    handleFile(e.dataTransfer.files[0]);
  }
};

const copyRawQRIS = async () => {
  if (!props.rawQRISInput) return;
  await copy(props.rawQRISInput);
};
</script>

<template>
  <div class="border-b border-slate-200/90 divide-y lg:divide-y-0 lg:divide-x divide-slate-200/90 bg-white grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
    <!-- LEFT: INPUT & UPLOAD -->
    <div class="lg:col-span-7 p-4 sm:p-6 bg-white flex flex-col justify-between">
      <div>
        <!-- TOP TOOLBAR: MODE TOGGLE & STATUS BADGE -->
        <div class="flex items-center justify-between pb-4 border-b border-slate-100 mb-5 flex-wrap gap-2">
          <div class="flex items-center gap-1">
            <button 
              :class="['px-3 py-1.5 rounded text-xs font-semibold border transition cursor-pointer', qrisInputMode === 'upload' ? 'bg-slate-900 text-white border-slate-900 shadow-xs' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50']"
              @click="qrisInputMode = 'upload'"
            >
              Upload Screenshot DANA
            </button>
            <button 
              :class="['px-3 py-1.5 rounded text-xs font-semibold border transition cursor-pointer', qrisInputMode === 'text' ? 'bg-slate-900 text-white border-slate-900 shadow-xs' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50']"
              @click="qrisInputMode = 'text'"
            >
              Input String EMVCo
            </button>
          </div>
          <span class="text-xs px-2 py-0.5 rounded bg-red-50 text-red-700 border border-red-200 font-medium">
            DANA Merchant
          </span>
        </div>

        <!-- UPLOAD DROPZONE -->
        <div 
          v-if="qrisInputMode === 'upload'" 
          :class="[
            'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
            isDragging 
              ? 'border-[#d71920] bg-red-50/50' 
              : 'border-slate-300 hover:border-slate-400 bg-slate-50/50 hover:bg-slate-50'
          ]" 
          @click="($refs.fileInput as HTMLInputElement)?.click()"
          @dragover.prevent="isDragging = true"
          @dragleave.prevent="isDragging = false"
          @drop.prevent="onDrop"
        >
          <input 
            type="file" 
            ref="fileInput" 
            style="display: none;" 
            accept="image/*" 
            @change="onFileUpload" 
          />
          
          <div v-if="previewImage" class="flex flex-col items-center">
            <div class="w-24 h-24 rounded border border-slate-300 mb-2 bg-white p-1">
              <img :src="previewImage" class="w-full h-full object-contain" alt="QR Preview" />
            </div>
            <div class="text-xs font-bold text-emerald-700 flex items-center gap-1">
              <CheckCircle2 :size="14" />
              <span>Gambar Berhasil Didekode</span>
            </div>
            <div class="text-[11px] text-slate-500 mt-1">Klik untuk mengganti screenshot</div>
          </div>

          <div v-else>
            <UploadCloud :size="28" class="text-slate-400 mx-auto mb-2" />
            <div class="text-xs font-bold text-slate-900">Pilih atau Seret Screenshot QRIS DANA</div>
            <div class="text-[11px] text-slate-500 mt-1">Mendukung format PNG atau JPG. Diproses aman di browser.</div>
          </div>
        </div>

        <!-- TEXT MODE -->
        <div v-else class="space-y-1.5">
          <div class="flex justify-between items-center text-xs">
            <label class="font-semibold text-slate-700">String EMVCo Mentah (00020101...)</label>
            <button 
              v-if="rawQRISInput" 
              @click="copyRawQRIS" 
              class="text-[11px] text-[#d71920] hover:text-red-800 flex items-center gap-1 cursor-pointer font-medium"
            >
              <component :is="copiedRaw ? Check : Copy" :size="11" />
              <span>{{ copiedRaw ? 'Tersalin' : 'Salin String' }}</span>
            </button>
          </div>
          <textarea 
            :value="rawQRISInput" 
            @input="handleTextareaInput(($event.target as HTMLTextAreaElement).value)"
            class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-md text-xs font-mono text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#d71920] focus:bg-white transition leading-relaxed" 
            rows="5" 
            placeholder="00020101021126570014COM.DANA.ID..."
          ></textarea>
        </div>
      </div>

      <!-- SAVE ACTION -->
      <div class="mt-6 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div class="text-xs text-slate-500">
          <span v-if="rawQRISInput" class="text-emerald-700 font-medium">✓ Payload siap disimpan</span>
          <span v-else>Belum ada QRIS yang dimasukkan</span>
        </div>
        <button 
          @click="emit('save')" 
          class="btn btn-primary cursor-pointer w-full sm:w-auto" 
          :disabled="!rawQRISInput.trim()"
        >
          <Check :size="14" />
          <span>{{ isMerchant ? 'Simpan QRIS Toko' : 'Simpan Sebagai Master QRIS' }}</span>
        </button>
      </div>
    </div>

    <!-- RIGHT: EMVCO TAG INSPECTOR -->
    <div class="lg:col-span-5 p-4 sm:p-6 bg-slate-50/40">
      <div class="flex justify-between items-center pb-3 border-b border-slate-200 mb-4">
        <div class="flex items-center gap-1.5">
          <ShieldCheck :size="16" class="text-emerald-600" />
          <span class="text-xs font-bold text-slate-900 uppercase tracking-wider">EMVCo Tag Inspector</span>
        </div>
        <span v-if="masterQRISInfo" class="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
          VALID ASPI
        </span>
      </div>

      <div v-if="!masterQRISInfo" class="py-12 text-center text-slate-400">
        <QrCode :size="28" class="mx-auto mb-1 text-slate-300" />
        <p class="text-xs font-medium text-slate-600">Belum Ada QRIS Dipindai</p>
        <p class="text-[11px] text-slate-400 mt-0.5">Upload gambar di sebelah kiri untuk melihat rincian tag EMVCo.</p>
      </div>

      <div v-else class="space-y-3">
        <!-- Quick Summary Card -->
        <div class="p-3.5 bg-slate-50 border border-slate-200 rounded-md space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Nama Merchant</span>
            <span class="text-xs font-bold text-slate-900">{{ masterQRISInfo.merchantName }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Acquirer / ID</span>
            <span class="text-xs font-mono font-semibold text-emerald-700">{{ masterQRISInfo.acquirer }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Kota Lokasi</span>
            <span class="text-xs text-slate-700">{{ masterQRISInfo.merchantCity }}</span>
          </div>
        </div>

        <!-- Collapsible Inspector Details Toggle -->
        <div>
          <button 
            @click="isInspectorExpanded = !isInspectorExpanded" 
            class="w-full flex items-center justify-between p-2.5 bg-white hover:bg-slate-50 rounded border border-slate-200 text-xs font-medium text-slate-700 transition cursor-pointer"
          >
            <div class="flex items-center gap-1.5">
              <Tag :size="13" class="text-slate-400" />
              <span>Rincian Tag EMVCo TLV ({{ masterQRISInfo.elementsCount }} Tag)</span>
            </div>
            <component :is="isInspectorExpanded ? ChevronUp : ChevronDown" :size="14" class="text-slate-400" />
          </button>

          <!-- Expanded Details Table -->
          <div v-if="isInspectorExpanded" class="mt-2 divide-y divide-slate-100 border border-slate-200 rounded-md bg-white p-1">
            <div class="py-2 px-2.5 flex justify-between items-center text-xs">
              <span class="text-slate-500 flex items-center gap-1.5">
                <Tag :size="11" class="text-slate-400" />
                <span>Tag 59 (Nama Merchant)</span>
              </span>
              <span class="font-bold text-slate-900">{{ masterQRISInfo.merchantName }}</span>
            </div>

            <div class="py-2 px-2.5 flex justify-between items-center text-xs">
              <span class="text-slate-500 flex items-center gap-1.5">
                <Tag :size="11" class="text-slate-400" />
                <span>Tag 26 (Acquirer / DANA ID)</span>
              </span>
              <span class="font-mono font-semibold text-emerald-700">{{ masterQRISInfo.acquirer }}</span>
            </div>

            <div class="py-2 px-2.5 flex justify-between items-center text-xs">
              <span class="text-slate-500 flex items-center gap-1.5">
                <Tag :size="11" class="text-slate-400" />
                <span>Tag 60 (Kota Merchant)</span>
              </span>
              <span class="text-slate-700 font-medium">{{ masterQRISInfo.merchantCity }}</span>
            </div>

            <div class="py-2 px-2.5 flex justify-between items-center text-xs">
              <span class="text-slate-500 flex items-center gap-1.5">
                <Tag :size="11" class="text-slate-400" />
                <span>Tag 53 (Currency)</span>
              </span>
              <span class="font-mono text-slate-700">{{ masterQRISInfo.currency }} (360 Rupiah)</span>
            </div>

            <div class="py-2 px-2.5 flex justify-between items-center text-xs">
              <span class="text-slate-500 flex items-center gap-1.5">
                <Tag :size="11" class="text-slate-400" />
                <span>Tag 01 (Metode Inisiasi)</span>
              </span>
              <span class="font-mono text-[11px] text-red-700 bg-red-50 px-1.5 py-0.2 rounded font-semibold border border-red-200">
                {{ masterQRISInfo.type }} (11 Static)
              </span>
            </div>

            <div class="py-2 px-2.5 flex justify-between items-center text-xs">
              <span class="text-slate-500 flex items-center gap-1.5">
                <Tag :size="11" class="text-slate-400" />
                <span>Total Objek TLV</span>
              </span>
              <span class="font-mono text-slate-700 font-semibold">{{ masterQRISInfo.elementsCount }} Tag</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
