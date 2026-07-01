const prisma = require("../config/prisma");
const createHttpError = require("http-errors");
const { writeAudit } = require("../utils/audit");
const { getIo } = require("../config/socket");

const emitMenu = (restaurantId) => {
  getIo().to(`restaurant:${restaurantId}`).emit("menu:updated");
};

const getMenu = async (req, res, next) => {
  try {
    const categories = await prisma.menuCategory.findMany({
      where: { restaurantId: req.restaurantId },
      include: {
        menuItems: {
          include: {
            variants: {
              orderBy: { sortOrder: "asc" }
            }
          },
          orderBy: { name: "asc" }
        }
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
    res.json({ success: true, data: categories });
  } catch (error) {
    next(error);
  }
};

const addCategory = async (req, res, next) => {
  try {
    const category = await prisma.menuCategory.create({
      data: { ...req.body, restaurantId: req.restaurantId },
    });
    await writeAudit(req, "MENU_CATEGORY_CREATED", "MenuCategory", category.id);
    emitMenu(req.restaurantId);
    res.status(201).json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
};

const updateCategory = async (req, res, next) => {
  try {
    const result = await prisma.menuCategory.updateMany({
      where: { id: req.params.id, restaurantId: req.restaurantId },
      data: req.body,
    });
    if (!result.count) throw createHttpError(404, "Category not found");
    await writeAudit(req, "MENU_CATEGORY_UPDATED", "MenuCategory", req.params.id, req.body);
    emitMenu(req.restaurantId);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

const deleteCategory = async (req, res, next) => {
  try {
    const category = await prisma.menuCategory.findFirst({
      where: { id: req.params.id, restaurantId: req.restaurantId },
      include: { _count: { select: { menuItems: true } } },
    });
    if (!category) throw createHttpError(404, "Category not found");
    if (category._count.menuItems) {
      throw createHttpError(409, "Delete or move the category's menu items first");
    }
    await prisma.menuCategory.delete({ where: { id: category.id } });
    await writeAudit(req, "MENU_CATEGORY_DELETED", "MenuCategory", category.id);
    emitMenu(req.restaurantId);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

const addMenuItem = async (req, res, next) => {
  try {
    const { variants, ...itemData } = req.body;
    const category = await prisma.menuCategory.findFirst({
      where: { id: itemData.categoryId, restaurantId: req.restaurantId },
    });
    if (!category) throw createHttpError(404, "Category not found");
    const item = await prisma.menuItem.create({
      data: {
        ...itemData,
        restaurantId: req.restaurantId,
        variants: variants && variants.length > 0 ? {
          create: variants
        } : undefined
      },
    });
    await writeAudit(req, "MENU_ITEM_CREATED", "MenuItem", item.id);
    emitMenu(req.restaurantId);
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
};

const updateMenuItem = async (req, res, next) => {
  try {
    const { variants, ...itemData } = req.body;
    const existingItem = await prisma.menuItem.findFirst({
      where: { id: req.params.id, restaurantId: req.restaurantId }
    });
    if (!existingItem) throw createHttpError(404, "Menu item not found");

    if (itemData.categoryId) {
      const category = await prisma.menuCategory.findFirst({
        where: { id: itemData.categoryId, restaurantId: req.restaurantId },
      });
      if (!category) throw createHttpError(404, "Category not found");
    }

    await prisma.menuItem.update({
      where: { id: req.params.id },
      data: {
        ...itemData,
        variants: variants ? {
          deleteMany: {},
          create: variants
        } : undefined
      },
    });

    await writeAudit(req, "MENU_ITEM_UPDATED", "MenuItem", req.params.id, req.body);
    emitMenu(req.restaurantId);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

const toggleMenuItem = async (req, res, next) => {
  try {
    const result = await prisma.menuItem.updateMany({
      where: { id: req.params.id, restaurantId: req.restaurantId },
      data: { available: req.body.available },
    });
    if (!result.count) throw createHttpError(404, "Menu item not found");
    await writeAudit(req, "MENU_ITEM_AVAILABILITY_CHANGED", "MenuItem", req.params.id, req.body);
    emitMenu(req.restaurantId);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

const deleteMenuItem = async (req, res, next) => {
  try {
    const result = await prisma.menuItem.deleteMany({
      where: {
        id: req.params.id,
        restaurantId: req.restaurantId,
        orderItems: { none: {} },
      },
    });
    if (!result.count) {
      throw createHttpError(409, "Menu item not found or is referenced by an order");
    }
    await writeAudit(req, "MENU_ITEM_DELETED", "MenuItem", req.params.id);
    emitMenu(req.restaurantId);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMenu,
  addCategory,
  updateCategory,
  deleteCategory,
  addMenuItem,
  updateMenuItem,
  toggleMenuItem,
  deleteMenuItem,
};
