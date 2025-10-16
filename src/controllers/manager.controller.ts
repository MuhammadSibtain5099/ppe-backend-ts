import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import User from '../models/User';
import Membership from '../models/Membership';
import { HttpError } from '../middleware/errors';

/**
 * CREATE - Add manager to company
 */
export async function addManager(req: Request, res: Response) {
  const { companyId } = req.params;
  const { name, email, password } = req.body;

  if (!email || !password) throw new HttpError(400, 'Email and password are required');

  // Check for existing user
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) throw new HttpError(409, 'User with this email already exists');

  // Create user
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ email: email.toLowerCase(), passwordHash, name });

  // Create membership as manager
  const membership = await Membership.create({
    companyId,
    userId: user._id,
    role: 'manager',
    status: 'approved'
  });

  res.status(201).json({
    message: 'Manager added successfully',
    userId: user._id,
    companyId,
    membershipId: membership._id
  });
}

interface PopulatedManager {
  userId: { _id: string; name?: string; email?: string } | null;
  companyId: string;
  role: string;
  status: string;
  createdAt: Date;
}

/**
 * READ - List all managers of a company
 */
// READ - List all managers of a company
export async function listManagers(req: Request, res: Response) {
  const { companyId } = req.params;

  const managers = await Membership.find({ companyId, role: 'manager' })
    .populate({ path: 'userId', model: User, select: ['name', 'email', '_id'] })
    .lean<PopulatedManager[]>(); // ✅ tell TypeScript the populated type

  const result = managers.map(m => ({
    userId: m.userId?._id ?? null,
    name: m.userId?.name ?? null,
    email: m.userId?.email ?? null,
    status: m.status,
    joinedAt: m.createdAt
  }));

  res.json({ companyId, total: result.length, managers: result });
}


/**
 * UPDATE - Update manager info or role (optional)
 */
export async function updateManager(req: Request, res: Response) {
  const { companyId, userId } = req.params;
  const { name, password, status } = req.body;

  // Update user info
  if (name || password) {
    const update: any = {};
    if (name) update.name = name;
    if (password) update.passwordHash = await bcrypt.hash(password, 10);
    await User.findByIdAndUpdate(userId, update);
  }

  // Update membership status if provided
  if (status) {
    const membership = await Membership.findOneAndUpdate(
      { companyId, userId, role: 'manager' },
      { status },
      { new: true }
    );
    if (!membership) throw new HttpError(404, 'Manager not found');
  }

  res.json({ message: 'Manager updated successfully', userId });
}

/**
 * DELETE - Remove a manager from a company
 */
export async function removeManager(req: Request, res: Response) {
  const { companyId, userId } = req.params;

  // Step 1. Delete membership
  const membership = await Membership.findOneAndDelete({
    companyId,
    userId,
    role: 'manager'
  });

  if (!membership) throw new HttpError(404, 'Manager not found');

  // Step 2. Delete user record
  const deletedUser = await User.findByIdAndDelete(userId);

  if (!deletedUser) {
    console.warn(`⚠️ Manager user ${userId} not found in User collection.`);
  }

  res.json({
    success: true,
    message: 'Manager and associated user deleted successfully',
    userId
  });
}

