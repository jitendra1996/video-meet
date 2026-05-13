"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAppDispatch } from "@/store/hooks";
import { setCredentials } from "@/store/slices/authSlice";
import { classroomFetch } from "@/lib/classroom-api";
import type { AuthUser } from "@/store/slices/authSlice";

export default function RegisterPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [role, setRole] = useState<"student" | "teacher" | "admin">("student");
  const [err, setErr] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    try {
      const body: Record<string, string> = { email, password, name, role };
      if (inviteCode) body.inviteCode = inviteCode;
      const data = await classroomFetch<{ token: string; user: AuthUser }>(
        "/api/v1/auth/register",
        { method: "POST", body: JSON.stringify(body) }
      );
      dispatch(setCredentials(data));
      router.push(
        data.user.role === "student" ? "/dashboard/student" : "/dashboard/teacher"
      );
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Registration failed");
    }
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <h1 className="mb-6 text-2xl font-semibold text-zinc-100">Create account</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <input
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
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
          minLength={8}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100"
          placeholder="Password (min 8)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <select
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100"
          value={role}
          onChange={(e) => setRole(e.target.value as typeof role)}
        >
          <option value="student">Student</option>
          <option value="teacher">Teacher (needs invite)</option>
          <option value="admin">Admin (needs invite)</option>
        </select>
        {(role === "teacher" || role === "admin") && (
          <input
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100"
            placeholder="Invite code"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            required
          />
        )}
        {err && <p className="text-sm text-red-400">{err}</p>}
        <button
          type="submit"
          className="w-full rounded-lg bg-emerald-600 py-2 font-medium text-white"
        >
          Register
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-zinc-500">
        Already have an account?{" "}
        <Link href="/login" className="text-emerald-400 underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
