import { HmsService } from "../../integrations/hms/hms.service.js";
import { LiveClassRepository } from "./live-class.repository.js";
import { AttendanceRepository } from "../attendance/attendance.repository.js";
import { NotificationRepository } from "../notifications/notification.repository.js";
import { RecordingRepository } from "../recording/recording.repository.js";
import type { AccessTokenPayload } from "../../common/utils/jwt.js";
import type { CreateLiveClassInput, ScheduleLiveClassInput } from "./live-class.dto.js";
import type { ILiveClass } from "./live-class.model.js";
export declare class LiveClassService {
    private readonly liveClasses;
    private readonly attendance;
    private readonly notifications;
    private readonly recordings;
    private readonly hms;
    constructor(liveClasses?: LiveClassRepository, attendance?: AttendanceRepository, notifications?: NotificationRepository, recordings?: RecordingRepository, hms?: HmsService);
    create(user: AccessTokenPayload, input: CreateLiveClassInput): Promise<ILiveClass>;
    schedule(user: AccessTokenPayload, classId: string, input: ScheduleLiveClassInput): Promise<ILiveClass>;
    start(user: AccessTokenPayload, classId: string): Promise<ILiveClass>;
    end(user: AccessTokenPayload, classId: string): Promise<ILiveClass>;
    enroll(user: AccessTokenPayload, classId: string, studentId: string): Promise<ILiveClass>;
    join(user: AccessTokenPayload, classId: string): Promise<{
        token: string;
        roomId: string;
    }>;
    leave(user: AccessTokenPayload, classId: string): Promise<void>;
    list(user: AccessTokenPayload): Promise<ILiveClass[]>;
    getById(user: AccessTokenPayload, classId: string): Promise<ILiveClass>;
    removeParticipant(user: AccessTokenPayload, classId: string, peerId: string): Promise<void>;
    private requireClass;
    private assertCanManage;
    private assertCanAccess;
    /** Close any sessions still open when the teacher ends the class. */
    private reconcileOpenAttendance;
}
//# sourceMappingURL=live-class.service.d.ts.map