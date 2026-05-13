import { NotificationRepository } from "./notification.repository.js";
export declare class NotificationController {
    private readonly repo;
    constructor(repo?: NotificationRepository);
    list: import("express").RequestHandler<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>;
    markRead: import("express").RequestHandler<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>;
}
//# sourceMappingURL=notification.controller.d.ts.map