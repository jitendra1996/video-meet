export declare class AppError extends Error {
    readonly statusCode: number;
    readonly code?: string | undefined;
    readonly details?: unknown | undefined;
    constructor(statusCode: number, message: string, code?: string | undefined, details?: unknown | undefined);
}
//# sourceMappingURL=AppError.d.ts.map