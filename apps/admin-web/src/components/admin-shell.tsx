"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";

import { getToken } from "@/lib/api";
import { Sidebar } from "./sidebar";

// Token never changes without a navigation, so no subscription is needed —
// each render re-reads the snapshot. Server snapshot is null (no localStorage).
const emptySubscribe = () => () => {};

/** Client-side auth gate: everything except /login requires a token. */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const token = useSyncExternalStore(emptySubscribe, getToken, () => null);

  useEffect(() => {
    if (pathname !== "/login" && token === null) router.replace("/login");
  }, [pathname, token, router]);

  if (pathname === "/login") return <>{children}</>;
  if (token === null) return null; // redirecting (and matches the server render)

  return (
    <>
      <Sidebar />
      <main className="min-w-0 flex-1 px-8 py-8">{children}</main>
    </>
  );
}
