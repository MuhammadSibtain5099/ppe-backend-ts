import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import authRoutes from './routes/auth.routes';
import projectRoutes from './routes/project.routes';
import workerRoutes from './routes/worker.routes';
import taskRoutes from './routes/task.routes';
import ppeRoutes from './routes/ppe.routes';
import companyRoutes from './routes/company.routes';


export const app = express();

app.use(helmet());
app.use(cors());

// ✅ must be before any routes that read req.body
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false })); // optional but handy for forms

app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/api/projects', projectRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/workers', workerRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/ppe', ppeRoutes);
app.use('/api/companies', companyRoutes);
