import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser, AuthError } from "@/lib/auth";
import { findCoverageCandidates } from "@/lib/coverage";
import { notifyEntireTeam, notifyUser } from "@/lib/notify";
import { formatDateKey, startOfDay } from "@/lib/time";

/** First to accept wins — claim an open coverage request. */
export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;

    const result = await prisma.$transaction(async (tx) => {
      const coverage = await tx.coverageRequest.findUnique({
        where: { id },
        include: {
          originalShift: true,
          requestedBy: { select: { id: true, name: true } },
        },
      });
      if (!coverage || coverage.status !== "OPEN") {
        throw new Error("Coverage no longer available");
      }
      if (coverage.expiresAt < new Date()) {
        await tx.coverageRequest.update({
          where: { id },
          data: { status: "EXPIRED" },
        });
        throw new Error("Coverage request expired");
      }
      if (coverage.requestedByUserId === user.id) {
        throw new Error("You cannot cover your own request");
      }

      const candidates = await findCoverageCandidates({
        date: coverage.originalShift.date,
        startTime: coverage.uncoveredStart,
        endTime: coverage.uncoveredEnd,
        excludeUserId: coverage.requestedByUserId,
        coverageRequestId: coverage.id,
      });
      if (user.role !== "ADMIN" && !candidates.some((c) => c.id === user.id)) {
        throw new Error("You are not eligible to cover this window");
      }

      const original = coverage.originalShift;

      await tx.shift.update({
        where: { id: original.id },
        data: {
          endTime: coverage.uncoveredStart,
          status: "CONFIRMED",
        },
      });

      const coverShift = await tx.shift.create({
        data: {
          date: startOfDay(original.date),
          startTime: coverage.uncoveredStart,
          endTime: coverage.uncoveredEnd,
          assignedUserId: user.id,
          status: "CONFIRMED",
          parentShiftId: original.id,
          notes: `Cover for coverage request ${coverage.id}`,
        },
      });

      const updated = await tx.coverageRequest.update({
        where: { id },
        data: {
          status: "FILLED",
          filledByUserId: user.id,
          filledAt: new Date(),
        },
      });

      return {
        coverage: updated,
        coverShift,
        requestedByName: coverage.requestedBy.name,
        uncoveredStart: coverage.uncoveredStart,
        uncoveredEnd: coverage.uncoveredEnd,
        shiftDate: original.date,
      };
    });

    const dateLabel = formatDateKey(result.shiftDate);
    const teamMessage = `${user.name} accepted coverage for ${result.requestedByName} on ${dateLabel} (${result.uncoveredStart}–${result.uncoveredEnd}). Schedule updated.`;

    const { whatsappLinks } = await notifyEntireTeam({
      type: "SCHEDULE_UPDATE",
      message: teamMessage,
      relatedId: result.coverage.id,
    });

    await notifyUser({
      userId: result.coverage.requestedByUserId,
      type: "SCHEDULE_UPDATE",
      message: `${user.name} accepted your coverage request.`,
      relatedId: result.coverage.id,
      whatsapp: false,
    });

    return NextResponse.json({
      coverage: result.coverage,
      coverShift: result.coverShift,
      whatsappLinks,
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    const message = e instanceof Error ? e.message : "Failed to accept";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
