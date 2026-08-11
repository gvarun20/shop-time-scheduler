import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser, AuthError } from "@/lib/auth";
import { parseDateKey, startOfDay } from "@/lib/time";
import { validateShiftAssignment } from "@/lib/coverage";
import { escalateToAdmins, notifyUser } from "@/lib/notify";

const schema = z.object({
  date: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  notes: z.string().max(300).optional(),
});

/** Employees log overtime past store hours; managers can also log for an employee via body.userId */
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = schema
      .extend({ userId: z.string().optional() })
      .parse(await req.json());

    const targetUserId =
      user.role === "ADMIN" && body.userId ? body.userId : user.id;

    if (targetUserId !== user.id && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const date = startOfDay(parseDateKey(body.date));
    const check = await validateShiftAssignment({
      userId: targetUserId,
      date,
      startTime: body.startTime,
      endTime: body.endTime,
      isOvertime: true,
    });
    if (!check.ok) {
      return NextResponse.json({ error: check.error }, { status: 400 });
    }

    const notePrefix = "Overtime";
    const notes = body.notes?.trim()
      ? `${notePrefix}: ${body.notes.trim()}`
      : `${notePrefix} (after shop hours)`;

    const shift = await prisma.shift.create({
      data: {
        date,
        startTime: body.startTime,
        endTime: body.endTime,
        assignedUserId: targetUserId,
        status: "CONFIRMED",
        isOvertime: true,
        notes,
      },
      include: {
        assignedUser: { select: { id: true, name: true, email: true } },
      },
    });

    const who = shift.assignedUser?.name || "Employee";
    await escalateToAdmins(
      `${who} logged overtime ${body.date} ${body.startTime}–${body.endTime}`,
      shift.id,
    );

    if (targetUserId !== user.id) {
      await notifyUser({
        userId: targetUserId,
        type: "SCHEDULE_UPDATE",
        message: `Overtime recorded for you: ${body.date} ${body.startTime}–${body.endTime}`,
        relatedId: shift.id,
      });
    }

    return NextResponse.json({ shift });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "Failed to log overtime" }, { status: 500 });
  }
}
