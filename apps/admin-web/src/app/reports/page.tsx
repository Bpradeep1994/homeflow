"use client";

import { BarChart, TrendLineChart } from "@/components/charts";
import { Badge, Card, PageHeader, StatTile, Table, Td } from "@/components/ui";
import { formatINR, useApi } from "@/lib/api";

interface Summary {
  bookings: { completionRate: number | null };
  reviews: { average: number | null; count: number };
  revenue: { pendingSettlement: number };
}

interface Trends {
  weekly: { week: string; revenue: number; bookings: number; newCustomers: number }[];
  cancellationRate: number | null;
  providerPerformance: {
    name?: string;
    services: string[];
    city?: string;
    rating: number;
    jobsDone: number;
    online: boolean;
    earnings: number;
  }[];
}

export default function ReportsPage() {
  const { data: summary } = useApi<Summary>("/admin/reports");
  const { data: trends, error } = useApi<Trends>("/admin/reports/trends");

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!trends || !summary) return <p className="text-sm text-neutral-500">Loading…</p>;

  return (
    <>
      <PageHeader title="Reports" subtitle="Last 8 weeks · live data" />
      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatTile
          label="Completion rate"
          value={summary.bookings.completionRate === null ? "—" : `${summary.bookings.completionRate}%`}
          hint="of decided bookings"
        />
        <StatTile
          label="Cancellation rate"
          value={trends.cancellationRate === null ? "—" : `${trends.cancellationRate}%`}
        />
        <StatTile
          label="Average rating"
          value={summary.reviews.average === null ? "—" : summary.reviews.average.toFixed(1)}
          hint={`${summary.reviews.count} reviews`}
        />
        <StatTile label="Pending settlement" value={formatINR(summary.revenue.pendingSettlement)} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
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
        <Card className="p-5">
          <h2 className="text-sm font-semibold">Customer growth — new sign-ups per week</h2>
          <div className="mt-4">
            <TrendLineChart data={trends.weekly.map((w) => ({ label: w.week, value: w.newCustomers }))} />
          </div>
        </Card>
      </div>

      <Card className="mt-6">
        <div className="px-4 pt-4">
          <h2 className="text-sm font-semibold">Provider performance</h2>
        </div>
        <Table head={["Provider", "Skills", "City", "Rating", "Jobs done", "Availability", "Earnings"]}>
          {trends.providerPerformance.map((p) => (
            <tr key={`${p.name}-${p.city}`}>
              <Td className="font-medium">{p.name}</Td>
              <Td>{p.services.join(", ")}</Td>
              <Td>{p.city ?? "—"}</Td>
              <Td>{p.rating > 0 ? `⭐ ${p.rating.toFixed(1)}` : "—"}</Td>
              <Td>{p.jobsDone}</Td>
              <Td>
                <Badge tone={p.online ? "good" : "neutral"}>{p.online ? "Online" : "Offline"}</Badge>
              </Td>
              <Td className="font-semibold">{formatINR(p.earnings)}</Td>
            </tr>
          ))}
        </Table>
      </Card>
    </>
  );
}
