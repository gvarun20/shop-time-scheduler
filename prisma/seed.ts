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
      shopName: "Corner Shop",
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
      name: "Alex Manager",
      email: "admin@shop.local",
      phone: "+15550001",
      pinHash: pin,
      role: "ADMIN",
      maxHoursPerWeek: 40,
    },
  });

  const [maya, jordan, sam, riley] = await Promise.all([
    prisma.user.create({
      data: {
        name: "Maya Chen",
        email: "maya@shop.local",
        phone: "+15550002",
        pinHash: pin,
        role: "EMPLOYEE",
        maxHoursPerWeek: 15,
      },
    }),
    prisma.user.create({
      data: {
        name: "Jordan Lee",
        email: "jordan@shop.local",
        phone: "+15550003",
        pinHash: pin,
        role: "EMPLOYEE",
        maxHoursPerWeek: 20,
      },
    }),
    prisma.user.create({
      data: {
        name: "Sam Ortiz",
        email: "sam@shop.local",
        phone: "+15550004",
        pinHash: pin,
        role: "EMPLOYEE",
        maxHoursPerWeek: 18,
      },
    }),
    prisma.user.create({
      data: {
        name: "Riley Brooks",
        email: "riley@shop.local",
        phone: "+15550005",
        pinHash: pin,
        role: "EMPLOYEE",
        maxHoursPerWeek: 12,
      },
    }),
  ]);

  // Recurring availability Mon–Fri afternoons / evenings
  const availRows = [
    ...[1, 2, 3, 4, 5].map((d) => ({
      userId: maya.id,
      dayOfWeek: d,
      startTime: "14:00",
      endTime: "21:00",
    })),
    ...[1, 2, 3, 4, 5, 6].map((d) => ({
      userId: jordan.id,
      dayOfWeek: d,
      startTime: "09:00",
      endTime: "17:00",
    })),
    ...[2, 3, 4, 5, 6].map((d) => ({
      userId: sam.id,
      dayOfWeek: d,
      startTime: "12:00",
      endTime: "22:00",
    })),
    ...[0, 5, 6].map((d) => ({
      userId: riley.id,
      dayOfWeek: d,
      startTime: "10:00",
      endTime: "20:00",
    })),
  ];
  await prisma.availability.createMany({ data: availRows });

  // Seed this week's shifts starting from today (or nearest Monday-ish)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const shifts = [
    { date: today, startTime: "09:00", endTime: "14:00", assignedUserId: jordan.id, status: "CONFIRMED" as const },
    { date: today, startTime: "14:00", endTime: "21:00", assignedUserId: maya.id, status: "CONFIRMED" as const },
  ];

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  shifts.push(
    { date: tomorrow, startTime: "12:00", endTime: "18:00", assignedUserId: sam.id, status: "CONFIRMED" as const },
    { date: tomorrow, startTime: "18:00", endTime: "21:00", assignedUserId: maya.id, status: "CONFIRMED" as const },
  );

  for (const s of shifts) {
    await prisma.shift.create({ data: s });
  }

  await prisma.notification.create({
    data: {
      userId: admin.id,
      type: "SCHEDULE_UPDATE",
      message: "Welcome to Shop Shift Scheduler. Demo PIN for all accounts: 1234",
    },
  });

  console.log("Seeded shop data.");
  console.log("Login examples (PIN 1234):");
  console.log("  admin@shop.local  (manager)");
  console.log("  maya@shop.local   (employee)");
  console.log("  jordan@shop.local (employee)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
