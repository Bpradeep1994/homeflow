"use client";

import { Badge, Card, PageHeader, Table, Td } from "@/components/ui";
import { apiFetch, useApi } from "@/lib/api";

interface UserRow {
  id: string;
  name?: string;
  phone: string;
  email?: string | null;
  status: "ACTIVE" | "BLOCKED";
  createdAt: string;
}

export default function CustomersPage() {
  const { data, error, reload } = useApi<UserRow[]>("/admin/users?role=customer");

  async function toggleBlock(user: UserRow) {
    await apiFetch(`/admin/users/${user.id}/block`, {
      method: "PATCH",
      body: { blocked: user.status === "ACTIVE" },
    });
    reload();
  }

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  return (
    <>
      <PageHeader title="Customers" subtitle={`${data?.length ?? "…"} registered customers`} />
      <Card>
        <Table head={["Name", "Phone", "Email", "Joined", "Status", ""]}>
          {(data ?? []).map((c) => (
            <tr key={c.id}>
              <Td className="font-medium">{c.name ?? "—"}</Td>
              <Td>{c.phone}</Td>
              <Td>{c.email ?? "—"}</Td>
              <Td>{new Date(c.createdAt).toLocaleDateString("en-IN")}</Td>
              <Td>
                <Badge tone={c.status === "ACTIVE" ? "good" : "critical"}>{c.status}</Badge>
              </Td>
              <Td>
                <button
                  onClick={() => toggleBlock(c)}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
                    c.status === "ACTIVE"
                      ? "text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                      : "text-green-700 hover:bg-green-50 dark:hover:bg-green-950/40"
                  }`}
                >
                  {c.status === "ACTIVE" ? "Block" : "Unblock"}
                </button>
              </Td>
            </tr>
          ))}
        </Table>
      </Card>
    </>
  );
}
