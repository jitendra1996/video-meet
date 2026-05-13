import { AuthService } from "./auth.service.js";
import { UserRepository } from "../users/user.repository.js";
export declare class AuthController {
    private readonly service;
    private readonly users;
    constructor(service?: AuthService, users?: UserRepository);
    register: import("express").RequestHandler<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>;
    login: import("express").RequestHandler<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>;
    me: import("express").RequestHandler<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>;
}
//# sourceMappingURL=auth.controller.d.ts.map