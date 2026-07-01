import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { enqueueSnackbar } from "notistack";
import {
  deleteDiningArea,
  deleteTable,
  getDiningAreas,
  getErrorMessage,
  getTables,
  updateTable,
} from "../../https";
import useRoleDashboard from "../../hooks/useRoleDashboard";
import useRole from "../../hooks/useRole";
import DiningAreaModal from "../tables/DiningAreaModal";
import TableFormModal from "../tables/TableFormModal";
import TableStatusBadge from "../tables/TableStatusBadge";
import {
  CLIMATE_LABELS,
  EXPERIENCE_LABELS,
  getTableLabel,
  SHAPE_LABELS,
} from "../tables/tableOptions";

const EmptyState = ({ title, description, action }) => (
  <div className="dashboard-table-empty">
    <div className="dashboard-table-empty-icon">⌑</div>
    <h3>{title}</h3>
    <p>{description}</p>
    {action}
  </div>
);

const TableManagement = () => {
  const queryClient = useQueryClient();
  const { canCreateTable, canUpdateTable, canDeleteTable } =
    useRoleDashboard();
  const { isOwner } = useRole();
  const [activeView, setActiveView] = useState("tables");
  const [editingTable, setEditingTable] = useState(null);
  const [editingArea, setEditingArea] = useState(null);
  const [showTableModal, setShowTableModal] = useState(false);
  const [showAreaModal, setShowAreaModal] = useState(false);

  const tablesQuery = useQuery({
    queryKey: ["tables", "management"],
    queryFn: () => getTables(),
  });
  const areasQuery = useQuery({
    queryKey: ["dining-areas"],
    queryFn: () => getDiningAreas(),
  });
  const tables = useMemo(
    () => tablesQuery.data?.data.data || [],
    [tablesQuery.data],
  );
  const areas = useMemo(
    () => areasQuery.data?.data.data || [],
    [areasQuery.data],
  );

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["tables"] });
    queryClient.invalidateQueries({ queryKey: ["dining-areas"] });
  };

  const quickStatusMutation = useMutation({
    mutationFn: updateTable,
    onSuccess: () => {
      refresh();
      enqueueSnackbar("Table status updated", { variant: "success" });
    },
    onError: (error) =>
      enqueueSnackbar(getErrorMessage(error), { variant: "error" }),
  });
  const archiveTableMutation = useMutation({
    mutationFn: deleteTable,
    onSuccess: () => {
      refresh();
      enqueueSnackbar("Table archived", { variant: "success" });
    },
    onError: (error) =>
      enqueueSnackbar(getErrorMessage(error), { variant: "error" }),
  });
  const archiveAreaMutation = useMutation({
    mutationFn: deleteDiningArea,
    onSuccess: () => {
      refresh();
      enqueueSnackbar("Dining area archived", { variant: "success" });
    },
    onError: (error) =>
      enqueueSnackbar(getErrorMessage(error), { variant: "error" }),
  });

  const openCreateTable = () => {
    setEditingTable(null);
    setShowTableModal(true);
  };
  const openEditTable = (table) => {
    setEditingTable(table);
    setShowTableModal(true);
  };
  const openCreateArea = () => {
    setEditingArea(null);
    setShowAreaModal(true);
  };
  const openEditArea = (area) => {
    setEditingArea(area);
    setShowAreaModal(true);
  };

  const isLoading = tablesQuery.isLoading || areasQuery.isLoading;
  const error = tablesQuery.error || areasQuery.error;

  return (
    <div className="dashboard-table-management container mx-auto">
      <section className="dashboard-table-management-header">
        <div>
          <p className="dashboard-eyebrow">Restaurant layout</p>
          <h2>Dining areas & tables</h2>
          <p>
            Organize service by AC, Non-AC, VIP, private rooms or any layout
            your restaurant uses.
          </p>
        </div>
        {canCreateTable && (
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={openCreateArea}
              className="dashboard-secondary-button px-4 py-3"
            >
              Add dining area
            </button>
            <button
              type="button"
              onClick={openCreateTable}
              className="dashboard-primary-button px-4 py-3"
            >
              Add table
            </button>
          </div>
        )}
      </section>

      <section className="dashboard-table-stats">
        <div>
          <span>Total tables</span>
          <strong>{tables.length}</strong>
        </div>
        <div>
          <span>Available</span>
          <strong>
            {tables.filter((table) => table.status === "AVAILABLE").length}
          </strong>
        </div>
        <div>
          <span>In service</span>
          <strong>
            {tables.filter((table) => table.status === "OCCUPIED").length}
          </strong>
        </div>
        <div>
          <span>Need attention</span>
          <strong>
            {
              tables.filter((table) =>
                ["CLEANING", "OUT_OF_SERVICE"].includes(table.status),
              ).length
            }
          </strong>
        </div>
      </section>

      <div className="dashboard-table-view-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeView === "tables"}
          className={activeView === "tables" ? "is-active" : ""}
          onClick={() => setActiveView("tables")}
        >
          Tables <span>{tables.length}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeView === "areas"}
          className={activeView === "areas" ? "is-active" : ""}
          onClick={() => setActiveView("areas")}
        >
          Dining areas <span>{areas.length}</span>
        </button>
      </div>

      {error && (
        <div className="dashboard-inline-error">
          {getErrorMessage(error, "Unable to load table configuration")}
        </div>
      )}

      {isLoading ? (
        <div className="dashboard-table-loading">
          Loading restaurant layout…
        </div>
      ) : activeView === "tables" ? (
        tables.length === 0 ? (
          <EmptyState
            title="No tables configured"
            description="Create your first table and assign it to a dining area."
            action={
              canCreateTable ? (
                <button
                  type="button"
                  onClick={openCreateTable}
                  className="dashboard-primary-button px-4 py-3"
                >
                  Add first table
                </button>
              ) : null
            }
          />
        ) : (
          <div className="dashboard-management-table-grid">
            {tables.map((table) => (
              <article
                key={table.id}
                className="dashboard-management-table-card"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="dashboard-table-card-kicker">
                      {table.area?.name || "Unassigned area"}
                    </p>
                    <h3>{getTableLabel(table)}</h3>
                  </div>
                  <TableStatusBadge status={table.status} />
                </div>

                <div className="dashboard-table-card-meta">
                  <span>
                    <b>
                      {table.minSeats}–{table.seats}
                    </b>{" "}
                    guests
                  </span>
                  <span>{SHAPE_LABELS[table.shape] || table.shape}</span>
                  {table.isCombinable && <span>Combinable</span>}
                  {table.combinationGroup && (
                    <span>Group {table.combinationGroup}</span>
                  )}
                </div>

                <div className="dashboard-table-order-summary">
                  {table.currentOrder ? (
                    <>
                      <div>
                        <span>Active order</span>
                        <strong>#{table.currentOrder.orderNo}</strong>
                      </div>
                      <div>
                        <span>Guest</span>
                        <strong>{table.currentOrder.customerName}</strong>
                      </div>
                    </>
                  ) : (
                    <p>No active order</p>
                  )}
                </div>

                {canUpdateTable && (
                  <div className="dashboard-table-card-actions">
                    {table.status === "CLEANING" && (
                      <button
                        type="button"
                        onClick={() =>
                          quickStatusMutation.mutate({
                            tableId: table.id,
                            status: "AVAILABLE",
                          })
                        }
                      >
                        Mark cleaned
                      </button>
                    )}
                    {table.status === "AVAILABLE" && (
                      <button
                        type="button"
                        onClick={() =>
                          quickStatusMutation.mutate({
                            tableId: table.id,
                            status: "RESERVED",
                          })
                        }
                      >
                        Reserve
                      </button>
                    )}
                    {table.status === "RESERVED" && (
                      <button
                        type="button"
                        onClick={() =>
                          quickStatusMutation.mutate({
                            tableId: table.id,
                            status: "AVAILABLE",
                          })
                        }
                      >
                        Release
                      </button>
                    )}
                    <button type="button" onClick={() => openEditTable(table)}>
                      Edit
                    </button>
                    {canDeleteTable && (
                      <button
                        type="button"
                        className="is-danger"
                        onClick={() => {
                          if (
                            window.confirm(
                              `Archive ${getTableLabel(table)}? Order history will be preserved.`,
                            )
                          ) {
                            archiveTableMutation.mutate(table.id);
                          }
                        }}
                      >
                        Archive
                      </button>
                    )}
                  </div>
                )}
              </article>
            ))}
          </div>
        )
      ) : areas.length === 0 ? (
        <EmptyState
          title="No dining areas configured"
          description="Add AC, Non-AC, VIP, rooftop or private dining areas."
          action={
            canCreateTable ? (
              <button
                type="button"
                onClick={openCreateArea}
                className="dashboard-primary-button px-4 py-3"
              >
                Add first area
              </button>
            ) : null
          }
        />
      ) : (
        <div className="dashboard-area-grid">
          {areas.map((area) => (
            <article key={area.id} className="dashboard-area-card">
              <div
                className="dashboard-area-colour"
                style={{ backgroundColor: area.color }}
              />
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p>{area.code}</p>
                  <h3>{area.name}</h3>
                </div>
                <strong>{area._count?.tables || 0} tables</strong>
              </div>
              <div className="dashboard-area-tags">
                <span>{CLIMATE_LABELS[area.climate]}</span>
                <span>{EXPERIENCE_LABELS[area.experience]}</span>
                {area.floor && <span>{area.floor}</span>}
              </div>
              {canUpdateTable && (
                <div className="dashboard-table-card-actions">
                  <button type="button" onClick={() => openEditArea(area)}>
                    Edit area
                  </button>
                  {isOwner && (
                    <button
                      type="button"
                      className="is-danger"
                      disabled={(area._count?.tables || 0) > 0}
                      title={
                        (area._count?.tables || 0) > 0
                          ? "Move or archive its tables first"
                          : undefined
                      }
                      onClick={() => {
                        if (window.confirm(`Archive ${area.name}?`)) {
                          archiveAreaMutation.mutate(area.id);
                        }
                      }}
                    >
                      Archive
                    </button>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      <TableFormModal
        isOpen={showTableModal}
        onClose={() => setShowTableModal(false)}
        table={editingTable}
      />
      <DiningAreaModal
        isOpen={showAreaModal}
        onClose={() => setShowAreaModal(false)}
        area={editingArea}
      />
    </div>
  );
};

export default TableManagement;
