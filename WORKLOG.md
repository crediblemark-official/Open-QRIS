# Worklog — Perbaikan Bug OpenQRIS

**Tanggal:** 6 Oktober 2026
**Lingkup:** Analisis bug/fitur prematur → perbaikan bug B1–B12 (B13 duplikat B4) → test integrasi → verifikasi penuh.
**Runtime:** Bun + Elysia + Drizzle/PostgreSQL (DB dev hidup) + Vue 3. Android (Java) dibangun dengan Gradle wrapper.

---

## 1. Ringkasan Status

| Bug | Deskripsi | Status | Verifikasi |
|-----|-----------|--------|------------|
| B1 | `expiresAt`/`createdAt` dibuat sebagai string → insert Drizzle `TypeError: value.toISOString is not a function` | ✅ Selesai | Test integrasi insert ke PostgreSQL |
| B2 | `getPendingByAmount` memanggil `.where()` 2× → yang kedua menimpa scoping tenant/expiry | ✅ Selesai | Test cross-tenant & expiry |
| B3 | `/v1/webhooks/listener` tanpa autentikasi + fallback `sk_live_` sebagai device token | ✅ Selesai | Test 401 tanpa/salah token & secret ditolak |
| B4/B13 | Kolom DB `staticQris` vs dibaca `staticQRIS` → QRIS toko merchant tak pernah terpakai | ✅ Selesai | Test merchant QRIS dipakai + fallback default |
| B5 | `getPaginated` interpolasi ARRAY ke `sql\`\`` → SQL rusak `$1( AND …)` saat filter > 1 | ✅ Selesai | Test filter gabungan + paginasi |
| B6 | Webhook kirim `payment.success`/`X-QRIS-Signature`/status `PENDING` vs README `charge.paid`/`X-OpenQRIS-Signature`/`PAID` | ✅ Selesai | Test kontrak webhook (server penangkap nyata) |
| B7 | Tombol **Simulasi Bayar** di checkout publik selalu 401 | ✅ Selesai | Test default 401 + `SANDBOX_MODE=true` → PAID |
| B8 | Secret key dibuat `Math.random()` + kredensial `ssk_…` bocor di README | ✅ Selesai | Test format CSPRNG 256/128-bit |
| B9 | Android mengirim `sk_live_` sebagai `X-Device-Token` | ✅ Selesai | Build Android + grep tanpa header rahasia |
| B10 | Selector hantu `[data-settings-modal]` → feedback tes Telegram tak pernah tampil | ✅ Selesai | `vite build` (type & compile) |
| B11 | Android tanpa `gradlew`/wrapper, `proguard-rules.pro` hilang (release gagal), auto-boot hanya izin tanpa `<receiver>` | ✅ Selesai | `assembleDebug` & `assembleRelease` **BUILD SUCCESSFUL** |
| B12 | Client memuat SELURUH transaksi lalu filter di browser | ✅ Selesai | Test repo counts + route `/v1/transactions` |

Analisis awal juga memuat **16 fitur prematur** — dicatat sebagai temuan, belum ditindaklanjuti (di luar lingkup perbaikan ini).

---

## 2. Detail Perbaikan

### B1 — Konversi Date (create charge)
- `src/server/services/qris.ts`: `expiresAt = new Date(...)`, `createdAt: new Date()` (bukan `.toISOString()`).
- `src/db/repositories/charge.repo.ts` `create()`: sudah ada konversi `instanceof Date` (diverifikasi).
- `src/server/services/store.types.ts`: `Charge.expiresAt/paidAt/createdAt: Date`.

### B2 — `.where()` dobel di `getPendingByAmount`
- Satu panggilan `.where(and(...whereConditions))` berisi status + expiry + nominal + scoping tenant.

### B3 — Autentikasi listener
- `src/server/routes/webhooks.ts`: device token hanya dari body `device_token`/header `x-device-token`; **hapus** fallback `getTenantBySecretKey` dan field `secret` pada schema; 401 bila kosong/tidak terdaftar; pencocokan charge selalu scoped ke tenant pemilik token; heartbeat 401 bila token kosong.
- `src/client/views/ListenerView.vue`: input **Device Token Toko** + header `X-Device-Token`.

### B4/B13 — Mismatch `staticQris`/`staticQRIS`
- **Akar:** Drizzle mengembalikan key `staticQris`; server (`qris.ts`) dan client membaca `staticQRIS` → selalu `undefined` → QRIS toko terus jatuh ke default platform dan UI tak pernah menampilkan QRIS toko.
- **Fix satu titik:** `src/db/repositories/tenant.repo.ts` — `mapRow()` mengekspos kedua key, diterapkan di `getAll/getById/getBySecretKey/getByPublicKey/getByDeviceToken/create/update`.
- `create()` melempar error bila insert tak mengembalikan row (tipe tetap non-optional tanpa cast).
- Jalur tulis (`PUT /v1/apps` → kolom `static_qris`) tidak diubah karena sudah benar.

### B5 — SQL filter pencarian invalid
- `src/db/repositories/charge.repo.ts`: `whereClause` dihitung dengan `and(...conditions)`; `conditions: SQL[]`; LIKE→**ILIKE** (case-insensitive, konsisten client).

### B6 — Payload & header webhook vs README
- `src/server/services/webhook.ts`: `event: 'charge.paid'`; header `X-OpenQRIS-Signature` (+ `X-OpenQRIS-Event/Delivery/Attempt`); `paid_at` selalu ISO string.
- `src/server/routes/webhooks.ts`: listener & simulate-paid mendispatch **row hasil `updateChargeStatus`** → `data.status = "PAID"` + `paid_at` terisi (dulu object stale → `PENDING`).
- Konsumen diselaraskan: plugin `woocommerce-openqris.php` (`HTTP_X_OPENQRIS_SIGNATURE`, `charge.paid`) dan contoh di `DocsView.vue`.

### B7 — Simulasi Bayar checkout publik
- `src/server/routes/webhooks.ts`: route dipindah ke depan `authGuard` + autentikasi manual (`resolveAuthUser`); tanpa login hanya bila **`SANDBOX_MODE=true`** (default mati → 401, mencegah penandaihan lunas oleh pemegang Charge ID).
- `src/server/routes/charges.ts`: `GET /v1/charges/:id` menyertakan flag `sandbox`.
- `src/client/views/HostedCheckoutView.vue`: tombol hanya tampil saat sandbox aktif + pesan error tampil.
- `.env.example`: dokumentasi `SANDBOX_MODE=false`.

### B8 — Kredensial CSPRNG + kebersihan README
- `src/server/services/store.pg.ts`: `randomBytes` — `sk_live_`+64 hex (256-bit), `pk_live_`/`dev_`+32 hex, id `app_`/`usr_`.
- `src/server/services/qris.ts`: Charge ID `ch_`+16 hex (capability token checkout publik).
- `README.md`: kredensial `ssk_4ct5x…` di-redact jadi placeholder (`.env` asli TIDAK diubah).

### B9 — Android tidak lagi memegang/mengirim secret
- `android/.../NetworkHelper.java`: hanya `X-Device-Token` + body `device_token`; header `X-API-Key`/`Authorization` dihapus; nilai `sk_live_` **ditolak lokal** dengan pesan arah Device Token.
- `activity_main.xml` (label/hint), `README.md`, `android/README.md`: instruksi Device Token saja.

### B10 — Feedback tes Telegram
- `src/client/views/SaaSAppsView.vue`: ref template ke `SettingsModal` menggantikan selector DOM hantu; `setTestingTelegram(false)` + `setTelegramTestSuccess/Error`; try/catch agar spinner tidak nyangkut.

### B11 — Build Android
- **Baru:** `android/app/proguard-rules.pro` (direferensikan `build.gradle`), `android/app/src/main/java/com/openqris/listener/BootReceiver.java`, `<receiver>` BOOT_COMPLETED/QUICKBOOT di `AndroidManifest.xml`.
- **Gradle wrapper dibuat** (via gradle 8.14.3 lokal): `gradlew`, `gradlew.bat`, `gradle/wrapper/gradle-wrapper.jar`, `gradle-wrapper.properties`.
- Konfigurasi lokal agar bisa build: `android/local.properties` (`sdk.dir=/home/rasyiqi/android-sdk`) + penerimaan lisensi SDK.

### B12 — Server-side pagination transaksi
- `charge.repo.ts`: refactor `buildConditions(options, { includeStatus })`; method baru **`getStatusCounts`** (GROUP BY status; ikut filter tenant/search/date, tanpa filter status).
- `store.pg.ts`: facade `getChargesStatusCounts`.
- `src/server/routes/settings.ts`: cabang paginated `/v1/transactions` kini mengembalikan **`counts`**.
- `useGatewayData.ts`: `loadData` membatasi **`?limit=100`**; fungsi baru **`fetchTransactions(params)`**.
- `TransactionTable.vue`: mode server-driven opsional (`serverFetch`) — debounce pencarian 350ms, filter status/date & halaman minta ke server, pill counts dari API, CSV export ≤200 baris dari server; mode legacy tetap ada bila `serverFetch` tidak diberikan.
- Wiring: `TransactionsView.vue` → `App.vue` (`:serverFetch="fetchTransactions"`); tipe di `src/client/types/index.ts`.

---

## 3. Test

Suite: **19 → 51 test** (semua lulus), termasuk test integrasi baru di PostgreSQL dev NYATA:

| File | Cakupan |
|------|---------|
| `tests/payment-flow.test.ts` | B1 (insert Date), B3 (auth listener), B2 (scoping tenant & expiry), alur end-to-end HTTP `POST /v1/charges` → matching → PAID |
| `tests/merchant-qris.test.ts` | B4: `staticQRIS` ter-ekspos di store/API + QRIS toko yang dipakai (bukan default platform) |
| `tests/webhook-contract.test.ts` | B6: header `X-OpenQRIS-Signature` = HMAC-SHA256(raw body), `event: charge.paid`, `status: PAID`, `paid_at` ISO, log webhook `SUCCESS` |
| `tests/charge-filter.test.ts` | B5: filter gabungan valid, paginasi benar; B12: `getStatusCounts` per status |
| `tests/security-hardening.test.ts` | B7: sandbox gate (401 → PAID saat aktif); B8: format CSPRNG |
| `tests/transactions-api.test.ts` | B12: `/v1/transactions` 401 tanpa token; pagination + counts + filter server-side |

Test membersihkan data sendiri (tenant/charge/webhook_log test dihapus di `afterAll`; settings dikembalikan) — diverifikasi: **0 sisa row** di DB dev.

---

## 4. Hasil Verifikasi (akhir)

| Check | Hasil |
|-------|-------|
| `bun test` (pipefail) | **51/51 pass, exit 0** |
| `bunx tsc --noEmit` | **exit 0** |
| `bun run build` (vite) | **exit 0** — semua edit `.vue` ter-compile |
| `./gradlew assembleDebug` | **BUILD SUCCESSFUL** |
| `./gradlew assembleRelease` | **BUILD SUCCESSFUL** (sebelumnya gagal: `proguard-rules.pro` hilang) |
| Kebersihan DB | 0 sisa row test; `.env` asli tidak diubah |

---

## 5. Catatan & Keterbatasan

- **Breaking change disengaja (B6):** konsumen eksternal yang masih memakai `X-QRIS-Signature`/`payment.success` harus migrasi (README, DocsView, plugin repo sudah seragam).
- **Perilaku baru (B7):** tombol Simulasi Bayar disembunyikan kecuali `SANDBOX_MODE=true`; ini menggantikan tombol yang dulu selalu tampil tapi selalu gagal 401.
- **Tradeoff (B12):** statistik dashboard dihitung dari 100 transaksi terakhir; riwayat lengkap tetap akurat via halaman transaksi (server pagination).
- UI (tombol sandbox, modal Telegram, tabel transaksi) diverifikasi lewat build/typecheck + test API, belum uji browser interaktif.
- APK release berstatus *unsigned* (konfigurasi signing tidak ada di repo).
- Verifikasi build Android memakai penyesuaian lokal: `android/local.properties` + lisensi SDK di `~/android-sdk`.
- Belum ditindaklanjuti: 16 temuan fitur prematur, escaping wildcard `LIKE`, kompatibilitas header webhook lama, stats dashboard agregasi server.
