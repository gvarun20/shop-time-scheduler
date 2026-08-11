import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { startOfDay, addDays } from "@/lib/time";
import { sendWhatsAppToUserIds } from "@/lib/whatsapp";
import { notifyUser } from "@/lib/notify";

function shopOffset() {
  return process.env.SHOP_UTC_OFFSET || "+02:00";
}

function shiftStartDate(date: Date, startTime: string): Date {
  const key = date.toISOString().slice(0, 10);
  return new Date(`${key}T${startTime}:00${shopOffset()}`);
}

/**
 * Vercel Cron: every 15 minutes.
 * Sends WhatsApp + in-app reminder ~2 hours before each confirmed shift.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = Date.now();
  const windowStart = now + (2 * 60 - 20) * 60 * 1000; // 1h40
  const windowEnd = now + (2 * 60 + 20) * 60 * 1000; // 2h20

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

    // Also ping managers
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

  return NextResponse.json({
    ok: true,
    checked: shifts.length,
    sent: sent.length,
    reminders: sent,
    whatsappReady: Boolean(
      process.env.TWILIO_ACCOUNT_SID &&
        process.env.TWILIO_AUTH_TOKEN &&
        process.env.TWILIO_WHATSAPP_FROM,
    ),
  });
}
