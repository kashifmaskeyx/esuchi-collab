import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
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
  getCurrentUser,
  getStoredUser,
  requestEmailChangeOtp,
  updateCurrentUser,
} from "../api/auth";
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
});

export default function ProfilePage() {
  const navigate = useNavigate();
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
  const [emailOtp, setEmailOtp] = useState("");
  const [accountStatus, setAccountStatus] = useState("");
  const [accountError, setAccountError] = useState("");
  const [emailOtpStatus, setEmailOtpStatus] = useState("");
  const [emailOtpError, setEmailOtpError] = useState("");
  const [passwordStatus, setPasswordStatus] = useState("");
  const [passwordError, setPasswordError] = useState("");
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
  const notifications = useMemo(
    () =>
      loginNotification
        ? [{ id: "login-success", ...loginNotification }]
        : [],
    [loginNotification],
  );

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
      setEmailOtp("");
      setEmailOtpStatus("");
      setEmailOtpError("");
    }
  };

  const handlePasswordChange = (event) => {
    const { name, value } = event.target;
    setPasswordForm((current) => ({ ...current, [name]: value }));
    setPasswordStatus("");
    setPasswordError("");
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

    setIsSendingEmailOtp(true);

    try {
      const response = await requestEmailChangeOtp({ email });
      setEmailOtpStatus(response.message || "OTP sent to your new email.");
    } catch (error) {
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

    if (emailChanged && !emailOtp.trim()) {
      setAccountError("Enter the OTP sent to your new email.");
      return;
    }

    setIsSavingAccount(true);
    setAccountError("");
    setAccountStatus("");

    try {
      const response = await updateCurrentUser({
        ...nextProfile,
        emailOtp: emailOtp.trim(),
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
      setEmailOtp("");
      setEmailOtpStatus("");
      setEmailOtpError("");
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
          sidebarOpen ? "with-sidebar" : "with-collapsed-sidebar"
        }`}
      >
        <header className="profile-topbar">
          <div className="profile-topbar-left">
            <h1 className="profile-page-title">Account Settings</h1>
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

            <div className="profile-avatar" aria-label="Current user">
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
                    <div className="profile-email-verification">
                      <span>Verification required for this new email.</span>
                      <div className="profile-otp-row">
                        <input
                          type="text"
                          inputMode="numeric"
                          name="emailOtp"
                          placeholder="Enter OTP"
                          value={emailOtp}
                          onChange={(event) => {
                            setEmailOtp(event.target.value);
                            setAccountError("");
                            setEmailOtpError("");
                          }}
                        />
                        <button
                          type="button"
                          className="profile-otp-btn"
                          onClick={handleSendEmailOtp}
                          disabled={isSendingEmailOtp}
                        >
                          {isSendingEmailOtp ? "Sending..." : "Send OTP"}
                        </button>
                      </div>
                      {emailOtpStatus ? (
                        <span className="profile-otp-status">
                          {emailOtpStatus}
                        </span>
                      ) : null}
                      {emailOtpError ? (
                        <span className="profile-otp-error">{emailOtpError}</span>
                      ) : null}
                    </div>
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
          </div>
        </section>
      </main>
    </div>
  );
}
