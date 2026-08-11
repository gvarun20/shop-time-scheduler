import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin, AuthError } from "@/lib/auth";
import { getShopWhatsAppPhone } from "@/lib/whatsapp";

export async function GET() {
  try {
    await requireAdmin();
    const [messages, shopPhone, pendingCount] = await Promise.all([
      prisma.whatsAppMessage.findMany({
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
        take: 50,
      }),
      getShopWhatsAppPhone(),
      prisma.whatsAppMessage.count({ where: { status: "ready" } }),
    ]);
    return NextResponse.json({
      configured: true,
      free: true,
      shopPhone,
      pendingCount,
      messages,
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error(e);
    return NextResponse.json({ error: "Failed to load WhatsApp log" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    await requireAdmin();
    const body = (await req.json()) as { id?: string; ids?: string[] };
    const ids = body.ids || (body.id ? [body.id] : []);
    if (!ids.length) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }
    await prisma.whatsAppMessage.updateMany({
      where: { id: { in: ids } },
      data: { status: "opened" },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error(e);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
