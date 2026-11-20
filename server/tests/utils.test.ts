import { describe, expect, it } from 'vitest';
import { maskNationalId } from '../src/utils/maskNationalId';
import { generateTempPassword } from '../src/utils/generateTempPassword';
import { fail, ok } from '../src/utils/apiResponse';

describe('maskNationalId', () => {
  it('masks all but the last four digits', () => {
    expect(maskNationalId('1234567890123456')).toBe('****3456');
  });

  it('fully masks short or missing values', () => {
    expect(maskNationalId('123')).toBe('****');
    expect(maskNationalId('')).toBe('****');
  });
});

describe('generateTempPassword', () => {
  it('generates unpredictable passwords of the requested length', () => {
    const first = generateTempPassword();
    const second = generateTempPassword();
    expect(first).toHaveLength(12);
    expect(second).toHaveLength(12);
    expect(first).not.toBe(second);
    expect(generateTempPassword(20)).toHaveLength(20);
  });
});

describe('apiResponse', () => {
  it('builds success and failure envelopes', () => {
    expect(ok({ id: 1 }, 'Created')).toEqual({ success: true, data: { id: 1 }, message: 'Created' });
    expect(fail('Nope')).toEqual({ success: false, message: 'Nope' });
    expect(fail('Nope', { field: 'bad' })).toEqual({ success: false, message: 'Nope', errors: { field: 'bad' } });
  });
});
