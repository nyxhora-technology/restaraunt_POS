const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const prisma = require("../config/prisma");
const config = require("../config/config");

const email = `smoke-${crypto.randomUUID()}@example.com`;
const waiterEmail = `smoke-waiter-${crypto.randomUUID()}@example.com`;
const adminEmail = `smoke-admin-${crypto.randomUUID()}@example.com`;
let cookie = "";
let userId;
let waiterId;
let adminId;
let restaurantId;

const request = async (path, options = {}) => {
  const response = await fetch(`${config.backendUrl}${path}`, {
    signal: AbortSignal.timeout(15000),
    ...options,
    headers: {
      "content-type": "application/json",
      origin: config.frontendUrl,
      ...(cookie && { cookie }),
      ...options.headers,
    },
  });
  const setCookies = response.headers.getSetCookie?.() || [];
  if (setCookies.length) {
    cookie = setCookies.map((value) => value.split(";")[0]).join("; ");
  }
  const body = await response.json();
  if (!response.ok) {
    throw new Error(
      `${options.method || "GET"} ${path}: ${response.status} ${body.message}`,
    );
  }
  return body;
};

const cleanup = async () => {
  if (restaurantId) {
    await prisma.table.updateMany({
      where: { restaurantId },
      data: { currentOrderId: null, status: "AVAILABLE" },
    });
    await prisma.payment.deleteMany({ where: { restaurantId } });
    await prisma.order.deleteMany({ where: { restaurantId } });
    await prisma.table.deleteMany({ where: { restaurantId } });
    await prisma.diningArea.deleteMany({ where: { restaurantId } });
    await prisma.menuItem.deleteMany({ where: { restaurantId } });
    await prisma.menuCategory.deleteMany({ where: { restaurantId } });
    await prisma.auditLog.deleteMany({ where: { restaurantId } });
    if (userId || waiterId) {
      await prisma.user.updateMany({
        where: { id: { in: [userId, waiterId].filter(Boolean) } },
        data: { restaurantId: null },
      });
    }
    await prisma.restaurant.deleteMany({ where: { id: restaurantId } });
  }
  if (userId || waiterId || adminId) {
    await prisma.user.deleteMany({
      where: { id: { in: [userId, waiterId, adminId].filter(Boolean) } },
    });
  }
};

const run = async () => {
  const signUp = await request("/api/auth/sign-up/email", {
    method: "POST",
    body: JSON.stringify({
      name: "Smoke Test Owner",
      email,
      phone: "9999999999",
      password: "SmokeTest1!",
    }),
  });
  userId = signUp.user.id;

  const context = await request("/api/restaurant/context");
  assert.equal(context.data.email, email);
  assert.equal(context.data.role, "CASHIER");

  const registration = await request("/api/restaurant/register", {
    method: "POST",
    body: JSON.stringify({
      name: "Smoke Test Restaurant",
      address: "1 Test Street",
      city: "Test City",
      phone: "9999999999",
      email,
      description: "Temporary integration test tenant",
    }),
  });
  restaurantId = registration.data.id;
  await prisma.restaurant.update({
    where: { id: restaurantId },
    data: { status: "APPROVED" },
  });
  console.log("Smoke: tenant approved");

  const category = await request("/api/menu/category", {
    method: "POST",
    body: JSON.stringify({ name: "Mains" }),
  });
  const menuItem = await request("/api/menu/item", {
    method: "POST",
    body: JSON.stringify({
      name: "Test Meal",
      price: 100,
      categoryId: category.data.id,
      isVeg: true,
    }),
  });
  const qrCode = await request("/api/qr", {
    method: "POST",
    body: JSON.stringify({ label: "General Menu" }),
  });
  const publicMenu = await request(`/api/qr/public/${qrCode.data.slug}`);
  assert.equal(publicMenu.data.capabilities.ordering, false);
  assert.equal(publicMenu.data.restaurant.name, "Smoke Test Restaurant");
  assert.equal(publicMenu.data.restaurant.id, undefined);
  assert.equal(publicMenu.data.restaurant.plan, "STARTER");
  assert.equal(publicMenu.data.restaurant.status, undefined);
  assert.equal(publicMenu.data.categories[0].menuItems[0].name, "Test Meal");
  console.log("Smoke: public QR is a read-only menu payload");

  const diningArea = await request("/api/table/areas", {
    method: "POST",
    body: JSON.stringify({
      name: "AC Main Hall",
      code: "MAIN",
      floor: "Ground Floor",
      climate: "AC",
      experience: "STANDARD",
    }),
  });
  const table = await request("/api/table", {
    method: "POST",
    body: JSON.stringify({
      tableNo: 1,
      label: "A-01",
      areaId: diningArea.data.id,
      minSeats: 1,
      seats: 4,
      shape: "SQUARE",
      isCombinable: true,
      combinationGroup: "MAIN-A",
    }),
  });
  const secondTable = await request("/api/table", {
    method: "POST",
    body: JSON.stringify({
      tableNo: 2,
      label: "A-02",
      areaId: diningArea.data.id,
      minSeats: 1,
      seats: 4,
      shape: "SQUARE",
      isCombinable: true,
      combinationGroup: "MAIN-A",
    }),
  });
  const order = await request("/api/order", {
    method: "POST",
    body: JSON.stringify({
      tableIds: [table.data.id, secondTable.data.id],
      customerName: "Test Customer",
      customerPhone: "9999999999",
      guests: 6,
      items: [{ menuItemId: menuItem.data.id, quantity: 2 }],
    }),
  });
  assert.equal(Number(order.data.subtotal), 200);
  assert.equal(Number(order.data.totalWithTax), 210);
  assert.equal(order.data.tableAssignments.length, 2);

  for (const orderStatus of ["ACCEPTED", "PREPARING", "READY", "SERVED"]) {
    await request(`/api/order/${order.data.id}/status`, {
      method: "PUT",
      body: JSON.stringify({ orderStatus }),
    });
  }
  await request(`/api/payment/cash/${order.data.id}`, { method: "POST" });

  const completed = await request(`/api/order/${order.data.id}`);
  assert.equal(completed.data.orderStatus, "COMPLETED");
  assert.equal(completed.data.paymentStatus, "PAID");
  assert.equal(completed.data.payment.method, "CASH");
  const tables = await request("/api/table");
  assert.equal(tables.data[0].status, "AVAILABLE");
  assert.equal(tables.data[1].status, "AVAILABLE");
  assert.equal(tables.data[0].currentOrderId, null);
  assert.equal(tables.data[1].currentOrderId, null);
  assert.equal(tables.data[0].area.name, "AC Main Hall");
  console.log(
    "Smoke: dining area, table, dine-in and automatic release passed",
  );

  const invitation = await request("/api/restaurant/staff/invite", {
    method: "POST",
    body: JSON.stringify({
      name: "Smoke Test Waiter",
      email: waiterEmail,
      phone: "8888888888",
      role: "WAITER",
    }),
  });
  waiterId = invitation.data.id;
  const ownerCookie = cookie;
  await request("/api/auth/sign-in/email", {
    method: "POST",
    body: JSON.stringify({
      email: waiterEmail,
      password: invitation.temporaryPassword,
    }),
  });
  const waiterContext = await request("/api/restaurant/context");
  assert.equal(waiterContext.data.role, "WAITER");
  await request("/api/auth/change-password", {
    method: "POST",
    body: JSON.stringify({
      currentPassword: invitation.temporaryPassword,
      newPassword: "ChangedSmoke1!",
      revokeOtherSessions: true,
    }),
  });
  console.log("Smoke: waiter access passed");

  const takeaway = await request("/api/order", {
    method: "POST",
    body: JSON.stringify({
      orderType: "TAKEAWAY",
      customerName: "Takeaway Customer",
      customerPhone: "8888888888",
      guests: 1,
      items: [{ menuItemId: menuItem.data.id, quantity: 1 }],
    }),
  });
  assert.equal(takeaway.data.orderType, "TAKEAWAY");
  assert.equal(takeaway.data.tableId, null);

  const waiterUpdatedOrder = await request(
    `/api/order/${takeaway.data.id}/items`,
    {
      method: "PUT",
      body: JSON.stringify({
        items: [{ menuItemId: menuItem.data.id, quantity: 2 }],
      }),
    },
  );
  assert.equal(waiterUpdatedOrder.data.items[0].quantity, 2);
  assert.equal(Number(waiterUpdatedOrder.data.subtotal), 200);
  console.log("Smoke: waiter order creation and item update passed");

  cookie = ownerCookie;
  for (const orderStatus of ["ACCEPTED", "PREPARING", "READY"]) {
    await request(`/api/order/${takeaway.data.id}/status`, {
      method: "PUT",
      body: JSON.stringify({ orderStatus }),
    });
  }
  await request(`/api/payment/cash/${takeaway.data.id}`, { method: "POST" });
  const completedTakeaway = await request(`/api/order/${takeaway.data.id}`);
  assert.equal(completedTakeaway.data.orderStatus, "COMPLETED");
  assert.equal(completedTakeaway.data.paymentStatus, "PAID");
  console.log("Smoke: takeaway flow passed");

  const adminSignup = await request("/api/auth/sign-up/email", {
    method: "POST",
    body: JSON.stringify({
      name: "Smoke Platform Admin",
      email: adminEmail,
      password: "SmokeAdmin1!",
    }),
  });
  adminId = adminSignup.user.id;
  await prisma.user.update({
    where: { id: adminId },
    data: { role: "SUPER_ADMIN", restaurantId: null },
  });
  const adminStats = await request("/api/admin/stats");
  assert.ok(adminStats.data.users >= 3);
  const adminRestaurants = await request("/api/admin/restaurants");
  assert.ok(
    adminRestaurants.data.some((restaurant) => restaurant.id === restaurantId),
  );
  const adminRestaurant = await request(
    `/api/admin/restaurants/${restaurantId}`,
  );
  assert.equal(adminRestaurant.data.owner.email, email);
  assert.ok(Array.isArray(adminRestaurant.data.staff));
  await request(`/api/admin/restaurants/${restaurantId}/status`, {
    method: "PUT",
    body: JSON.stringify({ status: "SUSPENDED" }),
  });
  await request(`/api/admin/restaurants/${restaurantId}/status`, {
    method: "PUT",
    body: JSON.stringify({ status: "APPROVED" }),
  });
  const adminUsers = await request("/api/admin/users");
  assert.ok(adminUsers.data.some((user) => user.id === adminId));

  console.log(
    "Smoke test passed: tenant POS -> waiter -> takeaway -> payment -> superadmin detail/status",
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
