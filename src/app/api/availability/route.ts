import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser, AuthError } from "@/lib/auth";
import { parseDateKey, startOfDay } from "@/lib/time";

export async function GET(req: Request) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(req.url);
    const all = searchParams.get("all") === "1";
    const userId = searchParams.get("userId") || user.id;

    if (all) {
      if (user.role !== "ADMIN") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const employees = await prisma.user.findMany({
        where: { role: "EMPLOYEE" },
        select: {
          id: true,
          name: true,
          email: true,
          availabilities: {
            orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
          },
        },
        orderBy: { name: "asc" },
      });
      return NextResponse.json({ team: employees });
    }

    if (userId !== user.id && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const availabilities = await prisma.availability.findMany({
      where: { userId },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    });
    return NextResponse.json({ availabilities });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error(e);
    return NextResponse.json({ error: "Failed to load availability" }, { status: 500 });
  }
}

const createSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string(),
  endTime: z.string(),
  isRecurring: z.boolean().optional(),
  isException: z.boolean().optional(),
  specificDate: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = createSchema.parse(await req.json());

    const row = await prisma.availability.create({
      data: {
        userId: user.id,
        dayOfWeek: body.dayOfWeek,
        startTime: body.startTime,
        endTime: body.endTime,
        isRecurring: body.isRecurring ?? !body.isException,
        isException: body.isException ?? false,
        specificDate: body.specificDate
          ? startOfDay(parseDateKey(body.specificDate))
          : null,
      },
    });
    return NextResponse.json({ availability: row });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const row = await prisma.availability.findUnique({ where: { id } });
    if (!row || (row.userId !== user.id && user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    await prisma.availability.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error(e);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
