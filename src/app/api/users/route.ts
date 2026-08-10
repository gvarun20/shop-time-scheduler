import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser, requireAdmin, AuthError, hashPin } from "@/lib/auth";
import { z } from "zod";

export async function GET() {
  try {
    await requireUser();
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        maxHoursPerWeek: true,
      },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ users });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error(e);
    return NextResponse.json({ error: "Failed to load users" }, { status: 500 });
  }
}

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  pin: z.string().min(4).max(8),
  role: z.enum(["ADMIN", "EMPLOYEE"]).optional(),
  maxHoursPerWeek: z.number().int().positive().optional(),
});

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = createSchema.parse(await req.json());
    const user = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email.toLowerCase(),
        phone: body.phone,
        pinHash: await hashPin(body.pin),
        role: body.role ?? "EMPLOYEE",
        maxHoursPerWeek: body.maxHoursPerWeek ?? 20,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        maxHoursPerWeek: true,
      },
    });
    return NextResponse.json({ user });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}
