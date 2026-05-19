import React from "react";
import { useNavigate } from "react-router-dom";
import { getStoredUser, logoutUser } from "../api/auth";
import logo from "../assets/logo.png";
import "../css/PendingApproval.css";

export default function PendingApproval() {
  const navigate = useNavigate();
  const user = getStoredUser();

  const handleLogout = async () => {
    await logoutUser();
    navigate("/login", { replace: true });
  };

  return (
    <div className="pending-page">
      <section className="pending-panel">
        <img src={logo} alt="eSuchi logo" className="pending-logo" />
        <p className="pending-kicker">Company approval</p>
        <h1 className="pending-title">Your account is waiting for approval</h1>
        <p className="pending-copy">
          {user?.company?.name
            ? `You joined ${user.company.name}. A company admin needs to approve your access before you can use the inventory workspace.`
            : "A company admin needs to approve your access before you can use the inventory workspace."}
        </p>
        <div className="pending-actions">
          <button
            type="button"
            className="pending-primary"
            onClick={() => navigate("/login")}
          >
            Back to login
          </button>
          <button
            type="button"
            className="pending-secondary"
            onClick={handleLogout}
          >
            Log out
          </button>
        </div>
      </section>
    </div>
  );
}
