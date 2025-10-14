import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import {
  createTask, listTasks, getTask, updateTask, deleteTask,
  assignWorkerToTask, listTaskWorkers
} from '../controllers/task.controller';

const r = Router();

r.post('/api/companies/:companyId/projects/:projectId/tasks', requireAuth, createTask);
r.get('/api/companies/:companyId/projects/:projectId/tasks', requireAuth, listTasks);
r.get('/api/companies/:companyId/projects/:projectId/tasks/:taskId', requireAuth, getTask);
r.patch('/api/companies/:companyId/projects/:projectId/tasks/:taskId', requireAuth, updateTask);
r.delete('/api/companies/:companyId/projects/:projectId/tasks/:taskId', requireAuth, deleteTask);

r.post('/api/companies/:companyId/projects/:projectId/tasks/:taskId/workers', requireAuth, assignWorkerToTask);
r.get('/api/companies/:companyId/projects/:projectId/tasks/:taskId/workers', requireAuth, listTaskWorkers);

export default r;
