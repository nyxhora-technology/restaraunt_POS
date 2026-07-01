const prisma = require("../config/prisma");

const email = process.argv[2]?.trim().toLowerCase();
if (!email) {
  console.error("Usage: npm run make-admin -- admin@example.com");
  process.exit(1);
}

prisma.user
  .update({
    where: { email },
    data: { role: "SUPER_ADMIN", restaurantId: null },
    select: { id: true, email: true, role: true },
  })
  .then((user) => console.log(`Updated ${user.email} to ${user.role}`))
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
