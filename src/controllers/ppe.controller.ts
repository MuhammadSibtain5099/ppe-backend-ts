import crypto from 'crypto';
import axios from 'axios';
import PPECheck from '../models/PPECheck';
import { uploadToGCS } from '../utils/gcsUploader';
import { Request, Response } from 'express';
import { HttpError } from '../middleware/errors';

/**
 * POST /api/companies/:companyId/tasks/:taskId/ppe-checks
 * Saves PPE check in DB and forwards summary to external service.
 */
export async function submitCheck(req: Request, res: Response) {
  const { companyId, taskId } = req.params;
  if (companyId !== req.user?.companyId) throw new HttpError(403, 'Cross-tenant access denied');

  const { workerId, result } = req.body;
  const file = (req as any).file; // multer adds 'file'

  if (!workerId || result === undefined) throw new HttpError(400, 'workerId and result are required');

  // ✅ Upload image if provided
  let imageUrl: string | null = null;
  if (file) {
    imageUrl = await uploadToGCS(file, `ppe/${companyId}`);
  }

  const payload = JSON.stringify({ taskId, workerId, result, imageUrl });
  const evidenceHash = crypto.createHash('sha256').update(payload).digest();

  const check = await PPECheck.create({
    companyId,
    taskId,
    workerId,
    checkedById: req.user!.sub,
    result,
    jsonBlobUrl: imageUrl,
    evidenceHash
  });

  res.status(201).json({
    message: 'PPE check uploaded successfully',
    checkId: check._id,
    imageUrl,
    evidenceHashHex: Buffer.from(evidenceHash).toString('hex')
  });
}



export async function getPPECheck(req: Request, res: Response) {
  const { companyId, taskId, workerId } = req.params;

  if (!companyId || !taskId || !workerId)
    throw new HttpError(400, 'companyId, taskId, and workerId are required');

  const check = await PPECheck.findOne({
    companyId,
    taskId,
    workerId
  })
    .select('_id companyId taskId workerId checkedById result jsonBlobUrl createdAt')
    .lean();

  if (!check) throw new HttpError(404, 'PPE check not found');

  res.json({
    checkId: check._id,
    companyId: check.companyId,
    taskId: check.taskId,
    workerId: check.workerId,
    checkedById: check.checkedById,
    result: check.result,
    jsonBlobUrl: check.jsonBlobUrl,
    createdAt: check.createdAt
  });
}