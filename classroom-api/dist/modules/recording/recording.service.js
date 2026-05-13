import mongoose from "mongoose";
import { AppError } from "../../common/errors/AppError.js";
import { env } from "../../config/env.js";
import { RecordingRepository } from "./recording.repository.js";
import { LiveClassRepository } from "../live-class/live-class.repository.js";
import { S3Service } from "../../integrations/s3/s3.service.js";
export class RecordingService {
    recordings;
    liveClasses;
    s3;
    constructor(recordings = new RecordingRepository(), liveClasses = new LiveClassRepository(), s3 = new S3Service()) {
        this.recordings = recordings;
        this.liveClasses = liveClasses;
        this.s3 = s3;
    }
    async list(user, liveClassId) {
        const doc = await this.liveClasses.findById(liveClassId);
        if (!doc)
            throw new AppError(404, "Class not found", "NOT_FOUND");
        this.assertAccess(user, doc);
        return this.recordings.listByClass(new mongoose.Types.ObjectId(liveClassId));
    }
    /**
     * Returns a short-lived signed URL for S3 objects, or the provider URL when S3 is not used.
     */
    async playbackUrl(user, recordingId) {
        const row = await this.recordings.findById(recordingId);
        if (!row)
            throw new AppError(404, "Recording not found", "NOT_FOUND");
        const doc = await this.liveClasses.findById(row.liveClassId.toString());
        if (!doc)
            throw new AppError(404, "Class not found", "NOT_FOUND");
        this.assertAccess(user, doc);
        if (row.s3Key) {
            const url = await this.s3.getSignedReadUrl(row.s3Key);
            return { url, expiresInSeconds: env.SIGNED_URL_TTL_SECONDS };
        }
        if (row.providerPlaybackUrl) {
            return { url: row.providerPlaybackUrl, expiresInSeconds: env.SIGNED_URL_TTL_SECONDS };
        }
        throw new AppError(404, "Recording asset not ready", "RECORDING_NOT_READY");
    }
    assertAccess(user, doc) {
        const uid = new mongoose.Types.ObjectId(user.sub);
        const ok = user.role === "admin" ||
            doc.teacherId.equals(uid) ||
            doc.enrolledStudentIds.some((id) => id.equals(uid));
        if (!ok)
            throw new AppError(403, "Forbidden", "FORBIDDEN");
    }
}
//# sourceMappingURL=recording.service.js.map