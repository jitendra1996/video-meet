import { LiveClassRepository } from "../live-class/live-class.repository.js";
import type { AccessTokenPayload } from "../../common/utils/jwt.js";
export type AttendanceSummaryRow = {
    userId: string;
    name: string;
    email: string;
    totalSeconds: number;
    attendancePercent: number;
};
export declare class AttendanceService {
    private readonly liveClasses;
    constructor(liveClasses?: LiveClassRepository);
    /** Expected session length in seconds (for percentage), from actual or scheduled window. */
    private plannedSeconds;
    summary(user: AccessTokenPayload, liveClassId: string): Promise<{
        plannedSeconds: number;
        rows: AttendanceSummaryRow[];
    }>;
    toCsv(rows: AttendanceSummaryRow[]): string;
}
//# sourceMappingURL=attendance.service.d.ts.map