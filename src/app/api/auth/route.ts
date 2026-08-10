import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createSession, destroySession, getSessionUser, verifyPin, AuthError } from "@/lib/auth";

const loginSchema = z.object({
  email: z.string().email(),
  pin: z.string().min(4).max(8),
});

export async function POST(req: Request) {
  try {
    const body = loginSchema.parse(await req.json());
    const user = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
    if (!user || !(await verifyPin(body.pin, user.pinHash))) {
      return NextResponse.json({ error: "Invalid email or PIN" }, { status: 401 });
    }
    await createSession(user);
    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}

export async function DELETE() {
  await destroySession();
  return NextResponse.json({ ok: true });
}

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ user: null });
    return NextResponse.json({ user });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ user: null });
    }
    throw e;
  }
}
