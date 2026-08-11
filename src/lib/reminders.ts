import { prisma } from "./db";
import { addDays, startOfDay } from "./time";
import { sendWhatsApp } from "./whatsapp";
import { notifyUser, escalateToAdmins } from "./notify";

function shopOffset() {
  return process.env.SHOP_UTC_OFFSET || "+02:00";
}

function shiftStartDate(date: Date, startTime: string): Date {
  const key = date.toISOString().slice(0, 10);
  return new Date(`${key}T${startTime}:00${shopOffset()}`);
}

/**
 * Queue ~2h-before reminders.
 * In-app → employee.
 * WhatsApp draft → manager sends FROM shop number TO that employee.
 */
export async function sendDueShiftReminders() {
  const now = Date.now();
  const windowStart = now + (2 * 60 - 25) * 60 * 1000;
  const windowEnd = now + (2 * 60 + 25) * 60 * 1000;

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
      whatsapp: false,
    });

    if (shift.assignedUser.phone) {
      await sendWhatsApp({
        toPhone: shift.assignedUser.phone,
        toUserId: shift.assignedUser.id,
        toName: shift.assignedUser.name,
        body: `Ngroceries: ${message}`,
      });
    }

    await escalateToAdmins(
      `Send 2h reminder on WhatsApp (from shop number) to ${shift.assignedUser.name} for ${dateLabel} ${shift.startTime}.`,
      shift.id,
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
