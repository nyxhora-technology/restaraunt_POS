const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

async function main() {
  // Clear orphaned menuItemId references on InventoryItem
  const result = await p.$executeRawUnsafe(
    `UPDATE "InventoryItem" SET "menuItemId" = NULL WHERE "menuItemId" IS NOT NULL AND "menuItemId" NOT IN (SELECT id FROM "MenuItem")`
  );
  console.log("Cleaned orphaned menuItemId rows:", result);

  // Also clean restaurantId references
  const r2 = await p.$executeRawUnsafe(
    `UPDATE "InventoryAlert" SET "restaurantId" = (SELECT "restaurantId" FROM "InventoryItem" WHERE "InventoryItem".id = "InventoryAlert"."inventoryItemId") WHERE "restaurantId" IS NOT NULL`
  );
  console.log("Updated alert restaurantIds:", r2);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => p.$disconnect());
