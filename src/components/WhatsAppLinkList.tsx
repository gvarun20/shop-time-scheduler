"use client";

export type WaLink = {
  id?: string;
  name?: string | null;
  phone: string;
  link: string;
  body?: string;
};

/** Free one-tap WhatsApp buttons (opens WhatsApp with message pre-filled). */
export function WhatsAppLinkList({
  links,
  title = "Send on WhatsApp (free)",
}: {
  links: WaLink[];
  title?: string;
}) {
  if (!links.length) return null;

  const copyAll = async () => {
    const text = links.map((l) => `${l.name || l.phone}: ${l.body || l.link}`).join("\n\n");
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore
    }
  };

  return (
    <div className="mt-4 space-y-2 rounded-2xl border border-brand/25 bg-surface-soft p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-brand-deep">{title}</p>
          <p className="text-xs text-muted">
            100% free — taps open WhatsApp on your phone with the message ready. Just hit Send.
          </p>
        </div>
        <button
          type="button"
          onClick={copyAll}
          className="shrink-0 rounded-lg border border-line bg-white px-2 py-1 text-[11px] font-semibold"
        >
          Copy all
        </button>
      </div>
      <ul className="space-y-1.5">
        {links.map((l) => (
          <li key={l.id || l.phone}>
            <a
              href={l.link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-2 rounded-xl border border-line bg-white px-3 py-2.5 text-sm font-semibold text-ink transition hover:border-brand/40 hover:bg-brand/5"
            >
              <span className="truncate">
                {l.name || "Team"} · {l.phone}
              </span>
              <span className="shrink-0 text-xs font-bold text-brand">Open WA</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
