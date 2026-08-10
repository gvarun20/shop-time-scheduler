import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser, requireAdmin, AuthError } from "@/lib/auth";

export async function GET() {
  try {
    await requireUser();
    const [settings, storeHours] = await Promise.all([
      prisma.shopSettings.findUnique({ where: { id: "default" } }),
      prisma.storeHours.findMany({ orderBy: { dayOfWeek: "asc" } }),
    ]);
    return NextResponse.json({ settings, storeHours });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error(e);
    return NextResponse.json({ error: "Failed to load settings" }, { status: 500 });
  }
}

const patchSchema = z.object({
  shopName: z.string().optional(),
  minShiftMinutes: z.number().int().optional(),
  maxShiftMinutes: z.number().int().optional(),
  minNoticeMinutes: z.number().int().optional(),
  maxHoursPerDay: z.number().int().optional(),
  maxHoursPerWeek: z.number().int().optional(),
  minGapMinutes: z.number().int().optional(),
  coverageTimeoutMinutes: z.number().int().optional(),
  autoAcceptCoverage: z.boolean().optional(),
  storeHours: z
    .array(
      z.object({
        dayOfWeek: z.number().int().min(0).max(6),
        openTime: z.string(),
        closeTime: z.string(),
        isClosed: z.boolean(),
      }),
    )
    .optional(),
});

export async function PATCH(req: Request) {
  try {
    await requireAdmin();
    const body = patchSchema.parse(await req.json());
    const { storeHours, ...settings } = body;

    const updated = await prisma.shopSettings.upsert({
      where: { id: "default" },
      create: { id: "default", ...settings },
      update: settings,
    });

    if (storeHours) {
      for (const h of storeHours) {
        await prisma.storeHours.upsert({
          where: { dayOfWeek: h.dayOfWeek },
          create: h,
          update: {
            openTime: h.openTime,
            closeTime: h.closeTime,
            isClosed: h.isClosed,
          },
        });
      }
    }

    const hours = await prisma.storeHours.findMany({ orderBy: { dayOfWeek: "asc" } });
    return NextResponse.json({ settings: updated, storeHours: hours });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
