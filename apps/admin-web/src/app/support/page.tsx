"use client";

import { Badge, Card, PageHeader, Table, Td, type BadgeTone } from "@/components/ui";
import { apiFetch, useApi } from "@/lib/api";

interface TicketRow {
  id: string;
  user: { name?: string; phone: string; role: string };
  subject: string;
  message: string;
  bookingId?: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  status: "OPEN" | "PENDING" | "RESOLVED";
  updatedAt: string;
}

const priorityTone: Record<string, BadgeTone> = { HIGH: "critical", MEDIUM: "warning", LOW: "neutral" };
const ticketTone: Record<string, BadgeTone> = { OPEN: "serious", PENDING: "warning", RESOLVED: "good" };

export default function SupportPage() {
  const { data, error, reload } = useApi<TicketRow[]>("/admin/tickets");
  const open = (data ?? []).filter((t) => t.status !== "RESOLVED").length;

  async function setStatus(t: TicketRow, status: TicketRow["status"]) {
    await apiFetch(`/admin/tickets/${t.id}`, { method: "PATCH", body: { status } });
    reload();
  }

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  return (
    <>
      <PageHeader title="Support" subtitle={`${open} tickets need attention`} />
      <Card>
        <Table head={["User", "Type", "Subject", "Booking", "Priority", "Status", "Update"]}>
          {(data ?? []).map((t) => (
            <tr key={t.id}>
              <Td className="font-medium">{t.user?.name ?? t.user?.phone}</Td>
              <Td className="capitalize">{t.user?.role}</Td>
              <Td>
                <div className="font-medium">{t.subject}</div>
                <div className="max-w-md truncate text-xs text-neutral-500">{t.message}</div>
              </Td>
              <Td className="font-mono text-xs">{t.bookingId ?? "—"}</Td>
              <Td>
                <Badge tone={priorityTone[t.priority]}>{t.priority}</Badge>
              </Td>
              <Td>
                <Badge tone={ticketTone[t.status]}>{t.status}</Badge>
              </Td>
              <Td>
                <select
                  value={t.status}
                  onChange={(e) => setStatus(t, e.target.value as TicketRow["status"])}
                  className="rounded-md border border-black/15 bg-transparent px-2 py-1 text-xs dark:border-white/15"
                >
                  <option value="OPEN">Open</option>
                  <option value="PENDING">Pending</option>
                  <option value="RESOLVED">Resolved</option>
                </select>
              </Td>
            </tr>
          ))}
        </Table>
      </Card>
    </>
  );
}
