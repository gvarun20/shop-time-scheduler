import { prisma } from "./db";

export type WhatsAppLink = {
  id?: string;
  userId?: string | null;
  name?: string;
  phone: string;
  body: string;
  link: string;
};

/** Normalize to E.164-ish digits with leading + */
export function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const cleaned = phone.replace(/[^\d+]/g, "");
  if (!cleaned) return null;
  if (cleaned.startsWith("+")) return cleaned;
  return `+${cleaned.replace(/^\+/, "")}`;
}

/** Digits only for wa.me (no +) */
export function phoneDigits(phone: string): string {
  return phone.replace(/\D/g, "");
}

/** Free WhatsApp deep link — opens the user's WhatsApp with text pre-filled. */
export function buildWaMeLink(phone: string, body: string): string {
  const digits = phoneDigits(phone);
  return `https://wa.me/${digits}?text=${encodeURIComponent(body)}`;
}

/** Always "configured" — free wa.me links need no paid API. */
export function whatsappConfigured() {
  return true;
}

/**
 * Create a free WhatsApp share link and log it.
 * No Twilio / no paid services — user taps the link to send from their phone.
 */
export async function sendWhatsApp(opts: {
  toPhone: string;
  body: string;
  toUserId?: string;
  toName?: string;
}): Promise<WhatsAppLink & { status: string; error: string | null }> {
  const phone = normalizePhone(opts.toPhone);
  if (!phone) {
    const row = await prisma.whatsAppMessage.create({
      data: {
        toPhone: opts.toPhone || "",
        toUserId: opts.toUserId,
        body: opts.body,
        status: "skipped",
        error: "Missing/invalid phone",
        provider: "wa.me",
      },
    });
    return {
      id: row.id,
      userId: opts.toUserId,
      name: opts.toName,
      phone: opts.toPhone || "",
      body: opts.body,
      link: "",
      status: row.status,
      error: row.error,
    };
  }

  const link = buildWaMeLink(phone, opts.body);
  const row = await prisma.whatsAppMessage.create({
    data: {
      toPhone: phone,
      toUserId: opts.toUserId,
      body: opts.body,
      link,
      status: "ready",
      provider: "wa.me",
    },
  });

  return {
    id: row.id,
    userId: opts.toUserId,
    name: opts.toName,
    phone,
    body: opts.body,
    link,
    status: row.status,
    error: null,
  };
}

/** Prepare free WhatsApp links for every user who has a phone number. */
export async function broadcastWhatsApp(opts: {
  body: string;
  excludeUserId?: string;
}): Promise<WhatsAppLink[]> {
  const users = await prisma.user.findMany({
    where: {
      phone: { not: null },
      ...(opts.excludeUserId ? { id: { not: opts.excludeUserId } } : {}),
    },
    select: { id: true, phone: true, name: true },
  });

  const results: WhatsAppLink[] = [];
  for (const u of users) {
    if (!u.phone) continue;
    const sent = await sendWhatsApp({
      toPhone: u.phone,
      toUserId: u.id,
      toName: u.name,
      body: opts.body,
    });
    if (sent.link) {
      results.push({
        id: sent.id,
        userId: u.id,
        name: u.name,
        phone: sent.phone,
        body: sent.body,
        link: sent.link,
      });
    }
  }
  return results;
}

export async function sendWhatsAppToUserIds(
  userIds: string[],
  body: string,
): Promise<WhatsAppLink[]> {
  if (userIds.length === 0) return [];
  const users = await prisma.user.findMany({
    where: { id: { in: userIds }, phone: { not: null } },
    select: { id: true, phone: true, name: true },
  });
  const results: WhatsAppLink[] = [];
  for (const u of users) {
    if (!u.phone) continue;
    const sent = await sendWhatsApp({
      toPhone: u.phone,
      toUserId: u.id,
      toName: u.name,
      body,
    });
    if (sent.link) {
      results.push({
        id: sent.id,
        userId: u.id,
        name: u.name,
        phone: sent.phone,
        body: sent.body,
        link: sent.link,
      });
    }
  }
  return results;
}
