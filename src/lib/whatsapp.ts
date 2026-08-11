import { prisma } from "./db";

/** Normalize to E.164-ish digits with leading + */
export function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const cleaned = phone.replace(/[^\d+]/g, "");
  if (!cleaned) return null;
  if (cleaned.startsWith("+")) return cleaned;
  // Default: assume already includes country code digits
  return `+${cleaned.replace(/^\+/, "")}`;
}

export function whatsappConfigured() {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_WHATSAPP_FROM,
  );
}

async function sendViaTwilio(to: string, body: string) {
  const sid = process.env.TWILIO_ACCOUNT_SID!;
  const token = process.env.TWILIO_AUTH_TOKEN!;
  const from = process.env.TWILIO_WHATSAPP_FROM!; // e.g. whatsapp:+14155238886

  const toWa = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;
  const fromWa = from.startsWith("whatsapp:") ? from : `whatsapp:${from}`;

  const auth = Buffer.from(`${sid}:${token}`).toString("base64");
  const params = new URLSearchParams({
    To: toWa,
    From: fromWa,
    Body: body,
  });

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    },
  );

  const data = (await res.json()) as { sid?: string; message?: string; error_message?: string };
  if (!res.ok) {
    throw new Error(data.message || data.error_message || `Twilio HTTP ${res.status}`);
  }
  return data.sid || "sent";
}

export async function sendWhatsApp(opts: {
  toPhone: string;
  body: string;
  toUserId?: string;
}) {
  const phone = normalizePhone(opts.toPhone);
  if (!phone) {
    return prisma.whatsAppMessage.create({
      data: {
        toPhone: opts.toPhone || "",
        toUserId: opts.toUserId,
        body: opts.body,
        status: "skipped",
        error: "Missing/invalid phone",
      },
    });
  }

  if (!whatsappConfigured()) {
    console.info(`[whatsapp:dry-run] → ${phone}: ${opts.body}`);
    return prisma.whatsAppMessage.create({
      data: {
        toPhone: phone,
        toUserId: opts.toUserId,
        body: opts.body,
        status: "skipped",
        error: "Twilio WhatsApp not configured (set TWILIO_* env vars)",
        provider: "none",
      },
    });
  }

  try {
    await sendViaTwilio(phone, opts.body);
    return prisma.whatsAppMessage.create({
      data: {
        toPhone: phone,
        toUserId: opts.toUserId,
        body: opts.body,
        status: "sent",
      },
    });
  } catch (e) {
    const error = e instanceof Error ? e.message : "Send failed";
    console.error("[whatsapp]", error);
    return prisma.whatsAppMessage.create({
      data: {
        toPhone: phone,
        toUserId: opts.toUserId,
        body: opts.body,
        status: "failed",
        error,
      },
    });
  }
}

/** Send the same WhatsApp to every user who has a phone number. */
export async function broadcastWhatsApp(opts: {
  body: string;
  excludeUserId?: string;
}) {
  const users = await prisma.user.findMany({
    where: {
      phone: { not: null },
      ...(opts.excludeUserId ? { id: { not: opts.excludeUserId } } : {}),
    },
    select: { id: true, phone: true, name: true },
  });

  const results = [];
  for (const u of users) {
    if (!u.phone) continue;
    results.push(
      await sendWhatsApp({
        toPhone: u.phone,
        toUserId: u.id,
        body: opts.body,
      }),
    );
  }
  return results;
}

export async function sendWhatsAppToUserIds(userIds: string[], body: string) {
  if (userIds.length === 0) return [];
  const users = await prisma.user.findMany({
    where: { id: { in: userIds }, phone: { not: null } },
    select: { id: true, phone: true },
  });
  const results = [];
  for (const u of users) {
    if (!u.phone) continue;
    results.push(await sendWhatsApp({ toPhone: u.phone, toUserId: u.id, body }));
  }
  return results;
}
