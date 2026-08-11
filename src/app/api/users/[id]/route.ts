import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin, AuthError } from "@/lib/auth";

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await requireAdmin();
    const { id } = await ctx.params;

    if (id === admin.id) {
      return NextResponse.json({ error: "You cannot delete your own account" }, { status: 400 });
    }

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    if (target.role === "ADMIN") {
      return NextResponse.json(
        { error: "Managers cannot be deleted from here" },
        { status: 400 },
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.coverageDecline.deleteMany({ where: { userId: id } });
      await tx.notification.deleteMany({ where: { userId: id } });
      await tx.availability.deleteMany({ where: { userId: id } });
      await tx.coverageRequest.deleteMany({
        where: {
          OR: [{ requestedByUserId: id }, { filledByUserId: id }],
        },
      });
      await tx.shift.updateMany({
        where: { assignedUserId: id },
        data: { assignedUserId: null, status: "OPEN" },
      });
      await tx.user.delete({ where: { id } });
    });

    return NextResponse.json({ ok: true, deleted: { id: target.id, name: target.name } });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error(e);
    return NextResponse.json({ error: "Failed to delete employee" }, { status: 500 });
  }
}
