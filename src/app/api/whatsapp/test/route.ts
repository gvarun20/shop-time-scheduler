import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin, AuthError } from "@/lib/auth";
import { sendWhatsApp } from "@/lib/whatsapp";

const schema = z.object({
  userId: z.string().optional(),
  phone: z.string().optional(),
  message: z.string().min(1).max(500).optional(),
});

/** Manager: prepare a free wa.me test link for a user/phone. */
export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = schema.parse(await req.json());

    let phone = body.phone || null;
    let userId = body.userId;
    let name = "recipient";

    if (body.userId) {
      const user = await prisma.user.findUnique({ where: { id: body.userId } });
      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
      phone = user.phone;
      name = user.name;
      userId = user.id;
    }

    if (!phone) {
      return NextResponse.json(
        { error: "No WhatsApp number on this user" },
        { status: 400 },
      );
    }

    const text =
      body.message ||
      `Ngroceries test: Hi ${name}, WhatsApp alerts are working (free wa.me link).`;

    const result = await sendWhatsApp({
      toPhone: phone,
      toUserId: userId,
      toName: name,
      body: text,
    });

    return NextResponse.json({
      ok: result.status === "ready",
      configured: true,
      free: true,
      message: result,
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "Failed to prepare WhatsApp link" }, { status: 500 });
  }
}
