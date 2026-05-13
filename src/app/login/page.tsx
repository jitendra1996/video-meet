"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAppDispatch } from "@/store/hooks";
import { setCredentials } from "@/store/slices/authSlice";
import { classroomFetch } from "@/lib/classroom-api";
import type { AuthUser } from "@/store/slices/authSlice";

export default function LoginPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    try {
      const data = await classroomFetch<{ token: string; user: AuthUser }>(
        "/api/v1/auth/login",
        { method: "POST", body: JSON.stringify({ email, password }) }
      );
      dispatch(setCredentials(data));
      router.push(
        data.user.role === "student" ? "/dashboard/student" : "/dashboard/teacher"
      );
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Login failed");
    }
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <h1 className="mb-6 text-2xl font-semibold text-zinc-100">Sign in</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <input
          type="email"
          required
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          required
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {err && <p className="text-sm text-red-400">{err}</p>}
        <button
          type="submit"
          className="w-full rounded-lg bg-emerald-600 py-2 font-medium text-white"
        >
          Continue
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-zinc-500">
        No account?{" "}
        <Link href="/register" className="text-emerald-400 underline">
          Register
        </Link>
      </p>
    </div>
  );
}
