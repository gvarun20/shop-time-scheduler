import { prisma } from "./db";
import { broadcastWhatsApp, sendWhatsAppToUserIds, type WhatsAppLink } from "./whatsapp";

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
  whatsapp?: boolean;
}): Promise<{ notification: unknown; whatsappLinks: WhatsAppLink[] }> {
  const notification = await prisma.notification.create({
    data: {
      userId: opts.userId,
      type: opts.type,
      message: opts.message,
      relatedId: opts.relatedId,
    },
  });

  let whatsappLinks: WhatsAppLink[] = [];
  if (opts.whatsapp) {
    whatsappLinks = await sendWhatsAppToUserIds(
      [opts.userId],
      `Ngroceries: ${opts.message}`,
    );
  }

  return { notification, whatsappLinks };
}

export async function notifyMany(
  userIds: string[],
  opts: {
    type: NotificationType;
    message: string;
    relatedId?: string;
    whatsapp?: boolean;
  },
): Promise<{ whatsappLinks: WhatsAppLink[] }> {
  if (userIds.length === 0) return { whatsappLinks: [] };
  await prisma.notification.createMany({
    data: userIds.map((userId) => ({
      userId,
      type: opts.type,
      message: opts.message,
      relatedId: opts.relatedId,
    })),
  });

  if (!opts.whatsapp) return { whatsappLinks: [] };
  const whatsappLinks = await sendWhatsAppToUserIds(
    userIds,
    `Ngroceries: ${opts.message}`,
  );
  return { whatsappLinks };
}

export async function escalateToAdmins(message: string, relatedId?: string) {
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true },
  });
  return notifyMany(
    admins.map((a) => a.id),
    { type: "ESCALATION", message, relatedId, whatsapp: true },
  );
}

/** In-app + free WhatsApp links for every staff member (employees + managers). */
export async function notifyEntireTeam(opts: {
  type: NotificationType;
  message: string;
  relatedId?: string;
  excludeUserId?: string;
}): Promise<{ whatsappLinks: WhatsAppLink[] }> {
  const users = await prisma.user.findMany({
    where: opts.excludeUserId ? { id: { not: opts.excludeUserId } } : undefined,
    select: { id: true },
  });
  const ids = users.map((u) => u.id);
  await notifyMany(ids, {
    type: opts.type,
    message: opts.message,
    relatedId: opts.relatedId,
    whatsapp: false,
  });
  const whatsappLinks = await broadcastWhatsApp({
    body: `Ngroceries: ${opts.message}`,
    excludeUserId: opts.excludeUserId,
  });
  return { whatsappLinks };
}
