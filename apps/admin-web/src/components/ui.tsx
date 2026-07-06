import type { ReactNode } from "react";

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-xl font-bold">{title}</h1>
      {subtitle && <p className="mt-0.5 text-sm text-neutral-500">{subtitle}</p>}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-xl border border-black/10 bg-white dark:border-white/10 dark:bg-neutral-900 ${className}`}
    >
      {children}
    </div>
  );
}

export function StatTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="p-4">
      <div className="text-xs font-medium text-neutral-500">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
      {hint && <div className="mt-1 text-xs text-neutral-500">{hint}</div>}
    </Card>
  );
}

// Status badges use the reserved status palette (icon + label, never color alone).
const badgeStyles: Record<string, string> = {
  good: "bg-green-600/10 text-green-700 dark:text-green-500",
  warning: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  serious: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
  critical: "bg-red-600/10 text-red-700 dark:text-red-400",
  neutral: "bg-neutral-500/10 text-neutral-600 dark:text-neutral-300",
  info: "bg-blue-600/10 text-blue-700 dark:text-blue-400",
};

const badgeIcons: Record<string, string> = {
  good: "✓",
  warning: "◔",
  serious: "△",
  critical: "✕",
  neutral: "·",
  info: "→",
};

export type BadgeTone = keyof typeof badgeStyles;

export function Badge({ tone, children }: { tone: BadgeTone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold ${badgeStyles[tone]}`}
    >
      <span aria-hidden>{badgeIcons[tone]}</span>
      {children}
    </span>
  );
}

export function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-black/10 text-left text-xs uppercase tracking-wide text-neutral-500 dark:border-white/10">
            {head.map((h) => (
              <th key={h} className="px-4 py-3 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-black/5 dark:divide-white/5">{children}</tbody>
      </table>
    </div>
  );
}

export function Td({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <td className={`px-4 py-3 ${className}`}>{children}</td>;
}
