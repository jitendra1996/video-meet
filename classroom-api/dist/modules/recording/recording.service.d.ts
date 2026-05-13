import { RecordingRepository } from "./recording.repository.js";
import { LiveClassRepository } from "../live-class/live-class.repository.js";
import { S3Service } from "../../integrations/s3/s3.service.js";
import type { AccessTokenPayload } from "../../common/utils/jwt.js";
export declare class RecordingService {
    private readonly recordings;
    private readonly liveClasses;
    private readonly s3;
    constructor(recordings?: RecordingRepository, liveClasses?: LiveClassRepository, s3?: S3Service);
    list(user: AccessTokenPayload, liveClassId: string): Promise<import("./recording.model.js").IRecording[]>;
    /**
     * Returns a short-lived signed URL for S3 objects, or the provider URL when S3 is not used.
     */
    playbackUrl(user: AccessTokenPayload, recordingId: string): Promise<{
        url: string;
        expiresInSeconds: number;
    }>;
    private assertAccess;
}
//# sourceMappingURL=recording.service.d.ts.map