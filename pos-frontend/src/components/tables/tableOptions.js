export const TABLE_STATUS_LABELS = {
  AVAILABLE: "Available",
  OCCUPIED: "Occupied",
  RESERVED: "Reserved",
  CLEANING: "Cleaning",
  OUT_OF_SERVICE: "Out of service",
};

export const TABLE_STATUS_TONES = {
  AVAILABLE: "is-available",
  OCCUPIED: "is-occupied",
  RESERVED: "is-reserved",
  CLEANING: "is-cleaning",
  OUT_OF_SERVICE: "is-out-of-service",
};

export const CLIMATE_LABELS = {
  AC: "AC",
  NON_AC: "Non-AC",
  OUTDOOR: "Outdoor",
};

export const EXPERIENCE_LABELS = {
  STANDARD: "Standard",
  VIP: "VIP",
  PRIVATE: "Private",
  BAR: "Bar",
};

export const SHAPE_LABELS = {
  SQUARE: "Square",
  ROUND: "Round",
  RECTANGLE: "Rectangle",
  BOOTH: "Booth",
};

export const getTableLabel = (table) => table.label || `Table ${table.tableNo}`;

export const getOrderTables = (order) => {
  const assigned = (order?.tableAssignments || [])
    .map((assignment) => assignment.table)
    .filter(Boolean);
  return assigned.length ? assigned : order?.table ? [order.table] : [];
};

export const getOrderTableLabel = (order, fallback = "Dine in") => {
  const labels = getOrderTables(order).map(getTableLabel);
  return labels.length ? labels.join(" + ") : fallback;
};

export const getEditableStatuses = (status) => {
  const transitions = {
    AVAILABLE: ["AVAILABLE", "RESERVED", "CLEANING", "OUT_OF_SERVICE"],
    RESERVED: ["RESERVED", "AVAILABLE", "CLEANING", "OUT_OF_SERVICE"],
    CLEANING: ["CLEANING", "AVAILABLE", "OUT_OF_SERVICE"],
    OUT_OF_SERVICE: ["OUT_OF_SERVICE", "AVAILABLE", "CLEANING"],
    OCCUPIED: ["OCCUPIED"],
  };
  return transitions[status] || [status];
};
