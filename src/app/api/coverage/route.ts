import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser, AuthError } from "@/lib/auth";
import { findCoverageCandidates } from "@/lib/coverage";
import { escalateToAdmins, notifyMany } from "@/lib/notify";
import { timeToMinutes } from "@/lib/time";

const createSchema = z.object({
  shiftId: z.string(),
  leaveAt: z.string(),
  isEmergency: z.boolean().optional(),
});

export async function GET() {
  try {
    const user = await requireUser();
    const open = await prisma.coverageRequest.findMany({
      where: { status: "OPEN" },
      include: {
        originalShift: {
          include: { assignedUser: { select: { id: true, name: true } } },
        },
        requestedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Expire stale requests and escalate
    const settings = await prisma.shopSettings.findUnique({ where: { id: "default" } });
    const now = new Date();
    for (const req of open) {
      if (req.expiresAt < now) {
        await prisma.coverageRequest.update({
          where: { id: req.id },
          data: { status: "EXPIRED" },
        });
        await escalateToAdmins(
          `Coverage request expired for ${req.requestedBy.name}'s shift (${req.uncoveredStart}–${req.uncoveredEnd}). Needs manual cover.`,
          req.id,
        );
      }
    }

    const stillOpen = await prisma.coverageRequest.findMany({
      where: { status: "OPEN" },
      include: {
        originalShift: true,
        requestedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Annotate which ones the current user can accept
    const annotated = [];
    for (const req of stillOpen) {
      const candidates = await findCoverageCandidates({
        date: req.originalShift.date,
        startTime: req.uncoveredStart,
        endTime: req.uncoveredEnd,
        excludeUserId: req.requestedByUserId,
        coverageRequestId: req.id,
      });
      annotated.push({
        ...req,
        canAccept: candidates.some((c) => c.id === user.id) || user.role === "ADMIN",
        candidateCount: candidates.length,
      });
    }

    return NextResponse.json({ requests: annotated, timeoutMinutes: settings?.coverageTimeoutMinutes ?? 20 });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error(e);
    return NextResponse.json({ error: "Failed to load coverage" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = createSchema.parse(await req.json());
    const shift = await prisma.shift.findUnique({ where: { id: body.shiftId } });
    if (!shift) {
      return NextResponse.json({ error: "Shift not found" }, { status: 404 });
    }
    if (shift.assignedUserId !== user.id && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Not your shift" }, { status: 403 });
    }
    if (
      timeToMinutes(body.leaveAt) < timeToMinutes(shift.startTime) ||
      timeToMinutes(body.leaveAt) >= timeToMinutes(shift.endTime)
    ) {
      return NextResponse.json(
        { error: "Leave time must be within the shift" },
        { status: 400 },
      );
    }

    const settings = await prisma.shopSettings.findUnique({ where: { id: "default" } });
    const timeout = settings?.coverageTimeoutMinutes ?? 20;
    const expiresAt = new Date(Date.now() + timeout * 60 * 1000);

    const coverage = await prisma.coverageRequest.create({
      data: {
        originalShiftId: shift.id,
        requestedByUserId: user.id,
        uncoveredStart: body.leaveAt,
        uncoveredEnd: shift.endTime,
        isEmergency: body.isEmergency ?? true,
        expiresAt,
      },
    });

    await prisma.shift.update({
      where: { id: shift.id },
      data: { status: "NEEDS_COVERAGE" },
    });

    const candidates = await findCoverageCandidates({
      date: shift.date,
      startTime: body.leaveAt,
      endTime: shift.endTime,
      excludeUserId: user.id,
      coverageRequestId: coverage.id,
    });

    await notifyMany(
      candidates.map((c) => c.id),
      {
        type: "COVERAGE_ALERT",
        message: `${user.name} needs cover ${body.leaveAt}–${shift.endTime}. First to accept wins.`,
        relatedId: coverage.id,
      },
    );

    if (candidates.length === 0) {
      await escalateToAdmins(
        `No available candidates for ${user.name}'s coverage (${body.leaveAt}–${shift.endTime}).`,
        coverage.id,
      );
    }

    return NextResponse.json({
      coverage,
      candidates: candidates.map((c) => ({ id: c.id, name: c.name })),
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "Failed to create coverage request" }, { status: 500 });
  }
}
