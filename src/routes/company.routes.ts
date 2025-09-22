import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import * as ctrl from '../controllers/company.controller';

// If you want rate limiting on public registration:
// import rateLimit from 'express-rate-limit';
// const limiter = rateLimit({ windowMs: 15*60*1000, limit: 50 });

const r = Router();

// Public registration (no auth header required)
r.post('/register', ctrl.registerCompany);


export default r;
