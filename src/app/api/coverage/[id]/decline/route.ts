import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser, AuthError } from "@/lib/auth";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;

    const coverage = await prisma.coverageRequest.findUnique({ where: { id } });
    if (!coverage || coverage.status !== "OPEN") {
      return NextResponse.json({ error: "Not open" }, { status: 400 });
    }

    await prisma.coverageDecline.upsert({
      where: {
        coverageRequestId_userId: {
          coverageRequestId: id,
          userId: user.id,
        },
      },
      create: { coverageRequestId: id, userId: user.id },
      update: {},
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error(e);
    return NextResponse.json({ error: "Failed to decline" }, { status: 500 });
  }
}
