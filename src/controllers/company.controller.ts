import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import Company from '../models/Company';
import User from '../models/User';
import Membership from '../models/Membership';

const SECRET = process.env.JWT_SECRET || 'dev-secret';

/**
 * POST /api/companies/register
 * Public (no auth). Creates:
 *  - Company (status: 'pending')
 *  - Admin user (email/password)
 *  - Membership (role: 'admin')
 * Returns: { companyId, status, token }
 */
export async function registerCompany(req: Request, res: Response, next: NextFunction) {
  try {
    const body = req.body || {};
    const company = body.company || {};
    const admin   = body.admin || {};

    // --- minimal validation ---
    if (!company.name)       return res.status(400).json({ error: 'company.name is required' });
    if (!company.regNumber)  return res.status(400).json({ error: 'company.regNumber is required' });
    if (!admin.email)        return res.status(400).json({ error: 'admin.email is required' });
    if (!admin.password || String(admin.password).length < 8)
      return res.status(400).json({ error: 'admin.password must be at least 8 characters' });

    // reject if email already used by an existing user (simplest rule)
    const existingUser = await User.findOne({ email: admin.email.toLowerCase() }).lean();
    if (existingUser) {
      return res.status(409).json({
        error: 'Email already exists. Log in and use a different flow to create another company.'
      });
    }

    // create admin user
    const passwordHash = await bcrypt.hash(String(admin.password), 10);
    const user = await User.create({
      email: String(admin.email).toLowerCase(),
      passwordHash,
      name: admin.name
    });

    // create company (status: pending)
    const companyDoc = await Company.create({
      name: company.name,
      regNumber: company.regNumber, // will be normalized by model hook
      domain: company.domain,
      address: company.address,
      contactEmail: company.contactEmail,
      contactPhone: company.contactPhone,
      description: company.description,
      status: 'pending'
    });

    // link membership
    await Membership.create({
      companyId: companyDoc._id,
      userId: user._id,
      role: 'admin'
    });

    // issue a JWT bound to this company context
    const token = jwt.sign(
      { sub: String(user._id), companyId: String(companyDoc._id), roles: ['admin'] },
      SECRET,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      companyId: companyDoc._id,
      status: companyDoc.status,  // ✅ verification status returned
      token
    });
  } catch (err: any) {
    // duplicate regNumber -> 409
    if (err?.code === 11000 && err?.keyPattern?.regNumber) {
      return res.status(409).json({ error: 'A company with this registration number already exists' });
    }
    next(err);
  }
}
