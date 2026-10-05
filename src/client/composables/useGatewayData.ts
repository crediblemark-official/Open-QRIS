import { ref, type Ref } from 'vue';
import type { User as UserType, Tenant, Charge, GatewaySettings } from '../types';

interface GatewayDataOptions {
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
  currentUser: Ref<UserType | null>;
  isAuthenticated: Ref<boolean>;
  showToast: (msg: string) => void;
}

export function useGatewayData(options: GatewayDataOptions) {
  const { authFetch, currentUser, isAuthenticated, showToast } = options;

  const settings = ref<GatewaySettings>({
    defaultStaticQRIS: '',
    useUniqueCode: true,
    expiryMinutes: 30
  });
  const tenants = ref<Tenant[]>([]);
  const transactions = ref<Charge[]>([]);
  const masterQRISInfo = ref<any>(null);
  const rawQRISInput = ref('');
  const showNewAppModal = ref(false);
  const newAppName = ref('');
  const newAppWebhook = ref('');
  const newAppStaticQRIS = ref('');
  const listenerUrl = ref(typeof window !== 'undefined' ? `${window.location.origin}/v1/webhooks/listener` : '');

  // Decode QRIS
  const decodeQRIS = async (qrisStr: string) => {
    if (!qrisStr.trim()) return;
    rawQRISInput.value = qrisStr;
    try {
      const res = await fetch('/v1/decode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qris: qrisStr.trim() }),
      });
      const json = await res.json();
      if (json.success) {
        masterQRISInfo.value = json.data;
      }
    } catch (err) {
      showToast('Terjadi kesalahan saat mem-parse QRIS');
    }
  };

  // Load Data
  const loadData = async () => {
    if (!isAuthenticated.value) return;

    try {
      const [resSettings, resTenants, resTx] = await Promise.all([
        authFetch('/v1/settings').then((r) => r.ok ? r.json() : null),
        authFetch('/v1/apps').then((r) => r.ok ? r.json() : null),
        // B12: jangan load seluruh tabel transaksi - ambil 100 terbaru saja.
        // Halaman riwayat memakai fetchTransactions() (server-side pagination).
        authFetch('/v1/transactions?limit=100').then((r) => r.ok ? r.json() : null),
      ]);

      if (resSettings && resSettings.success) {
        settings.value = resSettings.data;
      }
      if (resTenants && resTenants.success) {
        tenants.value = resTenants.data;
      }
      if (resTx && resTx.success) {
        transactions.value = resTx.data;
      }

      // Tentukan QRIS yang aktif: milik merchant atau default platform
      if (currentUser.value?.role === 'merchant' && tenants.value.length > 0) {
        const myTenant = tenants.value[0];
        if (myTenant.staticQRIS) {
          decodeQRIS(myTenant.staticQRIS);
        } else if (settings.value.defaultStaticQRIS) {
          decodeQRIS(settings.value.defaultStaticQRIS);
        }
      } else if (settings.value.defaultStaticQRIS) {
        decodeQRIS(settings.value.defaultStaticQRIS);
      }
    } catch (err) {
      console.error('Failed loading gateway data', err);
    }
  };

  // Save Master QRIS
  const saveMasterQRIS = async () => {
    if (!rawQRISInput.value.trim()) {
      showToast('Upload atau masukkan string QRIS terlebih dahulu');
      return;
    }

    // Jika merchant, simpan langsung ke data tenant tokonya
    if (currentUser.value?.role === 'merchant') {
      if (tenants.value.length > 0) {
        const myTenant = tenants.value[0];
        try {
          const res = await authFetch(`/v1/apps/${myTenant.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              static_qris: rawQRISInput.value.trim(),
            }),
          });
          const json = await res.json();
          if (json.success) {
            myTenant.staticQRIS = rawQRISInput.value.trim();
            showToast('QRIS toko Anda berhasil disimpan! Pembayaran pelanggan akan masuk ke rekening Anda.');
            loadData();
          } else {
            showToast(json.message || 'Gagal menyimpan QRIS toko');
          }
        } catch (e) {
          showToast('Gagal menyimpan QRIS toko');
        }
      } else {
        // Coba reload data atau tampilkan info ke merchant
        await loadData();
        if (tenants.value.length > 0) {
          return saveMasterQRIS();
        }
        showToast('Profil toko merchant belum siap. Silakan refresh halaman.');
      }
      return;
    }

    // Jika Administrator platform
    if (currentUser.value?.role === 'admin') {
      try {
        const res = await authFetch('/v1/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            default_static_qris: rawQRISInput.value.trim(),
            use_unique_code: settings.value.useUniqueCode,
            expiry_minutes: settings.value.expiryMinutes,
          }),
        });
        const json = await res.json();
        if (json.success) {
          settings.value = json.data;
          showToast('Master QRIS platform berhasil disimpan!');
        } else {
          showToast(json.message || 'Gagal menyimpan master QRIS platform');
        }
      } catch (err) {
        showToast('Gagal menyimpan master QRIS platform');
      }
      return;
    }

    showToast('Akses ditolak: Anda tidak memiliki izin untuk menyimpan konfigurasi ini.');
  };

  // Create SaaS App
  const createSaaSApp = async (appData?: { name: string; webhook: string; staticQRIS?: string }) => {
    const name = appData?.name ?? newAppName.value;
    const webhook = appData?.webhook ?? newAppWebhook.value;
    const staticQRIS = appData?.staticQRIS ?? newAppStaticQRIS.value;

    if (!name.trim() || !webhook.trim()) {
      showToast('Nama App dan Webhook URL wajib diisi');
      return;
    }
    try {
      const res = await authFetch('/v1/apps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          webhook_url: webhook.trim(),
          static_qris: staticQRIS?.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (json.success) {
        tenants.value.unshift(json.data);
        showNewAppModal.value = false;
        newAppName.value = '';
        newAppWebhook.value = '';
        newAppStaticQRIS.value = '';
        showToast('SaaS Client App berhasil dibuat!');
      }
    } catch (err) {
      showToast('Gagal membuat SaaS app');
    }
  };

  // Delete SaaS App
  const deleteSaaSApp = async (id: string) => {
    if (typeof window !== 'undefined' && !confirm('Hapus kredensial integrasi aplikasi ini?')) return;
    try {
      const res = await authFetch(`/v1/apps/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        tenants.value = tenants.value.filter((t) => t.id !== id);
        showToast('Aplikasi berhasil dihapus');
      }
    } catch (err) {
      showToast('Gagal menghapus aplikasi');
    }
  };

  // Fetch transaksi server-side (pagination + filter di server, bukan load semua di browser)
  const fetchTransactions = async (
    params: {
      search?: string;
      status?: string;
      dateRange?: string;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{
    items: Charge[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
    counts?: Record<string, number>;
  }> => {
    const qs = new URLSearchParams();
    qs.set('page', String(params.page ?? 1));
    qs.set('limit', String(params.limit ?? 25));
    if (params.search?.trim()) qs.set('search', params.search.trim());
    if (params.status && params.status !== 'ALL') qs.set('status', params.status);
    if (params.dateRange && params.dateRange !== 'ALL') qs.set('date_range', params.dateRange);

    const res = await authFetch(`/v1/transactions?${qs.toString()}`);
    if (!res.ok) throw new Error('Gagal memuat transaksi');
    const json = await res.json();
    if (!json.success) throw new Error(json.message || 'Gagal memuat transaksi');
    return {
      items: (json.data || []) as Charge[],
      pagination: json.pagination || { page: 1, limit: params.limit ?? 25, total: 0, totalPages: 1 },
      counts: json.counts,
    };
  };

  // Simulate Paid
  const simulatePaid = async (chargeId: string) => {
    try {
      const res = await authFetch(`/v1/charges/${chargeId}/simulate-paid`, {
        method: 'POST',
      });
      const json = await res.json();
      if (json.success) {
        loadData();
        showToast('Pembayaran berhasil diverifikasi! Webhook terkirim.');
      }
    } catch (err) {
      showToast('Gagal simulasi bayar');
    }
  };

  return {
    settings,
    tenants,
    transactions,
    masterQRISInfo,
    rawQRISInput,
    showNewAppModal,
    newAppName,
    newAppWebhook,
    newAppStaticQRIS,
    listenerUrl,
    decodeQRIS,
    loadData,
    fetchTransactions,
    saveMasterQRIS,
    createSaaSApp,
    deleteSaaSApp,
    simulatePaid,
  };
}
