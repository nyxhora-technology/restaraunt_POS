import React from "react";
import TableStatusBadge from "./TableStatusBadge";
import {
  CLIMATE_LABELS,
  EXPERIENCE_LABELS,
  getTableLabel,
  SHAPE_LABELS,
  TABLE_STATUS_TONES,
} from "./tableOptions";

const TableCard = ({
  table,
  selected = false,
  disabled = false,
  disabledReason,
  onToggle,
}) => {
  const minSeats = table.minSeats ?? 1;
  const maxSeats = table.seats ?? 0;
  const area = table.area;
  const isAvailable = table.status === "AVAILABLE";
  const isSelectable = isAvailable && !disabled;

  const helperText = selected
    ? `${maxSeats} seats added`
    : disabledReason
      ? disabledReason
      : isAvailable
        ? `Fits ${minSeats}–${maxSeats} guests`
        : table.currentOrder
          ? `Order #${table.currentOrder.orderNo} · ${table.currentOrder.customerName}`
          : table.status === "CLEANING"
            ? "Waiting for cleaning"
            : "Not selectable";

  return (
    <button
      type="button"
      onClick={() => onToggle?.(table)}
      disabled={!isSelectable && !selected}
      className={`dashboard-live-table-card ${
        isSelectable ? "is-selectable" : "is-disabled"
      } ${selected ? "is-selected" : ""} ${
        TABLE_STATUS_TONES[table.status] || "is-out-of-service"
      }`}
      aria-pressed={selected}
      aria-label={`${getTableLabel(table)}, ${table.status}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="text-left">
          <p className="dashboard-table-card-kicker">
            {area?.name || "Main Dining"}
          </p>
          <h3>{getTableLabel(table)}</h3>
        </div>
        {selected ? (
          <span className="dashboard-selected-pill">Selected</span>
        ) : (
          <TableStatusBadge status={table.status} />
        )}
      </div>

      <div className="dashboard-live-table-visual" data-shape={table.shape}>
        <span>{maxSeats}</span>
        <small>seats</small>
      </div>

      <div className="dashboard-area-tags">
        {area && CLIMATE_LABELS[area.climate] && (
          <span>{CLIMATE_LABELS[area.climate]}</span>
        )}
        {area?.experience &&
          area.experience !== "STANDARD" &&
          EXPERIENCE_LABELS[area.experience] && (
            <span>{EXPERIENCE_LABELS[area.experience]}</span>
          )}
        {table.shape && <span>{SHAPE_LABELS[table.shape] || table.shape}</span>}
        {table.combinationGroup && <span>Group {table.combinationGroup}</span>}
      </div>

      <div className="dashboard-live-table-footer">
        <span>{helperText}</span>
        {isSelectable && <strong>{selected ? "Remove" : "Select"} →</strong>}
      </div>
    </button>
  );
};

export default TableCard;
