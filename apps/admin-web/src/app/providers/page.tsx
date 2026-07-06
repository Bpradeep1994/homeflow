"use client";

import { Badge, Card, PageHeader, Table, Td, type BadgeTone } from "@/components/ui";
import { API_URL, apiFetch, useApi } from "@/lib/api";

interface ProfileRow {
  id: string;
  user: { id: string; name?: string; phone: string; status: string };
  services: string[];
  city?: string;
  serviceAreas: string[];
  experienceYears: number;
  verificationStatus: string;
  idDocumentUrl?: string;
  rating: number;
  jobsDone: number;
  online: boolean;
}

const verificationTone: Record<string, BadgeTone> = {
  APPROVED: "good",
  PENDING: "warning",
  REJECTED: "critical",
  NONE: "neutral",
};

export default function ProvidersPage() {
  const { data, error, reload } = useApi<ProfileRow[]>("/admin/providers");
  const pending = (data ?? []).filter((p) => p.verificationStatus === "PENDING");

  async function review(userId: string, decision: "approve" | "reject") {
    await apiFetch(`/admin/verifications/${userId}`, { method: "POST", body: { decision } });
    reload();
  }

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  return (
    <>
      <PageHeader
        title="Providers"
        subtitle={`${data?.length ?? "…"} professionals · ${pending.length} awaiting verification`}
      />

      {pending.length > 0 && (
        <Card className="mb-6">
          <div className="px-4 pt-4">
            <h2 className="text-sm font-semibold">Pending verifications</h2>
          </div>
          <Table head={["Name", "Skills", "City", "Experience", "ID document", "Decision"]}>
            {pending.map((p) => (
              <tr key={p.id}>
                <Td className="font-medium">{p.user.name ?? p.user.phone}</Td>
                <Td>{p.services.join(", ")}</Td>
                <Td>{p.city ?? "—"}</Td>
                <Td>{p.experienceYears} yrs</Td>
                <Td>
                  {p.idDocumentUrl ? (
                    <a
                      href={`${API_URL}${p.idDocumentUrl}`}
                      target="_blank"
                      className="text-teal-700 hover:underline dark:text-teal-500"
                    >
                      View →
                    </a>
                  ) : (
                    "—"
                  )}
                </Td>
                <Td>
                  <div className="flex gap-2">
                    <button
                      onClick={() => review(p.user.id, "approve")}
                      className="rounded-md bg-green-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-green-700"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => review(p.user.id, "reject")}
                      className="rounded-md px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                    >
                      Reject
                    </button>
                  </div>
                </Td>
              </tr>
            ))}
          </Table>
        </Card>
      )}

      <Card>
        <Table head={["Name", "Skills", "City", "Rating", "Jobs", "Availability", "Verification"]}>
          {(data ?? []).map((p) => (
            <tr key={p.id}>
              <Td className="font-medium">{p.user.name ?? p.user.phone}</Td>
              <Td>{p.services.join(", ")}</Td>
              <Td>{p.city ?? "—"}</Td>
              <Td>{p.rating > 0 ? `⭐ ${p.rating.toFixed(1)}` : "—"}</Td>
              <Td>{p.jobsDone}</Td>
              <Td>
                <Badge tone={p.online ? "good" : "neutral"}>{p.online ? "Online" : "Offline"}</Badge>
              </Td>
              <Td>
                <Badge tone={verificationTone[p.verificationStatus] ?? "neutral"}>
                  {p.verificationStatus}
                </Badge>
              </Td>
            </tr>
          ))}
        </Table>
      </Card>
    </>
  );
}
