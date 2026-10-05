/**
 * OpenQRIS Smart Notification Parser
 * Mengekstrak nominal kredit/uang masuk dari notifikasi bank & e-wallet Indonesia:
 * BCA (m-BCA/myBCA), Mandiri (Livin'), BRI (BRImo), BNI (wondr/BNI Mobile),
 * BSI Mobile, DANA, GoPay/GoBiz, OVO, ShopeePay/Shopee Partner, SeaBank, Bank Jago.
 * Dilengkapi Anti-Debit Guard untuk mencegah notifikasi uang keluar/bayar belanja.
 */

export interface ParsedNotification {
  amount: number | null;
  bankOrWallet: string;
  sender?: string;
  isDebit: boolean;
  rawText: string;
}

// Keyword pengeluaran uang (Debit) yang HARUS ditolak
const DEBIT_KEYWORDS = [
  'BERHASIL DIBAYAR',
  'PEMBAYARAN BERHASIL KE',
  'KAMU TELAH MEMBAYAR',
  'TRANSFER KE ',
  'KIRIM UANG KE',
  'PEMBELIAN ',
  'PULSA BERHASIL',
  'TAGIHAN BERHASIL',
  'BERHASIL TRANSFER KE',
  'TRANSAKSI DEBET',
  'DEBET SEBESAR',
  'TELAH DIDEBIT',
  'PEMBAYARAN QRIS KE',
  'UANG KELUAR',
  'SENT TO',
];

export function parseIncomingNotification(text: string): ParsedNotification {
  if (!text) {
    return { amount: null, bankOrWallet: 'Unknown', isDebit: false, rawText: '' };
  }

  const raw = text.trim();
  const upper = raw.toUpperCase();

  // 1. Anti-Debit Guard: Cegah notifikasi pengeluaran/uang keluar
  const isDebit = DEBIT_KEYWORDS.some((kw) => upper.includes(kw));
  if (isDebit) {
    return {
      amount: null,
      bankOrWallet: detectProvider(upper),
      isDebit: true,
      rawText: raw,
    };
  }

  const bankOrWallet = detectProvider(upper);
  let sender: string | undefined = undefined;
  let amount: number | null = null;

  // 2. Provider-Specific Parser / Regex
  // DANA Bisnis & Personal
  if (bankOrWallet === 'DANA') {
    // "Kamu menerima Saldo DANA Rp 50.123 dari John"
    // "Pembayaran sebesar Rp50.123 berhasil diterima"
    // "DANA Bisnis: Kamu menerima pembayaran Rp 50.123"
    amount = extractNominal(raw);
    const m = raw.match(/(?:dari|from)\s+([A-Za-z0-9\s]+?)(?:sebesar|\.|$)/i);
    if (m) sender = m[1].trim();
  }
  // BCA (m-BCA, myBCA, KlikBCA)
  else if (bankOrWallet === 'BCA') {
    // "m-Transfer: BERHASIL... Masuk Rp 50.123 dari..."
    // "Transfer dr EKO WAHYUDI Rp 50.123"
    amount = extractNominal(raw);
    const m = raw.match(/(?:dr|dari)\s+([A-Za-z0-9\s]+?)(?:sebesar|Rp|IDR|\.|$)/i);
    if (m) sender = m[1].trim();
  }
  // Mandiri (Livin')
  else if (bankOrWallet === 'Mandiri') {
    // "Dana Masuk Rp50.123 dari Budi"
    // "Transfer Masuk Rp 50.123"
    amount = extractNominal(raw);
    const m = raw.match(/(?:dari)\s+([A-Za-z0-9\s]+?)(?:ke|\.|$)/i);
    if (m) sender = m[1].trim();
  }
  // BRI (BRImo)
  else if (bankOrWallet === 'BRI') {
    // "Transaksi Masuk: Rekening ... menerima transfer Rp 50.123 dari ..."
    amount = extractNominal(raw);
    const m = raw.match(/(?:dari)\s+([A-Za-z0-9\s]+?)(?:sebesar|\.|$)/i);
    if (m) sender = m[1].trim();
  }
  // BNI (wondr / BNI Mobile)
  else if (bankOrWallet === 'BNI') {
    amount = extractNominal(raw);
  }
  // GoPay / GoBiz
  else if (bankOrWallet === 'GoPay') {
    // "Kamu menerima pembayaran QRIS sebesar Rp50.123"
    amount = extractNominal(raw);
  }
  // OVO
  else if (bankOrWallet === 'OVO') {
    amount = extractNominal(raw);
  }
  // ShopeePay / Shopee Partner
  else if (bankOrWallet === 'ShopeePay') {
    amount = extractNominal(raw);
  }
  // Universal Fallback
  else {
    amount = extractNominal(raw);
    const fromMatch = raw.match(/(?:dari|from)\s+([A-Za-z0-9\s]+?)(?:sebesar|\.|$)/i);
    if (fromMatch && fromMatch[1]) {
      sender = fromMatch[1].trim();
    }
  }

  return {
    amount,
    bankOrWallet,
    sender,
    isDebit: false,
    rawText: raw,
  };
}

function detectProvider(upper: string): string {
  if (upper.includes('MANDIRI') || upper.includes('LIVIN')) return 'Mandiri';
  if (upper.includes('BCA') || upper.includes('M-TRANSFER') || upper.includes('M-BCA') || upper.includes('KLIKBCA') || upper.includes('MYBCA')) return 'BCA';
  if (upper.includes('BRIMO') || upper.includes('BANK BRI') || upper.includes('BRI ') || upper.includes('BRI:')) return 'BRI';
  if (upper.includes('BNI') || upper.includes('WONDR')) return 'BNI';
  if (upper.includes('BSI')) return 'BSI';
  if (upper.includes('GOBIZ') || upper.includes('GOPAY') || upper.includes('GOJEK')) return 'GoPay';
  if (upper.includes('SHOPEEPAY') || upper.includes('SHOPEE PARTNER') || upper.includes('SHOPEE')) return 'ShopeePay';
  if (upper.includes('OVO')) return 'OVO';
  if (upper.includes('JAGO')) return 'Bank Jago';
  if (upper.includes('SEABANK')) return 'SeaBank';
  if (upper.includes('LINKAJA')) return 'LinkAja';
  if (upper.includes('DANA')) return 'DANA';
  return 'Universal / Bank Lain';
}

function extractNominal(raw: string): number | null {
  // Pola 1: "Rp 50.123", "Rp. 50.123", "Rp50.123", "IDR 50.123" (dengan opsional desimal ,00)
  const rpRegex = /(?:RP|IDR)\.?\s*([\d\.,]+)/i;
  const matchRp = raw.match(rpRegex);

  if (matchRp && matchRp[1]) {
    let clean = matchRp[1].trim();
    // Hilangkan desimal ,00 atau .00 di akhir jika ada
    clean = clean.replace(/[,.]00$/, '');
    // Hilangkan pemisah ribuan (. atau ,)
    clean = clean.replace(/[^\d]/g, '');
    const parsed = parseInt(clean, 10);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }

  // Pola 2 Fallback: Cari deretan 4 - 9 digit angka
  const digitsOnly = raw.replace(/[^\d]/g, ' ');
  const numbers = digitsOnly.match(/\b\d{4,9}\b/g);
  if (numbers && numbers.length > 0) {
    const val = parseInt(numbers[0], 10);
    if (!isNaN(val) && val > 0) return val;
  }

  return null;
}
