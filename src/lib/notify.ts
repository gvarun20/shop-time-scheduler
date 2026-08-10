import { prisma } from "./db";

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
}) {
  return prisma.notification.create({
    data: {
      userId: opts.userId,
      type: opts.type,
      message: opts.message,
      relatedId: opts.relatedId,
    },
  });
}

export async function notifyMany(
  userIds: string[],
  opts: { type: NotificationType; message: string; relatedId?: string },
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
}

export async function escalateToAdmins(message: string, relatedId?: string) {
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true },
  });
  await notifyMany(
    admins.map((a) => a.id),
    { type: "ESCALATION", message, relatedId },
  );
}
