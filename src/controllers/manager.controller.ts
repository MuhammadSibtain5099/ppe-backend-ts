import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import User from '../models/User';
import Membership from '../models/Membership';
import { HttpError } from '../middleware/errors';
import jwt from 'jsonwebtoken';
const SECRET = process.env.JWT_SECRET || 'dev-secret';
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

/**
 * POST /api/managers/login
 * Manager Login (auto-detects company from Membership)
 */
export async function managerLogin(req: Request, res: Response) {
  const { email, password } = req.body;

  if (!email || !password)
    throw new HttpError(400, 'Email and password are required');

  // 🔹 1. Find user
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) throw new HttpError(401, 'Invalid credentials');

  // 🔹 2. Verify password
  const validPassword = await bcrypt.compare(password, user.passwordHash);
  if (!validPassword) throw new HttpError(401, 'Invalid credentials');

  // 🔹 3. Find active manager memberships
  const memberships = await Membership.find({
    userId: user._id,
    role: 'manager',
    status: 'approved'
  }).populate('companyId', 'name status');

  if (!memberships.length)
    throw new HttpError(403, 'You are not assigned as a manager in any company');

  // 🔹 4. If multiple companies, return selection list
  if (memberships.length > 1) {
    return res.status(200).json({
      needsCompanySelection: true,
      message: 'Manager belongs to multiple companies. Please select one.',
      companies: memberships.map(m => ({
        companyId: m.companyId?._id,
        companyName: m.companyId?.name,
        status: m.companyId?.status
      }))
    });
  }

  // 🔹 5. If only one company, auto-login
  const company = memberships[0].companyId;
  const companyId = company?._id;

  const token = jwt.sign(
    {
      sub: String(user._id),
      companyId: String(companyId),
      roles: ['manager']
    },
    SECRET,
    { expiresIn: '7d' }
  );

  res.json({
    message: 'Login successful',
    token,
    manager: {
      userId: user._id,
      name: user.name,
      email: user.email,
      companyId,
      companyName: company?.name
    }
  });
}