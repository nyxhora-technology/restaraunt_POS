const prisma = require("../config/prisma");

const writeAudit = async (req, action, resource, resourceId, metadata) => {
  try {
    await prisma.auditLog.create({
      data: {
        restaurantId: req.restaurantId || null,
        userId: req.user.id,
        action,
        resource,
        resourceId: resourceId || null,
        metadata,
        ipAddress: req.ip,
      },
    });
  } catch (error) {
    console.error("Audit log write failed:", error.message);
  }
};

module.exports = { writeAudit };
