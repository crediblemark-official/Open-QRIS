<script setup lang="ts">
import { ref, watch } from 'vue';
import { 
  Smartphone, 
  Copy, 
  Check, 
  CheckCircle2, 
  AlertCircle, 
  Send
} from 'lucide-vue-next';

const props = withDefaults(defineProps<{
  listenerUrl: string;
  tenants?: any[];
}>(), {
  tenants: () => [],
});

const emit = defineEmits<{
  (e: 'copy', text: string, id: string): void;
  (e: 'toast', msg: string): void;
  (e: 'refresh'): void;
}>();

const testNotifText = ref('DANA: Kamu menerima uang Rp 25.142 dari Budi');
const testNotifLoading = ref(false);
const testNotifResult = ref<any>(null);
const copiedUrl = ref(false);
// Default: token HP milik toko merchant yang sedang login (fallback: input manual)
const testDeviceToken = ref(
  props.tenants?.[0]?.deviceToken || (typeof localStorage !== 'undefined' ? localStorage.getItem('qris_admin_token') || '' : '')
);
watch(
  () => props.tenants,
  (list) => {
    if (list && list.length > 0 && list[0]?.deviceToken) {
      testDeviceToken.value = list[0].deviceToken;
    }
  },
  { immediate: true }
);

const getDeviceStatus = (app: any) => {
  if (!app.deviceLastSeen) {
    return { status: 'UNKNOWN', label: 'Belum Terhubung', color: 'bg-slate-100 text-slate-500 border-slate-200', dot: 'bg-slate-400' };
  }
  const diffMs = Date.now() - new Date(app.deviceLastSeen).getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins <= 15) {
    const batt = app.deviceBattery ? ` · ${app.deviceBattery}%${app.deviceIsCharging ? '⚡' : ''}` : '';
    return { status: 'ONLINE', label: `Online${batt}`, color: 'bg-emerald-50 text-emerald-800 border-emerald-200', dot: 'bg-emerald-500' };
  }
  if (diffMins <= 60) {
    return { status: 'IDLE', label: `Idle (${diffMins}m lalu)`, color: 'bg-amber-50 text-amber-800 border-amber-200', dot: 'bg-amber-500' };
  }
  const hours = Math.floor(diffMins / 60);
  return { status: 'OFFLINE', label: `Offline (${hours > 24 ? Math.floor(hours / 24) + 'h lalu' : hours + 'j lalu'})`, color: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500' };
};

const copyUrl = async () => {
  await navigator.clipboard.writeText(props.listenerUrl);
  copiedUrl.value = true;
  setTimeout(() => (copiedUrl.value = false), 2000);
};

const onSendTest = async () => {
  if (!testNotifText.value.trim()) return;
  if (!testDeviceToken.value.trim()) {
    emit('toast', 'Isi Device Token toko Anda terlebih dahulu (tersedia di daftar HP di bawah)');
    return;
  }
  testNotifLoading.value = true;
  testNotifResult.value = null;
  try {
    const res = await fetch('/v1/webhooks/listener', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Device-Token': testDeviceToken.value.trim(),
      },
      body: JSON.stringify({ text: testNotifText.value }),
    });
    const json = await res.json();
    testNotifResult.value = json;
    if (json.success && json.matched) {
      emit('toast', 'Order berhasil terverifikasi otomatis!');
      emit('refresh');
    } else {
      emit('toast', json.message || 'Sinyal terkirim');
    }
  } catch (e) {
    emit('toast', 'Gagal mengirim sinyal');
  } finally {
    testNotifLoading.value = false;
  }
};
</script>

<template>
  <div class="border-b border-slate-200/90 divide-y lg:divide-y-0 lg:divide-x divide-slate-200/90 bg-white grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
    <!-- STEPS GUIDE -->
    <div class="lg:col-span-7 p-6 bg-white flex flex-col justify-between">
      <div>
        <div class="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div class="flex items-center gap-2">
            <Smartphone :size="15" class="text-slate-600" />
            <span class="text-xs font-bold text-slate-800 uppercase tracking-wider">Setup Notifikasi Gateway</span>
          </div>
          <span class="text-xs px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
            MDR 0%
          </span>
        </div>

        <div class="divide-y divide-slate-100">
          <!-- Step 1 -->
          <div class="py-3.5 flex items-start gap-3">
            <div class="w-6 h-6 rounded bg-[#d71920] text-white text-xs font-bold flex items-center justify-center shrink-0">
              1
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-slate-900">Aplikasi Android Resmi: OpenQRIS Listener</span>
                <span class="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">Native Android Service</span>
              </div>
              <div class="text-xs text-slate-600 mt-0.5 leading-relaxed">
                Gunakan aplikasi native resmi <strong>OpenQRIS Listener</strong> mandiri (berada di folder <code>android/</code>). Tanpa perlu aplikasi pihak ketiga seperti MacroDroid atau Notification Forwarder.
              </div>
              <div class="mt-2.5 p-2.5 bg-slate-50 border border-slate-200/80 rounded-md text-xs space-y-1">
                <div class="font-semibold text-slate-800 flex items-center gap-1.5">
                  <Smartphone :size="13" class="text-[#d71920]" />
                  <span>Source Code Project APK Tersedia:</span>
                </div>
                <div class="font-mono text-[11px] text-slate-600 break-all select-all bg-white p-1.5 rounded border border-slate-200">
                  android/
                </div>
                <div class="text-[11px] text-slate-500 pt-0.5">
                  Buka folder <code>android/</code> di Android Studio atau jalankan <code>./gradlew assembleDebug</code> untuk build APK.
                </div>
              </div>
            </div>
          </div>

          <!-- Step 2 -->
          <div class="py-3.5 flex items-start gap-3">
            <div class="w-6 h-6 rounded bg-slate-900 text-white text-xs font-bold flex items-center justify-center shrink-0">
              2
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-xs font-bold text-slate-900">Isi URL Endpoint Listener di Aplikasi HP</div>
              <div class="text-xs text-slate-600 mt-0.5">
                Buka aplikasi OpenQRIS Listener di HP, lalu masukkan URL webhook gateway di bawah ini:
              </div>
              
              <div class="flex items-center justify-between bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 mt-2">
                <span class="font-mono text-xs text-red-700 truncate select-all">{{ listenerUrl }}</span>
                <button 
                  @click="copyUrl" 
                  class="p-1 rounded text-slate-400 hover:text-slate-700 transition cursor-pointer shrink-0 ml-2"
                  title="Salin URL"
                >
                  <component :is="copiedUrl ? Check : Copy" :size="12" :class="copiedUrl ? 'text-emerald-600' : ''" />
                </button>
              </div>
            </div>
          </div>

          <!-- Step 3 -->
          <div class="py-3.5 flex items-start gap-3">
            <div class="w-6 h-6 rounded bg-slate-900 text-white text-xs font-bold flex items-center justify-center shrink-0">
              3
            </div>
            <div>
              <div class="text-xs font-bold text-slate-900">Aktifkan Izin & Auto-Settlement 1 Detik</div>
              <div class="text-xs text-slate-600 mt-0.5 leading-relaxed">
                Klik <strong>"Buka Izin Akses Notifikasi"</strong> di dalam aplikasi. Begitu uang masuk ke DANA/Bank, background service langsung menangkap notifikasi dan menembakkan webhook untuk menandai transaksi <strong>PAID</strong> seketika.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- LIVE TEST CONSOLE -->
    <div class="lg:col-span-5 p-6 bg-slate-50/40">
      <div class="flex justify-between items-center pb-3 border-b border-slate-200/80 mb-4">
        <div class="flex items-center gap-1.5">
          <Smartphone :size="15" class="text-slate-700" />
          <span class="text-xs font-bold text-slate-900 uppercase tracking-wider">Simulator Sinyal HP</span>
        </div>
        <span class="text-[10px] font-mono font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
          Regex Matcher
        </span>
      </div>

      <!-- PRESETS -->
      <div class="mb-3">
        <label class="text-[11px] font-semibold text-slate-600 mb-1 block">Pilih Contoh Notifikasi:</label>
        <div class="flex gap-1 flex-wrap">
          <button 
            class="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-xs text-slate-700 transition cursor-pointer border border-slate-200" 
            @click="testNotifText = 'DANA: Kamu menerima uang Rp 25.142 dari Budi'"
          >
            DANA
          </button>
          <button 
            class="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-xs text-slate-700 transition cursor-pointer border border-slate-200" 
            @click="testNotifText = 'myBCA: M-Transfer masuk Rp 50.123 dari AHMAD'"
          >
            BCA
          </button>
          <button 
            class="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-xs text-slate-700 transition cursor-pointer border border-slate-200" 
            @click="testNotifText = 'Livin: Dana masuk sebesar Rp 100.450,00'"
          >
            Mandiri
          </button>
        </div>
      </div>

      <!-- TEXTAREA -->
      <div class="space-y-1 mb-3">
        <label class="text-xs font-semibold text-slate-700">Device Token Toko</label>
        <input
          v-model="testDeviceToken"
          class="w-full p-2 bg-slate-50 border border-slate-200 rounded-md text-[11px] font-mono text-slate-900 focus:outline-none focus:border-[#d71920] focus:bg-white transition"
          placeholder="dev_xxxxxxxx..."
        />
        <label class="text-xs font-semibold text-slate-700 pt-1 block">Payload Teks Notifikasi</label>
        <textarea 
          v-model="testNotifText" 
          class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-md text-xs font-mono text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#d71920] focus:bg-white transition leading-relaxed" 
          rows="3"
        ></textarea>
      </div>

      <button 
        @click="onSendTest" 
        :disabled="testNotifLoading" 
        class="btn btn-primary w-full cursor-pointer text-xs font-bold h-9"
      >
        <Send :size="12" />
        <span>{{ testNotifLoading ? 'Memeriksa...' : 'Kirim Sinyal Notifikasi' }}</span>
      </button>

      <!-- RESULT -->
      <div v-if="testNotifResult" class="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-md">
        <div v-if="testNotifResult.matched" class="text-xs text-emerald-800 font-semibold flex items-start gap-1.5">
          <CheckCircle2 :size="15" class="shrink-0 mt-0.5 text-emerald-600" />
          <div>
            <div>Kecocokan Ditemukan!</div>
            <div class="text-[11px] text-slate-600 font-normal mt-0.5">
              Invoice <span class="text-slate-900 font-mono font-bold">{{ testNotifResult.order_id }}</span> otomatis diverifikasi lunas.
            </div>
          </div>
        </div>
        <div v-else class="text-xs text-amber-800 font-medium flex items-center gap-1.5">
          <AlertCircle :size="15" class="shrink-0 text-amber-600" />
          <span>{{ testNotifResult.message || 'Tidak ada order PENDING dengan nominal tersebut.' }}</span>
        </div>
      </div>

      <!-- PERANGKAT HP TERDAFTAR & HEALTH STATUS -->
      <div v-if="tenants.length > 0" class="mt-6 pt-4 border-t border-slate-200">
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-bold text-slate-900 uppercase tracking-wider">Status HP Merchant</span>
          <span class="text-[10px] font-mono text-slate-500">{{ tenants.length }} Terdaftar</span>
        </div>
        <div class="divide-y divide-slate-100 border border-slate-200 rounded-md bg-white">
          <div v-for="t in tenants" :key="t.id" class="p-2.5 flex items-center justify-between gap-2">
            <div class="min-w-0">
              <div class="font-bold text-xs text-slate-900 truncate">{{ t.name }}</div>
              <div class="text-[10px] text-slate-400 font-mono truncate">{{ t.deviceModel || 'OpenQRIS App' }}</div>
            </div>
            <div class="shrink-0 flex items-center gap-1.5">
              <span :class="['inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border', getDeviceStatus(t).color]">
                <span :class="['w-1.5 h-1.5 rounded-full', getDeviceStatus(t).dot]"></span>
                <span>{{ getDeviceStatus(t).label }}</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
