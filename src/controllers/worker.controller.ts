import Worker from '../models/Worker';
import User from '../models/User';
import Membership from '../models/Membership';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { Request, Response } from 'express';
import { HttpError } from '../middleware/errors';

const norm = (s:string)=>s.trim().toUpperCase().replace(/[\s-]/g,'');

export async function selfRegister(req: Request, res: Response) {
  const { companyId } = req.params;
  const { nationalId, name, dob, phone, email, password } = req.body;
  if (!nationalId) throw new HttpError(400,'nationalId required');

  const nationalIdHash = crypto.createHash('sha256').update(norm(nationalId)).digest();

  let userId: any = undefined;
  if (email && password) {
    const passwordHash = await bcrypt.hash(password, 10);
    const u = await User.create({ email, passwordHash, nationalIdHash });
    await Membership.create({ companyId, userId: u._id, role: 'worker' });
    userId = u._id;
  }

  const w = await Worker.create({
    companyId, userId, nationalIdHash, name, phone, dob: dob ? new Date(dob) : undefined
  });
  res.json({ workerId: w._id });
}
