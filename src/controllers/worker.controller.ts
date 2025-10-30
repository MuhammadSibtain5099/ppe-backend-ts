import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import Worker from '../models/Worker';
import User from '../models/User';
import Membership from '../models/Membership';
import TaskAssignment from '../models/TaskAssignment';
import PPECheck from '../models/PPECheck';
import { HttpError } from '../middleware/errors';


interface PopulatedMembership {
  userId: { _id: string; name?: string; email?: string } | null;
  companyId: string;
  role: string;
  status: string;
}


const SECRET = process.env.JWT_SECRET || 'test';


(async () => {
  try {
    await Worker.collection.dropIndex('companyId_1_nationalIdHash_1');
    console.log('✅ Old index dropped successfully');
  } catch (err: any) {
    if (err.code === 27) {
      console.log('ℹ️ Index not found (already removed)');
    } else {
      console.error('⚠️ Failed to drop index:', err);
    }
  }
})();

/**
 * Independent worker registration (no company required)
 */
export async function registerIndependentWorker(req: Request, res: Response) {
  const { name, phone, email, password } = req.body;

  if (!email && !phone) throw new HttpError(400, 'phone or email required');
  if (!password) throw new HttpError(400, 'password required');

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ email: email?.toLowerCase(), passwordHash, name });

  const worker = await Worker.create({
    userId: user._id,
    name,
    phone,
    status: 'independent'
  });

  res.status(201).json({ workerId: worker._id, status: worker.status });
}

/**
 * Link worker to a company (new membership, pending approval)
 */
export async function linkWorkerToCompany(req: Request, res: Response) {
  const { workerId, companyId } = req.params;

  const worker = await Worker.findById(workerId);
  if (!worker) throw new HttpError(404, 'Worker not found');

  const existing = await Membership.findOne({ userId: worker.userId, companyId });
  if (existing) throw new HttpError(409, 'Already linked to this company');

  await Membership.create({ companyId, userId: worker.userId, role: 'worker', status: 'pending' });
  worker.status = 'active';
  await worker.save();

  res.json({ workerId: worker._id, companyId, status: 'pending' });
}

/**
 * Unlink worker from company (end membership, return to independent)
 */
export async function unlinkWorkerFromCompany(req: Request, res: Response) {
  const { workerId, companyId } = req.params;

  const membership = await Membership.findOne({ userId: workerId, companyId, status: 'approved' });
  if (!membership) throw new HttpError(404, 'Active membership not found');

  membership.endedAt = new Date();
  membership.status = 'rejected';
  await membership.save();

  const worker = await Worker.findById(workerId);
  if (worker) {
    worker.status = 'independent';
    await worker.save();
  }

  res.json({ workerId, status: 'independent' });
}

/**
 * Approve/reject worker membership
 */
export async function approveWorker(req: Request, res: Response) {
  const { workerId, companyId } = req.params;
  const { status } = req.body; // 'approved' or 'rejected'

  const membership = await Membership.findOne({ userId: workerId, companyId });
  if (!membership) throw new HttpError(404, 'Membership not found');

  if (!['approved', 'rejected'].includes(status)) throw new HttpError(400, 'Invalid status');
  membership.status = status;
  if (status === 'rejected') membership.endedAt = new Date();
  await membership.save();

  res.json(membership);
}

/**
 * Worker login with email or phone
 */
export async function workerLogin(req: Request, res: Response) {
  const { email, phone, password } = req.body;

  let user;
  if (email) user = await User.findOne({ email: email.toLowerCase() });
  if (!user && phone) {
    const worker = await Worker.findOne({ phone }).populate('userId');
    user = worker?.userId as any;
  }

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new HttpError(401, 'Invalid credentials');
  }

  const memberships = await Membership.find({ userId: user._id, status: 'approved' });
  const companyIds = memberships.map(m => m.companyId);

  const token = jwt.sign(
    { sub: String(user._id), companyIds: companyIds.map(String), roles: ['worker'] },
    SECRET,
    { expiresIn: '7d' }
  );

  res.json({ token, companyIds });
}

/**
 * Worker stats (tasks and PPE checks)
 */
export async function workerStats(req: Request, res: Response) {
  const { workerId } = req.params;

  const tasks = await TaskAssignment.countDocuments({ workerId });
  const checks = await PPECheck.countDocuments({ workerId });

  res.json({ workerId, tasks, checks });
}

/**
 * Worker company history
 */
export async function workerHistory(req: Request, res: Response) {
  const { workerId } = req.params;

  const history = await Membership.find({ userId: workerId })
    .populate('companyId', 'name status')
    .sort({ startedAt: 1 });

  res.json({ workerId, history });
}

// Company adds worker directly (auto-approved)
export async function addWorkerByCompany(req: Request, res: Response) {
  const { companyId } = req.params;
  const { name, phone, email, password } = req.body;

  if (!name) throw new HttpError(400, 'Name is required');

  let userId: any = null;
  if (email && password) {
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) throw new HttpError(409, 'User with this email already exists');

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ email: email.toLowerCase(), passwordHash, name });
    userId = user._id;
  }

  const worker = await Worker.create({
    userId,
    companyId,
    name,
    phone,
    status: 'active'
  });

  await Membership.create({
    companyId,
    userId: userId || worker._id,
    role: 'worker',
    status: 'approved'
  });

  res.status(201).json({
    workerId: worker._id,
    userId,
    companyId,
    status: 'approved'
  });
}

// In task.controller.ts
export async function unassignWorkerFromTask(req: Request, res: Response) {
  const { taskId } = req.params;
  const { workerId } = req.body;
  const result = await TaskAssignment.findOneAndDelete({ taskId, workerId });
  if (!result) throw new HttpError(404, 'Assignment not found');
  res.json({ success: true });
}

interface PopulatedMembership {
  userId: { _id: string; name?: string; email?: string } | null;
  companyId: string;
  role: string;
  status: string;
}

export async function listCompanyWorkers(req: Request, res: Response) {
  const { companyId } = req.params;

  // Step 1️⃣: Find approved worker memberships
  const memberships = await Membership.find({
    companyId,
    role: 'worker',
    status: 'approved'
  })
    .populate({
      path: 'userId',
      model: User,
      select: ['name', 'email']
    })
    .lean<PopulatedMembership[]>();

  if (!memberships.length) {
    throw new HttpError(404, 'No approved workers found for this company');
  }

  // Step 2️⃣: Extract userIds
  const userIds = memberships
    .map(m => m.userId?._id)
    .filter((id): id is string => Boolean(id));

  // Step 3️⃣: Fetch worker profiles and explicitly populate email
  const workers = await Worker.find({ userId: { $in: userIds } })
    .populate({
      path: 'userId',
      model: User,
      select: ['email'] // ✅ ensure email is fetched even if membership lean fails
    })
    .select('userId companyId name phone status photoUrl')
    .lean();

  // Step 4️⃣: Fetch PPE + Task summary
  const [taskCounts, ppeCounts] = await Promise.all([
    TaskAssignment.aggregate([
      { $match: { workerId: { $in: workers.map(w => w._id) } } },
      { $group: { _id: '$workerId', count: { $sum: 1 } } }
    ]),
    PPECheck.aggregate([
      { $match: { workerId: { $in: workers.map(w => w._id) } } },
      {
        $group: {
          _id: '$workerId',
          passCount: { $sum: { $cond: [{ $eq: ['$result', 'pass'] }, 1, 0] } },
          failCount: { $sum: { $cond: [{ $eq: ['$result', 'fail'] }, 1, 0] } }
        }
      }
    ])
  ]);

  const taskMap = new Map(taskCounts.map(t => [String(t._id), t.count]));
  const ppeMap = new Map(
    ppeCounts.map(p => [String(p._id), { pass: p.passCount, fail: p.failCount }])
  );

  // Step 5️⃣: Merge everything
  const combined = workers.map(worker => {
    const membership = memberships.find(m => m.userId?._id === String(worker.userId));
    const ppeSummary = ppeMap.get(String(worker._id)) || { pass: 0, fail: 0 };
    const taskCount = taskMap.get(String(worker._id)) || 0;

    return {
      companyId: worker.companyId || companyId,
      workerId: worker._id,
      userId: worker.userId,
      name: worker.name || membership?.userId?.name,
      email:
        membership?.userId?.email ||
        (worker.userId as any)?.email || // ✅ fallback to worker.userId.email
        null,
      phone: worker.phone,
      status: worker.status,
      membershipStatus: membership?.status,
      totalTasks: taskCount,
      ppePass: ppeSummary.pass,
      ppeFail: ppeSummary.fail
    };
  });

  res.json({
    companyId,
    total: combined.length,
    workers: combined
  });
}
/**
 * UPDATE - Edit worker details
 */
export async function updateWorkerDetails(req: Request, res: Response) {
  const { companyId, workerId } = req.params;
  const { name, phone, status, photoUrl, email, password } = req.body;

  // ✅ Step 1: Find worker
  const worker = await Worker.findOne({ _id: workerId, companyId });
  if (!worker) throw new HttpError(404, 'Worker not found');

  // ✅ Step 2: Update worker basic details
  if (name) worker.name = name;
  if (phone) worker.phone = phone;
  if (status) worker.status = status;
  if (photoUrl) worker.photoUrl = photoUrl;

  // ✅ Step 3: If user exists, update their account (email/password)
  if (worker.userId) {
    const user = await User.findById(worker.userId);
    if (user) {
      if (email) user.email = email.toLowerCase();
      if (password) user.passwordHash = await bcrypt.hash(password, 10);
      await user.save();
    }
  }

  await worker.save();

  res.json({
    message: 'Worker updated successfully',
    worker: {
      _id: worker._id,
      userId: worker.userId,
      name: worker.name,
      phone: worker.phone,
      status: worker.status,
      photoUrl: worker.photoUrl
    }
  });
}

