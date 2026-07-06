"use client";

import { useState } from "react";

import { Badge, Card, PageHeader, Table, Td } from "@/components/ui";
import { apiFetch, useApi } from "@/lib/api";

interface CouponRow {
  code: string;
  title: string;
  type: "FLAT" | "PERCENT";
  value: number;
  maxUses: number;
  used: number;
  expiresAt: string;
  active: boolean;
}

export default function CouponsPage() {
  const { data, error, reload } = useApi<CouponRow[]>("/admin/coupons");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    code: "",
    title: "",
    type: "FLAT" as "FLAT" | "PERCENT",
    value: 100,
    maxUses: 500,
    expiresAt: "2026-12-31",
  });

  async function create(e: React.FormEvent) {
    e.preventDefault();
    try {
      await apiFetch("/admin/coupons", { method: "POST", body: form });
      setShowForm(false);
      reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    }
  }

  async function toggle(c: CouponRow) {
    await apiFetch(`/admin/coupons/${c.code}`, { method: "PATCH", body: { active: !c.active } });
    reload();
  }

  const input = "w-full rounded-lg border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/15";
  if (error) return <p className="text-sm text-red-600">{error}</p>;
  return (
    <>
      <PageHeader
        title="Coupons"
        subtitle={`${(data ?? []).filter((c) => c.active).length} active campaigns`}
      />
      <div className="mb-4">
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded-md bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700"
        >
          {showForm ? "Close" : "+ New coupon"}
        </button>
      </div>

      {showForm && (
        <Card className="mb-6 p-5">
          <form onSubmit={create} className="grid gap-3 md:grid-cols-3">
            <input
              className={input}
              placeholder="CODE (A–Z, 0–9)"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              required
            />
            <input
              className={`${input} md:col-span-2`}
              placeholder="Campaign title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
            <select
              className={input}
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as "FLAT" | "PERCENT" })}
            >
              <option value="FLAT">Flat ₹ off</option>
              <option value="PERCENT">% off</option>
            </select>
            <input
              className={input}
              type="number"
              min={1}
              placeholder="Value"
              value={form.value}
              onChange={(e) => setForm({ ...form, value: Number(e.target.value) })}
            />
            <input
              className={input}
              type="number"
              min={1}
              placeholder="Max uses"
              value={form.maxUses}
              onChange={(e) => setForm({ ...form, maxUses: Number(e.target.value) })}
            />
            <input
              className={input}
              type="date"
              value={form.expiresAt}
              onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
            />
            <button
              type="submit"
              className="rounded-md bg-teal-600 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-700 md:col-span-2"
            >
              Create coupon
            </button>
          </form>
        </Card>
      )}

      <Card>
        <Table head={["Code", "Campaign", "Discount", "Usage", "Expires", "Status", ""]}>
          {(data ?? []).map((c) => (
            <tr key={c.code}>
              <Td className="font-mono text-xs font-bold">{c.code}</Td>
              <Td className="font-medium">{c.title}</Td>
              <Td>{c.type === "FLAT" ? `₹${c.value}` : `${c.value}%`}</Td>
              <Td>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-24 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
                    <div
                      className="h-full rounded-full bg-teal-600"
                      style={{ width: `${Math.min(100, Math.round((c.used / c.maxUses) * 100))}%` }}
                    />
                  </div>
                  <span className="text-xs text-neutral-500">
                    {c.used}/{c.maxUses}
                  </span>
                </div>
              </Td>
              <Td>{c.expiresAt}</Td>
              <Td>
                <Badge tone={c.active ? "good" : "neutral"}>{c.active ? "Active" : "Paused"}</Badge>
              </Td>
              <Td>
                <button
                  onClick={() => toggle(c)}
                  className="rounded-md px-2.5 py-1 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
                >
                  {c.active ? "Pause" : "Activate"}
                </button>
              </Td>
            </tr>
          ))}
        </Table>
      </Card>
    </>
  );
}
