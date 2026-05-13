"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAppSelector } from "@/store/hooks";
import { classroomFetch } from "@/lib/classroom-api";

type Recording = {
  _id: string;
  status: string;
  providerPlaybackUrl?: string;
  createdAt: string;
};

export default function RecordingsPage() {
  const params = useParams();
  const id = params.id as string;
  const token = useAppSelector((s) => s.auth.token);
  const router = useRouter();
  const [rows, setRows] = useState<Recording[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      router.replace("/login");
      return;
    }
    const q = new URLSearchParams({ liveClassId: id });
    void classroomFetch<Recording[]>(`/api/v1/recordings?${q.toString()}`, { token })
      .then(setRows)
      .catch((e) => setErr(e instanceof Error ? e.message : "Error"));
  }, [token, id, router]);

  const openPlayback = async (recId: string) => {
    if (!token) return;
    try {
      const { url } = await classroomFetch<{ url: string; expiresInSeconds: number }>(
        `/api/v1/recordings/${recId}/play-url`,
        { token }
      );
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Playback URL failed");
    }
  };

  if (err) return <div className="p-6 text-red-300">{err}</div>;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 text-zinc-100">
      <h1 className="mb-6 text-xl font-semibold">Recordings</h1>
      <ul className="space-y-3">
        {rows.map((r) => (
          <li
            key={r._id}
            className="flex flex-col gap-2 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <div className="text-sm font-medium">{r.status}</div>
              <div className="text-xs text-zinc-500">
                {new Date(r.createdAt).toLocaleString()}
              </div>
            </div>
            <button
              type="button"
              className="rounded-lg bg-emerald-700 px-3 py-2 text-sm disabled:opacity-40"
              disabled={r.status !== "ready"}
              onClick={() => void openPlayback(r._id)}
            >
              Play
            </button>
          </li>
        ))}
      </ul>
      {rows.length === 0 && (
        <p className="text-sm text-zinc-500">No recordings yet for this class.</p>
      )}
    </div>
  );
}
