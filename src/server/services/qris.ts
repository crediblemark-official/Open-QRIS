/**
 * OpenQRIS QR Service
 * Memproses pembuatan transaksi dan rendering QR Code visual
 */

import QRCode from 'qrcode';
import { convertToDynamicQRIS } from '../core/emvco';
import { store, type Charge, type TenantApp } from './store';

export interface CreateChargeInput {
  orderId: string;
  amount: number;
  customerName?: string;
  customerEmail?: string;
  expiryMinutes?: number;
}

export async function createDynamicCharge(
  tenant: TenantApp,
  input: CreateChargeInput,
  originUrl: string = 'http://localhost:3000'
): Promise<Charge> {
  const settings = await store.getSettings();

  // 1. Tentukan sumber QRIS statis (Tenant custom QRIS atau Default platform)
  const sourceStaticQRIS = tenant.staticQRIS || settings.defaultStaticQRIS;
  if (!sourceStaticQRIS) {
    throw new Error(
      'Belum ada Master QRIS Statis yang dikonfigurasi. Silakan upload QRIS DANA di Dashboard pengaturan terlebih dahulu.'
    );
  }

  // 2. Alokasikan Kode Unik jika diaktifkan (agar tidak ada 2 invoice pending dengan nominal yang sama)
  const baseAmount = Math.round(Number(input.amount));
  if (baseAmount < 1000) {
    throw new Error('Nominal transaksi minimal adalah Rp 1.000');
  }

  let uniqueCode = 0;
  let totalAmount = baseAmount;

  if (settings.useUniqueCode) {
    const allocated = await store.findAvailableUniqueCode(baseAmount);
    uniqueCode = allocated.uniqueCode;
    totalAmount = allocated.totalAmount;
  }

  // 3. Konversi menjadi string QRIS Dinamis
  const dynamicQRIS = convertToDynamicQRIS(sourceStaticQRIS, totalAmount, {
    orderId: input.orderId,
  });

  // 4. Render gambar QR Code (High Quality PNG Data URL)
  const qrDataUrl = await QRCode.toDataURL(dynamicQRIS, {
    errorCorrectionLevel: 'M',
    margin: 2,
    scale: 8,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
  });

  // 5. Tentukan masa berlaku
  const expiryMins = input.expiryMinutes || settings.expiryMinutes || 30;
  const expiresAt = new Date(Date.now() + expiryMins * 60 * 1000);

  const chargeId = `ch_${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 6)}`;

  const charge: Charge = {
    id: chargeId,
    tenantId: tenant.id,
    tenantName: tenant.name,
    orderId: input.orderId,
    amount: baseAmount,
    uniqueCode,
    totalAmount,
    customerName: input.customerName,
    customerEmail: input.customerEmail,
    rawQRIS: dynamicQRIS,
    qrDataUrl,
    status: 'PENDING',
    expiresAt,
    createdAt: new Date(),
  };

  await store.createCharge(charge);
  return charge;
}
