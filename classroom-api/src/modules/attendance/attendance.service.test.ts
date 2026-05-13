import { describe, expect, it } from "vitest";
import { AttendanceService } from "./attendance.service.js";

describe("AttendanceService", () => {
  it("formats CSV with escaping", () => {
    const svc = new AttendanceService();
    const csv = svc.toCsv([
      {
        userId: "1",
        name: 'Doe, "Jane"',
        email: "j@x.com",
        totalSeconds: 120,
        attendancePercent: 80,
      },
    ]);
    expect(csv).toContain("userId,name,email,totalSeconds,attendancePercent");
    expect(csv).toContain('"Doe, ""Jane"""');
  });
});
