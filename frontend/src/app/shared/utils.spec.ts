import { describe, expect, it } from 'vitest';

import { emptyToNull, safeReturnUrl } from './utils';

describe('utils', () => {
  it('emptyToNull', () => {
    expect(emptyToNull('  ')).toBeNull();
    expect(emptyToNull(undefined)).toBeNull();
    expect(emptyToNull(' texto ')).toBe('texto');
  });

  it('safeReturnUrl aceita apenas caminhos internos', () => {
    expect(safeReturnUrl('/contents/4')).toBe('/contents/4');
    expect(safeReturnUrl('https://evil.example.com')).toBe('/dashboard');
    expect(safeReturnUrl('//evil.example.com')).toBe('/dashboard');
    expect(safeReturnUrl('/login')).toBe('/dashboard');
    expect(safeReturnUrl(null)).toBe('/dashboard');
  });
});
