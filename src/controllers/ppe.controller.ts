import crypto from 'crypto';
import axios from 'axios';
import PPECheck from '../models/PPECheck';
import Worker from '../models/Worker';
import Task from '../models/Task';
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

/**
 * Get PPE summary report for all workers (grouped by worker)
 * Shows count of pass/fail results per worker.
 */
export async function getPPEWorkerReport(req: Request, res: Response) {
  const { companyId } = req.params;

  // ✅ Check company ID validity
  if (!companyId) throw new HttpError(400, 'companyId is required');

  // --- Step 1: Aggregate PPE checks ---
  const stats = await PPECheck.aggregate([
    { $match: { companyId } },
    {
      $group: {
        _id: '$workerId',
        totalChecks: { $sum: 1 },
        passCount: { $sum: { $cond: [{ $eq: ['$result', 'pass'] }, 1, 0] } },
        failCount: { $sum: { $cond: [{ $eq: ['$result', 'fail'] }, 1, 0] } },
        lastCheckAt: { $max: '$createdAt' }
      }
    },
    { $sort: { failCount: -1 } }
  ]);

  // --- Step 2: Get worker details for display ---
  const workerIds = stats.map(s => s._id);
  const workers = await Worker.find({ _id: { $in: workerIds } })
    .select('name phone status')
    .lean();

  // --- Step 3: Merge stats + worker info ---
  const report = stats.map(stat => {
    const worker = workers.find(w => String(w._id) === String(stat._id));
    return {
      workerId: stat._id,
      name: worker?.name || '(Unknown)',
      phone: worker?.phone || '-',
      status: worker?.status || '-',
      totalChecks: stat.totalChecks,
      passCount: stat.passCount,
      failCount: stat.failCount,
      lastCheckAt: stat.lastCheckAt
    };
  });

  res.json({
    companyId,
    totalWorkers: report.length,
    summary: {
      totalChecks: report.reduce((a, b) => a + b.totalChecks, 0),
      totalPass: report.reduce((a, b) => a + b.passCount, 0),
      totalFail: report.reduce((a, b) => a + b.failCount, 0)
    },
    workers: report
  });
}


/**
 * Get all PPE checks for a specific worker
 * Includes task info, result, and timestamps
 */
/**
 * Fetch all PPE checks for a specific worker
 * Includes task, manager, and teamLead information
 */
export async function getWorkerPPEChecks(req: Request, res: Response) {
  const { workerId } = req.params;
  if (!workerId) throw new HttpError(400, 'workerId is required');

  // --- 1️⃣ Fetch and populate related task + manager + teamLead ---
  const checks = await PPECheck.find({ workerId })
    .populate({
      path: 'taskId',
      model: 'Task',
      select: ['title', 'workDate', 'shift', 'managerId', 'teamLeadId'],
      populate: [
        { path: 'managerId', model: 'User', select: ['name', 'email'] }
      ]
    })
    .sort({ createdAt: -1 })
    .lean();

  if (!checks.length) throw new HttpError(404, 'No PPE checks found for this worker');

  // --- 2️⃣ Map result cleanly ---
  const result = checks.map(c => {
    const task: any = c.taskId; // ✅ Fix TypeScript inference issue

    return {
      checkId: c._id,
      taskTitle: task?.title ?? null,
      workDate: task?.workDate ?? null,
      shift: task?.shift ?? null,
      manager: task?.managerId?.name ?? null,
      result: c.result,
      createdAt: c.createdAt
    };
  });

  // --- 3️⃣ Calculate summary (optional, for reporting) ---
  const total = result.length;
  const passCount = result.filter(r => r.result === 'pass').length;
  const failCount = result.filter(r => r.result === 'fail').length;

  // --- 4️⃣ Send response ---
  res.json({
    workerId,
    total,
    passCount,
    failCount,
    checks: result
  });
}