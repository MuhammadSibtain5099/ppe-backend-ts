import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import * as c from '../controllers/ppe.controller';
const r = Router();
r.post('/:companyId/tasks/:taskId/checks', requireAuth, requireRole('subcontractor','manager'), c.submitCheck);
export default r;
