"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAppSelector } from "@/store/hooks";
import { classroomFetch } from "@/lib/classroom-api";

type Row = {
  userId: string;
  name: string;
  email: string;
  totalSeconds: number;
  attendancePercent: number;
};

export default function AttendancePage() {
  const params = useParams();
  const id = params.id as string;
  const token = useAppSelector((s) => s.auth.token);
  const router = useRouter();
  const [data, setData] = useState<{ plannedSeconds: number; rows: Row[] } | null>(
    null
  );
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      router.replace("/login");
      return;
    }
    void classroomFetch<{ plannedSeconds: number; rows: Row[] }>(
      `/api/v1/live-classes/${id}/attendance`,
      { token }
    )
      .then(setData)
      .catch((e) => setErr(e instanceof Error ? e.message : "Error"));
  }, [token, id, router]);

  const exportCsv = async () => {
    if (!token) return;
    const BASE =
      process.env.NEXT_PUBLIC_CLASSROOM_API_URL ?? "http://localhost:4000";
    const res = await fetch(
      `${BASE}/api/v1/live-classes/${id}/attendance/export.csv`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-${id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (err) return <div className="p-6 text-red-300">{err}</div>;
  if (!data) return <div className="p-6 text-zinc-400">Loading…</div>;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 text-zinc-100">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Attendance</h1>
        <button
          type="button"
          className="text-sm text-emerald-400 underline"
          onClick={() => void exportCsv()}
        >
          Export CSV
        </button>
      </div>
      <p className="mb-4 text-sm text-zinc-500">
        Planned session length: {Math.round(data.plannedSeconds / 60)} min
      </p>
      <div className="overflow-x-auto rounded-xl border border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-900/80 text-zinc-400">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Email</th>
              <th className="p-3">Minutes</th>
              <th className="p-3">Attendance %</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((r) => (
              <tr key={r.userId} className="border-t border-zinc-800">
                <td className="p-3">{r.name}</td>
                <td className="p-3">{r.email}</td>
                <td className="p-3">{Math.round(r.totalSeconds / 60)}</td>
                <td className="p-3">{r.attendancePercent}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
