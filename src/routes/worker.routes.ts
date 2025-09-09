import { Router } from 'express';
import * as c from '../controllers/worker.controller';
const r = Router();
// public endpoint (you can add CAPTCHA); companyId as path
r.post('/:companyId/register', c.selfRegister);
export default r;
