import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import Company from '../models/Company';
import User from '../models/User';
import Membership from '../models/Membership';
import Project from '../models/Project';
import Worker from '../models/Worker';
import Task from '../models/Task';
import PPECheck from '../models/PPECheck';

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

export async function loginCompany(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password, companyId } = req.body || {};

    if (!email)    return res.status(400).json({ error: 'email is required' });
    if (!password) return res.status(400).json({ error: 'password is required' });

    const user = await User.findOne({ email: String(email).toLowerCase() });
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });

    const ok = await bcrypt.compare(String(password), user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Invalid email or password' });

    // memberships for this user
    const memberships = await Membership.find({ userId: user._id }).lean();

    if (!memberships.length) {
      return res.status(403).json({ error: 'No company memberships for this user' });
    }

    // If client provided companyId, try to use that directly
    if (companyId) {
      const m = memberships.find(m => String(m.companyId) === String(companyId));
      if (!m) return res.status(403).json({ error: 'User is not a member of the specified company' });

      const company = await Company.findById(companyId).lean();
      if (!company) return res.status(404).json({ error: 'Company not found' });

      const token = jwt.sign(
        { sub: String(user._id), companyId: String(company._id), roles: [m.role] },
        SECRET,
        { expiresIn: '7d' }
      );

      return res.json({
        token,
        companyId: company._id,
        companyName: company.name,
        status: company.status   // e.g., 'pending' | 'verified' | 'rejected' (if you added it)
      });
    }

    // No companyId provided
    if (memberships.length === 1) {
      const only = memberships[0];
      const company = await Company.findById(only.companyId).lean();
      if (!company) return res.status(404).json({ error: 'Company not found' });

      const token = jwt.sign(
        { sub: String(user._id), companyId: String(company._id), roles: [only.role] },
        SECRET,
        { expiresIn: '7d' }
      );

      return res.json({
        token,
        companyId: company._id,
        companyName: company.name,
        status: company.status
      });
    }

    // Multiple companies: ask client to choose
    const companyIds = memberships.map(m => m.companyId);
    const companies = await Company.find({ _id: { $in: companyIds } }).lean();
    const byId = new Map(companies.map(c => [String(c._id), c]));

    return res.status(200).json({
      needsCompanySelection: true,
      companies: memberships
        .map(m => {
          const c = byId.get(String(m.companyId));
          return c ? {
            companyId: c._id,
            name: c.name,
            role: m.role,
            status: c.status
          } : null;
        })
        .filter(Boolean)
    });
  } catch (err) {
    next(err);
  }
}

/** GET /api/companies
 * Lists companies the current logged-in user belongs to.
 */
export async function listMyCompanies(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.sub) return res.status(401).json({ error: 'Unauthenticated' });

    const ms = await Membership.find({ userId: req.user.sub })
      .populate({ path: 'companyId', model: Company })
      .lean();

    const data = ms
      .map((m: any) => m.companyId && ({
        companyId: m.companyId._id,
        name: m.companyId.name,
        role: m.role,
        status: m.companyId.status, // if you added status
      }))
      .filter(Boolean);

    res.json({ data });
  } catch (e) { next(e); }
}

/** POST /api/companies/:companyId/switch-token
 * Issues a fresh JWT scoped to the chosen company (if the user is a member).
 * Body can be empty; path is the company selector.
 */
export async function switchToken(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.sub) return res.status(401).json({ error: 'Unauthenticated' });
    const { companyId } = req.params;

    const m = await Membership.findOne({ userId: req.user.sub, companyId }).lean();
    if (!m) return res.status(403).json({ error: 'Not a member of this company' });

    const company = await Company.findById(companyId).lean();
    if (!company) return res.status(404).json({ error: 'Company not found' });

    const token = jwt.sign(
      { sub: String(req.user.sub), companyId: String(company._id), roles: [m.role] },
      SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token, companyId: company._id, companyName: company.name, status: company.status });
  } catch (e) { next(e); }
}

/** POST /api/companies/:companyId/verify
 * Minimal verify action (set status = 'verified').
 */
export async function verifyCompany(req: Request, res: Response, next: NextFunction) {
  try {
    const { companyId } = req.params;
    const updated = await Company.findOneAndUpdate(
      { _id: companyId },
      { $set: { status: 'verified' } },
      { new: true }
    ).lean();
    if (!updated) return res.status(404).json({ error: 'Company not found' });
    res.json({ companyId: updated._id, status: updated.status });
  } catch (e) { next(e); }
}

/** POST /api/companies/:companyId/reject
 * Minimal reject action (set status = 'rejected' + reason).
 * Body: { reason?: string }
 */
export async function rejectCompany(req: Request, res: Response, next: NextFunction) {
  try {
    const { companyId } = req.params;
    const reason = (req.body && req.body.reason) ? String(req.body.reason) : undefined;

    const updated = await Company.findOneAndUpdate(
      { _id: companyId },
      { $set: { status: 'rejected', description: reason ? `[REJECTED] ${reason}` : undefined } },
      { new: true }
    ).lean();
    if (!updated) return res.status(404).json({ error: 'Company not found' });
    res.json({ companyId: updated._id, status: updated.status, reason });
  } catch (e) { next(e); }
}

// ---- helpers ----
function toDot(obj: any, prefix = ''): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj || {})) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)) {
      Object.assign(out, toDot(v, path));
    } else {
      out[path] = v;
    }
  }
  return out;
}

/** GET /api/companies/:companyId */
export async function getCompany(req: Request, res: Response, next: NextFunction) {
  try {
    const { companyId } = req.params;
    const doc = await Company.findOne({ _id: companyId, deletedAt: { $exists: false } }).lean();
    if (!doc) return res.status(404).json({ error: 'Company not found' });
    res.json(doc);
  } catch (e) { next(e); }
}

/** PATCH /api/companies/:companyId
 * Body: any subset of { name, regNumber, domain, address{line1,city,country}, contactEmail, contactPhone, description }
 */
export async function updateCompany(req: Request, res: Response, next: NextFunction) {
  try {
    const { companyId } = req.params;
    const payload = req.body || {};
    // tiny validation
    if (payload.contactEmail && typeof payload.contactEmail !== 'string')
      return res.status(400).json({ error: 'contactEmail must be a string' });
    if (payload.domain && typeof payload.domain !== 'string')
      return res.status(400).json({ error: 'domain must be a string' });

    const $set = toDot(payload);
    const updated = await Company.findOneAndUpdate(
      { _id: companyId, deletedAt: { $exists: false } },
      { $set },
      { new: true }
    ).lean();

    if (!updated) return res.status(404).json({ error: 'Company not found' });
    res.json(updated);
  } catch (e: any) {
    if (e?.code === 11000 && e?.keyPattern?.regNumber) {
      return res.status(409).json({ error: 'Registration number already exists' });
    }
    next(e);
  }
}



/** GET /api/companies/:companyId/members?role=&page=&limit= */
export async function listMembers(req: Request, res: Response, next: NextFunction) {
  try {
    const { companyId } = req.params;
    const role = req.query.role as 'admin'|'manager'|'subcontractor'|'worker'|undefined;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 20);

    const q: any = { companyId };
    if (role) q.role = role;

    const [rows, total] = await Promise.all([
      Membership.find(q)
        .populate({ path: 'userId', model: User, select: ['email','name'] })
        .skip((page-1)*limit)
        .limit(limit)
        .lean(),
      Membership.countDocuments(q)
    ]);

    const data = rows.map((m: any) => ({
      userId: m.userId?._id, name: m.userId?.name, email: m.userId?.email, role: m.role
    }));
    res.json({ data, page, limit, total });
  } catch (e) { next(e); }
}

/** POST /api/companies/:companyId/members  Body: { email, role } */
export async function addMember(req: Request, res: Response, next: NextFunction) {
  try {
    const { companyId } = req.params;
    const { email, role } = req.body || {};
    if (!email || !role) return res.status(400).json({ error: 'email and role are required' });

    const user = await User.findOne({ email: String(email).toLowerCase() });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const existing = await Membership.findOne({ companyId, userId: user._id });
    if (existing) return res.status(409).json({ error: 'User already a member' });

    const m = await Membership.create({ companyId, userId: user._id, role });
    res.status(201).json({ userId: user._id, role: m.role });
  } catch (e) { next(e); }
}

/** PATCH /api/companies/:companyId/members/:userId  Body: { role } */
export async function updateMemberRole(req: Request, res: Response, next: NextFunction) {
  try {
    const { companyId, userId } = req.params;
    const role = req.body?.role;
    if (!role) return res.status(400).json({ error: 'role is required' });

    const m = await Membership.findOneAndUpdate(
      { companyId, userId },
      { $set: { role } },
      { new: true }
    ).lean();
    if (!m) return res.status(404).json({ error: 'Membership not found' });
    res.json(m);
  } catch (e) { next(e); }
}

/** DELETE /api/companies/:companyId/members/:userId */
export async function removeMember(req: Request, res: Response, next: NextFunction) {
  try {
    const { companyId, userId } = req.params;
    const del = await Membership.deleteOne({ companyId, userId });
    res.json({ ok: true, deleted: del.deletedCount });
  } catch (e) { next(e); }
}

/** GET /api/companies/:companyId/stats */
export async function companyStats(req: Request, res: Response, next: NextFunction) {
  try {
    const { companyId } = req.params;
    const [projects, workers, tasks, checks] = await Promise.all([
      Project.countDocuments({ companyId }),
      Worker.countDocuments({ companyId }),
      Task.countDocuments({ companyId }),
      PPECheck.countDocuments({ companyId })
    ]);
    res.json({ projects, workers, tasks, checks });
  } catch (e) { next(e); }
}