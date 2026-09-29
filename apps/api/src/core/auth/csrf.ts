import type { NextFunction, Request, Response } from 'express';
import { env } from '../../config/env.js';

export const requireTrustedOrigin = (req: Request, res: Response, next: NextFunction) => {
  const origin = req.header('origin');
  const configuredOrigins = env.CORS_ORIGINS.split(',').map((value) => value.trim());
  let isSameOrigin = false;

  if (origin) {
    try {
      isSameOrigin = new URL(origin).host === req.get('host');
    } catch {
      isSameOrigin = false;
    }
  }

  if (!origin || (!isSameOrigin && !configuredOrigins.includes(origin))) {
    return res.status(403).json({
      error: { code: 'FORBIDDEN', message: 'Origen no permitido.' },
      meta: { correlationId: req.context.correlationId },
    });
  }

  next();
};
