import React, { useEffect, useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { enqueueSnackbar } from "notistack";
import {
  MdAdd,
  MdContentCopy,
  MdDelete,
  MdDownload,
  MdQrCode2,
  MdCheckCircle,
  MdInsights,
  MdToggleOn,
  MdToggleOff,
  MdClose,
  MdPalette,
  MdLink,
  MdVisibility,
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
import CustomSelect from "../shared/CustomSelect";

dayjs.extend(relativeTime);

const FRONTEND_BASE = window.location.origin;

const QR_COLORS = [
  { name: "Forest", primary: "#10b981", bg: "#ffffff" },
  { name: "Ocean", primary: "#3b82f6", bg: "#ffffff" },
  { name: "Royal", primary: "#8b5cf6", bg: "#ffffff" },
  { name: "Sunset", primary: "#f59e0b", bg: "#ffffff" },
  { name: "Rose", primary: "#f43f5e", bg: "#ffffff" },
  { name: "Slate", primary: "#1e293b", bg: "#ffffff" },
];

const QrCodeCard = ({ qr, onToggle, onDelete }) => {
  const svgRef = useRef(null);
  const qrUrl = `${FRONTEND_BASE}/qr/${qr.slug}`;
  const [qrColor, setQrColor] = useState(QR_COLORS[0]);
  const [showColorPicker, setShowColorPicker] = useState(false);

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
      canvas.width = 600;
      canvas.height = 600;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, 600, 600);
      ctx.drawImage(img, 75, 75, 450, 450);
      URL.revokeObjectURL(url);
      const link = document.createElement("a");
      link.download = `qr-${qr.slug}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    };
    img.src = url;
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(qrUrl);
    enqueueSnackbar("URL copied to clipboard!", { variant: "success" });
  };

  return (
    <div className={`qr-card ${!qr.enabled ? "qr-card--disabled" : ""}`}>
      {/* Card Header */}
      <div className="qr-card__header">
        <div className="qr-card__title-row">
          <div className="qr-card__icon-wrap">
            <MdQrCode2 size={20} />
          </div>
          <div className="qr-card__title-text">
            <h3>{qr.label}</h3>
            {qr.table && (
              <span className="qr-card__table-badge">
                <MdLink size={10} />
                {qr.table.label || `Table ${qr.table.tableNo}`}
              </span>
            )}
          </div>
        </div>
        <div className="qr-card__actions-top">
          <button
            onClick={() => onToggle(qr)}
            className={`qr-card__toggle ${qr.enabled ? "qr-card__toggle--on" : ""}`}
            title={qr.enabled ? "Disable QR" : "Enable QR"}
          >
            {qr.enabled ? <MdToggleOn size={24} /> : <MdToggleOff size={24} />}
          </button>
          <button
            onClick={() => {
              if (window.confirm(`Delete QR code "${qr.label}"?`))
                onDelete(qr.id);
            }}
            className="qr-card__delete"
            title="Delete QR"
          >
            <MdDelete size={16} />
          </button>
        </div>
      </div>

      {/* QR Code Display */}
      <div className="qr-card__code-area" ref={svgRef}>
        <div className="qr-card__code-frame">
          <QRCodeSVG
            value={qrUrl}
            size={180}
            level="H"
            includeMargin={false}
            fgColor={qrColor.primary}
            bgColor={qrColor.bg}
            imageSettings={{
              src: "",
              height: 0,
              width: 0,
              excavate: false,
            }}
          />
        </div>
        {/* Corner decorations */}
        <div className="qr-card__corner qr-card__corner--tl" />
        <div className="qr-card__corner qr-card__corner--tr" />
        <div className="qr-card__corner qr-card__corner--bl" />
        <div className="qr-card__corner qr-card__corner--br" />
      </div>

      {/* Color Picker */}
      <div className="qr-card__color-section">
        <button
          onClick={() => setShowColorPicker(!showColorPicker)}
          className="qr-card__color-toggle"
        >
          <MdPalette size={14} />
          <span>{qrColor.name}</span>
        </button>
        {showColorPicker && (
          <div className="qr-card__color-picker">
            {QR_COLORS.map((color) => (
              <button
                key={color.name}
                onClick={() => {
                  setQrColor(color);
                  setShowColorPicker(false);
                }}
                className={`qr-card__color-swatch ${qrColor.name === color.name ? "active" : ""}`}
                style={{ backgroundColor: color.primary }}
                title={color.name}
              />
            ))}
          </div>
        )}
      </div>

      {/* URL Display */}
      <div className="qr-card__url">
        <MdLink size={12} />
        <span>{qrUrl}</span>
      </div>

      {/* Stats */}
      <div className="qr-card__stats">
        <div className="qr-card__stat">
          <MdVisibility size={14} />
          <span>{qr.scanCount} scans</span>
        </div>
        <div className="qr-card__stat">
          <span>Created {dayjs(qr.createdAt).fromNow()}</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="qr-card__buttons">
        <button onClick={downloadQR} className="qr-card__btn qr-card__btn--primary">
          <MdDownload size={16} />
          <span>Download</span>
        </button>
        <button onClick={copyUrl} className="qr-card__btn qr-card__btn--secondary">
          <MdContentCopy size={16} />
          <span>Copy URL</span>
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
  const totalScans = codes.reduce((s, c) => s + c.scanCount, 0);

  return (
    <div className="qr-mgmt">
      {/* Hero Header */}
      <div className="qr-mgmt__hero">
        <div className="qr-mgmt__hero-bg">
          <div className="qr-mgmt__hero-orb qr-mgmt__hero-orb--1" />
          <div className="qr-mgmt__hero-orb qr-mgmt__hero-orb--2" />
          <div className="qr-mgmt__hero-grid" />
        </div>
        <div className="qr-mgmt__hero-content">
          <div className="qr-mgmt__hero-text">
            <div className="qr-mgmt__badge">
              <MdQrCode2 size={14} />
              <span>QR Menu</span>
            </div>
            <h1>Digital Menu Codes</h1>
            <p>
              Create QR codes for guests to scan and browse your menu.
              Staff place all orders directly in the POS.
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="qr-mgmt__cta"
          >
            <MdAdd size={20} />
            <span>Generate QR</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="qr-mgmt__stats">
        <div className="qr-mgmt__stat qr-mgmt__stat--total">
          <div className="qr-mgmt__stat-icon">
            <MdQrCode2 size={22} />
          </div>
          <div className="qr-mgmt__stat-info">
            <span className="qr-mgmt__stat-label">Total Codes</span>
            <span className="qr-mgmt__stat-value">{codes.length}</span>
          </div>
        </div>
        <div className="qr-mgmt__stat qr-mgmt__stat--active">
          <div className="qr-mgmt__stat-icon">
            <MdCheckCircle size={22} />
          </div>
          <div className="qr-mgmt__stat-info">
            <span className="qr-mgmt__stat-label">Active</span>
            <span className="qr-mgmt__stat-value">{activeCount}</span>
          </div>
        </div>
        <div className="qr-mgmt__stat qr-mgmt__stat--scans">
          <div className="qr-mgmt__stat-icon">
            <MdInsights size={22} />
          </div>
          <div className="qr-mgmt__stat-info">
            <span className="qr-mgmt__stat-label">Total Scans</span>
            <span className="qr-mgmt__stat-value">{totalScans}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="qr-mgmt__loading">
          <div className="qr-mgmt__spinner" />
          <span>Loading QR codes...</span>
        </div>
      ) : codes.length === 0 ? (
        <div className="qr-mgmt__empty">
          <div className="qr-mgmt__empty-icon">
            <MdQrCode2 size={56} />
          </div>
          <h3>No QR codes yet</h3>
          <p>Generate your first QR code to let guests scan and view your menu.</p>
          <button
            onClick={() => setShowModal(true)}
            className="qr-mgmt__cta qr-mgmt__cta--small"
          >
            <MdAdd size={18} />
            <span>Generate First QR</span>
          </button>
        </div>
      ) : (
        <div className="qr-mgmt__grid">
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
          className="qr-mgmt__modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Generate QR Code"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeCreateModal();
          }}
        >
          <div className="qr-mgmt__modal">
            <div className="qr-mgmt__modal-header">
              <div className="qr-mgmt__modal-title">
                <div className="qr-mgmt__modal-icon">
                  <MdQrCode2 size={24} />
                </div>
                <div>
                  <h3>Generate QR Code</h3>
                  <p>Create a new QR code for your menu</p>
                </div>
              </div>
              <button onClick={closeCreateModal} className="qr-mgmt__modal-close">
                <MdClose size={20} />
              </button>
            </div>

            <div className="qr-mgmt__modal-body">
              <div className="qr-mgmt__field">
                <label>Label *</label>
                <input
                  type="text"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="e.g. General Menu, Table 5, Bar Area"
                  className="qr-mgmt__input"
                  autoFocus
                />
              </div>

              <div className="qr-mgmt__field">
                <label>Link to Table (Optional)</label>
                <CustomSelect
                  className="qr-mgmt__select"
                  name="newTableId"
                  value={newTableId}
                  onChange={(e) => setNewTableId(e.target.value)}
                  options={[
                    { value: "", label: "No specific table" },
                    ...tables.map((t) => ({
                      value: t.id,
                      label: `${t.label || `Table ${t.tableNo}`} (${t.seats} seats)`,
                    })),
                  ]}
                />
                <span className="qr-mgmt__hint">
                  Table-linked QRs display the table number on the menu page.
                </span>
              </div>
            </div>

            <div className="qr-mgmt__modal-footer">
              <button
                type="button"
                onClick={closeCreateModal}
                className="qr-mgmt__btn qr-mgmt__btn--ghost"
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
                className="qr-mgmt__cta qr-mgmt__cta--modal"
              >
                {createMutation.isPending ? (
                  <>
                    <div className="qr-mgmt__spinner qr-mgmt__spinner--small" />
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <MdQrCode2 size={18} />
                    <span>Generate QR</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QrManagement;
