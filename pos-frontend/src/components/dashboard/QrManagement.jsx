import React, { useEffect, useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { enqueueSnackbar } from "notistack";
import {
  MdAdd,
  MdDelete,
  MdDownload,
  MdQrCode,
  MdToggleOff,
  MdToggleOn,
} from "react-icons/md";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import {
  getQrCodes,
  createQrCode,
  updateQrCode,
  deleteQrCode,
  getTables,
  getErrorMessage,
} from "../../https";
import useFeature from "../../hooks/useFeature";
import UpgradeBanner from "../shared/UpgradeBanner";

dayjs.extend(relativeTime);

const FRONTEND_BASE = window.location.origin;

const QrCodeCard = ({ qr, onToggle, onDelete }) => {
  const svgRef = useRef(null);
  const qrUrl = `${FRONTEND_BASE}/qr/${qr.slug}`;

  const downloadQR = () => {
    const svgEl = svgRef.current?.querySelector("svg");
    if (!svgEl) return;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const img = new Image();
    const svgBlob = new Blob([svgData], {
      type: "image/svg+xml;charset=utf-8",
    });
    const url = URL.createObjectURL(svgBlob);
    img.onload = () => {
      canvas.width = 400;
      canvas.height = 400;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, 400, 400);
      ctx.drawImage(img, 50, 50, 300, 300);
      URL.revokeObjectURL(url);
      const link = document.createElement("a");
      link.download = `qr-${qr.slug}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    };
    img.src = url;
  };

  return (
    <div className="dashboard-management-row rounded-xl p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-bold text-white text-lg">{qr.label}</h3>
          {qr.table && (
            <span className="text-xs bg-[#285430]/50 text-[#02ca3a] px-2 py-1 rounded mt-1 inline-block">
              {qr.table.label || `Table ${qr.table.tableNo}`}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onToggle(qr)}
            title={qr.enabled ? "Disable QR" : "Enable QR"}
            className={`text-2xl ${qr.enabled ? "text-[#02ca3a]" : "text-[#ababab]"}`}
          >
            {qr.enabled ? <MdToggleOn /> : <MdToggleOff />}
          </button>
          <button
            onClick={() => {
              if (window.confirm(`Delete QR code "${qr.label}"?`))
                onDelete(qr.id);
            }}
            className="text-red-400 hover:text-red-300 p-1"
          >
            <MdDelete size={18} />
          </button>
        </div>
      </div>

      {/* QR code display */}
      <div
        ref={svgRef}
        className={`flex justify-center p-4 rounded-lg bg-white ${!qr.enabled ? "opacity-40 grayscale" : ""}`}
      >
        <QRCodeSVG
          value={qrUrl}
          size={160}
          level="H"
          includeMargin={false}
          imageSettings={{
            src: "",
            height: 0,
            width: 0,
            excavate: false,
          }}
        />
      </div>

      {/* URL */}
      <div className="bg-[var(--dash-surface-muted)] px-3 py-2 rounded text-xs text-[var(--dash-muted)] truncate font-mono">
        {qrUrl}
      </div>

      {/* Stats row */}
      <div className="flex justify-between items-center text-xs text-[#6b7280]">
        <span>👁 {qr.scanCount} scans</span>
        <span>Created {dayjs(qr.createdAt).fromNow()}</span>
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-auto">
        <button
          onClick={downloadQR}
          className="dashboard-secondary-button flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm transition-colors"
        >
          <MdDownload size={16} /> Download PNG
        </button>
        <button
          onClick={() => {
            navigator.clipboard.writeText(qrUrl);
            enqueueSnackbar("URL copied!", { variant: "success" });
          }}
          className="dashboard-secondary-button flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm transition-colors"
        >
          Copy URL
        </button>
      </div>
    </div>
  );
};

const QrManagement = () => {
  const { hasQrMenu } = useFeature();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newTableId, setNewTableId] = useState("");

  const closeCreateModal = () => {
    setShowModal(false);
    setNewLabel("");
    setNewTableId("");
  };

  useEffect(() => {
    if (!showModal) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") closeCreateModal();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [showModal]);

  const { data, isLoading } = useQuery({
    queryKey: ["qr-codes"],
    queryFn: getQrCodes,
    enabled: hasQrMenu,
  });
  const { data: tablesData } = useQuery({
    queryKey: ["tables"],
    queryFn: () => getTables(),
    enabled: hasQrMenu,
  });

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["qr-codes"] });

  const createMutation = useMutation({
    mutationFn: createQrCode,
    onSuccess: () => {
      refresh();
      setShowModal(false);
      setNewLabel("");
      setNewTableId("");
      enqueueSnackbar("QR code created!", { variant: "success" });
    },
    onError: (e) => enqueueSnackbar(getErrorMessage(e), { variant: "error" }),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }) => updateQrCode({ id, enabled: !enabled }),
    onSuccess: refresh,
    onError: (e) => enqueueSnackbar(getErrorMessage(e), { variant: "error" }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteQrCode,
    onSuccess: () => {
      refresh();
      enqueueSnackbar("QR code deleted", { variant: "info" });
    },
    onError: (e) => enqueueSnackbar(getErrorMessage(e), { variant: "error" }),
  });

  const codes = data?.data.data || [];
  const tables = tablesData?.data.data || [];

  if (!hasQrMenu) return <UpgradeBanner feature="QR_MENU" />;
  const activeCount = codes.filter((c) => c.enabled).length;

  return (
    <div className="dashboard-management-panel container mx-auto p-5">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold">QR Menu Codes</h2>
          <p className="text-sm text-[var(--dash-muted)] mt-1">
            Generate browse-only digital menus. Guests view dishes and prices;
            staff place all orders in the POS.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-[#02ca3a] text-gray-900 font-bold px-5 py-2.5 rounded-lg hover:bg-[#02a830] transition-colors"
        >
          <MdAdd size={20} /> Generate QR
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="dashboard-inventory-stat">
          <h3>Total QR Codes</h3>
          <p className="text-2xl font-bold text-white mt-1">{codes.length}</p>
        </div>
        <div className="dashboard-inventory-stat">
          <h3>Active</h3>
          <p className="text-2xl font-bold text-[#02ca3a] mt-1">
            {activeCount}
          </p>
        </div>
        <div className="dashboard-inventory-stat">
          <h3>Total Scans</h3>
          <p className="text-2xl font-bold text-white mt-1">
            {codes.reduce((s, c) => s + c.scanCount, 0)}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-[var(--dash-muted)]">
          Loading QR codes...
        </div>
      ) : codes.length === 0 ? (
        <div className="text-center py-16 bg-[var(--dash-surface-muted)] border border-dashed border-[var(--dash-border)] rounded-xl">
          <MdQrCode size={48} className="text-[#383838] mx-auto mb-3" />
          <h3 className="text-white font-semibold mb-1">No QR codes yet</h3>
          <p className="text-[var(--dash-muted)] text-sm mb-4">
            Generate your first QR code for guests to scan.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="bg-[#02ca3a] text-gray-900 font-bold px-5 py-2.5 rounded-lg"
          >
            Generate First QR
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {codes.map((qr) => (
            <QrCodeCard
              key={qr.id}
              qr={qr}
              onToggle={(q) =>
                toggleMutation.mutate({ id: q.id, enabled: q.enabled })
              }
              onDelete={(id) => deleteMutation.mutate(id)}
            />
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div
          className="dashboard-modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Generate QR Code"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeCreateModal();
          }}
        >
          <div className="dashboard-detail-modal rounded-xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-[var(--dash-text)] text-xl font-bold mb-5">
              Generate QR Code
            </h3>

            <div className="mb-4">
              <label className="block text-sm text-[var(--dash-muted)] mb-1">
                Label *
              </label>
              <input
                type="text"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="e.g. General Menu, Table 5, Bar Area"
                className="dashboard-form-control w-full px-4 py-3 rounded-lg focus:outline-none"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm text-[var(--dash-muted)] mb-1">
                Link to Table (Optional)
              </label>
              <select
                value={newTableId}
                onChange={(e) => setNewTableId(e.target.value)}
                className="dashboard-form-control w-full px-4 py-3 rounded-lg focus:outline-none"
              >
                <option value="">— No specific table —</option>
                {tables.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label || `Table ${t.tableNo}`} ({t.seats} seats)
                  </option>
                ))}
              </select>
              <p className="text-xs text-[#6b7280] mt-1">
                Table-linked QRs show the table number on the menu page.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={closeCreateModal}
                className="dashboard-secondary-button flex-1 py-3 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!newLabel.trim())
                    return enqueueSnackbar("Label is required", {
                      variant: "warning",
                    });
                  createMutation.mutate({
                    label: newLabel.trim(),
                    tableId: newTableId || null,
                  });
                }}
                disabled={createMutation.isPending}
                className="dashboard-primary-button flex-1 rounded-lg py-3 font-bold disabled:opacity-60"
              >
                {createMutation.isPending ? "Generating..." : "Generate QR"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QrManagement;
