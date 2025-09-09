import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import * as c from '../controllers/task.controller';
const r = Router();
r.post('/:companyId/:projectId/tasks', requireAuth, requireRole('admin','manager'), c.createTask);
r.post('/:companyId/tasks/:taskId/assign', requireAuth, requireRole('admin','manager'), c.assignWorker);
r.get('/:companyId/tasks/:taskId/workers', requireAuth, c.listTaskWorkers);
export default r;
