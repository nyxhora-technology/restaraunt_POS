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
  dense = false,
}) => {
  const minSeats = table.minSeats ?? 1;
  const maxSeats = table.seats ?? 0;
  const area = table.area;
  const isAvailable = table.status === "AVAILABLE";
  const nextReservation = table.reservations?.[0];

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
          ? `Reserved at ${new Date(nextReservation.reservedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
          : nextReservation
            ? `Reserved ${new Date(nextReservation.reservedAt).toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`
            : `Fits ${minSeats}–${maxSeats} guests`
        : table.currentOrder
          ? `Order #${table.currentOrder.orderNo} · ${table.currentOrder.customerName}`
          : table.status === "CLEANING"
            ? "Waiting for cleaning"
            : "Not selectable";

  const tags = [];
  if (area && CLIMATE_LABELS[area.climate]) tags.push(CLIMATE_LABELS[area.climate]);
  if (area?.experience && area.experience !== "STANDARD" && EXPERIENCE_LABELS[area.experience]) {
    tags.push(EXPERIENCE_LABELS[area.experience]);
  }
  if (table.shape) tags.push(SHAPE_LABELS[table.shape] || table.shape);
  if (table.combinationGroup) tags.push(`Group ${table.combinationGroup}`);

  if (dense) {
    return (
      <button
        type="button"
        onClick={() => onToggle?.(table)}
        disabled={!isSelectable && !selected}
        className={`dashboard-live-table-card is-dense ${
          isSelectable ? "is-selectable" : "is-disabled"
        } ${selected ? "is-selected" : ""} ${
          TABLE_STATUS_TONES[table.status] || "is-out-of-service"
        } ${hasImminentReservation ? "has-imminent" : ""}`}
        aria-pressed={selected}
        aria-label={`${getTableLabel(table)}, ${table.status}`}
      >
        <span className={`dense-status-dot ${TABLE_STATUS_TONES[table.status] || "is-out-of-service"}`} />
        <span className="dense-table-name">{getTableLabel(table)}</span>
        <span className="dense-seats">{maxSeats} seats</span>
        {tags.length > 0 && (
          <span className="dense-tags">{tags.slice(0, 2).join(" · ")}</span>
        )}
        <span className="dense-helper">{helperText}</span>
        {isSelectable && (
          <span className="dense-action">{selected ? "Remove" : "Select"}</span>
        )}
        {selected && <span className="dense-selected-indicator" />}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onToggle?.(table)}
      disabled={!isSelectable && !selected}
      className={`dashboard-live-table-card ${
        isSelectable ? "is-selectable" : "is-disabled"
      } ${selected ? "is-selected" : ""} ${
        TABLE_STATUS_TONES[table.status] || "is-out-of-service"
      } ${hasImminentReservation ? "has-imminent" : ""}`}
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

      {tags.length > 0 && (
        <div className="dashboard-area-tags">
          {tags.map((tag, i) => (
            <span key={i}>{tag}</span>
          ))}
        </div>
      )}

      <div className="dashboard-live-table-footer">
        <span>{helperText}</span>
        {isSelectable && <strong>{selected ? "Remove" : "Select"} →</strong>}
      </div>
    </button>
  );
};

export default TableCard;
