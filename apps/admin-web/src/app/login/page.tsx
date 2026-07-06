"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { apiFetch, setToken } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@homeflow.in");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch<{ accessToken: string; user: { role: string } }>("/auth/login", {
        method: "POST",
        body: { email, password },
      });
      if (res.user.role !== "admin") {
        setError("This account is not an admin");
        return;
      }
      setToken(res.accessToken);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-2xl border border-black/10 bg-white p-8 dark:border-white/10 dark:bg-neutral-900"
      >
        <div className="mb-6 text-center">
          <div className="text-3xl">🏠</div>
          <h1 className="mt-2 text-lg font-bold">HomeFlow Admin</h1>
          <p className="text-sm text-neutral-500">Sign in to the operations panel</p>
        </div>
        <label className="mb-1 block text-xs font-semibold text-neutral-500">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-3 w-full rounded-lg border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/15"
          required
        />
        <label className="mb-1 block text-xs font-semibold text-neutral-500">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-4 w-full rounded-lg border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/15"
          placeholder="admin123 (dev)"
          required
        />
        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-teal-600 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
