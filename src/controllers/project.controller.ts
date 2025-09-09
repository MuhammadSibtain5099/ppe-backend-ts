import Project from '../models/Project';
import { Request, Response } from 'express';
import { HttpError } from '../middleware/errors';

export async function createProject(req: Request, res: Response) {
  const { companyId } = req.params;
  if (companyId !== req.user?.companyId) throw new HttpError(403,'Cross-tenant');
  const p = await Project.create({ companyId, name: req.body.name, description: req.body.description });
  res.json(p);
}

export async function listProjects(req: Request, res: Response) {
  const { companyId } = req.params;
  if (companyId !== req.user?.companyId) throw new HttpError(403,'Cross-tenant');
  res.json(await Project.find({ companyId }).lean());
}
