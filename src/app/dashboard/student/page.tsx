"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { classroomFetch } from "@/lib/classroom-api";
import { logout } from "@/store/slices/authSlice";
import { setClasses, type LiveClassSummary } from "@/store/slices/classroomSlice";

export default function StudentDashboardPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const token = useAppSelector((s) => s.auth.token);
  const user = useAppSelector((s) => s.auth.user);
  const classes = useAppSelector((s) => s.classroom.classes);

  useEffect(() => {
    if (!token || !user) {
      router.replace("/login");
      return;
    }
    if (user.role === "teacher" || user.role === "admin") {
      router.replace("/dashboard/teacher");
    }
  }, [token, user, router]);

  const load = async () => {
    if (!token) return;
    const rows = await classroomFetch<LiveClassSummary[]>("/api/v1/live-classes", {
      token,
    });
    dispatch(setClasses(rows));
  };

  useEffect(() => {
    void load();
  }, [token, dispatch]);

  if (!token || !user) return null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 text-zinc-100">
      <header className="mb-8 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Student dashboard</h1>
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
            <div className="flex gap-2">
              {c.status === "live" ? (
                <Link
                  href={`/classroom/live/${c._id}`}
                  className="rounded-lg bg-emerald-700 px-3 py-2 text-sm"
                >
                  Join live
                </Link>
              ) : (
                <span className="text-sm text-zinc-500">Not live</span>
              )}
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
