import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import * as ctrl from '../controllers/company.controller';

// If you want rate limiting on public registration:
// import rateLimit from 'express-rate-limit';
// const limiter = rateLimit({ windowMs: 15*60*1000, limit: 50 });

const r = Router();

// Public registration (no auth header required)
r.post('/register', ctrl.registerCompany);

r.post('/login', ctrl.loginCompany);           // <-- email+password login (no regNumber)

/* Useful additions */
r.get('/', requireAuth, ctrl.listMyCompanies);
r.post('/:companyId/switch-token', requireAuth, ctrl.switchToken);
r.post('/:companyId/verify', requireAuth, ctrl.verifyCompany);
r.post('/:companyId/reject', requireAuth, ctrl.rejectCompany);

r.get('/:companyId', requireAuth, ctrl.getCompany);
r.patch('/:companyId', requireAuth, ctrl.updateCompany);

r.get('/:companyId/members', requireAuth, ctrl.listMembers);
r.post('/:companyId/members', requireAuth, ctrl.addMember);
r.patch('/:companyId/members/:userId', requireAuth, ctrl.updateMemberRole);
r.delete('/:companyId/members/:userId', requireAuth, ctrl.removeMember);

r.get('/:companyId/stats', requireAuth, ctrl.companyStats);

export default r;
