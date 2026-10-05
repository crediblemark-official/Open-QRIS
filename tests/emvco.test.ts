import { describe, it, expect } from 'bun:test';
import { 
  calculateCRC16, 
  parseTLV, 
  extractQRISInfo, 
  convertToDynamicQRIS 
} from '../src/server/core/emvco';

describe('EMVCo QRIS Engine', () => {
  const SAMPLE_STATIC_QRIS = 
    '00020101021126570011ID.DANA.WWW011893600915303549932302090354993230303UMI51440014ID.CO.QRIS.WWW0215ID10266039578320303UMI5204899953033605802ID5912Crediblemark6012Kab. Sumenep6105694726304D204';

  describe('calculateCRC16', () => {
    it('should calculate valid 4-character hex CRC16-CCITT', () => {
      // Input without the final 4-char CRC
      const payload = SAMPLE_STATIC_QRIS.substring(0, SAMPLE_STATIC_QRIS.length - 4);
      const crc = calculateCRC16(payload);
      expect(crc).toBe('D204');
    });
  });

  describe('parseTLV', () => {
    it('should parse raw QRIS string into Tag-Length-Value array', () => {
      const elements = parseTLV(SAMPLE_STATIC_QRIS);
      expect(elements.length).toBeGreaterThan(5);

      // Tag 00: Payload Format Indicator
      const tag00 = elements.find(e => e.tag === '00');
      expect(tag00).toBeDefined();
      expect(tag00?.value).toBe('01');

      // Tag 01: Point of Initiation Method (11 = Static)
      const tag01 = elements.find(e => e.tag === '01');
      expect(tag01).toBeDefined();
      expect(tag01?.value).toBe('11');

      // Tag 58: Country Code
      const tag58 = elements.find(e => e.tag === '58');
      expect(tag58?.value).toBe('ID');

      // Tag 59: Merchant Name
      const tag59 = elements.find(e => e.tag === '59');
      expect(tag59?.value).toBe('Crediblemark');
    });
  });

  describe('extractQRISInfo', () => {
    it('should extract merchant and acquisition details from static QRIS', () => {
      const info = extractQRISInfo(SAMPLE_STATIC_QRIS);
      expect(info.type).toBe('STATIC');
      expect(info.isStatic).toBe(true);
      expect(info.merchantName).toBe('Crediblemark');
      expect(info.merchantCity).toBe('Kab. Sumenep');
      expect(info.currency).toBe('IDR');
      expect(info.acquirer).toContain('DANA');
    });
  });

  describe('convertToDynamicQRIS', () => {
    it('should convert static QRIS to dynamic with specified amount and order ID', () => {
      const dynamicQRIS = convertToDynamicQRIS(SAMPLE_STATIC_QRIS, 50000, {
        orderId: 'ORDER-TEST-123'
      });

      expect(dynamicQRIS).toBeDefined();
      const info = extractQRISInfo(dynamicQRIS);
      expect(info.type).toBe('DYNAMIC');
      expect(info.isStatic).toBe(false);
      expect(info.existingAmount).toBe(50000);

      // Verify CRC of the generated dynamic QRIS is valid
      const payload = dynamicQRIS.substring(0, dynamicQRIS.length - 4);
      const expectedCrc = dynamicQRIS.substring(dynamicQRIS.length - 4);
      expect(calculateCRC16(payload)).toBe(expectedCrc);
    });
  });
});
