import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { validate } from '../src/middleware/validate';

const schema = z.object({
  body: z.object({ nationalId: z.string().regex(/^\d{16}$/) }),
});

function invoke(body: unknown) {
  const req: any = { body, query: {}, params: {} };
  const res: any = {
    statusCode: 0,
    payload: null,
    status(code: number) { this.statusCode = code; return this; },
    json(payload: unknown) { this.payload = payload; return this; },
  };
  const next = vi.fn();
  validate(schema)(req, res, next);
  return { req, res, next };
}

describe('validate middleware', () => {
  it('accepts valid input and calls next', () => {
    const { res, next } = invoke({ nationalId: '1234567890123456' });
    expect(next).toHaveBeenCalledOnce();
    expect(res.statusCode).toBe(0);
  });

  it('returns 400 with field-level errors for invalid input', () => {
    const { res, next } = invoke({ nationalId: 'bad' });
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
    expect(res.payload.success).toBe(false);
    expect(res.payload.errors.fieldErrors.body).toBeDefined();
  });
});
