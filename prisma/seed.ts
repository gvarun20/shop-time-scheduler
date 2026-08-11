import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  await prisma.coverageDecline.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.coverageRequest.deleteMany();
  await prisma.shift.deleteMany();
  await prisma.availability.deleteMany();
  await prisma.storeHours.deleteMany();
  await prisma.shopSettings.deleteMany();
  await prisma.user.deleteMany();

  await prisma.shopSettings.create({
    data: {
      id: "default",
      shopName: "Ngroceries",
      coverageTimeoutMinutes: 20,
      autoAcceptCoverage: true,
    },
  });

  const hours = [
    { dayOfWeek: 0, openTime: "10:00", closeTime: "18:00", isClosed: false },
    { dayOfWeek: 1, openTime: "09:00", closeTime: "21:00", isClosed: false },
    { dayOfWeek: 2, openTime: "09:00", closeTime: "21:00", isClosed: false },
    { dayOfWeek: 3, openTime: "09:00", closeTime: "21:00", isClosed: false },
    { dayOfWeek: 4, openTime: "09:00", closeTime: "21:00", isClosed: false },
    { dayOfWeek: 5, openTime: "09:00", closeTime: "22:00", isClosed: false },
    { dayOfWeek: 6, openTime: "10:00", closeTime: "20:00", isClosed: false },
  ];
  await prisma.storeHours.createMany({ data: hours });

  const pin = await bcrypt.hash("1234", 10);

  const admin = await prisma.user.create({
    data: {
      name: "Manager",
      email: "manager@shop.local",
      phone: "+46722247856",
      pinHash: pin,
      role: "ADMIN",
      maxHoursPerWeek: 40,
    },
  });

  const [emp1, emp2, emp3] = await Promise.all([
    prisma.user.create({
      data: {
        name: "Employee 1",
        email: "employee1@shop.local",
        phone: "+46737540940",
        pinHash: pin,
        role: "EMPLOYEE",
        maxHoursPerWeek: 20,
      },
    }),
    prisma.user.create({
      data: {
        name: "Employee 2",
        email: "employee2@shop.local",
        phone: "+31610000003",
        pinHash: pin,
        role: "EMPLOYEE",
        maxHoursPerWeek: 20,
      },
    }),
    prisma.user.create({
      data: {
        name: "Employee 3",
        email: "employee3@shop.local",
        phone: "+31610000004",
        pinHash: pin,
        role: "EMPLOYEE",
        maxHoursPerWeek: 20,
      },
    }),
  ]);

  // Broad availability so managers can assign freely in demos
  const availRows = [emp1, emp2, emp3].flatMap((emp) =>
    [0, 1, 2, 3, 4, 5, 6].map((d) => ({
      userId: emp.id,
      dayOfWeek: d,
      startTime: "09:00",
      endTime: "22:00",
    })),
  );
  await prisma.availability.createMany({ data: availRows });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const shifts = [
    { date: today, startTime: "09:00", endTime: "14:00", assignedUserId: emp1.id, status: "CONFIRMED" as const },
    { date: today, startTime: "14:00", endTime: "21:00", assignedUserId: emp2.id, status: "CONFIRMED" as const },
    { date: tomorrow, startTime: "12:00", endTime: "18:00", assignedUserId: emp3.id, status: "CONFIRMED" as const },
    { date: tomorrow, startTime: "18:00", endTime: "21:00", assignedUserId: emp1.id, status: "CONFIRMED" as const },
  ];

  for (const s of shifts) {
    await prisma.shift.create({ data: s });
  }

  await prisma.notification.create({
    data: {
      userId: admin.id,
      type: "SCHEDULE_UPDATE",
      message: "Welcome. Demo PIN for all accounts: 1234",
    },
  });

  console.log("Seeded shop data.");
  console.log("Login examples (PIN 1234):");
  console.log("  manager@shop.local   (admin/manager)");
  console.log("  employee1@shop.local  (Employee 1)");
  console.log("  employee2@shop.local  (Employee 2)");
  console.log("  employee3@shop.local  (Employee 3)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
