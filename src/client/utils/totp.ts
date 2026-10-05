/**
 * TOTP & Base32 Helpers for Hexclave MFA Setup
 * Uses standard Web Crypto API (HMAC-SHA1)
 */

const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function uint8ArrayToBase32(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let output = '';

  for (let i = 0; i < bytes.length; i++) {
    value = (value << 8) | bytes[i];
    bits += 8;

    while (bits >= 5) {
      output += BASE32_CHARS[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_CHARS[(value << (5 - bits)) & 31];
  }

  return output;
}

export function generateRandomSecret(length = 20): Uint8Array {
  const bytes = new Uint8Array(length);
  window.crypto.getRandomValues(bytes);
  return bytes;
}

export async function generateTOTPCode(secret: Uint8Array, timeStep = 30, digits = 6, timeOffset = 0): Promise<string> {
  const epoch = Math.floor(Date.now() / 1000);
  const counter = Math.floor(epoch / timeStep) + timeOffset;

  const counterBuffer = new ArrayBuffer(8);
  const view = new DataView(counterBuffer);
  // High bits (zero for practical timestamps)
  view.setUint32(0, Math.floor(counter / 0x100000000));
  view.setUint32(4, counter & 0xffffffff);

  const key = await window.crypto.subtle.importKey(
    'raw',
    secret as BufferSource,
    { name: 'HMAC', hash: { name: 'SHA-1' } },
    false,
    ['sign']
  );

  const signature = await window.crypto.subtle.sign('HMAC', key, counterBuffer);
  const sigBytes = new Uint8Array(signature);

  const offset = sigBytes[sigBytes.length - 1] & 0x0f;
  const binary =
    ((sigBytes[offset] & 0x7f) << 24) |
    ((sigBytes[offset + 1] & 0xff) << 16) |
    ((sigBytes[offset + 2] & 0xff) << 8) |
    (sigBytes[offset + 3] & 0xff);

  const otp = binary % Math.pow(10, digits);
  return otp.toString().padStart(digits, '0');
}

export async function verifyTOTP(secret: Uint8Array, timeStep = 30, digits = 6, code: string): Promise<boolean> {
  const trimmed = code.trim();
  if (trimmed.length !== digits) return false;

  // Check current window, -1 window, and +1 window to allow for clock drift
  for (const offset of [0, -1, 1]) {
    const expected = await generateTOTPCode(secret, timeStep, digits, offset);
    if (expected === trimmed) {
      return true;
    }
  }

  return false;
}
