"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { setToken } from "@/lib/api";

const nav = [
  { href: "/", label: "Dashboard", icon: "📊" },
  { href: "/customers", label: "Customers", icon: "👤" },
  { href: "/providers", label: "Providers", icon: "👷" },
  { href: "/bookings", label: "Bookings", icon: "📅" },
  { href: "/payments", label: "Payments", icon: "💳" },
  { href: "/reviews", label: "Reviews", icon: "⭐" },
  { href: "/coupons", label: "Coupons", icon: "🏷️" },
  { href: "/reports", label: "Reports", icon: "📈" },
  { href: "/support", label: "Support", icon: "💬" },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-black/10 bg-white dark:border-white/10 dark:bg-neutral-900">
      <div className="flex items-center gap-2 px-5 py-5">
        <span className="text-xl">🏠</span>
        <div>
          <div className="text-sm font-bold leading-tight">HomeFlow</div>
          <div className="text-xs text-neutral-500">Admin Panel</div>
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 px-3 pb-4">
        {nav.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-teal-600 text-white"
                  : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-black/10 px-3 py-3 dark:border-white/10">
        <button
          onClick={() => {
            setToken(null);
            router.replace("/login");
          }}
          className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
        >
          ↩ Log out
        </button>
        <p className="px-3 pt-2 text-xs text-neutral-500">Hyderabad · v0.1.0</p>
      </div>
    </aside>
  );
}
