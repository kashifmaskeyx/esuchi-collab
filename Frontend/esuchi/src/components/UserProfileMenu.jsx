import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LogOut,
  Mail,
  UserRound,
} from "lucide-react";
import { getStoredUser, getUserInitials, logoutUser } from "../api/auth";
import "../css/UserProfileMenu.css";

export default function UserProfileMenu({ className = "" }) {
  const navigate = useNavigate();
  const menuRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const user = useMemo(() => getStoredUser() || {}, []);
  const initials = getUserInitials(user);
  const displayName = user.name || user.email?.split("@")[0] || "User";
  const displayEmail = user.email || "No email saved";

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const closeMenu = (event) => {
      if (!menuRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", closeMenu);

    return () => {
      document.removeEventListener("pointerdown", closeMenu);
    };
  }, [isOpen]);

  const handleNavigate = (path) => {
    setIsOpen(false);
    navigate(path);
  };

  const handleLogout = () => {
    logoutUser();
    navigate("/login");
  };

  return (
    <div className={`user-profile-menu ${className}`} ref={menuRef}>
      <button
        type="button"
        className="user-profile-trigger"
        onClick={() => setIsOpen((current) => !current)}
        aria-label="Open profile menu"
        aria-expanded={isOpen}
      >
        <span>{initials}</span>
      </button>

      {isOpen ? (
        <div className="user-profile-dropdown" role="menu">
          <div className="user-profile-dropdown-head">
            <div className="user-profile-photo">
              <UserRound size={56} />
            </div>
            <div>
              <h2>{displayName}</h2>
              <p>{displayName}</p>
            </div>
          </div>

          <div className="user-profile-details">
            <div>
              <Mail size={18} />
              <span>{displayEmail}</span>
            </div>
          </div>

          <div className="user-profile-actions">
            <button type="button" onClick={() => handleNavigate("/settings")}>
              <UserRound size={18} />
              My Profile
            </button>
          </div>

          <div className="user-profile-logout">
            <button type="button" onClick={handleLogout}>
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
