import type { NextFunction, Request, Response } from 'express';
import { writeAuthAudit } from '../audit/auth-audit.service.js';
import { canAccess, type RoleCode } from './roles.js';

export const requireRoles = (...roles: RoleCode[]) =>
  async (req: Request, res: Response, next: NextFunction) => {
    const auth = req.auth;

    if (!auth) {
      return res.status(401).json({
        error: { code: 'UNAUTHENTICATED', message: 'Autenticación requerida.' },
        meta: { correlationId: req.context.correlationId },
      });
    }

    if (!canAccess(auth.role, roles)) {
      try {
        await writeAuthAudit({
          action: 'AUTH_FORBIDDEN',
          outcome: 'DENIED',
          correlationId: req.context.correlationId,
          userId: auth.userId,
        });
      } catch {
        req.log.error(
          { correlationId: req.context.correlationId },
          'failed to persist forbidden audit event',
        );
      }

      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Acceso denegado.' },
        meta: { correlationId: req.context.correlationId },
      });
    }

    next();
  };
