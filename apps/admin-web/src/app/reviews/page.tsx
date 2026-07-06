"use client";

import { Badge, Card, PageHeader } from "@/components/ui";
import { API_URL, useApi } from "@/lib/api";

interface ReviewRow {
  id: string;
  customer: { name?: string };
  rating: number;
  comment?: string;
  photos: string[];
  reported: boolean;
  reportReason?: string;
  createdAt: string;
}

export default function ReviewsPage() {
  const { data, error } = useApi<ReviewRow[]>("/admin/reviews");
  const flagged = (data ?? []).filter((r) => r.reported).length;

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  return (
    <>
      <PageHeader
        title="Reviews"
        subtitle={`${data?.length ?? "…"} reviews · ${flagged} flagged for moderation`}
      />
      <div className="grid gap-4">
        {(data ?? []).map((r) => (
          <Card key={r.id} className="p-4">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="font-semibold">{r.customer?.name ?? "Customer"}</span>
              <span className="text-sm" aria-label={`${r.rating} out of 5 stars`}>
                {"★".repeat(r.rating)}
                <span className="text-neutral-300 dark:text-neutral-600">{"★".repeat(5 - r.rating)}</span>
              </span>
              <span className="ml-auto flex items-center gap-2 text-xs text-neutral-500">
                {r.reported && <Badge tone="critical">Flagged</Badge>}
                {new Date(r.createdAt).toLocaleDateString("en-IN")}
              </span>
            </div>
            {r.comment && (
              <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">“{r.comment}”</p>
            )}
            {r.photos.length > 0 && (
              <div className="mt-2 flex gap-2">
                {r.photos.map((p) => (
                  <a key={p} href={`${API_URL}${p}`} target="_blank">
                    {/* photos come from the API's upload store */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`${API_URL}${p}`}
                      alt="review photo"
                      className="h-16 w-16 rounded-lg border border-black/10 object-cover dark:border-white/10"
                    />
                  </a>
                ))}
              </div>
            )}
            {r.reported && r.reportReason && (
              <p className="mt-2 text-xs text-red-600">Report reason: {r.reportReason}</p>
            )}
          </Card>
        ))}
      </div>
    </>
  );
}
