import { PrismaClient } from "@prisma/client";
import { sendWhatsApp } from "../src/lib/whatsapp";

const prisma = new PrismaClient();

async function main() {
  await prisma.user.updateMany({
    where: { email: "employee1@shop.local" },
    data: { phone: "+46737540940" },
  });

  const row = await prisma.user.findFirst({
    where: { email: "employee1@shop.local" },
    select: { id: true, name: true, phone: true, email: true },
  });
  console.log("employee1:", row);

  if (row?.phone) {
    const result = await sendWhatsApp({
      toPhone: row.phone,
      toUserId: row.id,
      toName: row.name,
      body: "Ngroceries test: Hi Employee 1, WhatsApp alerts work with free wa.me links.",
    });
    console.log("whatsapp link:", result.link);
    console.log("status:", result.status);
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
