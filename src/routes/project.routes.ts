// src/routes/project.routes.ts
import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import {
  createProject, listProjects, getProject,
  updateProject, deleteProject,
  assignWorkerToProject, listProjectWorkers
} from '../controllers/project.controller';

const r = Router();

r.post('/:companyId/projects', requireAuth, createProject);
r.get('/:companyId/projects', requireAuth, listProjects);
r.get('/:companyId/projects/:projectId', requireAuth, getProject);
r.patch('/:companyId/projects/:projectId', requireAuth, updateProject);
r.delete('/:companyId/projects/:projectId', requireAuth, deleteProject);

r.post('/:companyId/projects/:projectId/workers', requireAuth, assignWorkerToProject);
r.get('/:companyId/projects/:projectId/workers', requireAuth, listProjectWorkers);

export default r;
