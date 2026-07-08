import React, { useEffect } from "react";
import CustomSelect from "../shared/CustomSelect";

export const Icon = {
  Box: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
  Truck: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,
  Users: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  ClipList: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg>,
  Chart: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>,
  Bell: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  Download: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg>,
  Plus: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  X: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Check: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><polyline points="20 6 9 17 4 12"/></svg>,
  Edit: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  Trash: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>,
  Refresh: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3"/></svg>,
  Search: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  Alert: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><polygon points="10.29 3.86 1.82 18 21.18 18 13.71 3.86"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
};

export const ExpiryBadge = ({ daysUntilExpiry, isExpired }) => {
  if (daysUntilExpiry === null && !isExpired) return null;
  if (isExpired || daysUntilExpiry <= 0) return <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 font-bold">Expired</span>;
  if (daysUntilExpiry <= 3) return <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 font-bold">Exp. {daysUntilExpiry}d</span>;
  if (daysUntilExpiry <= 7) return <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 font-bold">Exp. {daysUntilExpiry}d</span>;
  return <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">Exp. {daysUntilExpiry}d</span>;
};

export const POStatusBadge = ({ status }) => {
  const map = {
    DRAFT: "bg-[var(--dash-surface-muted)] text-[var(--dash-muted)]",
    ORDERED: "bg-blue-500/20 text-blue-400",
    PARTIAL: "bg-yellow-500/20 text-yellow-400",
    DELIVERED: "bg-green-500/20 text-green-400",
    CANCELLED: "bg-red-500/20 text-red-400",
  };
  return <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${map[status] || ""}`}>{status}</span>;
};

export const Modal = ({ onClose, title, children, wide }) => {
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`bg-[var(--dash-surface)] rounded-xl shadow-2xl border border-[var(--dash-border)] w-full ${wide ? "max-w-3xl" : "max-w-lg"} max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between p-5 border-b border-[var(--dash-border)] sticky top-0 bg-[var(--dash-surface)] z-10">
          <h2 className="text-[var(--dash-text)] text-lg font-bold">{title}</h2>
          <button onClick={onClose} className="text-[var(--dash-muted)] hover:text-[var(--dash-text)] transition-colors"><Icon.X /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
};

export const Field = ({ label, children, half }) => (
  <div className={half ? "" : "col-span-2"}>
    <label className="block text-xs text-[var(--dash-muted)] mb-1 font-medium uppercase tracking-wide">{label}</label>
    {children}
  </div>
);

export const Input = (props) => (
  <input {...props} className={`w-full bg-[var(--dash-surface-muted)] border border-[var(--dash-border)] text-[var(--dash-text)] p-2.5 rounded-lg focus:outline-none focus:border-[var(--dash-primary)] transition-colors text-sm ${props.className || ""}`} />
);

export const Select = ({ children, ...props }) => {
  const options = React.Children.toArray(children).map(child => {
    if (React.isValidElement(child) && child.type === 'option') {
      return {
        label: child.props.children,
        value: child.props.value,
      };
    }
    return null;
  }).filter(Boolean);

  return <CustomSelect options={options} {...props} />;
};

export const Textarea = (props) => (
  <textarea {...props} className={`w-full bg-[var(--dash-surface-muted)] border border-[var(--dash-border)] text-[var(--dash-text)] p-2.5 rounded-lg focus:outline-none focus:border-[var(--dash-primary)] text-sm resize-none ${props.className || ""}`} />
);
