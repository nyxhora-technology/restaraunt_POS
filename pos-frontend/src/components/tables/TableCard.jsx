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
  const nextReservation = table.reservations?.[0];

  // Flag: table is technically available but has a reservation in < 2 hours
  const hasImminentReservation =
    isAvailable &&
    nextReservation &&
    new Date(nextReservation.reservedAt).getTime() <= Date.now() + 2 * 60 * 60 * 1000;

  const isSelectable = isAvailable && !disabled;

  const helperText = selected
    ? `${maxSeats} seats added`
    : disabledReason
      ? disabledReason
      : isAvailable
        ? hasImminentReservation
          ? `Reserved at ${new Date(nextReservation.reservedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} — select with caution`
          : nextReservation
            ? `Reserved ${new Date(nextReservation.reservedAt).toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`
            : `Fits ${minSeats}–${maxSeats} guests`
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
      } ${hasImminentReservation ? "ring-2 ring-orange-400 ring-offset-1 ring-offset-transparent" : ""}`}
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
        ) : hasImminentReservation ? (
          <span className="text-xs font-bold bg-orange-500/20 text-orange-300 border border-orange-500/30 rounded-full px-2 py-0.5 shrink-0">
            Reserved Soon
          </span>
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

