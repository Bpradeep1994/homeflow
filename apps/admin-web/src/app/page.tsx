"use client";

import Link from "next/link";

import { BarChart, TrendLineChart } from "@/components/charts";
import { Badge, Card, PageHeader, StatTile, Table, Td, type BadgeTone } from "@/components/ui";
import { formatINR, useApi } from "@/lib/api";

interface Summary {
  users: { customers: number; providers: number; blocked: number };
  providers: { approved: number; pendingVerification: number; online: number };
  bookings: { total: number; byStatus: Record<string, number>; completionRate: number | null };
  revenue: { collected: number; commission: number; pendingSettlement: number; refunded: number };
  reviews: { count: number; average: number | null };
}

interface Trends {
  weekly: { week: string; revenue: number; bookings: number; newCustomers: number }[];
}

export interface BookingRow {
  id: string;
  customer: { name?: string };
  provider?: { name?: string } | null;
  services: { name: string }[];
  date: string;
  timeSlot: string;
  amount: number;
  status: string;
}

export const statusTone: Record<string, BadgeTone> = {
  PENDING: "warning",
  ASSIGNED: "info",
  ON_THE_WAY: "info",
  IN_PROGRESS: "neutral",
  COMPLETED: "good",
  CLOSED: "neutral",
  CANCELLED: "critical",
};

export default function Dashboard() {
  const { data: summary, error } = useApi<Summary>("/admin/reports");
  const { data: trends } = useApi<Trends>("/admin/reports/trends");
  const { data: bookings } = useApi<BookingRow[]>("/admin/bookings");

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!summary) return <p className="text-sm text-neutral-500">Loading…</p>;

  const active =
    (summary.bookings.byStatus.PENDING ?? 0) +
    (summary.bookings.byStatus.ASSIGNED ?? 0) +
    (summary.bookings.byStatus.ON_THE_WAY ?? 0) +
    (summary.bookings.byStatus.IN_PROGRESS ?? 0);

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Live platform overview" />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatTile
          label="Total revenue"
          value={formatINR(summary.revenue.collected)}
          hint={`${formatINR(summary.revenue.commission)} commission`}
        />
        <StatTile label="Total customers" value={String(summary.users.customers)} />
        <StatTile
          label="Total providers"
          value={String(summary.users.providers)}
          hint={`${summary.providers.online} online · ${summary.providers.pendingVerification} pending verification`}
        />
        <StatTile
          label="Active bookings"
          value={String(active)}
          hint={`${summary.bookings.total} all time`}
        />
      </div>

      {trends && (
        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          <Card className="p-5">
            <h2 className="text-sm font-semibold">Bookings per week</h2>
            <div className="mt-4">
              <TrendLineChart data={trends.weekly.map((w) => ({ label: w.week, value: w.bookings }))} />
            </div>
          </Card>
          <Card className="p-5">
            <h2 className="text-sm font-semibold">Revenue per week</h2>
            <div className="mt-4">
              <BarChart
                ariaLabel="Revenue per week"
                format="inr"
                data={trends.weekly.map((w) => ({ label: w.week, value: w.revenue }))}
              />
            </div>
          </Card>
        </div>
      )}

      <Card className="mt-6">
        <div className="flex items-center justify-between px-4 pt-4">
          <h2 className="text-sm font-semibold">Recent bookings</h2>
          <Link href="/bookings" className="text-sm font-medium text-teal-700 hover:underline dark:text-teal-500">
            View all →
          </Link>
        </div>
        <Table head={["ID", "Customer", "Service", "Provider", "Slot", "Amount", "Status"]}>
          {(bookings ?? []).slice(0, 6).map((b) => (
            <tr key={b.id}>
              <Td className="font-mono text-xs">{b.id}</Td>
              <Td>{b.customer?.name ?? "—"}</Td>
              <Td>{b.services.map((s) => s.name).join(", ")}</Td>
              <Td>{b.provider?.name ?? "—"}</Td>
              <Td className="whitespace-nowrap">
                {b.date} · {b.timeSlot}
              </Td>
              <Td className="font-semibold">{formatINR(b.amount)}</Td>
              <Td>
                <Badge tone={statusTone[b.status] ?? "neutral"}>{b.status.replaceAll("_", " ")}</Badge>
              </Td>
            </tr>
          ))}
        </Table>
      </Card>
    </>
  );
}
