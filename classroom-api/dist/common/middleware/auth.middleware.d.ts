import type { NextFunction, Request, Response } from "express";
import type { UserRole } from "../../modules/users/user.model.js";
export declare function authenticate(req: Request, _res: Response, next: NextFunction): void;
export declare function requireRoles(...roles: UserRole[]): (req: Request, _res: Response, next: NextFunction) => void;
//# sourceMappingURL=auth.middleware.d.ts.map