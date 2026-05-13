import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
export declare function createApp(): Promise<{
    app: express.Application;
    httpServer: ReturnType<typeof createServer>;
    io: Server;
}>;
//# sourceMappingURL=app.d.ts.map