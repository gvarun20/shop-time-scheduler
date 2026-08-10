import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin, AuthError } from "@/lib/auth";
import { validateShiftAssignment } from "@/lib/coverage";
import { notifyUser } from "@/lib/notify";

const patchSchema = z.object({
  assignedUserId: z.string().nullable().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  status: z.enum(["CONFIRMED", "OPEN", "NEEDS_COVERAGE"]).optional(),
  notes: z.string().optional(),
});

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await ctx.params;
    const body = patchSchema.parse(await req.json());
    const existing = await prisma.shift.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Shift not found" }, { status: 404 });
    }

    const assignedUserId =
      body.assignedUserId !== undefined ? body.assignedUserId : existing.assignedUserId;
    const startTime = body.startTime ?? existing.startTime;
    const endTime = body.endTime ?? existing.endTime;

    if (assignedUserId) {
      const check = await validateShiftAssignment({
        userId: assignedUserId,
        date: existing.date,
        startTime,
        endTime,
        excludeShiftId: id,
      });
      if (!check.ok && !check.error.startsWith("Warning")) {
        return NextResponse.json({ error: check.error }, { status: 400 });
      }
    }

    const shift = await prisma.shift.update({
      where: { id },
      data: {
        assignedUserId,
        startTime,
        endTime,
        notes: body.notes,
        status:
          body.status ??
          (assignedUserId ? "CONFIRMED" : "OPEN"),
      },
      include: {
        assignedUser: { select: { id: true, name: true, email: true } },
      },
    });

    if (assignedUserId && assignedUserId !== existing.assignedUserId) {
      await notifyUser({
        userId: assignedUserId,
        type: "SCHEDULE_UPDATE",
        message: `Shift updated: ${startTime}–${endTime}`,
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
    return NextResponse.json({ error: "Failed to update shift" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await ctx.params;
    await prisma.shift.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error(e);
    return NextResponse.json({ error: "Failed to delete shift" }, { status: 500 });
  }
}
