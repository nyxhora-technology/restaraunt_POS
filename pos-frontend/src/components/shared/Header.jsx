import React from "react";
import { FaSearch } from "react-icons/fa";
import { FaUserCircle } from "react-icons/fa";
import { FaBell } from "react-icons/fa";
import logo from "../../assets/images/logo.png";
import { useDispatch, useSelector } from "react-redux";
import { IoLogOut } from "react-icons/io5";
import { useMutation } from "@tanstack/react-query";
import { logout } from "../../https";
import { removeUser } from "../../redux/slices/userSlice";
import { useLocation, useNavigate } from "react-router-dom";
import {
  MdDashboard,
  MdInventory2,
  MdOutlineMenuBook,
  MdOutlineSettings,
  MdQrCode2,
  MdTableBar,
} from "react-icons/md";
import { useQueryClient } from "@tanstack/react-query";
import useRole from "../../hooks/useRole";
import useDashboardPreferences from "../../hooks/useDashboardPreferences";
import { APP_ROUTES } from "../../utils/authRouting";

const navItems = [
  { label: "Dashboard", path: APP_ROUTES.dashboard, icon: MdDashboard },
  { label: "Tables", path: APP_ROUTES.tables, icon: MdTableBar },
  { label: "Menu", path: APP_ROUTES.menu, icon: MdOutlineMenuBook },
  { label: "QR", path: APP_ROUTES.qr, icon: MdQrCode2 },
  {
    label: "Inventory",
    path: APP_ROUTES.inventory,
    icon: MdInventory2,
  },
  {
    label: "Settings",
    path: APP_ROUTES.settings,
    icon: MdOutlineSettings,
  },
];

const Header = () => {
  const userData = useSelector((state) => state.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { theme } = useDashboardPreferences();

  const logoutMutation = useMutation({
    mutationFn: () => logout(),
    onSettled: () => {
      queryClient.clear();
      dispatch(removeUser());
      navigate("/auth");
    },
  });

  const handleLogout = () => {
    logoutMutation.mutate();
  };
  const { isSuperAdmin, isManagement } = useRole();
  const homeRoute = isSuperAdmin
    ? APP_ROUTES.platform
    : isManagement
      ? APP_ROUTES.home
      : APP_ROUTES.dashboard;

  return (
    <header className={`common-header theme-${theme}`}>
      {/* LOGO */}
      <div onClick={() => navigate(homeRoute)} className="common-header-brand">
        <img src={logo} className="h-8 w-8" alt="restro logo" />
        <h1>{userData.restaurant?.name || "Restro"}</h1>
      </div>

      {/* SEARCH */}
      <div className="common-header-search">
        <FaSearch />
        <input type="text" placeholder="Search" />
      </div>

      {/* LOGGED USER DETAILS */}
      <div className="common-header-actions">
        {userData.role && (
          <>
            {isSuperAdmin ? (
              <button
                type="button"
                onClick={() => navigate(APP_ROUTES.platform)}
                className={`common-header-icon-button ${
                  location.pathname === APP_ROUTES.platform ? "is-active" : ""
                }`}
                title="Platform"
                aria-label="Platform"
              >
                <MdDashboard />
              </button>
            ) : (
              <div
                className="common-header-shortcuts"
                aria-label="Main navigation"
              >
                {navItems.map(({ label, path, aliases = [], icon: Icon }) => {
                  const active =
                    location.pathname === path ||
                    aliases.includes(location.pathname);
                  return (
                    <button
                      type="button"
                      key={path}
                      onClick={() => navigate(path)}
                      className={`common-header-icon-button ${
                        active ? "is-active" : ""
                      }`}
                      title={label}
                      aria-label={label}
                    >
                      <Icon />
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}
        <button
          type="button"
          className="common-header-icon-button"
          aria-label="Notifications"
          title="Notifications"
        >
          <FaBell />
        </button>
        <div
          onClick={() => navigate(APP_ROUTES.settings)}
          className="common-header-user"
        >
          <div className="common-header-initial-avatar">
            {(userData.name || "Test User").charAt(0).toUpperCase()}
          </div>
          <div>
            <h1>{userData.name || "TEST USER"}</h1>
            <p>{userData.role || "Role"}</p>
          </div>
          <IoLogOut
            onClick={(event) => {
              event.stopPropagation();
              handleLogout();
            }}
            className="common-header-logout"
            size={40}
          />
        </div>
      </div>
    </header>
  );
};

export default Header;
