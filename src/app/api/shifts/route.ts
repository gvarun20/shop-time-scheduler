import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin, requireUser, AuthError } from "@/lib/auth";
import { parseDateKey, startOfDay } from "@/lib/time";
import { validateShiftAssignment } from "@/lib/coverage";
import { notifyUser } from "@/lib/notify";

export async function GET(req: Request) {
  try {
    await requireUser();
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const fromDate = from ? startOfDay(parseDateKey(from)) : startOfDay(new Date());
    const toDate = to
      ? startOfDay(parseDateKey(to))
      : (() => {
          const d = new Date(fromDate);
          d.setDate(d.getDate() + 14);
          return d;
        })();

    const shifts = await prisma.shift.findMany({
      where: {
        date: { gte: fromDate, lt: toDate },
      },
      include: {
        assignedUser: { select: { id: true, name: true, email: true } },
        coverageRequests: {
          where: { status: "OPEN" },
          select: { id: true, uncoveredStart: true, uncoveredEnd: true, status: true },
        },
      },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    });

    return NextResponse.json({ shifts });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error(e);
    return NextResponse.json({ error: "Failed to load shifts" }, { status: 500 });
  }
}

const createSchema = z.object({
  date: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  assignedUserId: z.string().nullable().optional(),
  notes: z.string().optional(),
  isOvertime: z.boolean().optional(),
});

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = createSchema.parse(await req.json());
    const date = startOfDay(parseDateKey(body.date));
    const isOvertime = Boolean(body.isOvertime);

    if (body.assignedUserId) {
      const check = await validateShiftAssignment({
        userId: body.assignedUserId,
        date,
        startTime: body.startTime,
        endTime: body.endTime,
        isOvertime,
      });
      // Soft-warn for availability; hard-fail for conflicts/hours
      if (!check.ok && !check.error.startsWith("Warning")) {
        return NextResponse.json({ error: check.error }, { status: 400 });
      }
    }

    const shift = await prisma.shift.create({
      data: {
        date,
        startTime: body.startTime,
        endTime: body.endTime,
        assignedUserId: body.assignedUserId || null,
        status: body.assignedUserId ? "CONFIRMED" : "OPEN",
        notes: body.notes,
        isOvertime,
      },
      include: {
        assignedUser: { select: { id: true, name: true, email: true } },
      },
    });

    if (body.assignedUserId) {
      await notifyUser({
        userId: body.assignedUserId,
        type: "SCHEDULE_UPDATE",
        message: `${isOvertime ? "Overtime" : "Shift"} assigned ${body.date} ${body.startTime}–${body.endTime}`,
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
    return NextResponse.json({ error: "Failed to create shift" }, { status: 500 });
  }
}
