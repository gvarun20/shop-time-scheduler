import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin, AuthError } from "@/lib/auth";
import { whatsappConfigured } from "@/lib/whatsapp";

export async function GET() {
  try {
    await requireAdmin();
    const messages = await prisma.whatsAppMessage.findMany({
      orderBy: { createdAt: "desc" },
      take: 40,
    });
    return NextResponse.json({
      configured: whatsappConfigured(),
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
