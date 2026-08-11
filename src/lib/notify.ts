import { prisma } from "./db";
import { broadcastWhatsApp, sendWhatsAppToUserIds } from "./whatsapp";

export type NotificationType =
  | "REMINDER"
  | "COVERAGE_ALERT"
  | "SCHEDULE_UPDATE"
  | "ESCALATION";

export async function notifyUser(opts: {
  userId: string;
  type: NotificationType;
  message: string;
  relatedId?: string;
  /** Opt-in WhatsApp (default false to avoid spam on every schedule tweak) */
  whatsapp?: boolean;
}) {
  const row = await prisma.notification.create({
    data: {
      userId: opts.userId,
      type: opts.type,
      message: opts.message,
      relatedId: opts.relatedId,
    },
  });

  if (opts.whatsapp) {
    await sendWhatsAppToUserIds([opts.userId], `Ngroceries: ${opts.message}`);
  }

  return row;
}

export async function notifyMany(
  userIds: string[],
  opts: {
    type: NotificationType;
    message: string;
    relatedId?: string;
    whatsapp?: boolean;
  },
) {
  if (userIds.length === 0) return;
  await prisma.notification.createMany({
    data: userIds.map((userId) => ({
      userId,
      type: opts.type,
      message: opts.message,
      relatedId: opts.relatedId,
    })),
  });

  if (opts.whatsapp) {
    await sendWhatsAppToUserIds(userIds, `Ngroceries: ${opts.message}`);
  }
}

export async function escalateToAdmins(message: string, relatedId?: string) {
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true },
  });
  await notifyMany(
    admins.map((a) => a.id),
    { type: "ESCALATION", message, relatedId, whatsapp: true },
  );
}

/** In-app + WhatsApp to every staff member (employees + managers). */
export async function notifyEntireTeam(opts: {
  type: NotificationType;
  message: string;
  relatedId?: string;
  excludeUserId?: string;
}) {
  const users = await prisma.user.findMany({
    where: opts.excludeUserId ? { id: { not: opts.excludeUserId } } : undefined,
    select: { id: true },
  });
  const ids = users.map((u) => u.id);
  await notifyMany(ids, {
    type: opts.type,
    message: opts.message,
    relatedId: opts.relatedId,
    whatsapp: false, // send once via broadcast below
  });
  await broadcastWhatsApp({
    body: `Ngroceries: ${opts.message}`,
    excludeUserId: opts.excludeUserId,
  });
}
