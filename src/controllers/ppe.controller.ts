import crypto from 'crypto';
import axios from 'axios';
import PPECheck from '../models/PPECheck';
import { Request, Response } from 'express';
import { HttpError } from '../middleware/errors';

/**
 * POST /api/companies/:companyId/tasks/:taskId/ppe-checks
 * Saves PPE check in DB and forwards summary to external service.
 */
export async function submitCheck(req: Request, res: Response) {
  const { companyId, taskId } = req.params;

  // Security check — prevent cross-company misuse
  if (companyId !== req.user?.companyId) throw new HttpError(403, 'Cross-tenant access denied');

  const { workerId, result, jsonBlobUrl, companyName, imageUrl, status } = req.body;

  if (!workerId || result === undefined)
    throw new HttpError(400, 'workerId and result are required');

  // ✅ Generate SHA-256 hash as audit evidence
  const payload = JSON.stringify({ taskId, workerId, result, jsonBlobUrl });
  const evidenceHash = crypto.createHash('sha256').update(payload).digest(); // Buffer

  // ✅ Save PPE Check locally
  const check = await PPECheck.create({
    companyId,
    taskId,
    workerId,
    checkedById: req.user!.sub,
    result,
    jsonBlobUrl,
    evidenceHash
  });

  // ✅ Prepare data for external API
  const externalPayload = {
    companyId,
    companyName: companyName || 'Unknown',
    workerId,
    imageUrl: imageUrl || jsonBlobUrl || 'N/A',
    status: status ?? 1 // default to 1 if not provided
  };

  try {
    // ✅ Send data to external endpoint
    const externalResponse = await axios.post('http://34.173.239.52:8080/v1/api/ppe', externalPayload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 8000 // 8 seconds safety timeout
    });

    console.log('✅ PPE Data synced:', externalResponse.data);
  } catch (err: any) {
    console.error('⚠️ PPE external sync failed:', err.message);
    // Don’t crash the main request; log failure
  }

  // ✅ Return local confirmation
  res.json({
    message: 'PPE check submitted successfully',
    checkId: check._id,
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