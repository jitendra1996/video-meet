import { env } from "./config/env.js";
import { logger } from "./common/logger.js";
import { connectDatabase, disconnectDatabase } from "./infrastructure/database.js";
import { createApp } from "./app.js";
async function main() {
    if (env.NODE_ENV === "production" && env.JWT_SECRET.length < 32) {
        logger.warn("JWT_SECRET should be at least 32 characters in production");
    }
    await connectDatabase();
    const { httpServer } = await createApp();
    httpServer.listen(env.PORT, () => {
        logger.info(`classroom-api listening on :${env.PORT}`);
    });
    const shutdown = async () => {
        logger.info("Shutting down...");
        httpServer.close();
        await disconnectDatabase();
        process.exit(0);
    };
    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
}
main().catch((err) => {
    logger.error({ err }, "Fatal");
    process.exit(1);
});
//# sourceMappingURL=index.js.map