import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const updated = await prisma.user.updateMany({
    where: {
      OR: [{ email: "manager@shop.local" }, { role: "ADMIN" }],
    },
    data: { phone: "+46722247856" },
  });
  console.log("updated:", updated.count);

  const rows = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { name: true, email: true, phone: true, role: true },
  });
  console.log(rows);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
