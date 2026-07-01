import React from "react";
import { TABLE_STATUS_LABELS, TABLE_STATUS_TONES } from "./tableOptions";

const TableStatusBadge = ({ status }) => (
  <span
    className={`dashboard-status-pill ${
      TABLE_STATUS_TONES[status] || "is-out-of-service"
    }`}
  >
    {TABLE_STATUS_LABELS[status] || status}
  </span>
);

export default TableStatusBadge;
