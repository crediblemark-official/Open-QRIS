# OpenQRIS Android Listener (Official Native App)

Aplikasi Android resmi mandiri (*Native Background Ingestion Service*) untuk menangkap notifikasi uang masuk dari **DANA**, **BCA**, **Mandiri Livin**, **GoPay**, **OVO**, **ShopeePay**, dan **SMS Banking**, lalu secara otomatis meneruskannya langsung ke webhook OpenQRIS Gateway untuk settlement lunas seketika (*1 detik*).

Aplikasi ini menggantikan **MacroDroid** atau **Notification Forwarder** pihak ketiga secara penuh tanpa iklan, tanpa limit, dan 100% milik Anda sendiri.

---

## Fitur Utama

1. **Native `NotificationListenerService`**:
   - Berjalan mandiri di background service Android tanpa membebani baterai.
   - Tetap aktif setelah HP restart (*Auto-boot receiver*).
2. **Filter Aplikasi Otomatis**:
   - Menyaring paket aplikasi resmi (`id.dana`, `com.bca`, `com.bankmandiri.livin`, dll).
   - Menghindari pengiriman spam atau notifikasi yang tidak relevan.
3. **Pengaturan URL Fleksibel**:
   - Masukkan URL webhook gateway server Anda (contoh: `https://gateway.bisnis.com/v1/webhooks/listener` atau IP lokal `http://192.168.1.10:3000/v1/webhooks/listener`).
   - Mendukung autentikasi `X-API-Key` atau `Bearer Token`.
4. **Live Log & Status Intersepsi**:
   - Tampilan visual status HTTP (`200 OK`, `Error`).
   - Riwayat notifikasi yang berhasil ditangkap langsung di aplikasi.
5. **Tombol Tes Sinyal Gateway**:
   - Uji koneksi HP ke server gateway hanya dengan 1 klik sebelum digunakan live.

---

## Cara Build APK

### Opsi 1: Menggunakan Android Studio (Paling Mudah)
1. Buka **Android Studio**.
2. Pilih **File -> Open...**, lalu arahkan ke folder:
   `/media/rasyiqi/7653717A1C07B131/QRIS/android`
3. Tunggu proses *Gradle Sync* selesai.
4. Pilih menu **Build -> Build Bundle(s) / APK(s) -> Build APK(s)**.
5. File APK siap digunakan di folder:
   `android/app/build/outputs/apk/debug/app-debug.apk`.

### Opsi 2: Menggunakan Terminal (CLI)
Jika Gradle sudah terpasang di sistem Linux Anda:
```bash
cd /media/rasyiqi/7653717A1C07B131/QRIS/android
./gradlew assembleDebug
```
File APK akan di-*generate* di `android/app/build/outputs/apk/debug/app-debug.apk`.

---

## Cara Pasang & Mengaktifkan di HP Android

1. **Kirim file APK ke HP**:
   - Kirim via WhatsApp, Telegram, USB kabel, atau download dari Google Drive.
2. **Install APK**:
   - Izinkan *Install unknown apps* jika diminta oleh Android.
3. **Buka Aplikasi OpenQRIS Listener**:
   - Klik tombol merah **"Buka Izin Akses Notifikasi"**.
   - Cari **OpenQRIS Listener** di daftar izin, lalu centang / aktifkan.
4. **Isi Konfigurasi**:
   - Masukkan **URL Webhook Gateway** (contoh: `https://domainanda.com/v1/webhooks/listener`).
   - Masukkan **Device Token** toko Anda (bisa didapatkan di dashboard menu **SaaS Clients -> Pairing HP** / **Listener**). Dengan token ini, HP akan terikat eksklusif ke merchant Anda (anti-bentrok) dan status baterai/koneksi HP akan terpantau live di dashboard. Jangan masukkan Secret Key (`sk_live_`) - HP hanya menerima Device Token (`dev_...`).
   - Klik **"Simpan Pengaturan"**.
5. **Uji Coba**:
   - Klik **"Tes Sinyal Gateway"**. Jika muncul `HTTP 200`, maka HP dan Gateway server sudah terhubung sempurna!
6. **Selesai**:
   - Setiap kali customer membayar QRIS dan uang masuk ke akun perbankan/e-wallet Anda, background service akan otomatis memverifikasi tagihan dalam 1 detik.
