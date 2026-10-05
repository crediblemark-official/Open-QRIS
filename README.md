# OpenQRIS Gateway ⚡

[![Bun](https://img.shields.io/badge/Runtime-Bun%20v1.4+-black?style=flat&logo=bun)](https://bun.sh)
[![Elysia](https://img.shields.io/badge/Backend-ElysiaJS-ff4081?style=flat)](https://elysiajs.com)
[![Vue](https://img.shields.io/badge/Frontend-Vue%203%20%2B%20Vite-42b883?style=flat&logo=vuedotjs)](https://vuejs.org)
[![TailwindCSS](https://img.shields.io/badge/CSS-Tailwind%20v4-38bdf8?style=flat&logo=tailwindcss)](https://tailwindcss.com)
[![Hexclave](https://img.shields.io/badge/Auth-Hexclave-6366f1?style=flat)](https://hexclave.com)
[![Android](https://img.shields.io/badge/Listener-Android%20Kotlin-3ddc84?style=flat&logo=android)](https://developer.android.com)
[![MDR](https://img.shields.io/badge/MDR%20Fee-0%25%20(Rp%200)-success?style=flat)](#)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**OpenQRIS** adalah platform *Self-Hosted Payment Gateway* mandiri berbasis **Dynamic QRIS (EMVCo)** dengan **0% MDR (Merchant Discount Rate)**. 

Dirancang khusus untuk ekosistem UMKM, startup, e-commerce, dan pengembang aplikasi SaaS di Indonesia yang ingin menerima pembayaran QRIS langsung ke rekening bank atau e-wallet pribadi tanpa potongan biaya transaksi per-pembayaran, tanpa penahanan dana pihak ketiga (*H+0 real-time settlement*), dan 100% kepemilikan data secara mandiri.

---

## 📑 Daftar Isi

- [Kenapa OpenQRIS?](#-kenapa-openqris)
- [Arsitektur & Alur Kerja Sistem](#-arsitektur--alur-kerja-sistem)
- [Fitur Utama](#-fitur-utama)
- [Teknologi yang Digunakan](#-teknologi-yang-digunakan)
- [Struktur Direktori](#-struktur-direktori)
- [Panduan Memulai Cepat (Quick Start)](#-panduan-memulai-cepat-quick-start)
  - [Prasyarat](#prasyarat)
  - [Langkah Instalasi](#langkah-instalasi)
  - [Konfigurasi Environment (.env)](#konfigurasi-environment-env)
  - [Menjalankan Aplikasi](#menjalankan-aplikasi)
- [Pemisahan Role: Platform Owner vs Merchant](#-pemisahan-role-platform-owner-vs-merchant)
- [Konfigurasi QRIS Statis ke Dinamis](#-konfigurasi-qris-statis-ke-dinamis)
- [OpenQRIS Android Listener (Native Service)](#-openqris-android-listener-native-service)
- [Dokumentasi API & Integrasi](#-dokumentasi-api--integrasi)
  - [Swagger UI](#swagger-ui)
  - [Membuat Tagihan (Create Charge)](#membuat-tagihan-create-charge)
  - [Popup Modal Embed (embed.js)](#popup-modal-embed-embedjs)
  - [Verifikasi Webhook (HMAC-SHA256)](#verifikasi-webhook-hmac-sha256)
  - [Plugin WooCommerce WordPress](#plugin-woocommerce-wordpress)
- [Keamanan & Pencegahan Fraud](#-keamanan--pencegahan-fraud)
- [Daftar Port Layanan](#-daftar-port-layanan)
- [Troubleshooting & FAQ](#-troubleshooting--faq)
- [Lisensi](#-lisensi)

---

## 💡 Kenapa OpenQRIS?

| Fitur | Gateway Konvensional (Midtrans/Xendit/dll) | OpenQRIS Mandiri |
|---|---|---|
| **Biaya Transaksi (MDR)** | 0.7% s/d 1.5% per transaksi | **0% (Rp 0)** |
| **Penyaluran Dana (Settlement)** | H+1 s/d H+3 ke rekening penampung | **Detik itu juga (H+0)** langsung ke rekening pribadi/bisnis Anda |
| **Kebutuhan Legalitas** | Perlu PT/CV/SIUP/NPWP untuk verifikasi | **Cukup QRIS DANA/BCA/Mandiri/GoPay pribadi atau bisnis** |
| **Kepemilikan Data** | Data tersimpan di server pihak ketiga | **100% On-Premise / Private Cloud Anda** |
| **Biaya Bulanan** | Kadang ada minimum charge / maintenance fee | **Gratis selamanya (Open Source)** |

---

## 🔄 Arsitektur & Alur Kerja Sistem

OpenQRIS menghubungkan QRIS statis standar Bank Indonesia dengan aplikasi e-commerce/SaaS Anda melalui sistem kode unik dan intersepsi notifikasi resmi:

```mermaid
sequenceDiagram
    autonumber
    actor Customer as Pelanggan
    participant Web as Web / SaaS Store
    participant Gateway as OpenQRIS Gateway
    participant Bank as M-Banking / E-Wallet
    participant HP as HP Android (OpenQRIS Listener)
    participant Telegram as Telegram Merchant

    Customer->>Web: Checkout Pesanan (contoh: Rp 50.000)
    Web->>Gateway: POST /v1/charges (amount: 50000)
    Gateway-->>Gateway: Hitung Kode Unik (misal: +123 -> Rp 50.123)
    Gateway-->>Gateway: Injeksi Tag 54 & Hitung CRC16 QRIS Dinamis
    Gateway-->>Web: Respon URL Checkout & QR Image
    Web-->>Customer: Tampilkan QRIS Dinamis (Rp 50.123)
    
    Customer->>Bank: Scan & Bayar via QRIS (Rp 50.123)
    Bank-->>HP: Push Notifikasi Uang Masuk ("DANA: Saldo Masuk Rp 50.123...")
    HP->>Gateway: POST /v1/webhooks/listener (Forward Notifikasi)
    
    Gateway-->>Gateway: Anti-Debit Guard & Deduplication Check
    Gateway-->>Gateway: Pencocokan Tagihan Pending (Match Rp 50.123)
    Gateway-->>Gateway: Update Status Charge -> PAID
    
    par Notifikasi Lunas
        Gateway->>Web: Webhook HMAC (event: charge.paid)
        Web-->>Customer: Pesanan Diproses Otomatis
    and Notifikasi Telegram
        Gateway->>Telegram: Kirim Pesan Alert Pembayaran Berhasil
    and Real-Time Checkout UI
        Gateway-->>Customer: Halaman Checkout Berganti "Lunas! 🎉"
    end
```

---

## ✨ Fitur Utama

### 1. Core EMVCo Engine
- **Konversi Statis ke Dinamis**: Mengubah QRIS statis (Tag `010211`) menjadi QRIS dinamis (Tag `010212`) yang mengunci nominal pembayaran secara otomatis di aplikasi M-Banking pembeli.
- **Kalkulasi CRC16 Otomatis**: Menghitung ulang checksum standar **CRC16-CCITT (0xFFFF, Polinomial 0x1021)** untuk Tag 63 pada setiap generate tagihan.
- **Algoritma Kode Unik 3 Digit**: Menambahkan kode unik (misal: Rp 1 - Rp 999) untuk membedakan transaksi nominal kembar secara bersamaan tanpa tabrakan (*zero collision*).
- **Auto-Reaper Kadaluarsa**: Tagihan yang melewati batas waktu kedaluwarsa (*default: 15-30 menit*) secara otomatis ditandai `EXPIRED` di background.

### 2. Multi-Tenancy & Role-Based Access
- **Admin Panel (Platform Owner)**:
  - Monitoring seluruh transaksi global platform lintas-tenant.
  - Pengaturan Master QRIS default platform.
  - Kelola seluruh merchant/klien SaaS, API Keys, dan webhook.
  - Pembuatan Payment Link lintas-tenant dengan dropdown toko.
  - Export CSV transaksi global dengan detail tenant.
- **Merchant Dashboard (Tenant)**:
  - Metrik khusus toko (Total Pendapatan, Omset 24 Jam, Tagihan Menunggu, Total Order).
  - Generator Payment Link instan dengan tombol **Bagikan ke WhatsApp** (`wa.me`).
  - Pengaturan Secret Key, Public Key, Webhook URL, dan Static QRIS toko sendiri.
  - Token pairing eksklusif untuk HP Android Listener.

### 3. Autentikasi Modern dengan Hexclave
- Didukung oleh [Hexclave](https://hexclave.com) untuk manajemen user kelas enterprise:
  - **Passkeys (Biometrik WebAuthn)** login tanpa password dengan aman.
  - **Google OAuth Single Sign-On (SSO)**.
  - **Verifikasi Email & Reset Password terintegrasi**.
  - **MFA / TOTP (Google Authenticator)**.
  - **Fallback JWT Lokal** untuk otentikasi internal berkecepatan tinggi.
  - Penetapan role otomatis: email di `ADMIN_EMAILS` otomatis memperoleh status **Admin Platform**.

### 4. Official Android Native Listener
- Aplikasi Android resmi (Kotlin) dengan background service `NotificationListenerService`.
- **Anti-Debit Guard**: Filter pintar yang otomatis membuang notifikasi uang keluar/pembayaran belanja agar tidak salah verifikasi saldo masuk.
- **Device Telemetry**: Dashboard memantau status HP secara live (level baterai, status charging, model HP, waktu aktif terakhir).
- **Auto-Boot Receiver**: Layanan otomatis aktif kembali saat HP dinyalakan ulang.
- Mendukung aplikasi bank & e-wallet Indonesia: **DANA**, **BCA**, **Mandiri Livin'**, **BRImo**, **BNI wondr**, **GoPay**, **OVO**, **ShopeePay**, **SeaBank**, dan **Bank Jago**.

### 5. Integrasi Fleksibel
- **RESTful API** lengkap dengan OpenAPI / Swagger UI interaktif.
- **Modal Popup (`embed.js`)**: Pasang pembayaran QRIS popup di halaman web Anda hanya dengan 2 baris JavaScript.
- **Plugin WooCommerce**: Plugin WordPress siap download (`/downloads/woocommerce-openqris.zip`) untuk toko online WooCommerce.
- **Webhook Aman**: Pengiriman event dengan tanda tangan digital `X-OpenQRIS-Signature` menggunakan algoritma HMAC-SHA256 serta fitur *Resend Webhook*.
- **Notifikasi Telegram**: Alert uang masuk real-time langsung ke Bot / Channel Telegram merchant.
- **Hosted Checkout Page**: Halaman pembayaran responsif dengan QRIS SVG tajam, timer hitung mundur, tombol salin nominal presisi, auto-refresh polling, dan efek animasi *confetti* saat pembayaran berhasil.

---

## 🛠 Teknologi yang Digunakan

- **Runtime**: [Bun v1.4+](https://bun.sh) (Eksekusi JavaScript/TypeScript ultra-cepat)
- **Backend Framework**: [ElysiaJS v1.4+](https://elysiajs.com) (Router HTTP berkinerja tinggi)
- **Database & ORM**: [PostgreSQL](https://www.postgresql.org) + [Drizzle ORM](https://orm.drizzle.team) (Type-safe & High Performance)
- **Frontend**: [Vue 3](https://vuejs.org) (Composition API, `<script setup>`) + [Vite 6](https://vitejs.dev)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com) + [Lucide Icons](https://lucide.dev)
- **User Management & Auth**: [Hexclave JS & CLI](https://hexclave.com)
- **Mobile Listener**: Native Android Kotlin (`android/`)

---

## 📁 Struktur Direktori

```text
QRIS/
├── android/                   # Aplikasi Native Android Listener (Kotlin)
│   ├── app/src/main/          # NotificationListenerService & Activity
│   └── README.md              # Petunjuk khusus build APK Android
├── drizzle/                   # Migrasi SQL Drizzle
├── public/                    # Aset publik & installer WooCommerce zip
├── src/
│   ├── client/                # Frontend Vue 3 Single Page Application
│   │   ├── components/        # Komponen UI (OfficialQrisCard, StatusBadge, dll)
│   │   ├── views/             # Halaman (Dashboard, HostedCheckout, Docs, dll)
│   │   ├── lib/hexclave.ts    # Inisialisasi SDK Klien Hexclave
│   │   ├── App.vue            # Shell navigasi & role-based routing
│   │   └── main.ts            # Entrypoint client
│   ├── db/                    # Drizzle ORM Schema, Client & Repositories (PostgreSQL)
│   │   ├── repositories/      # Repositories (Charges, Tenants, Users, Webhooks, dll)
│   │   ├── schema.ts          # Skema tabel database PostgreSQL
│   │   └── index.ts           # Koneksi Drizzle Pool
│   └── server/                # Backend API ElysiaJS
│       ├── core/              # EMVCo Engine & Smart Notification Parser
│       ├── hexclave/          # Integrasi Hexclave Server SDK
│       ├── middleware/        # JWT Auth Guard & RBAC (Admin vs Merchant)
│       ├── routes/            # Modular Endpoint API (Charges, Webhooks, Apps, dll)
│       ├── services/          # Business logic, QRIS Service, Telegram, Webhook
│       └── index.ts           # Server entrypoint & routing utama
├── drizzle.config.ts          # Konfigurasi Drizzle Kit
├── hexclave.config.ts         # Konfigurasi fitur autentikasi & email Hexclave
├── .env.example               # Contoh konfigurasi environment
├── package.json               # Dependensi & script manajemen project
└── vite.config.ts             # Konfigurasi bundler Vite
```

---

## 🚀 Panduan Memulai Cepat (Quick Start)

### Prasyarat
1. **Bun**: Pastikan Bun sudah terpasang di sistem operasi Anda.
   ```bash
   curl -fsSL https://bun.sh/install | bash
   ```
2. **Android Studio** atau **Gradle** (Opsional, hanya jika ingin meng-compile ulang APK Android Listener dari source code).

---

### Langkah Instalasi

1. **Clone repository ini**:
   ```bash
   git clone https://github.com/username/openqris.git
   cd openqris
   ```

2. **Install dependensi**:
   ```bash
   bun install
   ```

---

### Konfigurasi Environment (`.env`)

Salin file `.env.example` menjadi `.env`:
```bash
cp .env.example .env
```

Buka file `.env` dan sesuaikan nilainya:

```ini
# Port Server Backend
PORT=3000

# Secret Key untuk Token Sesi JWT Lokal
JWT_SECRET=rahasia_super_secure_jwt_key_openqris_2026

# Daftar email Administrator Platform Owner (dipisah koma jika lebih dari satu)
# Setiap user yang login dengan email ini otomatis menjadi role 'admin'
ADMIN_EMAILS=info.rasyiqi@gmail.com,admin@bisnisanda.com

# Konfigurasi Hexclave (Otentikasi, Passkey & Email)
HEXCLAVE_API_URL=https://apigcp.hexclave.com
HEXCLAVE_PROJECT_ID=f25f20d3-02b5-487a-a5f6-baa773a5ebbc
HEXCLAVE_PUBLISHABLE_CLIENT_KEY=pck_mb44mybmr9zvjm3ny7jx5rs2by2n431faawcwp1ebb5t8
HEXCLAVE_SECRET_SERVER_KEY=ssk_4ct5x0ddfb2pqeyb40sdj98jye8b4m9vfezpptfrd58pg
```

---

### Menjalankan Aplikasi

#### Mode Development
Jalankan satu perintah berikut:
```bash
bun dev
```

> [!NOTE]
> Perintah `bun dev` akan menjalankan orchestrator **Hexclave RDE CLI** bersama dengan **Bun Elysia Server** (`dev:server`) dan **Vite Frontend** (`dev:client`) secara simultan.
> 
> Saat pertama kali dijalankan, Hexclave CLI akan melakukan inisialisasi lokal dashboard pada cache `~/.stack/rde-dashboard-runtime-26700/` (membutuhkan waktu ~1 menit). Setelah siap, seluruh service akan langsung menyala:
> - **Hexclave Local Dashboard**: [http://localhost:26700](http://localhost:26700)
> - **OpenQRIS Backend API**: [http://localhost:3000](http://localhost:3000)
> - **Swagger API Docs**: [http://localhost:3000/swagger](http://localhost:3000/swagger)
> - **OpenQRIS Frontend UI**: [http://localhost:5173](http://localhost:5173)

#### Mode Production
Untuk menjalankan di server produksi / VPS:
```bash
# 1. Build aset frontend Vue menjadi file statis (dist/)
bun run build

# 2. Jalankan server Elysia (server akan menyajikan file API sekaligus SPA frontend)
bun run start
```
Aplikasi produksi akan berjalan penuh di port `3000` (atau port sesuai `PORT` di `.env`).

---

## 👥 Pemisahan Role: Platform Owner vs Merchant

OpenQRIS mengadopsi arsitektur **Role-Based Single Shell** yang elegan:

```
                  ┌───────────────────────────────┐
                  │    Hexclave Authentication    │
                  └──────────────┬────────────────┘
                                 │
                 ┌───────────────┴───────────────┐
                 │ Apakah email di ADMIN_EMAILS? │
                 └───────┬───────────────┬───────┘
                        YA              TIDAK
                         │               │
        ┌────────────────┴──────┐ ┌──────┴────────────────┐
        │ Role: 'admin'         │ │ Role: 'merchant'      │
        │ DashboardView.vue     │ │ TenantDashboardView   │
        │ - Scope Global        │ │ - Scope Toko Sendiri  │
        │ - Platform Owner      │ │ - Mandiri (Self-Serve)│
        │ - Kelola Semua Tenant │ │ - Pairing HP Sendiri  │
        └───────────────────────┘ └───────────────────────┘
```

1. **Admin (Platform Owner)**:
   - Akses penuh ke seluruh tenant SaaS (`SaaS Clients`).
   - Melihat transaksi gabungan dari semua merchant dengan filter waktu & pencarian lengkap.
   - Mengatur **Master QRIS Platform** sebagai fallback jika ada toko yang belum memasang QRIS sendiri.
   - Membuat payment link atas nama tenant manapun.
   - Mengakses menu debug: `Listener`, `Playground`, `Docs`.

2. **Merchant (Tenant / Toko)**:
   - Terbatas hanya pada data, pendapatan, dan transaksi tokonya sendiri.
   - Onboarding instan: daftar mandiri via `/signup` lalu otomatis mendapatkan API Keys (`Public Key` & `Secret Key`).
   - Buat Payment Link toko dan langsung klik **Bagikan ke WhatsApp**.
   - Input QRIS statis DANA/BCA toko miliknya.
   - Memasangkan HP Android listener toko melalui pairing token.

---

## 🔍 Konfigurasi QRIS Statis ke Dinamis

### Cara Mendapatkan String Mentah (Raw String) QRIS Anda:
1. Buka aplikasi e-wallet/M-Banking Anda (contoh: **DANA Bisnis** atau QRIS m-BCA).
2. Simpan gambar / screenshot kode QRIS Anda.
3. Buka menu **Playground** di dashboard OpenQRIS (`http://localhost:3000/playground`) atau gunakan web scanner seperti [zxing.org/w/decode](https://zxing.org/w/decode) untuk mengunggah gambar tersebut.
4. Anda akan mendapatkan string berawalan:
   ```text
   00020101021126...5802ID...6304ABCD
   ```
5. Salin teks tersebut dan tempelkan ke menu **Master QRIS** (untuk Platform Owner) atau tab **Pengaturan Toko** (untuk Merchant).

### Logika Konversi String EMVCo:
1. **Tag 01 (Point of Initiation)**: `010211` (Statis) diubah menjadi `010212` (Dinamis).
2. **Tag 54 (Transaction Amount)**: Disisipkan sebelum Tag `5802ID` dengan format panjang karakter + nominal (contoh: Rp 50.123 -> `540550123`).
3. **Tag 63 (CRC16)**: 4 digit checksum lama dipotong, lalu dihitung ulang menggunakan algoritma **CRC16-CCITT (0xFFFF)**.

---

## 📱 OpenQRIS Android Listener (Native Service)

Aplikasi Android bawaan berada di dalam folder `android/`. Aplikasi ini bertugas mengintersepsi notifikasi uang masuk dari perbankan secara lokal tanpa perantara pihak ketiga.

### Fitur Android Listener:
- Menggunakan `NotificationListenerService` resmi Android (hemat baterai, minim memori).
- Mencegah intersepsi ganda (*idempotent*).
- Menolak notifikasi uang keluar (*Anti-Debit Guard*).
- Dilengkapi heartbeat berkala untuk memantau status baterai HP di dashboard merchant.

### Cara Build & Pasang APK:

#### Opsi 1: Build CLI dengan Gradle
```bash
cd android
./gradlew assembleDebug
```
File APK siap pakai akan tersedia di:
`android/app/build/outputs/apk/debug/app-debug.apk`

#### Opsi 2: Menggunakan Android Studio
1. Buka **Android Studio**.
2. Pilih **Open Project** -> arahkan ke folder `android/`.
3. Tunggu Gradle sync selesai, lalu klik **Build -> Build APK(s)**.

#### Cara Mengaktifkan di HP:
1. Install file APK di HP Android Anda.
2. Buka aplikasi, lalu izinkan **Akses Notifikasi (Notification Access)**.
3. Masukkan **URL Webhook Gateway**:
   ```text
   http://IP_SERVER_ANDA:3000/v1/webhooks/listener
   ```
4. Masukkan **Device Token / Secret Key** toko Anda (tersedia di menu Merchant Dashboard).
5. Klik **"Tes Sinyal Gateway"**. Jika muncul respon `HTTP 200`, HP siap digunakan!

---

## 🔌 Dokumentasi API & Integrasi

### Swagger UI
Dokumentasi interaktif OpenAPI dapat diakses langsung melalui browser di:
👉 **[http://localhost:3000/swagger](http://localhost:3000/swagger)**

---

### Membuat Tagihan (Create Charge)

Untuk membuat tagihan baru dari backend website/aplikasi Anda:

**Request (cURL):**
```bash
curl -X POST http://localhost:3000/v1/charges \
  -H "Authorization: Bearer sk_live_YOUR_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": "INV-20261005-001",
    "amount": 75000,
    "customer_name": "Ahmad Rizqi",
    "customer_email": "ahmad@example.com",
    "expiry_minutes": 15
  }'
```

**Respon Sukses (`200 OK`):**
```json
{
  "status": "success",
  "data": {
    "charge_id": "ch_7f8a9b2c3d4e",
    "tenant_id": "ten_01928374",
    "tenant_name": "Toko Berkah Digital",
    "order_id": "INV-20261005-001",
    "amount": 75000,
    "unique_code": 142,
    "total_amount": 75142,
    "status": "PENDING",
    "raw_qris": "000201010212...540575142...6304E1F2",
    "qr_data_url": "data:image/png;base64,iVBORw0KGgoAAAANSU...",
    "checkout_url": "http://localhost:3000/checkout/ch_7f8a9b2c3d4e",
    "expires_at": "2026-10-05T09:15:00.000Z",
    "created_at": "2026-10-05T09:00:00.000Z"
  }
}
```

Pelanggan cukup diarahkan ke `checkout_url`, atau render `qr_data_url` langsung di aplikasi Anda!

---

### Popup Modal Embed (`embed.js`)

Jika Anda ingin menampilkan popup modal pembayaran tanpa meninggalkan halaman checkout toko Anda:

```html
<!-- 1. Pasang script embed -->
<script src="http://localhost:3000/embed.js"></script>

<!-- 2. Buka popup saat checkout -->
<script>
  OpenQRIS.pay({
    chargeId: 'ch_7f8a9b2c3d4e',
    onSuccess: function(charge) {
      alert('Pembayaran Rp ' + charge.totalAmount + ' Berhasil!');
      window.location.href = '/order/finish?id=' + charge.orderId;
    },
    onClose: function() {
      console.log('Customer menutup modal');
    }
  });
</script>
```

---

### Verifikasi Webhook (HMAC-SHA256)

Setiap pembayaran berhasil diverifikasi oleh Android Listener, OpenQRIS Gateway akan mengirimkan HTTP POST ke `webhook_url` yang didaftarkan merchant.

Header menyertakan:
- `Content-Type: application/json`
- `X-OpenQRIS-Signature: <hex_digest_hmac_sha256>`

**Contoh Payload Webhook:**
```json
{
  "event": "charge.paid",
  "data": {
    "charge_id": "ch_7f8a9b2c3d4e",
    "order_id": "INV-20261005-001",
    "amount": 75000,
    "unique_code": 142,
    "total_amount": 75142,
    "customer_name": "Ahmad Rizqi",
    "paid_at": "2026-10-05T09:05:12.000Z",
    "status": "PAID"
  }
}
```

**Contoh Verifikasi Signature di Node.js:**
```javascript
import crypto from 'crypto';

app.post('/api/webhook/qris', (req, res) => {
  const signature = req.headers['x-openqris-signature'];
  const rawPayload = JSON.stringify(req.body);
  const secretKey = 'sk_live_YOUR_SECRET_KEY';

  const expectedSignature = crypto
    .createHmac('sha256', secretKey)
    .update(rawPayload)
    .digest('hex');

  if (signature !== expectedSignature) {
    return res.status(401).json({ error: 'Signature tidak valid' });
  }

  // Signature cocok! Proses pesanan pelanggan:
  const { event, data } = req.body;
  if (event === 'charge.paid') {
    console.log('Order lunas:', data.order_id);
  }

  return res.json({ received: true });
});
```

---

### Plugin WooCommerce WordPress

Untuk toko berbasis WordPress WooCommerce:
1. Unduh file plugin dari URL gateway Anda:
   ```text
   http://localhost:3000/downloads/woocommerce-openqris.zip
   ```
2. Buka dashboard WordPress Anda -> **Plugins -> Add New -> Upload Plugin**.
3. Upload dan aktifkan plugin **OpenQRIS Payment Gateway for WooCommerce**.
4. Masuk ke **WooCommerce -> Settings -> Payments -> OpenQRIS**.
5. Masukkan **Gateway Base URL**, **Public Key**, dan **Secret Key** toko Anda.

---

## 🛡️ Keamanan & Pencegahan Fraud

1. **Anti-Debit Guard**: Sistem menyaring dan menolak notifikasi yang mengandung frasa uang keluar seperti *Transaksi Debet, Pembayaran Berhasil Ke, Transfer Ke, Pulsa Berhasil, Uang Keluar*.
2. **Idempotency Hash Window**: Setiap notifikasi yang masuk dihitung SHA-256 hash-nya dan disimpan dalam sliding-window 1 jam untuk mencegah duplikasi kredit akibat notifikasi ganda dari HP.
3. **HMAC Webhook Signatures**: Mencegah pemalsuan webhook oleh pihak ketiga dengan hashing rahasia merchant.
4. **Merchant Scoping**: Data tagihan, simulasi bayar, dan API Keys terisolasi antar tenant sehingga merchant tidak dapat memanipulasi tagihan toko lain.

---

## 🌐 Daftar Port Layanan

| Port | Layanan | Keterangan |
|---|---|---|
| **`3000`** | **OpenQRIS Backend API** | Router ElysiaJS, Webhook Ingestion, & Hosted Checkout |
| **`5173`** | **Vite Dev Server** | Frontend antarmuka Vue 3 (Hot Module Reloading) |
| **`26700`** | **Hexclave Local Dashboard** | Dashboard lokal Hexclave RDE untuk mengelola auth & pengguna |

---

## ❓ Troubleshooting & FAQ

<details>
<summary><b>1. Mengapa saat pertama kali <code>bun dev</code> muncul pesan <i>Hexclave dashboard not found on port 26700</i>?</b></summary>
<br>
Itu adalah perilaku normal saat pertama kali Hexclave CLI menginisialisasi lingkungan runtime lokal di direktori <code>~/.stack/rde-dashboard-runtime-26700/</code>. Proses ini memerlukan waktu 1–2 menit tergantung kecepatan penyimpanan (I/O disk). Jangan batalkan (Ctrl+C). Setelah inisialisasi awal selesai, eksekusi berikutnya akan menyala instan.
</details>

<details>
<summary><b>2. Mengapa nominal pembayaran ditambahkan 1 sampai 3 digit?</b></summary>
<br>
Nominal tambahan tersebut adalah <b>Kode Unik</b> (contoh: tagihan Rp 10.000 menjadi Rp 10.125). Kode unik ini wajib ada agar sistem dapat mencocokkan pembayaran yang masuk secara otomatis jika ada 2 atau lebih pelanggan yang berbelanja dengan harga sama pada waktu bersamaan.
</details>

<details>
<summary><b>3. Apakah HP Android harus menyala terus?</b></summary>
<br>
Ya, HP yang difungsikan sebagai listener harus terhubung ke internet (WiFi / Paket Data) dan aplikasi OpenQRIS Listener berjalan di latar belakang (background) agar notifikasi uang masuk dapat langsung dikirim ke gateway. Disarankan menggunakan HP Android sekunder/khusus kasir yang selalu terhubung ke charger.
</details>

<details>
<summary><b>4. Bagaimana cara menetapkan akun saya sebagai Administrator Platform?</b></summary>
<br>
Cukup daftarkan atau login menggunakan alamat email yang terdaftar di variabel <code>ADMIN_EMAILS</code> pada file <code>.env</code> (misalnya: <code>ADMIN_EMAILS=info.rasyiqi@gmail.com</code>). Sistem akan secara otomatis memberikan role <code>admin</code> (Platform Owner) pada akun tersebut.
</details>

---

## 📄 Lisensi

Didistribusikan di bawah Lisensi **MIT**. Bebas digunakan, dimodifikasi, dan didistribusikan untuk keperluan personal maupun komersial. Dibuat dengan dedikasi untuk kemandirian finansial digital Indonesia.
