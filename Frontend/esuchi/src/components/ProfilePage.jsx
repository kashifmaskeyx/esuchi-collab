import React, { useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  Bell,
  CheckCircle2,
  KeyRound,
  Search,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import {
  changeCurrentPassword,
  getStoredUser,
  updateCurrentUser,
} from "../api/auth";
import "../css/ProfilePage.css";

const storedProfile = () => {
  try {
    const currentUser = getStoredUser();

    if (currentUser) {
      return currentUser;
    }

    return JSON.parse(localStorage.getItem("esuchiProfile")) || {};
  } catch {
    return {};
  }
};

export default function ProfilePage() {
  const outletContext = useOutletContext();
  const sidebarOpen = outletContext?.sidebarOpen ?? false;
  const profile = useMemo(() => storedProfile(), []);
  const [savedProfile, setSavedProfile] = useState({
    name: profile.name || "Admin User",
    email: profile.email || "admin@esuchi.com",
  });
  const [accountForm, setAccountForm] = useState({
    name: profile.name || "Admin User",
    email: profile.email || "admin@esuchi.com",
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [accountStatus, setAccountStatus] = useState("");
  const [accountError, setAccountError] = useState("");
  const [passwordStatus, setPasswordStatus] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isSavingAccount, setIsSavingAccount] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const initials = savedProfile.name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "A";

  const handleAccountChange = (event) => {
    const { name, value } = event.target;
    setAccountForm((current) => ({ ...current, [name]: value }));
    setAccountStatus("");
    setAccountError("");
  };

  const handlePasswordChange = (event) => {
    const { name, value } = event.target;
    setPasswordForm((current) => ({ ...current, [name]: value }));
    setPasswordStatus("");
    setPasswordError("");
  };

  const handleAccountSubmit = async (event) => {
    event.preventDefault();
    const nextProfile = {
      name: accountForm.name.trim(),
      email: accountForm.email.trim(),
    };

    if (!nextProfile.name || !nextProfile.email) {
      setAccountError("Name and email are required.");
      return;
    }

    setIsSavingAccount(true);
    setAccountError("");
    setAccountStatus("");

    try {
      const response = await updateCurrentUser(nextProfile);
      const updatedUser = response.user || nextProfile;
      const updatedProfile = {
        name: updatedUser.name || nextProfile.name,
        email: updatedUser.email || nextProfile.email,
      };

      localStorage.setItem("esuchiProfile", JSON.stringify(updatedUser));
      setSavedProfile(updatedProfile);
      setAccountForm({
        name: updatedProfile.name,
        email: updatedProfile.email,
      });
      setAccountStatus("Profile updated successfully.");
    } catch (error) {
      setAccountError(error.message || "Unable to update profile.");
    } finally {
      setIsSavingAccount(false);
    }
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    setPasswordError("");
    setPasswordStatus("");

    if (passwordForm.newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters.");
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("New password and confirmation do not match.");
      return;
    }

    setIsChangingPassword(true);

    try {
      await changeCurrentPassword(passwordForm);
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setPasswordStatus("Password changed successfully.");
    } catch (error) {
      setPasswordError(error.message || "Unable to change password.");
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="profile-page">
      <main
        className={`profile-main ${
          sidebarOpen ? "with-sidebar" : "with-collapsed-sidebar"
        }`}
      >
        <header className="profile-topbar">
          <div className="profile-topbar-left">
            <h1 className="profile-page-title">Account Settings</h1>
            <p>Manage your admin profile and security details.</p>
          </div>

          <div className="profile-topbar-right">
            <button type="button" className="profile-icon-btn" aria-label="Notifications">
              <Bell size={18} />
            </button>

            <div className="profile-search">
              <Search size={16} />
              <input type="text" placeholder="Search settings" />
            </div>

            <div className="profile-avatar" aria-label="Current admin">
              <span>{initials}</span>
            </div>
          </div>
        </header>

        <section className="profile-shell">
          <aside className="profile-settings-nav" aria-label="Account settings sections">
            <p>General Settings</p>
            <button type="button" className="active">
              <UserRound size={17} />
              Account
            </button>
            <button type="button">
              <ShieldCheck size={17} />
              Security
            </button>
          </aside>

          <div className="profile-content">
            <section className="profile-panel">
              <div className="profile-panel-head">
                <div>
                  <h2>My Profile</h2>
                  <p>Edit the name and email shown on your admin account.</p>
                </div>
                <div className="profile-identity">
                  <div className="profile-photo">
                    <span>{initials}</span>
                  </div>
                  <div>
                    <strong>{savedProfile.name}</strong>
                    <span>{savedProfile.email}</span>
                  </div>
                </div>
              </div>

              <form className="profile-form" onSubmit={handleAccountSubmit}>
                <label>
                  <span>Full Name</span>
                  <input
                    type="text"
                    name="name"
                    value={accountForm.name}
                    onChange={handleAccountChange}
                    required
                  />
                </label>

                <label>
                  <span>Email Address</span>
                  <input
                    type="email"
                    name="email"
                    value={accountForm.email}
                    onChange={handleAccountChange}
                    required
                  />
                </label>

                {accountStatus ? (
                  <p className="profile-form-status">
                    <CheckCircle2 size={15} />
                    {accountStatus}
                  </p>
                ) : null}

                {accountError ? (
                  <p className="profile-form-error">{accountError}</p>
                ) : null}

                <div className="profile-form-actions">
                  <button
                    type="submit"
                    className="profile-primary-btn"
                    disabled={isSavingAccount}
                  >
                    {isSavingAccount ? "Saving..." : "Save Profile"}
                  </button>
                </div>
              </form>
            </section>

            <section className="profile-panel">
              <div className="profile-panel-head">
                <div>
                  <h2>Change Password</h2>
                  <p>Use a strong password to keep your inventory data protected.</p>
                </div>
                <span className="profile-panel-icon">
                  <KeyRound size={18} />
                </span>
              </div>

              <form className="profile-form" onSubmit={handlePasswordSubmit}>
                <label className="profile-form-full">
                  <span>Current Password</span>
                  <input
                    type="password"
                    name="currentPassword"
                    value={passwordForm.currentPassword}
                    onChange={handlePasswordChange}
                    required
                  />
                </label>

                <label>
                  <span>New Password</span>
                  <input
                    type="password"
                    name="newPassword"
                    value={passwordForm.newPassword}
                    onChange={handlePasswordChange}
                    required
                  />
                </label>

                <label>
                  <span>Confirm New Password</span>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={passwordForm.confirmPassword}
                    onChange={handlePasswordChange}
                    required
                  />
                </label>

                {passwordError ? (
                  <p className="profile-form-error">{passwordError}</p>
                ) : null}

                {passwordStatus ? (
                  <p className="profile-form-status">
                    <CheckCircle2 size={15} />
                    {passwordStatus}
                  </p>
                ) : null}

                <div className="profile-form-actions">
                  <button
                    type="submit"
                    className="profile-primary-btn"
                    disabled={isChangingPassword}
                  >
                    {isChangingPassword ? "Changing..." : "Change Password"}
                  </button>
                </div>
              </form>
            </section>
          </div>
        </section>
      </main>
    </div>
  );
}
