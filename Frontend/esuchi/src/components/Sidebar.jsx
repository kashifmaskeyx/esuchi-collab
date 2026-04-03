import React from "react";
import { NavLink } from "react-router-dom";
import logo from "../assets/logo.png";
import {
  Home,
  ShoppingCart,
  Package,
  Users,
  Landmark,
  BarChart2,
  Megaphone,
  Tag,
  X,
} from "lucide-react";
import "../css/Sidebar.css";

const menuItems = [
  { label: "Home", icon: Home, path: "/dashboard" },
  { label: "Orders", icon: ShoppingCart, path: "/orders" },
  { label: "Products", icon: Package, path: "/products" },
  { label: "Customers", icon: Users, path: "/customers" },
  { label: "Finances", icon: Landmark, path: "/finances" },
  { label: "Analytics", icon: BarChart2, path: "/analytics" },
  { label: "Marketing", icon: Megaphone, path: "/marketing" },
  { label: "Discounts", icon: Tag, path: "/discounts" },
];

function Sidebar({ isOpen, onClose }) {
  return (
    <aside className={`sidebar-panel ${isOpen ? "open" : "closed"}`}>
      <div className="sidebar-header">
        <img src={logo} alt="eSuchi" className="sidebar-logo" />
        <button className="sidebar-close-btn" type="button" onClick={onClose}>
          <X size={18} />
        </button>
      </div>

      <nav>
        <ul className="sidebar-menu">
          {menuItems.map(({ label, icon: Icon, path }) => (
            <li key={label}>
              <NavLink
                to={path}
                className={({ isActive }) =>
                  `sidebar-link ${isActive ? "active" : ""}`
                }
                onClick={onClose}
              >
                <Icon size={18} />
                <span>{label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}

export default Sidebar;
