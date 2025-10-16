import express from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import {
  addManager,
  listManagers,
  updateManager,
  removeManager
} from '../controllers/manager.controller';

const router = express.Router();

// Create manager
router.post(
  '/companies/:companyId/managers',
  requireAuth,
  requireRole('admin'),
  addManager
);

// List all managers
router.get(
  '/companies/:companyId/managers',
  requireAuth,
  requireRole('admin', 'manager'),
  listManagers
);

// Update manager info
router.patch(
  '/companies/:companyId/managers/:userId',
  requireAuth,
  requireRole('admin'),
  updateManager
);

// Delete manager
router.delete(
  '/companies/:companyId/managers/:userId',
  requireAuth,
  requireRole('admin'),
  removeManager
);

export default router;
