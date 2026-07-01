const express = require("express");
const { z } = require("zod");
const controller = require("../controllers/tableController");
const { requireTenant } = require("../middlewares/requireTenant");
const { requireRole } = require("../middlewares/requireRole");
const { validate } = require("../middlewares/validate");

const router = express.Router();

const optionalBooleanQuery = z.preprocess(
  (value) => value === "true",
  z.boolean().default(false),
);

const diningAreaInput = z.object({
  name: z.string().trim().min(2).max(80),
  code: z.string().trim().min(1).max(16),
  floor: z.string().trim().max(80).optional(),
  climate: z.enum(["AC", "NON_AC", "OUTDOOR"]).default("AC"),
  experience: z.enum(["STANDARD", "VIP", "PRIVATE", "BAR"]).default("STANDARD"),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Color must be a six-digit hex value")
    .default("#F6B100"),
  sortOrder: z.coerce.number().int().min(0).max(10000).default(0),
});

const tableCapacityInput = z
  .object({
    tableNo: z.coerce.number().int().min(1).max(10000),
    label: z.string().trim().min(1).max(24).optional(),
    areaId: z.string().trim().min(1).optional(),
    minSeats: z.coerce.number().int().min(1).max(100).default(1),
    seats: z.coerce.number().int().min(1).max(100).default(4),
    shape: z.enum(["SQUARE", "ROUND", "RECTANGLE", "BOOTH"]).default("SQUARE"),
    isCombinable: z.boolean().default(false),
    combinationGroup: z.string().trim().min(1).max(32).optional(),
  })
  .refine((data) => data.minSeats <= data.seats, {
    path: ["minSeats"],
    message: "Minimum seats cannot exceed maximum capacity",
  })
  .refine((data) => !data.isCombinable || Boolean(data.combinationGroup), {
    path: ["combinationGroup"],
    message: "A combination group is required for combinable tables",
  });

router.use(requireTenant);

router.get(
  "/areas",
  requireRole("OWNER", "MANAGER", "CASHIER", "WAITER"),
  validate(
    z.object({
      includeInactive: optionalBooleanQuery,
    }),
    "query",
  ),
  controller.getDiningAreas,
);
router.post(
  "/areas",
  requireRole("OWNER", "MANAGER"),
  validate(diningAreaInput),
  controller.addDiningArea,
);
router.put(
  "/areas/:id",
  requireRole("OWNER", "MANAGER"),
  validate(
    diningAreaInput.partial().extend({
      isActive: z.boolean().optional(),
    }),
  ),
  controller.updateDiningArea,
);
router.delete("/areas/:id", requireRole("OWNER"), controller.archiveDiningArea);

router.get(
  "/",
  requireRole("OWNER", "MANAGER", "CASHIER", "WAITER"),
  validate(
    z.object({
      includeInactive: optionalBooleanQuery,
      areaId: z.string().trim().min(1).optional(),
      status: z
        .enum([
          "AVAILABLE",
          "OCCUPIED",
          "RESERVED",
          "CLEANING",
          "OUT_OF_SERVICE",
        ])
        .optional(),
      minSeats: z.coerce.number().int().min(1).max(100).optional(),
    }),
    "query",
  ),
  controller.getTables,
);
router.post(
  "/",
  requireRole("OWNER", "MANAGER"),
  validate(tableCapacityInput),
  controller.addTable,
);
router.put(
  "/:id",
  requireRole("OWNER", "MANAGER"),
  validate(
    z
      .object({
        tableNo: z.coerce.number().int().min(1).max(10000).optional(),
        label: z.string().trim().min(1).max(24).optional(),
        areaId: z.string().trim().min(1).optional(),
        minSeats: z.coerce.number().int().min(1).max(100).optional(),
        seats: z.coerce.number().int().min(1).max(100).optional(),
        shape: z.enum(["SQUARE", "ROUND", "RECTANGLE", "BOOTH"]).optional(),
        isCombinable: z.boolean().optional(),
        combinationGroup: z.string().trim().min(1).max(32).nullable().optional(),
        status: z
          .enum(["AVAILABLE", "RESERVED", "CLEANING", "OUT_OF_SERVICE"])
          .optional(),
      })
      .refine(
        (data) =>
          data.minSeats === undefined ||
          data.seats === undefined ||
          data.minSeats <= data.seats,
        {
          path: ["minSeats"],
          message: "Minimum seats cannot exceed maximum capacity",
        },
      ),
  ),
  controller.updateTable,
);
router.delete("/:id", requireRole("OWNER"), controller.deleteTable);

module.exports = router;
