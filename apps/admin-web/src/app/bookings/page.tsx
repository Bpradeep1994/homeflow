"use client";

import { statusTone, type BookingRow } from "@/app/page";
import { Badge, Card, PageHeader, Table, Td } from "@/components/ui";
import { formatINR, useApi } from "@/lib/api";

export default function BookingsPage() {
  const { data, error } = useApi<BookingRow[]>("/admin/bookings");
  const searching = (data ?? []).filter((b) => b.status === "PENDING").length;

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  return (
    <>
      <PageHeader
        title="Bookings"
        subtitle={`${data?.length ?? "…"} recent bookings · ${searching} searching for a provider`}
      />
      <Card>
        <Table head={["ID", "Customer", "Service", "Provider", "Date", "Slot", "Amount", "Status"]}>
          {(data ?? []).map((b) => (
            <tr key={b.id}>
              <Td className="font-mono text-xs">{b.id}</Td>
              <Td className="font-medium">{b.customer?.name ?? "—"}</Td>
              <Td>{b.services.map((s) => s.name).join(", ")}</Td>
              <Td>{b.provider?.name ?? "—"}</Td>
              <Td>{b.date}</Td>
              <Td className="whitespace-nowrap">{b.timeSlot}</Td>
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
