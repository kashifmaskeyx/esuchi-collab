import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useOutletContext } from "react-router-dom";
import {
  ArrowLeft,
  Bell,
  BellRing,
  CheckCircle2,
  Globe2,
  KeyRound,
  LayoutDashboard,
  PackageCheck,
  Palette,
  RotateCcw,
  Save,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Truck,
  UserRound,
} from "lucide-react";
import {
  changeCurrentPassword,
  getCurrentUser,
  getStoredUser,
  requestEmailChangeOtp,
  updateCurrentUser,
} from "../api/auth";
import {
  defaultProfileSettings,
  readProfileSettings,
  saveProfileSettings,
} from "../utils/profileSettings";
import "../css/ProfilePage.css";

const readLoginNotification = () => {
  try {
    const storedNotification = sessionStorage.getItem(
      "esuchiLoginNotification",
    );
    return storedNotification ? JSON.parse(storedNotification) : null;
  } catch {
    return null;
  }
};

const storedProfile = () => {
  try {
    const currentUser = getStoredUser();

    if (currentUser) {
      return currentUser;
    }

    return JSON.parse(localStorage.getItem("esuchiProfile")) || null;
  } catch {
    return null;
  }
};

const toProfile = (user = {}) => ({
  name: user?.name || "",
  email: user?.email || "",
});

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const settingsNavItems = [
  { id: "account", label: "Account", icon: UserRound },
  { id: "security", label: "Security", icon: ShieldCheck },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "notifications", label: "Notifications", icon: BellRing },
  { id: "operations", label: "Operations", icon: Truck },
];

export default function ProfilePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const outletContext = useOutletContext();
  const sidebarOpen = outletContext?.sidebarOpen ?? false;
  const profile = useMemo(() => storedProfile(), []);
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef(null);
  const [loginNotification, setLoginNotification] = useState(() =>
    readLoginNotification(),
  );
  const [savedProfile, setSavedProfile] = useState(() => toProfile(profile));
  const [accountForm, setAccountForm] = useState(() => toProfile(profile));
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [accountStatus, setAccountStatus] = useState("");
  const [accountError, setAccountError] = useState("");
  const [passwordStatus, setPasswordStatus] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [activeSection, setActiveSection] = useState("account");
  const [settingsForm, setSettingsForm] = useState(() => readProfileSettings());
  const [settingsStatus, setSettingsStatus] = useState("");
  const [isSavingAccount, setIsSavingAccount] = useState(false);
  const [isSendingEmailOtp, setIsSendingEmailOtp] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const initials =
    savedProfile.name
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ||
    savedProfile.email.slice(0, 2).toUpperCase() ||
    "U";
  const emailChanged =
    accountForm.email.trim().toLowerCase() !==
    savedProfile.email.trim().toLowerCase();
  const notifications = useMemo(
    () =>
      loginNotification ? [{ id: "login-success", ...loginNotification }] : [],
    [loginNotification],
  );
  const activeSettingsMeta =
    settingsNavItems.find((item) => item.id === activeSection) ||
    settingsNavItems[0];

  const clearLoginNotification = () => {
    sessionStorage.removeItem("esuchiLoginNotification");
    setLoginNotification(null);
  };

  const goToSection = (sectionId) => {
    setActiveSection(sectionId);
  };

  const handleSettingsChange = (event) => {
    const { name, type, checked, value } = event.target;
    setSettingsForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
    setSettingsStatus("");
  };

  const handleSettingsSubmit = (event) => {
    event.preventDefault();

    if (Number(settingsForm.stockAlertThreshold) < 1) {
      setSettingsStatus("Low-stock threshold must be at least 1.");
      return;
    }

    if (Number(settingsForm.shipmentAlertWindow) < 1) {
      setSettingsStatus("Shipment reminder window must be at least 1 day.");
      return;
    }

    const savedSettings = saveProfileSettings(settingsForm);
    setSettingsForm(savedSettings);
    setSettingsStatus("Settings saved and applied.");
  };

  const resetSettings = () => {
    const savedSettings = saveProfileSettings(defaultProfileSettings);
    setSettingsForm(savedSettings);
    setSettingsStatus("Settings reset to defaults.");
  };

  useEffect(() => {
    let isMounted = true;

    getCurrentUser()
      .then((response) => {
        if (!isMounted || !response.user) {
          return;
        }

        const currentProfile = toProfile(response.user);
        setSavedProfile(currentProfile);
        setAccountForm(currentProfile);
      })
      .catch(() => {
        // Keep any cached profile visible if the refresh fails.
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!location.state?.profileMessage) {
      return;
    }

    setAccountStatus(location.state.profileMessage);
    setActiveSection("account");
    navigate(location.pathname, { replace: true, state: {} });
  }, [location.pathname, location.state?.profileMessage, navigate]);

  useEffect(() => {
    if (!showNotifications) {
      return undefined;
    }

    const closeNotifications = (event) => {
      if (!notificationRef.current?.contains(event.target)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener("pointerdown", closeNotifications);

    return () => {
      document.removeEventListener("pointerdown", closeNotifications);
    };
  }, [showNotifications]);

  const handleAccountChange = (event) => {
    const { name, value } = event.target;
    setAccountForm((current) => ({ ...current, [name]: value }));
    setAccountStatus("");
    setAccountError("");

    if (name === "email") {
      setAccountStatus("");
    }
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

    if (!EMAIL_PATTERN.test(nextProfile.email)) {
      setAccountError("Enter a valid email address.");
      return;
    }

    setIsSavingAccount(true);
    setAccountError("");
    setAccountStatus("");

    try {
      if (emailChanged) {
        setIsSendingEmailOtp(true);
        const response = await requestEmailChangeOtp({
          email: nextProfile.email,
        });
        navigate("/settings/email-otp", {
          state: {
            name: nextProfile.name,
            email: nextProfile.email,
            message:
              response.message || "OTP sent to your new email address.",
          },
        });
        return;
      }

      const response = await updateCurrentUser({
        ...nextProfile,
      });
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
      setIsSendingEmailOtp(false);
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

    if (passwordForm.currentPassword === passwordForm.newPassword) {
      setPasswordError("New password must be different from current password.");
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
            <button
              type="button"
              className="profile-back-btn"
              onClick={() => navigate("/dashboard")}
            >
              <ArrowLeft size={16} />
              Dashboard
            </button>
            <h1 className="profile-page-title">Profile Settings</h1>
            <p>Manage your profile and security details.</p>
          </div>

          <div className="profile-topbar-right">
            <div className="notification-box-wrap" ref={notificationRef}>
              <button
                type="button"
                className="profile-icon-btn notification-trigger"
                aria-label="Notifications"
                aria-expanded={showNotifications}
                onClick={() => setShowNotifications((current) => !current)}
              >
                <Bell size={18} />
                {notifications.length ? (
                  <span className="notification-count">
                    {notifications.length}
                  </span>
                ) : null}
              </button>

              {showNotifications ? (
                <div className="notification-box" role="status">
                  <div className="notification-box-head">
                    <h2>Notifications</h2>
                    {loginNotification ? (
                      <button type="button" onClick={clearLoginNotification}>
                        Clear login
                      </button>
                    ) : null}
                  </div>

                  {notifications.length ? (
                    <div className="notification-list">
                      {notifications.map((notification) => (
                        <article
                          key={notification.id}
                          className={`notification-item ${notification.tone}`}
                        >
                          <h3>{notification.title}</h3>
                          <p>{notification.message}</p>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <p className="notification-empty">No new notifications.</p>
                  )}
                </div>
              ) : null}
            </div>

            <div className="profile-search">
              <Search size={16} />
              <input type="text" placeholder="Search settings" />
            </div>

            <div className="profile-avatar" aria-label="Current user">
              <span>{initials}</span>
            </div>
          </div>
        </header>

        <section className="profile-shell">
          <aside className="profile-settings-card">
            <div className="profile-settings-card-head">
              <div>
                <span className="profile-settings-card-icon">
                  <SlidersHorizontal size={18} />
                </span>
                <h2>Profile Settings</h2>
              </div>
              <p>General Settings</p>
            </div>
            <nav
              className="profile-settings-nav"
              aria-label="Account settings sections"
            >
              {settingsNavItems.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  className={activeSection === id ? "active" : ""}
                  onClick={() => goToSection(id)}
                >
                  <Icon size={17} />
                  {label}
                </button>
              ))}
            </nav>
          </aside>

          <div className="profile-content">
            <div className="profile-section-kicker">
              {React.createElement(activeSettingsMeta.icon, { size: 18 })}
              <span>{activeSettingsMeta.label}</span>
            </div>

            {activeSection === "account" ? (
            <section className="profile-panel" id="profile-account">
              <div className="profile-panel-head">
                <div>
                  <h2>My Profile</h2>
                  <p>Edit the name and email shown on your account.</p>
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
                  {emailChanged ? (
                    <span className="profile-email-hint">
                      Saving will send an OTP and open a verification page.
                    </span>
                  ) : null}
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
                    disabled={isSavingAccount || isSendingEmailOtp}
                  >
                    {isSendingEmailOtp
                      ? "Sending OTP..."
                      : isSavingAccount
                        ? "Saving..."
                        : emailChanged
                          ? "Continue to OTP"
                          : "Save Profile"}
                  </button>
                </div>
              </form>
            </section>
            ) : null}

            {activeSection === "security" ? (
            <section className="profile-panel" id="profile-security">
              <div className="profile-panel-head">
                <div>
                  <h2>Change Password</h2>
                  <p>
                    Use a strong password to keep your inventory data protected.
                  </p>
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
                  <button
                    type="button"
                    className="profile-inline-btn profile-forgot-password"
                    onClick={() => navigate("/forgot-password")}
                  >
                    Forgot password?
                  </button>
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

                <div className="profile-form-actions profile-password-actions">
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
            ) : null}

            {activeSection === "appearance" ? (
            <section className="profile-panel" id="profile-appearance">
              <div className="profile-panel-head">
                <div>
                  <h2>Appearance & Workspace</h2>
                  <p>Set how the logistics workspace feels when you open it.</p>
                </div>
                <span className="profile-panel-icon">
                  <Palette size={18} />
                </span>
              </div>

              <form
                className="profile-settings-form"
                onSubmit={handleSettingsSubmit}
              >
                <div className="profile-preference-grid">
                  <label className="profile-setting-field">
                    <span>Theme</span>
                    <select
                      name="theme"
                      value={settingsForm.theme}
                      onChange={handleSettingsChange}
                    >
                      <option value="system">Use system setting</option>
                      <option value="light">Light</option>
                      <option value="dark">Dark</option>
                    </select>
                  </label>

                  <label className="profile-setting-field">
                    <span>Interface Density</span>
                    <select
                      name="density"
                      value={settingsForm.density}
                      onChange={handleSettingsChange}
                    >
                      <option value="comfortable">Comfortable</option>
                      <option value="compact">Compact</option>
                    </select>
                  </label>

                  <label className="profile-setting-field">
                    <span>Default Landing Page</span>
                    <select
                      name="defaultView"
                      value={settingsForm.defaultView}
                      onChange={handleSettingsChange}
                    >
                      <option value="dashboard">Dashboard</option>
                      <option value="inventory">Inventory</option>
                      <option value="shipment">Shipment</option>
                      <option value="orders">Sales Orders</option>
                    </select>
                  </label>
                </div>

                {settingsStatus ? (
                  <p className="profile-form-status">
                    <CheckCircle2 size={15} />
                    {settingsStatus}
                  </p>
                ) : null}

                <div className="profile-form-actions">
                  <button type="submit" className="profile-primary-btn">
                    <Save size={15} />
                    Save Appearance
                  </button>
                </div>
              </form>
            </section>
            ) : null}

            {activeSection === "notifications" ? (
            <section className="profile-panel" id="profile-notifications">
              <div className="profile-panel-head">
                <div>
                  <h2>Notifications</h2>
                  <p>Choose the operational alerts you want to see first.</p>
                </div>
                <span className="profile-panel-icon">
                  <BellRing size={18} />
                </span>
              </div>

              <form
                className="profile-settings-form"
                onSubmit={handleSettingsSubmit}
              >
              <div className="profile-toggle-list">
                <label className="profile-toggle-row">
                  <input
                    type="checkbox"
                    name="emailAlerts"
                    checked={settingsForm.emailAlerts}
                    onChange={handleSettingsChange}
                  />
                  <span>
                    <strong>Email notifications</strong>
                    <small>Receive important account and operation updates.</small>
                  </span>
                </label>

                <label className="profile-toggle-row">
                  <input
                    type="checkbox"
                    name="lowStockAlerts"
                    checked={settingsForm.lowStockAlerts}
                    onChange={handleSettingsChange}
                  />
                  <span>
                    <strong>Low-stock alerts</strong>
                    <small>Highlight inventory that needs restocking.</small>
                  </span>
                </label>

                <label className="profile-toggle-row">
                  <input
                    type="checkbox"
                    name="shipmentAlerts"
                    checked={settingsForm.shipmentAlerts}
                    onChange={handleSettingsChange}
                  />
                  <span>
                    <strong>Shipment alerts</strong>
                    <small>Flag pending, in-transit, and delayed shipments.</small>
                  </span>
                </label>

                <label className="profile-toggle-row">
                  <input
                    type="checkbox"
                    name="returnAlerts"
                    checked={settingsForm.returnAlerts}
                    onChange={handleSettingsChange}
                  />
                  <span>
                    <strong>Returns and damage alerts</strong>
                    <small>Surface exceptions that affect stock accuracy.</small>
                  </span>
                </label>
              </div>

              {settingsStatus ? (
                <p className="profile-form-status">
                  <CheckCircle2 size={15} />
                  {settingsStatus}
                </p>
              ) : null}

              <div className="profile-form-actions">
                <button type="submit" className="profile-primary-btn">
                  <Save size={15} />
                  Save Notifications
                </button>
              </div>
              </form>
            </section>
            ) : null}

            {activeSection === "operations" ? (
            <section className="profile-panel" id="profile-operations">
              <div className="profile-panel-head">
                <div>
                  <h2>Logistics Preferences</h2>
                  <p>Set alert timing and regional display defaults.</p>
                </div>
                <span className="profile-panel-icon">
                  <PackageCheck size={18} />
                </span>
              </div>

              <form
                className="profile-settings-form"
                onSubmit={handleSettingsSubmit}
              >
                <div className="profile-preference-grid">
                  <label className="profile-setting-field">
                    <span>Low-stock Alert Threshold</span>
                    <input
                      type="number"
                      min="1"
                      name="stockAlertThreshold"
                      value={settingsForm.stockAlertThreshold}
                      onChange={handleSettingsChange}
                    />
                  </label>

                  <label className="profile-setting-field">
                    <span>Shipment Reminder Window</span>
                    <input
                      type="number"
                      min="1"
                      name="shipmentAlertWindow"
                      value={settingsForm.shipmentAlertWindow}
                      onChange={handleSettingsChange}
                    />
                  </label>

                  <label className="profile-setting-field">
                    <span>Timezone</span>
                    <select
                      name="timezone"
                      value={settingsForm.timezone}
                      onChange={handleSettingsChange}
                    >
                      <option value="Asia/Katmandu">Nepal Time</option>
                      <option value="Asia/Kolkata">India Standard Time</option>
                      <option value="UTC">UTC</option>
                    </select>
                  </label>

                  <label className="profile-setting-field">
                    <span>Currency</span>
                    <select
                      name="currency"
                      value={settingsForm.currency}
                      onChange={handleSettingsChange}
                    >
                      <option value="USD">USD</option>
                      <option value="NPR">NPR</option>
                      <option value="INR">INR</option>
                    </select>
                  </label>
                </div>

                <div className="profile-settings-summary">
                  <article>
                    <Globe2 size={18} />
                    <span>
                      <strong>{settingsForm.timezone}</strong>
                      <small>Regional time display</small>
                    </span>
                  </article>
                  <article>
                    <LayoutDashboard size={18} />
                    <span>
                      <strong>{settingsForm.defaultView}</strong>
                      <small>Preferred start view</small>
                    </span>
                  </article>
                  <article>
                    <Truck size={18} />
                    <span>
                      <strong>{settingsForm.shipmentAlertWindow} days</strong>
                      <small>Shipment reminders</small>
                    </span>
                  </article>
                </div>

                {settingsStatus ? (
                  <p className="profile-form-status">
                    <CheckCircle2 size={15} />
                    {settingsStatus}
                  </p>
                ) : null}

                <div className="profile-form-actions">
                  <button
                    type="button"
                    className="profile-secondary-btn"
                    onClick={resetSettings}
                  >
                    <RotateCcw size={15} />
                    Reset
                  </button>
                  <button type="submit" className="profile-primary-btn">
                    <Save size={15} />
                    Save Settings
                  </button>
                </div>
              </form>
            </section>
            ) : null}
          </div>
        </section>
      </main>
    </div>
  );
}
