import { PrismaClient } from "@prisma/client";
import { sendWhatsApp, whatsappConfigured } from "../src/lib/whatsapp";

const prisma = new PrismaClient();

async function main() {
  const updated = await prisma.user.updateMany({
    where: { email: "employee1@shop.local" },
    data: { phone: "+46737540940" },
  });
  console.log("updated rows:", updated.count);

  const row = await prisma.user.findFirst({
    where: { email: "employee1@shop.local" },
    select: { id: true, name: true, phone: true, email: true },
  });
  console.log("employee1:", row);
  console.log("twilio configured:", whatsappConfigured());

  if (row?.phone) {
    const result = await sendWhatsApp({
      toPhone: row.phone,
      toUserId: row.id,
      body: "Ngroceries test: Hi Employee 1, this is a WhatsApp alert test from the shift app.",
    });
    console.log("whatsapp result:", {
      status: result.status,
      error: result.error,
      toPhone: result.toPhone,
    });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
