import { describe, it, expect } from 'bun:test';
import { parseIncomingNotification } from '../src/server/core/notificationParser';

describe('Notification Parser & Anti-Debit Guard', () => {
  describe('Anti-Debit Guard', () => {
    it('should reject payment/outgoing money notifications', () => {
      const debitTexts = [
        'Pembayaran berhasil ke Merchant Kopi Kenangan Rp 35.000',
        'Kamu telah membayar tagihan listrik PLN sebesar Rp 150.000',
        'Transfer ke rekening BCA 1234567890 berhasil Rp 200.000',
        'Transaksi Debet sebesar Rp 75.000 telah didebit dari rekening Anda',
        'Pembayaran QRIS ke Warung Makan Rp 25.000 berhasil',
        'Sent to Budi Hartono Rp 50.000',
      ];

      for (const text of debitTexts) {
        const parsed = parseIncomingNotification(text);
        expect(parsed.isDebit).toBe(true);
        expect(parsed.amount).toBeNull();
      }
    });
  });

  describe('Incoming Payment Parsing (Credit)', () => {
    it('should correctly parse DANA incoming payments', () => {
      const text = 'DANA: Kamu menerima pembayaran sebesar Rp 75.250 dari Ahmad';
      const parsed = parseIncomingNotification(text);
      expect(parsed.isDebit).toBe(false);
      expect(parsed.amount).toBe(75250);
      expect(parsed.bankOrWallet).toBe('DANA');
    });

    it('should correctly parse BCA transfer masuk', () => {
      const text = 'm-Transfer: Masuk Rp 125.500 dari SITI FATIMAH';
      const parsed = parseIncomingNotification(text);
      expect(parsed.isDebit).toBe(false);
      expect(parsed.amount).toBe(125500);
      expect(parsed.bankOrWallet).toBe('BCA');
    });

    it('should correctly parse Mandiri Livin incoming funds', () => {
      const text = 'Livin by Mandiri: Dana Masuk Rp50.123 dari Eko Santoso';
      const parsed = parseIncomingNotification(text);
      expect(parsed.isDebit).toBe(false);
      expect(parsed.amount).toBe(50123);
      expect(parsed.bankOrWallet).toBe('Mandiri');
    });

    it('should correctly parse GoPay/GoBiz QRIS payments', () => {
      const text = 'GoBiz: Kamu menerima pembayaran QRIS sebesar Rp 45.000';
      const parsed = parseIncomingNotification(text);
      expect(parsed.isDebit).toBe(false);
      expect(parsed.amount).toBe(45000);
      expect(parsed.bankOrWallet).toBe('GoPay');
    });

    it('should handle empty or invalid notifications gracefully', () => {
      const empty = parseIncomingNotification('');
      expect(empty.amount).toBeNull();
      expect(empty.isDebit).toBe(false);
      expect(empty.bankOrWallet).toBe('Unknown');
    });
  });
});
