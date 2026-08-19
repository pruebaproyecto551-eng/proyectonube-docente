import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export function errorMiddleware(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation error',
      details: err.flatten(),
    });
  }

  if (err && typeof err.status === 'number') {
    return res.status(err.status).json({ error: err.message || 'Error' });
  }

  console.error(err);
  return res.status(500).json({ error: 'Internal Server Error' });
}
