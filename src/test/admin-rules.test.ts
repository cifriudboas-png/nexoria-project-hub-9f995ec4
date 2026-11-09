import { describe, expect, it } from 'vitest';
import { isValidGiftAmount } from '@/lib/admin';

describe('admin Nexos gifts', () => {
  it('allows gifts from 1 to 1,000,000 Nexos', () => {
    expect(isValidGiftAmount(1)).toBe(true);
    expect(isValidGiftAmount(1_000_000)).toBe(true);
  });

  it('rejects zero, negative, fractional and too-large gifts', () => {
    expect(isValidGiftAmount(0)).toBe(false);
    expect(isValidGiftAmount(-5)).toBe(false);
    expect(isValidGiftAmount(2.5)).toBe(false);
    expect(isValidGiftAmount(1_000_001)).toBe(false);
  });
});
