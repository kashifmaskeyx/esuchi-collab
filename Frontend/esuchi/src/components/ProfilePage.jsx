import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import {
  Bell,
  CheckCircle2,
  Download,
  KeyRound,
  MonitorCog,
  PackageCheck,
  Search,
  ShieldCheck,
  Trash2,
  UserRound,
} from "lucide-react";
import {
  changeCurrentPassword,
  getCurrentUser,
  getStoredUser,
  requestEmailChangeOtp,
  updateCurrentUser,
} from "../api/auth";
import UserProfileMenu from "./UserProfileMenu";
import logo from "../assets/logo.png";
import "../css/ProfilePage.css";

const readLoginNotification = () => {
  try {
    const storedNotification = sessionStorage.getItem("esuchiLoginNotification");
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
  role: user?.role || "user",
});

const emptyOtp = ["", "", "", "", "", ""];
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const settingsSections = [
  { id: "account", label: "Account", icon: UserRound },
  { id: "security", label: "Security", icon: ShieldCheck },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "theme", label: "Theme", icon: MonitorCog },
  { id: "account-controls", label: "Account Controls", icon: Trash2 },
];

export default function ProfilePage() {
  const navigate = useNavigate();
  const outletContext = useOutletContext();
  const sidebarOpen = outletContext?.sidebarOpen ?? false;
  const profile = useMemo(() => storedProfile(), []);
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef(null);
  const emailOtpRefs = useRef([]);
  const [activeSection, setActiveSection] = useState(() => {
    const sectionId = window.location.hash.replace("#", "");
    return settingsSections.some((section) => section.id === sectionId)
      ? sectionId
      : "account";
  });
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
  const [emailOtp, setEmailOtp] = useState(emptyOtp);
  const [isChangingEmail, setIsChangingEmail] = useState(false);
  const [showEmailOtpCard, setShowEmailOtpCard] = useState(false);
  const [accountStatus, setAccountStatus] = useState("");
  const [accountError, setAccountError] = useState("");
  const [emailOtpStatus, setEmailOtpStatus] = useState("");
  const [emailOtpError, setEmailOtpError] = useState("");
  const [passwordStatus, setPasswordStatus] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [settingsStatus, setSettingsStatus] = useState("");
  const [notificationPrefs, setNotificationPrefs] = useState({
    account: true,
    inventory: true,
    shipment: false,
  });
  const [themePrefs, setThemePrefs] = useState({
    mode: "System",
    accent: "Blue",
    density: "Comfortable",
  });
  const [isSavingAccount, setIsSavingAccount] = useState(false);
  const [isSendingEmailOtp, setIsSendingEmailOtp] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const initials = savedProfile.name
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
  const emailFormatError =
    isChangingEmail && accountForm.email.trim() && !emailPattern.test(accountForm.email.trim())
      ? "Enter a valid email address."
      : "";
  const emailInputError =
    emailFormatError ||
    (!showEmailOtpCard && emailOtpError ? emailOtpError : "");
  const notifications = useMemo(
    () =>
      loginNotification
        ? [{ id: "login-success", ...loginNotification }]
        : [],
    [loginNotification],
  );
  const activeSectionMeta =
    settingsSections.find((section) => section.id === activeSection) ||
    settingsSections[0];

  const clearLoginNotification = () => {
    sessionStorage.removeItem("esuchiLoginNotification");
    setLoginNotification(null);
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
    const syncHashSection = () => {
      const sectionId = window.location.hash.replace("#", "");

      if (settingsSections.some((section) => section.id === sectionId)) {
        setActiveSection(sectionId);
      }
    };

    window.addEventListener("hashchange", syncHashSection);

    return () => {
      window.removeEventListener("hashchange", syncHashSection);
    };
  }, []);

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

  const showSettingsSection = (sectionId) => {
    setActiveSection(sectionId);
    window.history.replaceState(null, "", `#${sectionId}`);
  };

  const handleAccountChange = (event) => {
    const { name, value } = event.target;
    setAccountForm((current) => ({ ...current, [name]: value }));
    setAccountStatus("");
    setAccountError("");

    if (name === "email") {
      setEmailOtp(emptyOtp);
      setEmailOtpStatus("");
      setEmailOtpError("");
      setShowEmailOtpCard(false);
    }
  };

  const handleEmailOtpChange = (value, index) => {
    if (!/^[0-9]?$/.test(value)) {
      return;
    }

    const nextOtp = [...emailOtp];
    nextOtp[index] = value;
    setEmailOtp(nextOtp);
    setAccountError("");
    setEmailOtpError("");

    if (value && index < emailOtp.length - 1) {
      emailOtpRefs.current[index + 1]?.focus();
    }
  };

  const handleEmailOtpKeyDown = (event, index) => {
    if (event.key === "Backspace" && !emailOtp[index] && index > 0) {
      emailOtpRefs.current[index - 1]?.focus();
    }
  };

  const handlePasswordChange = (event) => {
    const { name, value } = event.target;
    setPasswordForm((current) => ({ ...current, [name]: value }));
    setPasswordStatus("");
    setPasswordError("");
  };

  const handleThemeChange = (event) => {
    const { name, value } = event.target;
    setThemePrefs((current) => ({ ...current, [name]: value }));
    setSettingsStatus("");
  };

  const toggleNotificationPref = (key) => {
    setNotificationPrefs((current) => ({
      ...current,
      [key]: !current[key],
    }));
    setSettingsStatus("");
  };

  const handleLocalSettingsSave = () => {
    setSettingsStatus("Settings saved for this session.");
  };

  const handleSendEmailOtp = async () => {
    const email = accountForm.email.trim();
    setAccountStatus("");
    setAccountError("");
    setEmailOtpStatus("");
    setEmailOtpError("");

    if (!email) {
      setEmailOtpError("Enter your new email before requesting an OTP.");
      return;
    }

    if (!emailPattern.test(email)) {
      setEmailOtpError("Enter a valid email address.");
      return;
    }

    if (email.toLowerCase() === savedProfile.email.trim().toLowerCase()) {
      setEmailOtpError("Enter a different email address.");
      return;
    }

    setIsSendingEmailOtp(true);

    try {
      const response = await requestEmailChangeOtp({ email });
      setEmailOtp(emptyOtp);
      setEmailOtpStatus(response.message || "OTP sent to your new email.");
      setShowEmailOtpCard(true);
      window.setTimeout(() => emailOtpRefs.current[0]?.focus(), 0);
    } catch (error) {
      setShowEmailOtpCard(false);
      setEmailOtpError(error.message || "Unable to send OTP.");
    } finally {
      setIsSendingEmailOtp(false);
    }
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

    const emailOtpCode = emailOtp.join("");

    if (emailChanged && emailOtpCode.length !== 6) {
      setEmailOtpError("Enter the full OTP sent to your new email.");
      setShowEmailOtpCard(true);
      return;
    }

    setIsSavingAccount(true);
    setAccountError("");
    setAccountStatus("");

    try {
      const response = await updateCurrentUser({
        ...nextProfile,
        emailOtp: emailOtpCode,
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
      setEmailOtp(emptyOtp);
      setEmailOtpStatus("");
      setEmailOtpError("");
      setIsChangingEmail(false);
      setShowEmailOtpCard(false);
      setAccountStatus(
        emailChanged
          ? "Profile updated. Your new email has been verified."
          : "Profile updated successfully.",
      );
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
          sidebarOpen ? "with-sidebar" : "without-sidebar"
        }`}
      >
        <header className="profile-topbar">
          <div className="profile-topbar-left">
            <h1 className="profile-page-title">{activeSectionMeta.label}</h1>
            <p>Manage your profile, security, and workspace appearance.</p>
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
                    <p className="notification-empty">
                      No new notifications.
                    </p>
                  )}
                </div>
              ) : null}
            </div>

            <div className="profile-search">
              <Search size={16} />
              <input type="text" placeholder="Search settings" />
            </div>

            <UserProfileMenu />
          </div>
        </header>

        <section className="profile-shell">
          <aside className="profile-settings-nav" aria-label="Account settings sections">
            <div className="profile-settings-brand">
              <button
                type="button"
                className="profile-logo-link"
                onClick={() => navigate("/dashboard")}
                aria-label="Back to dashboard"
              >
                <img src={logo} alt="eSuchi" />
              </button>
            </div>
            <p>General Settings</p>
            {settingsSections.map(({ id, label, icon: Icon }) => (
              <button
                type="button"
                className={activeSection === id ? "active" : ""}
                onClick={() => showSettingsSection(id)}
                key={id}
              >
                <Icon size={17} />
                {label}
              </button>
            ))}
          </aside>

          <div className="profile-content">
            {activeSection === "account" ? (
            <section className="profile-panel">
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
                    readOnly={!isChangingEmail}
                    onChange={handleAccountChange}
                    required
                  />
                  <button
                    type="button"
                    className="profile-inline-btn profile-change-email-btn"
                    onClick={() => {
                      setIsChangingEmail((current) => !current);
                      setAccountForm((current) => ({
                        ...current,
                        email: savedProfile.email,
                      }));
                      setEmailOtp(emptyOtp);
                      setEmailOtpStatus("");
                      setEmailOtpError("");
                      setShowEmailOtpCard(false);
                      setAccountError("");
                    }}
                  >
                    {isChangingEmail ? "Cancel email change" : "Change email"}
                  </button>
                </label>

                {isChangingEmail ? (
                  <div className="profile-email-card">
                    <div className="profile-email-card-head">
                      <h3>Verify new email</h3>
                      <p>
                        Enter a new email address, send an OTP, then type the
                        6-digit code before saving your profile.
                      </p>
                    </div>

                    <label className="profile-form-full">
                      <span>New Email Address</span>
                      <input
                        type="email"
                        name="email"
                        value={accountForm.email}
                        onChange={handleAccountChange}
                        placeholder="name@example.com"
                        required
                      />
                      {emailInputError ? (
                        <span className="profile-field-error">
                          {emailInputError}
                        </span>
                      ) : accountForm.email.trim() && emailChanged ? (
                        <span className="profile-field-warning">
                          Make sure this is a real inbox you can access. If the
                          email is invalid, you will not receive the OTP.
                        </span>
                      ) : null}
                    </label>

                    <div className="profile-email-send-row">
                      <button
                        type="button"
                        className="profile-otp-btn"
                        onClick={handleSendEmailOtp}
                        disabled={isSendingEmailOtp || Boolean(emailFormatError)}
                      >
                        {isSendingEmailOtp
                          ? "Checking..."
                          : emailOtpStatus
                            ? "Resend OTP"
                            : "Send OTP"}
                      </button>
                      <span>
                        {emailOtpStatus ||
                          "A 6-digit verification code will be sent to this email."}
                      </span>
                    </div>

                    {emailOtpError && !emailInputError ? (
                      <p className="profile-form-error">{emailOtpError}</p>
                    ) : null}
                  </div>
                ) : null}

                {showEmailOtpCard ? (
                  <div className="profile-email-otp-overlay" role="dialog" aria-modal="true">
                    <div className="profile-email-otp-modal">
                      <img src={logo} alt="eSuchi" className="profile-email-otp-logo" />
                      <h3>Verify your new email</h3>
                      <p>
                        We&apos;ve sent a code to{" "}
                        <strong>{accountForm.email.trim()}</strong>
                      </p>

                      <div className="profile-email-otp-inputs">
                        {emailOtp.map((digit, index) => (
                          <input
                            key={index}
                            type="text"
                            inputMode="numeric"
                            maxLength="1"
                            value={digit}
                            ref={(element) => {
                              emailOtpRefs.current[index] = element;
                            }}
                            onChange={(event) =>
                              handleEmailOtpChange(event.target.value, index)
                            }
                            onKeyDown={(event) =>
                              handleEmailOtpKeyDown(event, index)
                            }
                            aria-label={`Email OTP digit ${index + 1}`}
                          />
                        ))}
                      </div>

                      {emailOtpError ? (
                        <p className="profile-form-error">{emailOtpError}</p>
                      ) : null}

                      <button
                        type="submit"
                        className="profile-primary-btn profile-email-verify-btn"
                        disabled={isSavingAccount}
                      >
                        {isSavingAccount ? "Verifying..." : "Verify and Save"}
                      </button>

                      <p className="profile-email-otp-resend">
                        Didn&apos;t get a code?{" "}
                        <button
                          type="button"
                          onClick={handleSendEmailOtp}
                          disabled={isSendingEmailOtp}
                        >
                          {isSendingEmailOtp ? "Checking..." : "Resend OTP"}
                        </button>
                      </p>

                      <button
                        type="button"
                        className="profile-email-otp-close"
                        onClick={() => setShowEmailOtpCard(false)}
                      >
                        Back to account
                      </button>
                    </div>
                  </div>
                ) : null}

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
            ) : null}

            {activeSection === "security" ? (
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

            {activeSection === "notifications" ? (
            <section className="profile-panel">
              <div className="profile-panel-head">
                <div>
                  <h2>Notifications</h2>
                  <p>Choose which account and inventory updates should reach you.</p>
                </div>
                <span className="profile-panel-icon">
                  <Bell size={18} />
                </span>
              </div>

              <div className="profile-settings-list">
                <div className="profile-setting-row">
                  <div>
                    <strong>Account alerts</strong>
                    <span>Password changes, email verification, and login updates.</span>
                  </div>
                  <button
                    type="button"
                    className={`profile-toggle ${notificationPrefs.account ? "on" : ""}`}
                    onClick={() => toggleNotificationPref("account")}
                    aria-pressed={notificationPrefs.account}
                  />
                </div>
                <div className="profile-setting-row">
                  <div>
                    <strong>Inventory alerts</strong>
                    <span>Low-stock warnings and product movement summaries.</span>
                  </div>
                  <button
                    type="button"
                    className={`profile-toggle ${notificationPrefs.inventory ? "on" : ""}`}
                    onClick={() => toggleNotificationPref("inventory")}
                    aria-pressed={notificationPrefs.inventory}
                  />
                </div>
                <div className="profile-setting-row">
                  <div>
                    <strong>Shipment updates</strong>
                    <span>Delivery status changes and pending shipment reminders.</span>
                  </div>
                  <button
                    type="button"
                    className={`profile-toggle ${notificationPrefs.shipment ? "on" : ""}`}
                    onClick={() => toggleNotificationPref("shipment")}
                    aria-pressed={notificationPrefs.shipment}
                  />
                </div>
              </div>
            </section>
            ) : null}

            {activeSection === "theme" ? (
            <section className="profile-panel">
              <div className="profile-panel-head">
                <div>
                  <h2>Theme</h2>
                  <p>Choose how your workspace should look and feel.</p>
                </div>
                <span className="profile-panel-icon">
                  <MonitorCog size={18} />
                </span>
              </div>

              <div className="profile-form">
                <label>
                  <span>Appearance</span>
                  <select
                    name="mode"
                    value={themePrefs.mode}
                    onChange={handleThemeChange}
                  >
                    <option>System</option>
                    <option>Light</option>
                    <option>Dark</option>
                  </select>
                </label>

                <label>
                  <span>Accent Color</span>
                  <select
                    name="accent"
                    value={themePrefs.accent}
                    onChange={handleThemeChange}
                  >
                    <option>Blue</option>
                    <option>Teal</option>
                    <option>Indigo</option>
                  </select>
                </label>

                <label className="profile-form-full">
                  <span>Dashboard Density</span>
                  <select
                    name="density"
                    value={themePrefs.density}
                    onChange={handleThemeChange}
                  >
                    <option>Comfortable</option>
                    <option>Compact</option>
                    <option>Spacious</option>
                  </select>
                </label>
              </div>
            </section>
            ) : null}

            {activeSection === "account-controls" ? (
            <section className="profile-panel">
              <div className="profile-panel-head">
                <div>
                  <h2>Account Controls</h2>
                  <p>Export your account data or request account removal.</p>
                </div>
                <span className="profile-panel-icon danger">
                  <PackageCheck size={18} />
                </span>
              </div>

              <div className="profile-action-grid">
                <div className="profile-action-card">
                  <div>
                    <h3>Export profile data</h3>
                    <p>Prepare a copy of your profile and preference details.</p>
                  </div>
                  <button type="button" className="profile-secondary-btn">
                    <Download size={16} />
                    Request Export
                  </button>
                </div>
                <div className="profile-action-card danger">
                  <div>
                    <h3>Deactivate account</h3>
                    <p>Ask an administrator to disable access for this account.</p>
                  </div>
                  <button type="button" className="profile-danger-btn">
                    <Trash2 size={16} />
                    Request Deactivation
                  </button>
                </div>
              </div>
            </section>
            ) : null}

            {["notifications", "theme"].includes(activeSection) ? (
            <div className="profile-page-actions">
              {settingsStatus ? (
                <p className="profile-form-status">
                  <CheckCircle2 size={15} />
                  {settingsStatus}
                </p>
              ) : null}
              <button
                type="button"
                className="profile-primary-btn"
                onClick={handleLocalSettingsSave}
              >
                Save Settings
              </button>
            </div>
            ) : null}
          </div>
        </section>
      </main>
    </div>
  );
}
