import { Request, Response } from 'express';
import { Types } from 'mongoose';
import Project from '../models/Project';
import Worker from '../models/Worker';
import TaskAssignment from '../models/TaskAssignment';
import Company from '../models/Company';
import { HttpError } from '../middleware/errors';

export async function createProject(req: Request, res: Response) {
  try {

    console.log('Company found:');
    const { companyId } = req.params;
    const { name, description } = req.body;

    if (!name) throw new HttpError(400, 'Project name required');
    if (!Types.ObjectId.isValid(companyId)) throw new HttpError(400, 'Invalid company ID');

    const company = await Company.findById(companyId);
    if (!company) throw new HttpError(404, 'Company not found');
    
    const project = await Project.create({ companyId, name, description });
    res.status(201).json(project);
  } catch (err) {
    throw err;
  }
}

export async function listProjects(req: Request, res: Response) {
  const { companyId } = req.params;
  const projects = await Project.find({ companyId, deletedAt: null }).lean();
  res.json(projects);
}

export async function getProject(req: Request, res: Response) {
  const { companyId, projectId } = req.params;
  const project = await Project.findOne({ _id: projectId, companyId, deletedAt: null });
  if (!project) throw new HttpError(404, 'Project not found');
  res.json(project);
}

export async function updateProject(req: Request, res: Response) {
  const { companyId, projectId } = req.params;
  const project = await Project.findOneAndUpdate(
    { _id: projectId, companyId, deletedAt: null },
    req.body,
    { new: true }
  );
  if (!project) throw new HttpError(404, 'Project not found');
  res.json(project);
}

export async function deleteProject(req: Request, res: Response) {
  const { companyId, projectId } = req.params;
  const project = await Project.findOneAndUpdate(
    { _id: projectId, companyId },
    { deletedAt: new Date() },
    { new: true }
  );
  if (!project) throw new HttpError(404, 'Project not found');
  res.json({ success: true });
}

export async function assignWorkerToProject(req: Request, res: Response) {
  const { projectId } = req.params;
  const { workerId } = req.body;
  const worker = await Worker.findById(workerId);
  if (!worker) throw new HttpError(404, 'Worker not found');
  const assignment = await TaskAssignment.create({ projectId, workerId });
  res.status(201).json(assignment);
}

export async function listProjectWorkers(req: Request, res: Response) {
  const { projectId } = req.params;
  const assignments = await TaskAssignment.find({ projectId }).populate('workerId');
  res.json(assignments.map(a => a.workerId));
}
