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
import ReservationsPanel from "../components/tables/ReservationsPanel";
import {
  MdCalendarMonth,
  MdCheckCircleOutline,
  MdGroups,
  MdOutlineAccessTime,
  MdSearch,
  MdTableRestaurant,
} from "react-icons/md";

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
  const [view, setView] = useState("tables");
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
    // title set via Helmet
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
  const totalSeats = useMemo(
    () => tables.reduce((sum, table) => sum + Number(table.seats || 0), 0),
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
    const nextReservation = table.reservations?.[0];
    if (
      nextReservation &&
      new Date(nextReservation.reservedAt).getTime() <=
        Date.now() + 2 * 60 * 60 * 1000
    ) {
      return `Reserved at ${new Date(nextReservation.reservedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    }
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
    navigate("/app/menu", { state: { orderFlow: "ACTIVE" } });
  };

  return (
    <section
      className={`dashboard-shell theme-${theme} operations-page tables-workspace-page dashboard-live-tables-page`}
    >
      <header className="analytics-header operations-page-header dashboard-live-tables-header">
        <div>
          <p className="analytics-eyebrow">Dine-in service</p>
          <h1>Tables</h1>
          <p>
            {customerName && guests
              ? `Choose the best table for ${customerName} · ${guests} ${
                  guests === 1 ? "guest" : "guests"
                }`
              : "Live availability, reservations, and seating across every dining area."}
          </p>
        </div>
        <label className="operations-search dashboard-table-search">
          <MdSearch />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search table or area"
          />
        </label>
      </header>

      <section className="operations-summary-grid" aria-label="Table summary">
        {[
          {
            label: "Available",
            value: statusCounts.AVAILABLE || 0,
            note: "Ready for new guests",
            icon: MdCheckCircleOutline,
          },
          {
            label: "Occupied",
            value: statusCounts.OCCUPIED || 0,
            note: "Currently in service",
            icon: MdOutlineAccessTime,
          },
          {
            label: "Reserved",
            value: statusCounts.RESERVED || 0,
            note: "Held for upcoming guests",
            icon: MdCalendarMonth,
          },
          {
            label: "Total capacity",
            value: totalSeats,
            note: `${tables.length} configured ${tables.length === 1 ? "table" : "tables"}`,
            icon: MdGroups,
          },
        ].map(({ label, value, note, icon: Icon }) => (
          <article key={label}>
            <div>
              <span>{label}</span>
              <strong>{tablesQuery.isLoading ? "—" : value}</strong>
              <small>{note}</small>
            </div>
            <i>
              <Icon />
            </i>
          </article>
        ))}
      </section>

      <div
        className="table-workspace-switch"
        role="tablist"
        aria-label="Table workspace"
      >
        <button
          type="button"
          role="tab"
          aria-selected={view === "tables"}
          className={view === "tables" ? "is-active" : ""}
          onClick={() => setView("tables")}
        >
          <MdTableRestaurant /> Live tables
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={view === "reservations"}
          className={view === "reservations" ? "is-active" : ""}
          onClick={() => setView("reservations")}
        >
          <MdCalendarMonth /> Reservations
        </button>
      </div>

      {view === "reservations" ? (
        <ReservationsPanel tables={tables} />
      ) : (
        <>
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
                      {value === "ALL"
                        ? tables.length
                        : statusCounts[value] || 0}
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
              <div className="dashboard-table-empty-icon">
                <MdTableRestaurant />
              </div>
              <h3>
                {tables.length
                  ? "No tables match these filters"
                  : "No tables configured yet"}
              </h3>
              <p>
                {tables.length
                  ? "Clear a status, area or search filter to see more tables."
                  : "Create dining areas and tables in Admin Workspace before starting dine-in service."}
              </p>
              <button
                type="button"
                onClick={() => {
                  if (tables.length) {
                    setStatus("ALL");
                    setAreaId("ALL");
                    setSearch("");
                  } else {
                    navigate("/app/dashboard");
                  }
                }}
                className="dashboard-secondary-button px-4 py-3"
              >
                {tables.length ? "Clear filters" : "Open Admin Workspace"}
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
                  {selectedTables
                    .map((table) => getTableLabel(table))
                    .join(" + ")}
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
        </>
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
