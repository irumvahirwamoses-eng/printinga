import { describe, expect, it } from 'vitest';
import { updateProfileSchema } from '../src/controllers/authController';

describe('updateProfileSchema', () => {
  it('accepts editable profile fields', () => {
    const result = updateProfileSchema.safeParse({
      body: {
        fullName: '  Jane Doe  ',
        email: 'jane@school.edu',
        phone: '0240000000',
        department: 'Mathematics',
      },
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.body.fullName).toBe('Jane Doe');
  });

  it('allows clearing optional contact fields', () => {
    const result = updateProfileSchema.safeParse({
      body: { fullName: 'Jane Doe', email: '', phone: '', department: '' },
    });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid email or a blank name', () => {
    expect(updateProfileSchema.safeParse({ body: { fullName: 'Jane', email: 'not-an-email' } }).success).toBe(false);
    expect(updateProfileSchema.safeParse({ body: { fullName: '   ' } }).success).toBe(false);
  });

  it('strips privileged fields instead of letting users edit them', () => {
    const result = updateProfileSchema.safeParse({
      body: { fullName: 'Jane Doe', role: 'OFFICER', isActive: true, nationalId: '1234567890123456' },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.body).not.toHaveProperty('role');
      expect(result.data.body).not.toHaveProperty('isActive');
      expect(result.data.body).not.toHaveProperty('nationalId');
    }
  });
});
