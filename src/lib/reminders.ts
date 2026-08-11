import { prisma } from "./db";
import { addDays, startOfDay } from "./time";
import { sendWhatsAppToUserIds } from "./whatsapp";
import { notifyUser } from "./notify";

function shopOffset() {
  return process.env.SHOP_UTC_OFFSET || "+02:00";
}

function shiftStartDate(date: Date, startTime: string): Date {
  const key = date.toISOString().slice(0, 10);
  return new Date(`${key}T${startTime}:00${shopOffset()}`);
}

/** Send ~2h-before reminders. Safe to call often (uses reminderSentAt). */
export async function sendDueShiftReminders() {
  const now = Date.now();
  const windowStart = now + (2 * 60 - 25) * 60 * 1000; // ~1h35
  const windowEnd = now + (2 * 60 + 25) * 60 * 1000; // ~2h25

  const from = startOfDay(new Date());
  const to = addDays(from, 3);

  const shifts = await prisma.shift.findMany({
    where: {
      date: { gte: from, lt: to },
      status: "CONFIRMED",
      assignedUserId: { not: null },
      reminderSentAt: null,
      isOvertime: false,
    },
    include: {
      assignedUser: { select: { id: true, name: true, phone: true } },
    },
  });

  const sent = [];
  for (const shift of shifts) {
    if (!shift.assignedUserId || !shift.assignedUser) continue;
    const startAt = shiftStartDate(shift.date, shift.startTime).getTime();
    if (startAt < windowStart || startAt > windowEnd) continue;

    const dateLabel = shift.date.toISOString().slice(0, 10);
    const message = `Reminder: your Ngroceries shift starts in about 2 hours (${dateLabel} ${shift.startTime}–${shift.endTime}).`;

    await notifyUser({
      userId: shift.assignedUserId,
      type: "REMINDER",
      message,
      relatedId: shift.id,
      whatsapp: true,
    });

    const managers = await prisma.user.findMany({
      where: { role: "ADMIN" },
      select: { id: true },
    });
    await sendWhatsAppToUserIds(
      managers.map((m) => m.id),
      `Ngroceries: ${shift.assignedUser.name} has a shift in ~2 hours (${dateLabel} ${shift.startTime}).`,
    );

    await prisma.shift.update({
      where: { id: shift.id },
      data: { reminderSentAt: new Date() },
    });

    sent.push({ shiftId: shift.id, userId: shift.assignedUserId });
  }

  return {
    checked: shifts.length,
    sent: sent.length,
    reminders: sent,
  };
}
