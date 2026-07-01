import React, { useState } from "react";
import { FaHome } from "react-icons/fa";
import {
  MdOutlineMoreHoriz,
  MdOutlineReorder,
  MdTableBar,
} from "react-icons/md";
import { CiCircleMore } from "react-icons/ci";
import { BiSolidDish } from "react-icons/bi";
import { MdOutlineRoomService } from "react-icons/md";
import { useNavigate, useLocation } from "react-router-dom";
import CreateOrderModal from "./CreateOrderModal";
import useRole from "../../hooks/useRole";
import { ORDER_ROLES, TENANT_ROLES } from "../../constants/roles";

const BottomNav = ({ dashboardVariant = false, onCreateOrder }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { role, isManagement, canHandleOrders } = useRole();

  const openModal = () => {
    if (onCreateOrder) {
      onCreateOrder();
      return;
    }
    setIsModalOpen(true);
  };
  const closeModal = () => setIsModalOpen(false);

  const isActive = (path) => location.pathname === path;
  const isTablesActive = ["/table", "/tables"].includes(location.pathname);
  const isMoreActive = [
    "/more",
    "/dashboard",
    "/menu",
    "/settings",
    "/inventory",
    "/qr",
  ].includes(location.pathname);
  const homePath = isManagement ? "/" : "/dashboard";
  const navigationItems = [
    {
      label: "Home",
      path: homePath,
      icon: FaHome,
      active: isActive(homePath),
      roles: TENANT_ROLES,
    },
    {
      label: "Orders",
      path: "/orders",
      icon: MdOutlineReorder,
      active: isActive("/orders"),
      roles: ORDER_ROLES,
    },
    {
      label: "Tables",
      path: "/tables",
      icon: MdTableBar,
      active: isTablesActive,
      roles: ORDER_ROLES,
    },
    {
      label: "More",
      path: "/more",
      icon: dashboardVariant ? MdOutlineMoreHoriz : CiCircleMore,
      active: isMoreActive,
      roles: TENANT_ROLES,
    },
  ];
  const visibleNavigationItems = navigationItems.filter((item) =>
    item.roles.includes(role),
  );

  return (
    <div
      className={
        dashboardVariant
          ? "dashboard-bottom-nav"
          : "fixed bottom-0 left-0 right-0 bg-[#262626] p-2 h-16 flex justify-around"
      }
      style={
        dashboardVariant
          ? {
              gridTemplateColumns: `repeat(${visibleNavigationItems.length}, minmax(0, 1fr))`,
            }
          : undefined
      }
    >
      {visibleNavigationItems.map(
        ({ label, path, icon: Icon, active }) => (
          <button
            key={label}
            onClick={() => navigate(path)}
            className={
              dashboardVariant
                ? `dashboard-bottom-link ${active ? "is-active" : ""}`
                : `flex items-center justify-center font-bold ${
                    active
                      ? "text-[#f5f5f5] bg-[#343434]"
                      : "text-[#ababab]"
                  } w-[300px] rounded-[20px]`
            }
          >
            <Icon className="inline mr-2" size={20} />
            <p>{label}</p>
          </button>
        ),
      )}

      {canHandleOrders && (
        <button
          disabled={isTablesActive || isActive("/menu")}
          onClick={openModal}
          className={
            dashboardVariant
              ? "dashboard-bottom-create"
              : "absolute bottom-6 bg-[#F6B100] text-[#f5f5f5] rounded-full p-4 items-center"
          }
          aria-label="Create order"
        >
          {dashboardVariant ? (
            <MdOutlineRoomService size={30} />
          ) : (
            <BiSolidDish size={40} />
          )}
        </button>
      )}

      {canHandleOrders && !onCreateOrder && (
        <CreateOrderModal
          isOpen={isModalOpen}
          onClose={closeModal}
          dashboardVariant={dashboardVariant}
        />
      )}
    </div>
  );
};

export default BottomNav;
