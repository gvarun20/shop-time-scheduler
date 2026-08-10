import { prisma } from "./db";
import {
  dayOfWeek,
  durationHours,
  overlaps,
  startOfDay,
  timeToMinutes,
} from "./time";

export type Candidate = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
};

/** Find employees who can cover an uncovered window on a given date. */
export async function findCoverageCandidates(opts: {
  date: Date;
  startTime: string;
  endTime: string;
  excludeUserId: string;
  coverageRequestId?: string;
}): Promise<Candidate[]> {
  const settings = await prisma.shopSettings.findUnique({ where: { id: "default" } });
  const maxDay = settings?.maxHoursPerDay ?? 8;
  const maxWeek = settings?.maxHoursPerWeek ?? 20;
  const minGap = settings?.minGapMinutes ?? 0;

  const day = startOfDay(opts.date);
  const dow = dayOfWeek(day);

  const weekStart = new Date(day);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const employees = await prisma.user.findMany({
    where: {
      role: "EMPLOYEE",
      id: { not: opts.excludeUserId },
    },
    include: {
      availabilities: true,
      shifts: {
        where: {
          date: { gte: weekStart, lt: weekEnd },
        },
      },
      declines: opts.coverageRequestId
        ? { where: { coverageRequestId: opts.coverageRequestId } }
        : false,
    },
  });

  const neededHours = durationHours(opts.startTime, opts.endTime);
  const candidates: Candidate[] = [];

  for (const emp of employees) {
    if (Array.isArray(emp.declines) && emp.declines.length > 0) continue;

    const exception = emp.availabilities.find(
      (a) =>
        a.isException &&
        a.specificDate &&
        startOfDay(a.specificDate).getTime() === day.getTime(),
    );
    if (exception) {
      // exception blocks = unavailable that day if times overlap or full-day block
      if (
        !exception.startTime ||
        overlaps(opts.startTime, opts.endTime, exception.startTime, exception.endTime)
      ) {
        continue;
      }
    }

    const recurring = emp.availabilities.filter(
      (a) => a.isRecurring && !a.isException && a.dayOfWeek === dow,
    );
    const available = recurring.some((a) => {
      const aStart = timeToMinutes(a.startTime);
      const aEnd = timeToMinutes(a.endTime);
      return (
        timeToMinutes(opts.startTime) >= aStart &&
        timeToMinutes(opts.endTime) <= aEnd
      );
    });
    if (!available) continue;

    const dayShifts = emp.shifts.filter(
      (s) => startOfDay(s.date).getTime() === day.getTime(),
    );
    if (
      dayShifts.some((s) =>
        overlaps(opts.startTime, opts.endTime, s.startTime, s.endTime),
      )
    ) {
      continue;
    }

    if (minGap > 0) {
      const gapOk = dayShifts.every((s) => {
        const gapBefore = timeToMinutes(opts.startTime) - timeToMinutes(s.endTime);
        const gapAfter = timeToMinutes(s.startTime) - timeToMinutes(opts.endTime);
        if (gapBefore >= 0) return gapBefore >= minGap;
        if (gapAfter >= 0) return gapAfter >= minGap;
        return false;
      });
      if (!gapOk && dayShifts.length > 0) continue;
    }

    const dayHours =
      dayShifts.reduce((sum, s) => sum + durationHours(s.startTime, s.endTime), 0) +
      neededHours;
    if (dayHours > maxDay) continue;

    const weekHours =
      emp.shifts.reduce((sum, s) => sum + durationHours(s.startTime, s.endTime), 0) +
      neededHours;
    const empCap = emp.maxHoursPerWeek || maxWeek;
    if (weekHours > Math.min(maxWeek, empCap)) continue;

    candidates.push({
      id: emp.id,
      name: emp.name,
      email: emp.email,
      phone: emp.phone,
    });
  }

  return candidates;
}

export async function validateShiftAssignment(opts: {
  userId: string;
  date: Date;
  startTime: string;
  endTime: string;
  excludeShiftId?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const settings = await prisma.shopSettings.findUnique({ where: { id: "default" } });
  const hours = await prisma.storeHours.findUnique({
    where: { dayOfWeek: dayOfWeek(opts.date) },
  });

  if (!hours || hours.isClosed) {
    return { ok: false, error: "Shop is closed that day" };
  }
  if (
    timeToMinutes(opts.startTime) < timeToMinutes(hours.openTime) ||
    timeToMinutes(opts.endTime) > timeToMinutes(hours.closeTime)
  ) {
    return { ok: false, error: "Shift must fall within store hours" };
  }

  const mins = timeToMinutes(opts.endTime) - timeToMinutes(opts.startTime);
  if (mins < (settings?.minShiftMinutes ?? 60)) {
    return { ok: false, error: "Shift is shorter than minimum length" };
  }
  if (mins > (settings?.maxShiftMinutes ?? 480)) {
    return { ok: false, error: "Shift exceeds maximum length" };
  }

  const day = startOfDay(opts.date);
  const overlapping = await prisma.shift.findFirst({
    where: {
      assignedUserId: opts.userId,
      date: day,
      id: opts.excludeShiftId ? { not: opts.excludeShiftId } : undefined,
    },
  });

  if (overlapping && overlaps(opts.startTime, opts.endTime, overlapping.startTime, overlapping.endTime)) {
    return { ok: false, error: "Employee is already booked for overlapping shift" };
  }

  const avail = await prisma.availability.findMany({
    where: {
      userId: opts.userId,
      OR: [
        { isRecurring: true, isException: false, dayOfWeek: dayOfWeek(day) },
        { isException: true, specificDate: day },
      ],
    },
  });

  const blocked = avail.some(
    (a) =>
      a.isException &&
      overlaps(opts.startTime, opts.endTime, a.startTime, a.endTime),
  );
  if (blocked) {
    return { ok: false, error: "Employee marked unavailable (exception)" };
  }

  const recurring = avail.filter((a) => a.isRecurring && !a.isException);
  if (recurring.length > 0) {
    const covered = recurring.some(
      (a) =>
        timeToMinutes(opts.startTime) >= timeToMinutes(a.startTime) &&
        timeToMinutes(opts.endTime) <= timeToMinutes(a.endTime),
    );
    if (!covered) {
      return {
        ok: false,
        error: "Warning: shift is outside employee's stated availability",
      };
    }
  }

  return { ok: true };
}
