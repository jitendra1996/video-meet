import { RecordingService } from "./recording.service.js";
export declare class RecordingController {
    private readonly service;
    constructor(service?: RecordingService);
    list: import("express").RequestHandler<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>;
    playUrl: import("express").RequestHandler<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>;
}
//# sourceMappingURL=recording.controller.d.ts.map