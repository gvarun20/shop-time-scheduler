import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin, AuthError } from "@/lib/auth";
import { normalizePhone } from "@/lib/whatsapp";

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().nullable().optional(),
  email: z.string().email().optional(),
});

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await ctx.params;
    const body = patchSchema.parse(await req.json());

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const phone =
      body.phone === undefined
        ? undefined
        : body.phone === null || body.phone.trim() === ""
          ? null
          : normalizePhone(body.phone);

    if (body.phone !== undefined && body.phone && !phone) {
      return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(body.name ? { name: body.name } : {}),
        ...(body.email ? { email: body.email.toLowerCase() } : {}),
        ...(body.phone !== undefined ? { phone } : {}),
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
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}

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
