import { Request, Response } from 'express';
import Task from '../models/Task';
import Worker from '../models/Worker';
import TaskAssignment from '../models/TaskAssignment';
import { HttpError } from '../middleware/errors';

// Create task
export async function createTask(req: Request, res: Response) {
  const { companyId, projectId } = req.params;
  const { title, workDate, shift, notes, managerId } = req.body;

  if (!title || !workDate || !managerId) throw new HttpError(400, 'title, workDate, managerId are required');

  const task = await Task.create({
    companyId,
    projectId,
    title,
    workDate: new Date(workDate),
    shift,
    notes,
    managerId
  });

  res.status(201).json(task);
}

// List tasks
export async function listTasks(req: Request, res: Response) {
  const { companyId, projectId } = req.params;
  const tasks = await Task.find({ companyId, projectId, deletedAt: { $exists: false } }).lean();
  res.json(tasks);
}

// Get task
export async function getTask(req: Request, res: Response) {
  const { companyId, projectId, taskId } = req.params;
  const task = await Task.findOne({ _id: taskId, companyId, projectId, deletedAt: { $exists: false } });
  if (!task) throw new HttpError(404, 'Task not found');
  res.json(task);
}

// Update task
export async function updateTask(req: Request, res: Response) {
  const { companyId, projectId, taskId } = req.params;
  const task = await Task.findOneAndUpdate(
    { _id: taskId, companyId, projectId, deletedAt: { $exists: false } },
    req.body,
    { new: true }
  );
  if (!task) throw new HttpError(404, 'Task not found');
  res.json(task);
}

// Delete task (soft)
export async function deleteTask(req: Request, res: Response) {
  const { companyId, projectId, taskId } = req.params;
  const task = await Task.findOneAndUpdate(
    { _id: taskId, companyId, projectId },
    { deletedAt: new Date() },
    { new: true }
  );
  if (!task) throw new HttpError(404, 'Task not found');
  res.json({ success: true });
}

// Assign worker to task
export async function assignWorkerToTask(req: Request, res: Response) {
  const { taskId } = req.params;
  const { workerId } = req.body;

  const worker = await Worker.findById(workerId);
  if (!worker) throw new HttpError(404, 'Worker not found');

  try {
    const assignment = await TaskAssignment.create({ taskId, workerId });
    res.status(201).json(assignment);
  } catch (e: any) {
    if (e?.code === 11000) throw new HttpError(409, 'Worker already assigned');
    throw e;
  }
}

// List workers in task
export async function listTaskWorkers(req: Request, res: Response) {
  const { taskId } = req.params;
  const assignments = await TaskAssignment.find({ taskId }).populate('workerId');
  res.json(assignments.map(a => a.workerId));
}
