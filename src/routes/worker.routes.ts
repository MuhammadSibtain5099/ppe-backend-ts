import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import {
  registerIndependentWorker,
  linkWorkerToCompany,
  unlinkWorkerFromCompany,
  approveWorker,
  workerLogin,
  workerStats,
  workerHistory,
  addWorkerByCompany
} from '../controllers/worker.controller';

const r = Router();

// Independent worker
r.post('/api/workers/register', registerIndependentWorker);

// Worker joins/leaves company
r.post('/api/workers/:workerId/link/:companyId', requireAuth, linkWorkerToCompany);
r.post('/api/workers/:workerId/unlink/:companyId', requireAuth, unlinkWorkerFromCompany);

// Approve/reject worker
r.post('/api/workers/:workerId/approve/:companyId', requireAuth, approveWorker);

// Worker login
r.post('/api/workers/login', workerLogin);

// Worker stats
r.get('/api/workers/:workerId/stats', requireAuth, workerStats);

// Worker history
r.get('/api/workers/:workerId/history', requireAuth, workerHistory);

// Company directly adds worker
r.post('/api/companies/:companyId/workers', requireAuth, addWorkerByCompany);

export default r;
