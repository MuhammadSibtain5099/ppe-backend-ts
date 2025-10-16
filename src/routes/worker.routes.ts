import { Router } from 'express';
import { requireRole, requireAuth } from '../middleware/auth';
import {
  registerIndependentWorker,
  linkWorkerToCompany,
  unlinkWorkerFromCompany,
  approveWorker,
  workerLogin,
  workerStats,
  workerHistory,
  addWorkerByCompany,
  unassignWorkerFromTask
} from '../controllers/worker.controller';

import { listCompanyWorkers } from '../controllers/worker.controller';

const r = Router();

// Independent worker
r.post('/register', registerIndependentWorker);

// Worker joins/leaves company
r.post('/:workerId/link/:companyId', requireAuth, linkWorkerToCompany);
r.post('/api/workers/:workerId/unlink/:companyId', requireAuth, unlinkWorkerFromCompany);

// Approve/reject worker
r.post('/api/workers/:workerId/approve/:companyId', requireAuth, approveWorker);

// Worker login
r.post('/login', workerLogin);

// Worker stats
r.get('/api/workers/:workerId/stats', requireAuth, workerStats);

// Worker history
r.get('/api/workers/:workerId/history', requireAuth, workerHistory);

// Company directly adds worker
r.post('/companies/:companyId/workers', requireAuth, addWorkerByCompany);

r.delete('/api/companies/:companyId/projects/:projectId/tasks/:taskId/workers', requireAuth, unassignWorkerFromTask);


r.get(
  '/companies/:companyId/workers',
  requireAuth,
  requireRole('admin', 'manager'),
  listCompanyWorkers
);

export default r;
