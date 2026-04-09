import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";
import logoIn from "../assets/LogoIn.png";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  Landmark,
  BarChart3,
  Megaphone,
  BadgePercent,
  Settings,
  CircleHelp,
  LogOut,
  PanelLeftClose,
  X,
} from "lucide-react";
import "../css/Sidebar.css";

const mainItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { label: "Orders", icon: ShoppingCart, path: "/orders" },
  { label: "Products", icon: Package, path: "/products" },
  { label: "Customers", icon: Users, path: "/customers" },
  { label: "Finances", icon: Landmark, path: "/finances" },
  { label: "Analytics", icon: BarChart3, path: "/analytics" },
  { label: "Marketing", icon: Megaphone, path: "/marketing" },
  { label: "Discounts", icon: BadgePercent, path: "/discounts" },
];

const secondaryItems = [
  { label: "Settings", icon: Settings, path: "/settings" },
  { label: "Help Center", icon: CircleHelp, path: "/help-center" },
];

function Sidebar({ isOpen, onClose, onToggle }) {
  const navigate = useNavigate();

  return (
    <aside className={`sidebar-panel ${isOpen ? "open" : "closed"}`}>
      <div className="sidebar-header">
        <img
          src={isOpen ? logo : logoIn}
          alt="eSuchi"
          className={`sidebar-logo ${isOpen ? "expanded" : "collapsed"}`}
        />
        <button
          className="sidebar-mini-btn"
          type="button"
          aria-label="Toggle sidebar"
          onClick={onToggle}
        >
          <PanelLeftClose size={16} />
        </button>
        <button className="sidebar-close-btn" type="button" onClick={onClose}>
          <X size={18} />
        </button>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-group">
          <p className="sidebar-group-label">MAIN</p>
          <ul className="sidebar-menu">
            {mainItems.map(({ label, icon: Icon, path }) => (
              <li key={label}>
                <NavLink
                  to={path}
                  className={({ isActive }) =>
                    `sidebar-link ${isActive ? "active" : ""}`
                  }
                  onClick={onClose}
                >
                  <Icon size={17} />
                  <span>{label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </div>

        <div className="sidebar-group">
          <p className="sidebar-group-label">SETTINGS</p>
          <ul className="sidebar-menu">
            {secondaryItems.map(({ label, icon: Icon, path }) => (
              <li key={label}>
                <NavLink
                  to={path}
                  className={({ isActive }) =>
                    `sidebar-link ${isActive ? "active" : ""}`
                  }
                  onClick={onClose}
                >
                  <Icon size={17} />
                  <span>{label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      <button
        type="button"
        className="sidebar-logout-btn"
        onClick={() => navigate("/login")}
      >
        <LogOut size={17} />
        <span>Logout</span>
      </button>
    </aside>
  );
}

export default Sidebar;
