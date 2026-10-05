import { describe, it, expect } from 'bun:test';
import { isAdminEmail } from '../src/server/middleware/auth';

describe('Auth & Role Access Control', () => {
  describe('isAdminEmail', () => {
    it('should correctly identify configured admin email', () => {
      // Default in .env: info.rasyiqi@gmail.com
      expect(isAdminEmail('info.rasyiqi@gmail.com')).toBe(true);
    });

    it('should handle case insensitivity and whitespace', () => {
      expect(isAdminEmail('  INFO.RASYIQI@GMAIL.COM  ')).toBe(true);
      expect(isAdminEmail('Info.Rasyiqi@Gmail.Com')).toBe(true);
    });

    it('should reject non-admin emails as merchant', () => {
      expect(isAdminEmail('merchant@example.com')).toBe(false);
      expect(isAdminEmail('user.baru@gmail.com')).toBe(false);
      expect(isAdminEmail('admin@hexclave.app')).toBe(false);
      expect(isAdminEmail('hacker@domain.com')).toBe(false);
    });

    it('should handle empty, null, or undefined email safely', () => {
      expect(isAdminEmail('')).toBe(false);
      expect(isAdminEmail(null)).toBe(false);
      expect(isAdminEmail(undefined)).toBe(false);
    });
  });
});
