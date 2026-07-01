import React, { useState, useEffect } from "react";
import { MdTableBar, MdCategory } from "react-icons/md";
import { BiSolidDish } from "react-icons/bi";
import Metrics from "../components/dashboard/Metrics";
import RecentOrders from "../components/dashboard/RecentOrders";
import Modal from "../components/dashboard/Modal";
import PaymentPanel from "../components/dashboard/PaymentPanel";
import StaffPanel from "../components/dashboard/StaffPanel";
import MenuModal from "../components/dashboard/MenuModal";
import MenuManagement from "../components/dashboard/MenuManagement";
import TableManagement from "../components/dashboard/TableManagement";
import InventoryManagement from "../components/dashboard/InventoryManagement";
import QrManagement from "../components/dashboard/QrManagement";
import KitchenDashboard from "../components/dashboard/KitchenDashboard";
import useRoleDashboard from "../hooks/useRoleDashboard";
import useDashboardPreferences from "../hooks/useDashboardPreferences";

const buttons = [
  { label: "Add Table", icon: <MdTableBar />, action: "table" },
  { label: "Add Category", icon: <MdCategory />, action: "category" },
  { label: "Add Dishes", icon: <BiSolidDish />, action: "dishes" },
];

const Dashboard = ({ initialTab }) => {
  const {
    role,
    availableTabs,
    defaultTab,
    canManageMenu,
    canCreateTable,
    isKitchen,
  } = useRoleDashboard();
  const { theme } = useDashboardPreferences();
  const tabKey = availableTabs.join("|");
  const getInitialTab = () =>
    initialTab && availableTabs.includes(initialTab) ? initialTab : defaultTab;

  useEffect(() => {
    document.title =
      isKitchen ? "POS | Kitchen Display" : "POS | Admin Dashboard";
    document.documentElement.style.colorScheme = theme;
    return () => {
      document.documentElement.style.removeProperty("color-scheme");
    };
  }, [role, theme]);

  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [menuModal, setMenuModal] = useState(null);
  const [activeTab, setActiveTab] = useState(getInitialTab);

  useEffect(() => {
    setActiveTab(getInitialTab());
  }, [initialTab, defaultTab, tabKey]);

  const handleOpenModal = (action) => {
    if (action === "table") setIsTableModalOpen(true);
    if (action === "category" || action === "dishes") setMenuModal(action);
  };

  if (isKitchen) {
    return <KitchenDashboard />;
  }

  return (
    <div className={`dashboard-shell theme-${theme}`}>
      <div className="dashboard-admin-page">
        <div className="dashboard-admin-toolbar container mx-auto">
          <div className="dashboard-admin-actions">
            {buttons
              .filter(({ action }) =>
                action === "table" ? canCreateTable : canManageMenu,
              )
              .map(({ label, icon, action }) => {
                return (
                  <button
                    key={label}
                    onClick={() => handleOpenModal(action)}
                    className="dashboard-admin-action"
                  >
                    {label} {icon}
                  </button>
                );
              })}
          </div>

          <div className="dashboard-admin-tabs">
            {availableTabs.map((tab) => {
              return (
                <button
                  key={tab}
                  className={`dashboard-admin-tab ${
                    activeTab === tab ? "is-active" : ""
                  }`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab}
                </button>
              );
            })}
          </div>
        </div>

        {activeTab === "Metrics" && <Metrics />}
        {activeTab === "Orders" && <RecentOrders />}
        {activeTab === "Payments" && <PaymentPanel />}
        {activeTab === "Staff" && <StaffPanel />}
        {activeTab === "Menu" && <MenuManagement />}
        {activeTab === "Inventory" && <InventoryManagement />}
        {activeTab === "QR Menu" && <QrManagement />}
        {activeTab === "Tables" && <TableManagement />}

        {isTableModalOpen && (
          <Modal setIsTableModalOpen={setIsTableModalOpen} />
        )}
        {menuModal && (
          <MenuModal action={menuModal} onClose={() => setMenuModal(null)} />
        )}
      </div>
    </div>
  );
};

export default Dashboard;
