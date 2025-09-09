import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import * as c from '../controllers/project.controller';
const r = Router();
r.post('/:companyId/projects', requireAuth, requireRole('admin','manager'), c.createProject);
r.get('/:companyId/projects',  requireAuth, c.listProjects);
export default r;
