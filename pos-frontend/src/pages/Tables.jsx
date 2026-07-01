import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { enqueueSnackbar } from "notistack";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { getDiningAreas, getErrorMessage, getTables } from "../https";
import CreateOrderModal from "../components/shared/CreateOrderModal";
import TableCard from "../components/tables/TableCard";
import useDashboardPreferences from "../hooks/useDashboardPreferences";
import {
  getTableLabel,
  TABLE_STATUS_LABELS,
  TABLE_STATUS_TONES,
} from "../components/tables/tableOptions";
import { removeCustomer, updateTables } from "../redux/slices/customerSlice";
import { removeAllItems } from "../redux/slices/cartSlice";

const statusFilters = [
  ["ALL", "All"],
  ["AVAILABLE", "Available"],
  ["OCCUPIED", "Occupied"],
  ["RESERVED", "Reserved"],
  ["CLEANING", "Cleaning"],
  ["OUT_OF_SERVICE", "Out of service"],
];

const Tables = () => {
  const [status, setStatus] = useState("ALL");
  const [areaId, setAreaId] = useState("ALL");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const dispatch = useDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  const guests = useSelector((state) => state.customer.guests);
  const customerName = useSelector((state) => state.customer.customerName);
  const { theme } = useDashboardPreferences();

  useEffect(() => {
    if (location.state?.orderFlow === "DETAILS_FIRST") return;
    if (location.state?.retainCart) return;
    dispatch(removeCustomer());
    dispatch(removeAllItems());
  }, [dispatch, location.state?.orderFlow, location.state?.retainCart]);

  useEffect(() => {
    document.title = "POS | Tables";
    document.documentElement.style.colorScheme = theme;
    return () => {
      document.documentElement.style.removeProperty("color-scheme");
    };
  }, [theme]);

  const tablesQuery = useQuery({
    queryKey: ["tables"],
    queryFn: () => getTables(),
  });
  const areasQuery = useQuery({
    queryKey: ["dining-areas"],
    queryFn: () => getDiningAreas(),
  });
  const error = tablesQuery.error || areasQuery.error;

  useEffect(() => {
    if (error) {
      enqueueSnackbar(getErrorMessage(error, "Unable to load tables"), {
        variant: "error",
      });
    }
  }, [error]);

  const tables = useMemo(
    () => tablesQuery.data?.data.data || [],
    [tablesQuery.data],
  );
  const areas = useMemo(
    () => areasQuery.data?.data.data || [],
    [areasQuery.data],
  );
  const visibleTables = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return tables.filter((table) => {
      if (status !== "ALL" && table.status !== status) return false;
      if (areaId !== "ALL" && table.areaId !== areaId) return false;
      if (!normalizedSearch) return true;
      return [table.label, table.tableNo, table.area?.name]
        .filter(Boolean)
        .some((value) =>
          String(value).toLowerCase().includes(normalizedSearch),
        );
    });
  }, [areaId, search, status, tables]);

  const statusCounts = useMemo(
    () =>
      Object.fromEntries(
        Object.keys(TABLE_STATUS_LABELS).map((key) => [
          key,
          tables.filter((table) => table.status === key).length,
        ]),
      ),
    [tables],
  );
  const selectedTables = useMemo(
    () =>
      selectedIds
        .map((id) => tables.find((table) => table.id === id))
        .filter(Boolean),
    [selectedIds, tables],
  );
  const selectedCapacity = selectedTables.reduce(
    (sum, table) => sum + table.seats,
    0,
  );
  const assignedTables = useMemo(
    () =>
      selectedTables.map((table) => ({
        tableId: table.id,
        tableNo: table.tableNo,
        label: getTableLabel(table),
        areaName: table.area?.name || null,
        seats: table.seats,
        minSeats: table.minSeats ?? 1,
      })),
    [selectedTables],
  );
  const hasEnoughCapacity =
    selectedTables.length > 0 &&
    selectedTables.every((table) => table.status === "AVAILABLE") &&
    (guests < 1 || selectedCapacity >= guests) &&
    (selectedTables.length > 1 ||
      guests < 1 ||
      guests >= (selectedTables[0]?.minSeats ?? 1));

  const getDisabledReason = (table) => {
    if (selectedIds.includes(table.id)) return null;
    if (table.status !== "AVAILABLE") return null;
    if (selectedTables.length >= 10) return "Maximum 10 tables";
    if (selectedTables.length === 0) {
      if (guests > table.seats && !table.combinationGroup) {
        return "Too small and not combinable";
      }
      if (guests > 0 && guests < (table.minSeats ?? 1)) {
        return `Minimum ${table.minSeats} guests`;
      }
      return null;
    }

    const anchor = selectedTables[0];
    if (
      !anchor.isCombinable ||
      !table.isCombinable ||
      !anchor.areaId ||
      table.areaId !== anchor.areaId ||
      !anchor.combinationGroup ||
      table.combinationGroup !== anchor.combinationGroup
    ) {
      return "Different combination group";
    }
    return null;
  };

  const toggleTable = (table) => {
    if (selectedIds.includes(table.id)) {
      setSelectedIds((current) => current.filter((id) => id !== table.id));
      return;
    }
    if (getDisabledReason(table)) return;
    setSelectedIds((current) => [...current, table.id]);
  };

  const continueOrderFlow = () => {
    if (!customerName) {
      setIsCustomerModalOpen(true);
      return;
    }
    if (!hasEnoughCapacity) return;
    dispatch(updateTables({ tables: assignedTables }));
    navigate("/menu", { state: { orderFlow: "ACTIVE" } });
  };

  return (
    <section
      className={`dashboard-shell theme-${theme} dashboard-live-tables-page`}
    >
      <header className="dashboard-live-tables-header">
        <div>
          <p className="dashboard-eyebrow">Dine-in service</p>
          <h1>Select a table</h1>
          <p>
            {customerName && guests
              ? `Choose the best table for ${customerName} · ${guests} ${
                  guests === 1 ? "guest" : "guests"
                }`
              : "Live availability across every dining area."}
          </p>
        </div>
        <label className="dashboard-table-search">
          <span>Search</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Table or area"
          />
        </label>
      </header>

      <div
        className="dashboard-table-status-legend"
        aria-label="Table status colours"
      >
        <strong>Status colours</strong>
        <div>
          {statusFilters.slice(1).map(([value, label]) => (
            <span key={value} className={TABLE_STATUS_TONES[value]}>
              <i />
              {label}
            </span>
          ))}
        </div>
      </div>

      <div className="dashboard-table-filter-panel">
        <div className="dashboard-table-filter-row">
          <span className="dashboard-filter-label">Status</span>
          <div className="dashboard-filter-scroll">
            {statusFilters.map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setStatus(value)}
                className={`dashboard-filter-chip ${
                  status === value ? "is-active" : ""
                }`}
              >
                {label}
                <span>
                  {value === "ALL" ? tables.length : statusCounts[value] || 0}
                </span>
              </button>
            ))}
          </div>
        </div>
        <div className="dashboard-table-filter-row">
          <span className="dashboard-filter-label">Area</span>
          <div className="dashboard-filter-scroll">
            <button
              type="button"
              onClick={() => setAreaId("ALL")}
              className={`dashboard-filter-chip ${
                areaId === "ALL" ? "is-active" : ""
              }`}
            >
              All areas
            </button>
            {areas.map((area) => (
              <button
                key={area.id}
                type="button"
                onClick={() => setAreaId(area.id)}
                className={`dashboard-filter-chip ${
                  areaId === area.id ? "is-active" : ""
                }`}
              >
                <i style={{ backgroundColor: area.color }} />
                {area.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="dashboard-live-table-results">
        <div className="flex items-center justify-between gap-4">
          <p>
            <strong>{visibleTables.length}</strong>{" "}
            {visibleTables.length === 1 ? "table" : "tables"}
          </p>
          {guests > 0 && (
            <span>Select one table or combine matching tables.</span>
          )}
        </div>
      </div>

      {tablesQuery.isLoading || areasQuery.isLoading ? (
        <div className="dashboard-table-loading">Loading live tables…</div>
      ) : visibleTables.length === 0 ? (
        <div className="dashboard-table-empty">
          <div className="dashboard-table-empty-icon">⌑</div>
          <h3>No tables match these filters</h3>
          <p>Clear a status, area or search filter to see more tables.</p>
          <button
            type="button"
            onClick={() => {
              setStatus("ALL");
              setAreaId("ALL");
              setSearch("");
            }}
            className="dashboard-secondary-button px-4 py-3"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="dashboard-live-table-grid">
          {visibleTables.map((table) => (
            <TableCard
              key={table.id}
              table={table}
              selected={selectedIds.includes(table.id)}
              disabled={Boolean(getDisabledReason(table))}
              disabledReason={getDisabledReason(table)}
              onToggle={toggleTable}
            />
          ))}
        </div>
      )}

      {selectedTables.length > 0 && (
        <div className="dashboard-table-selection-bar">
          <div>
            <strong>
              {selectedTables.map((table) => getTableLabel(table)).join(" + ")}
            </strong>
            <span>
              {selectedTables.length}{" "}
              {selectedTables.length === 1 ? "table" : "tables"} ·{" "}
              {customerName
                ? `${selectedCapacity} seats for ${guests} ${
                    guests === 1 ? "guest" : "guests"
                  }`
                : `${selectedCapacity} seats selected`}
            </span>
          </div>
          {customerName && !hasEnoughCapacity && (
            <p>
              {selectedCapacity < guests
                ? `Add ${guests - selectedCapacity} more seats from the same combination group.`
                : `This table requires at least ${selectedTables[0]?.minSeats} guests.`}
            </p>
          )}
          <button
            type="button"
            disabled={Boolean(customerName) && !hasEnoughCapacity}
            onClick={continueOrderFlow}
            className="dashboard-primary-button disabled:opacity-50"
          >
            {customerName ? "Continue to menu" : "Add customer details"}
          </button>
        </div>
      )}

      <CreateOrderModal
        isOpen={isCustomerModalOpen}
        onClose={() => {
          setIsCustomerModalOpen(false);
          setSelectedIds([]);
        }}
        dashboardVariant
        entryMode="TABLE_FIRST"
        initialTables={assignedTables}
      />
    </section>
  );
};

export default Tables;
