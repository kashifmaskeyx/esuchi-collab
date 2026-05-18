import React from "react";
import { NavLink } from "react-router-dom";
import logo from "../assets/logo.png";
import logoIn from "../assets/LogoIn.png";
import {
  LayoutDashboard,
  ShieldCheck,
  Package,
  ShoppingCart,
  Truck,
  Boxes,
  PanelLeftClose,
  X,
} from "lucide-react";
import "../css/Sidebar.css";

const mainItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { label: "Inventory", icon: Boxes, path: "/inventory" },
  { label: "Products", icon: Package, path: "/products" },
  { label: "Sales Orders", icon: ShoppingCart, path: "/orders" },
  { label: "Shipment", icon: Truck, path: "/shipment" },
  { label: "Staff & Roles", icon: ShieldCheck, path: "/staff" },
];

function Sidebar({ isOpen, onClose, onToggle }) {
  const handleNavClick = () => {
    if (window.innerWidth <= 980) {
      onClose();
    }
  };

  return (
    <aside className={`sidebar-panel ${isOpen ? "open" : "closed"}`}>
      <div className="sidebar-header">
        <NavLink
          to="/dashboard"
          className="sidebar-logo-link"
          onClick={handleNavClick}
          aria-label="Go to dashboard"
        >
          <img
            src={isOpen ? logo : logoIn}
            alt="eSuchi"
            className={`sidebar-logo ${isOpen ? "expanded" : "collapsed"}`}
          />
        </NavLink>
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
                  onClick={handleNavClick}
                >
                  {React.createElement(Icon, { size: 17 })}
                  <span>{label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </aside>
  );
}

export default Sidebar;
