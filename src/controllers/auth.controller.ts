import Company from '../models/Company';
import User from '../models/User';
import Membership from '../models/Membership';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Request, Response } from 'express';
import { HttpError } from '../middleware/errors';

const SECRET = process.env.JWT_SECRET || 'dev';

export async function signupCompanyAdmin(req: Request, res: Response, next: Function) {
  try {
    if (!req.body) return res.status(400).json({ error: 'Missing JSON body' });

    const { companyName, email, password } = req.body;
    if (!companyName || !email || !password) {
      return res.status(400).json({ error: 'companyName, email, password are required' });
    }

    const company = await Company.create({ name: companyName });
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ email, passwordHash });
    await Membership.create({ companyId: company._id, userId: user._id, role: 'admin' });

    const token = jwt.sign(
      { sub: user._id, companyId: company._id, roles: ['admin'] },
      SECRET,
      { expiresIn: '7d' }
    );
    res.json({ token, companyId: company._id });
  } catch (err) { next(err); }
}

export async function login(req: Request, res: Response) {
  const { email, password, companyId } = req.body;
  const user = await User.findOne({ email });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) throw new HttpError(401,'Invalid credentials');
  const membership = await Membership.findOne({ userId: user._id, companyId });
  if (!membership) throw new HttpError(403,'No access to this company');
  const token = jwt.sign({ sub: user._id, companyId, roles: [membership.role] }, SECRET, { expiresIn:'7d' });
  res.json({ token });
}
