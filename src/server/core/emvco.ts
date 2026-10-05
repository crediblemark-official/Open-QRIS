/**
 * OpenQRIS Core EMVCo Engine
 * Sesuai spesifikasi ASPI (Asosiasi Sistem Pembayaran Indonesia) & EMVCo QR Code Specification
 */

export interface TLVElement {
  tag: string;
  length: string;
  value: string;
}

export interface QRISInfo {
  raw: string;
  type: 'STATIC' | 'DYNAMIC';
  isStatic: boolean;
  merchantName: string;
  merchantCity: string;
  postalCode: string;
  currency: string;
  existingAmount: number | null;
  acquirer: string;
  nmid?: string;
  elementsCount: number;
}

export interface DynamicQRISOptions {
  orderId?: string;
  postalCode?: string;
}

/**
 * Menghitung Checksum CRC16-CCITT (0xFFFF, Polinomial 0x1021)
 * Digunakan untuk Tag 63 pada spesifikasi QRIS
 */
export function calculateCRC16(str: string): string {
  let crc = 0xffff;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Parsing string mentah QRIS menjadi struktur Tag-Length-Value (TLV)
 */
export function parseTLV(rawString: string): TLVElement[] {
  const elements: TLVElement[] = [];
  let index = 0;

  while (index < rawString.length) {
    if (index + 4 > rawString.length) break;

    const tag = rawString.substring(index, index + 2);
    const lengthStr = rawString.substring(index + 2, index + 4);
    const length = parseInt(lengthStr, 10);

    if (isNaN(length) || index + 4 + length > rawString.length) {
      break;
    }

    const value = rawString.substring(index + 4, index + 4 + length);
    elements.push({ tag, length: lengthStr, value });
    index += 4 + length;
  }

  return elements;
}

/**
 * Mengekstrak informasi penting dari QRIS (Merchant, Kota, Acquirer, dll.)
 */
export function extractQRISInfo(qrisString: string): QRISInfo {
  const elements = parseTLV(qrisString.trim());
  const map = new Map<string, string>(elements.map((e) => [e.tag, e.value]));

  const initiationMethod = map.get('01'); // 11: Static, 12: Dynamic
  const merchantName = map.get('59') || 'Merchant';
  const merchantCity = map.get('60') || 'Indonesia';
  const postalCode = map.get('61') || '';
  const currencyCode = map.get('53') || '360';
  const existingAmountRaw = map.get('54');
  const existingAmount = existingAmountRaw ? parseFloat(existingAmountRaw) : null;

  // Deteksi Acquirer (Tag 26 - 45) & NMID (National Merchant ID di Tag 51)
  let acquirer = 'Universal QRIS / Bank';
  let nmid: string | undefined = undefined;

  for (let i = 26; i <= 51; i++) {
    const tag = i.toString().padStart(2, '0');
    if (map.has(tag)) {
      const val = map.get(tag)!.toUpperCase();
      if (val.includes('DANA')) acquirer = 'DANA';
      else if (val.includes('GOPAY') || val.includes('GO-PAY')) acquirer = 'GoPay';
      else if (val.includes('SHOPEE') || val.includes('AIRPAY')) acquirer = 'ShopeePay';
      else if (val.includes('OVO')) acquirer = 'OVO';
      else if (val.includes('BCA')) acquirer = 'BCA';
      else if (val.includes('MANDIRI')) acquirer = 'Mandiri';
      else if (val.includes('BRI')) acquirer = 'BRI';
      else if (val.includes('NOBU')) acquirer = 'Nobu Bank';

      // Ekstrak subtag NMID jika ada (biasanya di Tag 51)
      if (tag === '51') {
        const subElements = parseTLV(map.get(tag)!);
        const sub02 = subElements.find(s => s.tag === '02');
        if (sub02) nmid = sub02.value;
      }
    }
  }

  return {
    raw: qrisString,
    type: initiationMethod === '12' ? 'DYNAMIC' : 'STATIC',
    isStatic: initiationMethod !== '12',
    merchantName,
    merchantCity,
    postalCode,
    currency: currencyCode === '360' ? 'IDR' : currencyCode,
    existingAmount,
    acquirer,
    nmid,
    elementsCount: elements.length,
  };
}

/**
 * Mengubah QRIS Statis menjadi QRIS Dinamis dengan nominal terkunci
 */
export function convertToDynamicQRIS(
  staticQRIS: string,
  amount: number | string,
  options: DynamicQRISOptions = {}
): string {
  if (!staticQRIS || typeof staticQRIS !== 'string') {
    throw new Error('QRIS statis wajib diisi dan berupa string');
  }

  const cleanQRIS = staticQRIS.trim();
  const elements = parseTLV(cleanQRIS);

  if (elements.length === 0) {
    throw new Error('Format QRIS tidak valid atau gagal di-parse');
  }

  // 1. Validasi / format nominal (integer Rupiah)
  const numAmount = Math.round(Number(amount));
  if (isNaN(numAmount) || numAmount <= 0) {
    throw new Error('Nominal transaksi harus berupa angka positif lebih dari 0');
  }
  const amountStr = numAmount.toString();
  const amountLengthStr = amountStr.length.toString().padStart(2, '0');

  // 2. Modifikasi / Bangun ulang elemen
  const newElements: TLVElement[] = [];
  let amountInserted = false;

  for (const el of elements) {
    // Lewati tag CRC lama (Tag 63)
    if (el.tag === '63') continue;

    // Modifikasi Tag 01: Dari '11' (Statis) menjadi '12' (Dinamis)
    if (el.tag === '01') {
      newElements.push({ tag: '01', length: '02', value: '12' });
      continue;
    }

    // Jika sudah ada Tag 54, update nilainya
    if (el.tag === '54') {
      newElements.push({ tag: '54', length: amountLengthStr, value: amountStr });
      amountInserted = true;
      continue;
    }

    // Sisipkan Tag 54 sebelum Tag 58 (Country Code)
    if (!amountInserted && parseInt(el.tag, 10) >= 58) {
      newElements.push({ tag: '54', length: amountLengthStr, value: amountStr });
      amountInserted = true;
    }

    // Opsi: Tag 62 (Additional Data / Reference ID)
    if (el.tag === '62' && options.orderId) {
      const orderRef = String(options.orderId).substring(0, 25);
      const subTag01 = `01${orderRef.length.toString().padStart(2, '0')}${orderRef}`;
      newElements.push({
        tag: '62',
        length: subTag01.length.toString().padStart(2, '0'),
        value: subTag01,
      });
      continue;
    }

    newElements.push(el);
  }

  // Jika Tag 54 belum masuk sampai akhir loop (sebelum Tag 63)
  if (!amountInserted) {
    newElements.push({ tag: '54', length: amountLengthStr, value: amountStr });
  }

  // Jika ada orderId dan belum ada Tag 62
  if (options.orderId && !newElements.some((e) => e.tag === '62')) {
    const orderRef = String(options.orderId).substring(0, 25);
    const subTag01 = `01${orderRef.length.toString().padStart(2, '0')}${orderRef}`;
    newElements.push({
      tag: '62',
      length: subTag01.length.toString().padStart(2, '0'),
      value: subTag01,
    });
  }

  // 3. Gabungkan seluruh TLV string tanpa CRC
  let payloadWithoutCRC = '';
  for (const el of newElements) {
    payloadWithoutCRC += `${el.tag}${el.length}${el.value}`;
  }

  // 4. Tambahkan header Tag 63: '6304'
  const payloadToSign = `${payloadWithoutCRC}6304`;

  // 5. Hitung CRC16-CCITT
  const newCRC = calculateCRC16(payloadToSign);

  return `${payloadToSign}${newCRC}`;
}
