import Task from '../models/Task';
import TaskAssignment from '../models/TaskAssignment';
import Worker from '../models/Worker';
import { Request, Response } from 'express';
import { HttpError } from '../middleware/errors';

export async function createTask(req: Request, res: Response) {
  const { companyId, projectId } = req.params;
  if (companyId !== req.user?.companyId) throw new HttpError(403,'Cross-tenant');
  const { workDate, title, shift, notes, supervisorId } = req.body;
  const task = await Task.create({ companyId, projectId, workDate:new Date(workDate), title, shift, notes, supervisorId });
  res.json(task);
}

export async function assignWorker(req: Request, res: Response) {
  const { companyId, taskId } = req.params;
  if (companyId !== req.user?.companyId) throw new HttpError(403,'Cross-tenant');
  const { workerId } = req.body;
  const w = await Worker.findOne({ _id: workerId, companyId });
  if (!w) throw new HttpError(404,'Worker not found');
  try {
    const ta = await TaskAssignment.create({ taskId, workerId });
    res.json(ta);
  } catch (e:any) {
    if (e?.code === 11000) throw new HttpError(409,'Worker already in this task');
    throw e;
  }
}

export async function listTaskWorkers(req: Request, res: Response) {
  const rows = await TaskAssignment.find({ taskId: req.params.taskId }).populate('workerId');
  res.json(rows.map(r => r.workerId));
}
