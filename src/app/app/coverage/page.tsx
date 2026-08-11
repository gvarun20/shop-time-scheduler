"use client";

import { useCallback, useEffect, useState } from "react";
import { WhatsAppLinkList, type WaLink } from "@/components/WhatsAppLinkList";

type CoverageReq = {
  id: string;
  uncoveredStart: string;
  uncoveredEnd: string;
  expiresAt: string;
  canAccept: boolean;
  candidateCount: number;
  requestedBy: { name: string };
  originalShift: { date: string };
};

export default function CoveragePage() {
  const [requests, setRequests] = useState<CoverageReq[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [waLinks, setWaLinks] = useState<WaLink[]>([]);

  const load = useCallback(async () => {
    const res = await fetch("/api/coverage");
    const data = await res.json();
    if (res.ok) setRequests(data.requests || []);
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, [load]);

  const accept = async (id: string) => {
    setMessage(null);
    setWaLinks([]);
    const res = await fetch(`/api/coverage/${id}/accept`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) setMessage(data.error || "Could not accept");
    else {
      setMessage("You got it — you're on the cover block. Notify everyone on WhatsApp below.");
      setWaLinks(data.whatsappLinks || []);
    }
    load();
  };

  const decline = async (id: string) => {
    await fetch(`/api/coverage/${id}/decline`, { method: "POST" });
    load();
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl">Open coverage</h1>
        <p className="text-sm text-muted">
          First accept wins. Then tap free WhatsApp links to tell the whole team.
        </p>
      </div>
      {message && (
        <p className="rounded-xl border border-brand/20 bg-brand/10 px-3 py-2 text-sm text-brand-deep">
          {message}
        </p>
      )}
      <WhatsAppLinkList links={waLinks} title="Tell everyone on WhatsApp (free)" />
      <div className="space-y-3">
        {requests.length === 0 && (
          <p className="rounded-2xl border border-dashed border-line bg-white/60 px-4 py-10 text-center text-sm text-muted">
            No open coverage requests
          </p>
        )}
        {requests.map((r) => (
          <article key={r.id} className="rounded-2xl border border-line bg-white p-4 shadow-sm">
            <p className="font-semibold text-ink">
              {r.requestedBy.name} · {r.uncoveredStart}–{r.uncoveredEnd}
            </p>
            <p className="mt-1 text-sm text-muted">
              {r.originalShift.date.slice(0, 10)} · {r.candidateCount} candidates · expires{" "}
              {new Date(r.expiresAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </p>
            {r.canAccept && (
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => accept(r.id)}
                  className="flex-1 rounded-xl bg-brand px-3 py-2.5 text-sm font-bold text-white"
                >
                  I can cover
                </button>
                <button
                  type="button"
                  onClick={() => decline(r.id)}
                  className="rounded-xl border border-line px-3 py-2.5 text-sm font-semibold"
                >
                  Pass
                </button>
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
