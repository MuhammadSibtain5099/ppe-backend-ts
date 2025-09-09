// src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

type Role = 'admin' | 'manager' | 'subcontractor' | 'worker';
interface JwtClaims { sub: string; companyId: string; roles: Role[]; }

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const hdr = req.headers.authorization;
  if (!hdr?.startsWith('Bearer ')) return next(new Error('Missing token'));
  try {
    const token = hdr.slice(7);
    req.user = jwt.verify(token, JWT_SECRET) as JwtClaims;
    next();
  } catch {
    next(new Error('Invalid token'));
  }
}

export function requireRole(...wanted: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    // ✅ Guard: after this, TS knows req.user is not undefined
    if (!req.user) return next(new Error('Unauthenticated'));
    const { roles } = req.user;
    if (!wanted.some(r => roles.includes(r))) return next(new Error('Forbidden'));
    next();
  };
}
