import { Router } from 'express';
import * as c from '../controllers/auth.controller';
const r = Router();
r.post('/signup', c.signupCompanyAdmin);
r.post('/login',  c.login);
export default r;
