const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const prisma = require("../config/prisma");

const suffix = crypto.randomUUID();
let userId;
let restaurantId;

const cleanup = async () => {
  if (restaurantId) {
    await prisma.table.updateMany({
      where: { restaurantId },
      data: { currentOrderId: null, status: "AVAILABLE" },
    });
    await prisma.order.deleteMany({ where: { restaurantId } });
    await prisma.table.deleteMany({ where: { restaurantId } });
    await prisma.diningArea.deleteMany({ where: { restaurantId } });
    await prisma.user.updateMany({
      where: { restaurantId },
      data: { restaurantId: null },
    });
    await prisma.restaurant.deleteMany({ where: { id: restaurantId } });
  }
  if (userId) {
    await prisma.user.deleteMany({ where: { id: userId } });
  }
};

const run = async () => {
  const user = await prisma.user.create({
    data: {
      name: "Table Combination Check",
      email: `table-check-${suffix}@example.com`,
      role: "OWNER",
    },
  });
  userId = user.id;

  const restaurant = await prisma.restaurant.create({
    data: {
      name: "Table Combination Check",
      slug: `table-check-${suffix}`,
      address: "Temporary",
      city: "Temporary",
      phone: "9999999999",
      email: `restaurant-${suffix}@example.com`,
      ownerId: user.id,
      status: "APPROVED",
    },
  });
  restaurantId = restaurant.id;
  await prisma.user.update({
    where: { id: user.id },
    data: { restaurantId: restaurant.id },
  });

  const area = await prisma.diningArea.create({
    data: {
      restaurantId,
      name: "AC Main Hall",
      code: "MAIN",
      climate: "AC",
    },
  });
  const tables = await Promise.all(
    [1, 2].map((tableNo) =>
      prisma.table.create({
        data: {
          restaurantId,
          areaId: area.id,
          tableNo,
          label: `A-0${tableNo}`,
          seats: 4,
          isCombinable: true,
          combinationGroup: "MAIN-A",
        },
      }),
    ),
  );

  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        restaurantId,
        orderNo: 1,
        orderType: "DINE_IN",
        tableId: tables[0].id,
        customerName: "Six Guest Party",
        customerPhone: "9999999999",
        guests: 6,
        subtotal: 100,
        tax: 5,
        totalWithTax: 105,
        tableAssignments: {
          create: tables.map((table) => ({ tableId: table.id })),
        },
      },
      include: { tableAssignments: true },
    });
    const occupied = await tx.table.updateMany({
      where: {
        id: { in: tables.map((table) => table.id) },
        currentOrderId: null,
        status: "AVAILABLE",
      },
      data: { currentOrderId: created.id, status: "OCCUPIED" },
    });
    assert.equal(occupied.count, 2);
    return created;
  });

  assert.equal(order.tableAssignments.length, 2);
  const occupiedTables = await prisma.table.findMany({
    where: { restaurantId, currentOrderId: order.id, status: "OCCUPIED" },
  });
  assert.equal(occupiedTables.length, 2);

  await prisma.table.updateMany({
    where: { restaurantId, currentOrderId: order.id },
    data: { currentOrderId: null, status: "AVAILABLE" },
  });
  const availableTables = await prisma.table.count({
    where: { restaurantId, status: "AVAILABLE", currentOrderId: null },
  });
  assert.equal(availableTables, 2);

  console.log(
    "Table combination check passed: 2 tables -> 1 order -> 8 seats -> released together",
  );
};

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await cleanup();
    await prisma.$disconnect();
    process.exit(process.exitCode || 0);
  });
