import { ChatService } from "./chat.service.js";
export declare class ChatController {
    private readonly service;
    constructor(service?: ChatService);
    history: import("express").RequestHandler<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>;
    post: import("express").RequestHandler<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>;
}
//# sourceMappingURL=chat.controller.d.ts.map