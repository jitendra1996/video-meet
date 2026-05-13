import { AttendanceService } from "./attendance.service.js";
export declare class AttendanceController {
    private readonly service;
    constructor(service?: AttendanceService);
    summary: import("express").RequestHandler<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>;
    exportCsv: import("express").RequestHandler<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>;
}
//# sourceMappingURL=attendance.controller.d.ts.map