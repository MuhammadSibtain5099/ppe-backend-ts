import crypto from 'crypto';
import PPECheck from '../models/PPECheck';
import { Request, Response } from 'express';
import { HttpError } from '../middleware/errors';

export async function submitCheck(req: Request, res: Response) {
  const { companyId, taskId } = req.params;
  if (companyId !== req.user?.companyId) throw new HttpError(403,'Cross-tenant');
  const { workerId, result, jsonBlobUrl } = req.body;

  const payload = JSON.stringify({ taskId, workerId, result, jsonBlobUrl });
  const evidenceHash = crypto.createHash('sha256').update(payload).digest(); // Buffer

  const check = await PPECheck.create({
    companyId, taskId, workerId,
    checkedById: req.user!.sub, result, jsonBlobUrl, evidenceHash
  });

  res.json({ checkId: check._id, evidenceHashHex: Buffer.from(evidenceHash).toString('hex') });
}
