"use client";

import { Badge, Card, PageHeader, StatTile, Table, Td } from "@/components/ui";
import { apiFetch, formatINR, useApi } from "@/lib/api";

interface PaymentRow {
  id: string;
  booking: { id: string; customer: { name?: string }; provider?: { name?: string } | null };
  method: string;
  amount: number;
  commission: number;
  payout: number;
  status: "PAID" | "REFUNDED";
  settledAt?: string | null;
  createdAt: string;
}

interface PayoutRow {
  provider: string;
  providerId: string;
  payments: number;
  amount: number;
}

export default function PaymentsPage() {
  const { data, error, reload } = useApi<PaymentRow[]>("/admin/payments");
  const { data: payouts, reload: reloadPayouts } = useApi<PayoutRow[]>("/admin/payouts");

  const paid = (data ?? []).filter((p) => p.status === "PAID");
  const collected = paid.reduce((s, p) => s + p.amount, 0);
  const commission = paid.reduce((s, p) => s + p.commission, 0);
  const refunded = (data ?? []).filter((p) => p.status === "REFUNDED").reduce((s, p) => s + p.amount, 0);

  async function refund(p: PaymentRow) {
    if (!confirm(`Refund ${formatINR(p.amount)} for ${p.booking.id}?`)) return;
    try {
      await apiFetch(`/admin/payments/${p.id}/refund`, { method: "POST" });
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    }
    reload();
    reloadPayouts();
  }

  async function settleAll() {
    const res = await apiFetch<{ settledProviders: number }>("/admin/payouts/settle", { method: "POST" });
    alert(`Settled payouts for ${res.settledProviders} provider(s)`);
    reload();
    reloadPayouts();
  }

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  return (
    <>
      <PageHeader title="Payments" subtitle="Collections, commissions, refunds and provider payouts" />
      <div className="mb-6 grid grid-cols-3 gap-4">
        <StatTile label="Collected" value={formatINR(collected)} />
        <StatTile label="Platform commission" value={formatINR(commission)} hint="20% per booking" />
        <StatTile label="Refunded" value={formatINR(refunded)} />
      </div>

      {(payouts?.length ?? 0) > 0 && (
        <Card className="mb-6">
          <div className="flex items-center justify-between px-4 pt-4">
            <h2 className="text-sm font-semibold">Unsettled payouts</h2>
            <button
              onClick={settleAll}
              className="rounded-md bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700"
            >
              Settle all (weekly batch)
            </button>
          </div>
          <Table head={["Provider", "Payments", "Amount due"]}>
            {(payouts ?? []).map((p) => (
              <tr key={p.providerId}>
                <Td className="font-medium">{p.provider}</Td>
                <Td>{p.payments}</Td>
                <Td className="font-semibold">{formatINR(p.amount)}</Td>
              </tr>
            ))}
          </Table>
        </Card>
      )}

      <Card>
        <Table head={["Booking", "Customer", "Provider", "Method", "Amount", "Payout", "Settled", "Status", ""]}>
          {(data ?? []).map((p) => (
            <tr key={p.id}>
              <Td className="font-mono text-xs">{p.booking.id}</Td>
              <Td>{p.booking.customer?.name ?? "—"}</Td>
              <Td>{p.booking.provider?.name ?? "—"}</Td>
              <Td>{p.method}</Td>
              <Td className="font-semibold">{formatINR(p.amount)}</Td>
              <Td>{formatINR(p.payout)}</Td>
              <Td>{p.settledAt ? "✓" : "—"}</Td>
              <Td>
                <Badge tone={p.status === "PAID" ? "good" : "critical"}>{p.status}</Badge>
              </Td>
              <Td>
                {p.status === "PAID" && !p.settledAt && (
                  <button
                    onClick={() => refund(p)}
                    className="rounded-md px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                  >
                    Refund
                  </button>
                )}
              </Td>
            </tr>
          ))}
        </Table>
      </Card>
    </>
  );
}
