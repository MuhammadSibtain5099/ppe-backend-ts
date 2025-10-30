import { Router } from 'express';
import { upload } from '../middleware/upload';
import { requireAuth, requireRole } from '../middleware/auth';
import * as c from '../controllers/ppe.controller';
const r = Router();
// multipart/form-data for image upload
r.post(
  '/companies/:companyId/tasks/:taskId/ppe-checks',
  requireAuth,
  upload.single('image'),
  c.submitCheck
);

r.get('/companies/:companyId/tasks/:taskId/ppe-checks/:workerId', requireAuth, c.getPPECheck);


export default r;
