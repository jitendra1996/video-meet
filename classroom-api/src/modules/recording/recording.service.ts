import mongoose from "mongoose";
import { AppError } from "../../common/errors/AppError.js";
import { env } from "../../config/env.js";
import { RecordingRepository } from "./recording.repository.js";
import { LiveClassRepository } from "../live-class/live-class.repository.js";
import { S3Service } from "../../integrations/s3/s3.service.js";
import type { AccessTokenPayload } from "../../common/utils/jwt.js";
import type { ILiveClass } from "../live-class/live-class.model.js";

export class RecordingService {
  constructor(
    private readonly recordings = new RecordingRepository(),
    private readonly liveClasses = new LiveClassRepository(),
    private readonly s3 = new S3Service()
  ) {}

  async list(user: AccessTokenPayload, liveClassId: string) {
    const doc = await this.liveClasses.findById(liveClassId);
    if (!doc) throw new AppError(404, "Class not found", "NOT_FOUND");
    this.assertAccess(user, doc);
    return this.recordings.listByClass(new mongoose.Types.ObjectId(liveClassId));
  }

  /**
   * Returns a short-lived signed URL for S3 objects, or the provider URL when S3 is not used.
   */
  async playbackUrl(
    user: AccessTokenPayload,
    recordingId: string
  ): Promise<{ url: string; expiresInSeconds: number }> {
    const row = await this.recordings.findById(recordingId);
    if (!row) throw new AppError(404, "Recording not found", "NOT_FOUND");
    const doc = await this.liveClasses.findById(row.liveClassId.toString());
    if (!doc) throw new AppError(404, "Class not found", "NOT_FOUND");
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

  private assertAccess(user: AccessTokenPayload, doc: ILiveClass): void {
    const uid = new mongoose.Types.ObjectId(user.sub);
    const ok =
      user.role === "admin" ||
      doc.teacherId.equals(uid) ||
      doc.enrolledStudentIds.some((id) => id.equals(uid));
    if (!ok) throw new AppError(403, "Forbidden", "FORBIDDEN");
  }
}
