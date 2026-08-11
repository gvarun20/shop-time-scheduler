import { NextResponse } from "next/server";
import { sendDueShiftReminders } from "@/lib/reminders";
import { whatsappConfigured } from "@/lib/whatsapp";

/**
 * Vercel Cron (Hobby: once daily) + manual trigger.
 * Reminders also run when the schedule is opened (see /api/shifts).
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await sendDueShiftReminders();
  return NextResponse.json({
    ok: true,
    ...result,
    whatsappReady: whatsappConfigured(),
  });
}
