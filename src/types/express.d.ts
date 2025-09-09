import "express-serve-static-core";
declare module "express-serve-static-core" {
  interface Request {
    user?: { sub: string; companyId: string; roles: ('admin'|'manager'|'subcontractor'|'worker')[] };
  }
}
