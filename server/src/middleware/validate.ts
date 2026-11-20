import { Request, Response, NextFunction } from 'express';
import { z, ZodType } from 'zod';
import { fail } from '../utils/apiResponse';

export const validate = (schema: ZodType<any>) =>
  (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    if (!result.success) {
      res.status(400).json(fail('Validation error', z.flattenError(result.error)));
      return;
    }
    req.body = result.data.body ?? req.body;
    req.query = result.data.query ?? req.query;
    req.params = result.data.params ?? req.params;
    next();
  };
