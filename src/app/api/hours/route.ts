import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin, AuthError } from "@/lib/auth";
import { durationHours, startOfDay } from "@/lib/time";

/** Manager: monthly hours worked per employee */
export async function GET(req: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month"); // YYYY-MM
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ error: "Use month=YYYY-MM" }, { status: 400 });
    }

    const [year, mon] = month.split("-").map(Number);
    const from = startOfDay(new Date(year, mon - 1, 1));
    const to = startOfDay(new Date(year, mon, 1));

    const employees = await prisma.user.findMany({
      where: { role: "EMPLOYEE" },
      select: { id: true, name: true, email: true, maxHoursPerWeek: true },
      orderBy: { name: "asc" },
    });

    const shifts = await prisma.shift.findMany({
      where: {
        date: { gte: from, lt: to },
        assignedUserId: { not: null },
        status: { in: ["CONFIRMED", "NEEDS_COVERAGE"] },
      },
      select: {
        assignedUserId: true,
        startTime: true,
        endTime: true,
        isOvertime: true,
        date: true,
      },
    });

    const byUser = new Map<
      string,
      { regularHours: number; overtimeHours: number; shiftCount: number }
    >();

    for (const emp of employees) {
      byUser.set(emp.id, { regularHours: 0, overtimeHours: 0, shiftCount: 0 });
    }

    for (const s of shifts) {
      if (!s.assignedUserId) continue;
      const row = byUser.get(s.assignedUserId);
      if (!row) continue;
      const hours = durationHours(s.startTime, s.endTime);
      if (hours <= 0) continue;
      row.shiftCount += 1;
      if (s.isOvertime) row.overtimeHours += hours;
      else row.regularHours += hours;
    }

    const report = employees.map((emp) => {
      const row = byUser.get(emp.id)!;
      const regularHours = Math.round(row.regularHours * 100) / 100;
      const overtimeHours = Math.round(row.overtimeHours * 100) / 100;
      return {
        userId: emp.id,
        name: emp.name,
        email: emp.email,
        shiftCount: row.shiftCount,
        regularHours,
        overtimeHours,
        totalHours: Math.round((regularHours + overtimeHours) * 100) / 100,
      };
    });

    const totals = report.reduce(
      (acc, r) => {
        acc.regularHours += r.regularHours;
        acc.overtimeHours += r.overtimeHours;
        acc.totalHours += r.totalHours;
        acc.shiftCount += r.shiftCount;
        return acc;
      },
      { regularHours: 0, overtimeHours: 0, totalHours: 0, shiftCount: 0 },
    );

    return NextResponse.json({
      month,
      from: from.toISOString(),
      to: to.toISOString(),
      report,
      totals: {
        regularHours: Math.round(totals.regularHours * 100) / 100,
        overtimeHours: Math.round(totals.overtimeHours * 100) / 100,
        totalHours: Math.round(totals.totalHours * 100) / 100,
        shiftCount: totals.shiftCount,
      },
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error(e);
    return NextResponse.json({ error: "Failed to load hours" }, { status: 500 });
  }
}
