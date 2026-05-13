"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { classroomFetch } from "@/lib/classroom-api";
import { logout } from "@/store/slices/authSlice";
import { setClasses, type LiveClassSummary } from "@/store/slices/classroomSlice";

export default function TeacherDashboardPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const token = useAppSelector((s) => s.auth.token);
  const user = useAppSelector((s) => s.auth.user);
  const classes = useAppSelector((s) => s.classroom.classes);
  const [title, setTitle] = useState("");
  const [enrollByClass, setEnrollByClass] = useState<Record<string, string>>({});
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !user) {
      router.replace("/login");
      return;
    }
    if (user.role !== "teacher" && user.role !== "admin") {
      router.replace("/dashboard/student");
    }
  }, [token, user, router]);

  const load = async () => {
    if (!token) return;
    try {
      const rows = await classroomFetch<LiveClassSummary[]>("/api/v1/live-classes", {
        token,
      });
      dispatch(setClasses(rows));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load");
    }
  };

  useEffect(() => {
    void load();
  }, [token, dispatch]);

  const createClass = async () => {
    if (!token || !title.trim()) return;
    setErr(null);
    try {
      await classroomFetch("/api/v1/live-classes", {
        method: "POST",
        token,
        body: JSON.stringify({ title, recordingEnabled: true }),
      });
      setTitle("");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Create failed");
    }
  };

  const startClass = async (id: string) => {
    if (!token) return;
    await classroomFetch(`/api/v1/live-classes/${id}/start`, { method: "POST", token });
    await load();
  };

  const endClass = async (id: string) => {
    if (!token) return;
    await classroomFetch(`/api/v1/live-classes/${id}/end`, { method: "POST", token });
    await load();
  };

  const enrollStudent = async (classId: string) => {
    const studentId = enrollByClass[classId]?.trim();
    if (!token || !studentId) return;
    setErr(null);
    try {
      await classroomFetch(`/api/v1/live-classes/${classId}/enroll`, {
        method: "POST",
        token,
        body: JSON.stringify({ studentId }),
      });
      setEnrollByClass((m) => ({ ...m, [classId]: "" }));
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Enroll failed");
    }
  };

  if (!token || !user) return null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 text-zinc-100">
      <header className="mb-8 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Teacher dashboard</h1>
        <button
          type="button"
          className="text-sm text-zinc-400 underline"
          onClick={() => {
            dispatch(logout());
            router.push("/login");
          }}
        >
          Sign out
        </button>
      </header>

      <section className="mb-8 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
        <h2 className="mb-3 text-sm font-medium text-zinc-400">New live class</h2>
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <button
            type="button"
            onClick={() => void createClass()}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium"
          >
            Create
          </button>
        </div>
        {err && <p className="mt-2 text-sm text-red-400">{err}</p>}
      </section>

      <ul className="space-y-3">
        {classes.map((c) => (
          <li
            key={c._id}
            className="flex flex-col gap-2 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <div className="font-medium">{c.title}</div>
              <div className="text-xs text-zinc-500">Status: {c.status}</div>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <input
                className="min-w-[8rem] flex-1 rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs"
                placeholder="Student user ID (Mongo)"
                value={enrollByClass[c._id] ?? ""}
                onChange={(e) =>
                  setEnrollByClass((m) => ({ ...m, [c._id]: e.target.value }))
                }
              />
              <button
                type="button"
                className="rounded bg-zinc-700 px-2 py-1 text-xs"
                onClick={() => void enrollStudent(c._id)}
              >
                Enroll
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {c.status === "live" && (
                <Link
                  href={`/classroom/live/${c._id}`}
                  className="rounded-lg bg-emerald-700 px-3 py-2 text-sm"
                >
                  Enter
                </Link>
              )}
              {c.status !== "live" && c.status !== "ended" && (
                <button
                  type="button"
                  className="rounded-lg bg-zinc-700 px-3 py-2 text-sm"
                  onClick={() => void startClass(c._id)}
                >
                  Start
                </button>
              )}
              {c.status === "live" && (
                <button
                  type="button"
                  className="rounded-lg bg-red-900/80 px-3 py-2 text-sm"
                  onClick={() => void endClass(c._id)}
                >
                  End
                </button>
              )}
              <Link
                href={`/classroom/${c._id}/attendance`}
                className="rounded-lg border border-zinc-600 px-3 py-2 text-sm"
              >
                Attendance
              </Link>
              <Link
                href={`/classroom/${c._id}/recordings`}
                className="rounded-lg border border-zinc-600 px-3 py-2 text-sm"
              >
                Recordings
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
