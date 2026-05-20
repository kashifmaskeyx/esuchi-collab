import React, { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  Bell,
  Check,
  CirclePlus,
  Copy,
  Pencil,
  Search,
  ShieldCheck,
  Trash2,
  UserCheck,
  UsersRound,
  X,
} from "lucide-react";
import { getCurrentUser, getStoredUser } from "../api/auth";
import {
  approveStaff,
  createStaff,
  deleteStaff,
  getStaff,
  rejectStaff,
  updateStaff,
} from "../api/staff";
import UserProfileMenu from "./UserProfileMenu";
import "../css/Operations.css";

const emptyPermissions = {
  inventory: true,
  orders: false,
  shipments: false,
  staff: false,
};

const emptyForm = {
  name: "",
  email: "",
  role: "Viewer",
  status: "invited",
  permissions: emptyPermissions,
};

const permissionLabels = {
  inventory: "Inventory",
  orders: "Orders",
  shipments: "Shipments",
  staff: "Staff",
};

export default function StaffRoles() {
  const { sidebarOpen } = useOutletContext();
  const [currentUser, setCurrentUser] = useState(() => getStoredUser());
  const joinCode = currentUser?.company?.joinCode;
  const [staff, setStaff] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [copiedJoinCode, setCopiedJoinCode] = useState(false);

  const loadStaff = async () => {
    const response = await getStaff();
    setStaff(response.data ?? []);
  };

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        setIsLoading(true);
        setErrorMessage("");
        const response = await getStaff();

        if (isMounted) {
          setStaff(response.data ?? []);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(
            error.response?.data?.message ||
              error.message ||
              "Unable to load staff records.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadData();

    const loadUser = async () => {
      try {
        const response = await getCurrentUser();

        if (isMounted && response.user) {
          setCurrentUser(response.user);
        }
      } catch {
        // Keep the locally stored user if the refresh fails.
      }
    };

    loadUser();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredStaff = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();

    if (!normalized) {
      return staff;
    }

    return staff.filter((member) =>
      [member.name, member.email, member.role, member.status]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [searchTerm, staff]);

  const stats = useMemo(
    () => [
      { label: "Team Members", value: staff.length, icon: UsersRound },
      {
        label: "Active",
        value: staff.filter((member) => member.status === "active").length,
        icon: UserCheck,
      },
      {
        label: "Invited",
        value: staff.filter((member) =>
          ["invited", "pending"].includes(member.status),
        ).length,
        icon: CirclePlus,
      },
      {
        label: "Staff Admins",
        value: staff.filter((member) => member.role?.toLowerCase() === "admin")
          .length,
        icon: ShieldCheck,
      },
    ],
    [staff],
  );

  const openCreateModal = () => {
    setEditingStaff(null);
    setForm(emptyForm);
    setSubmitError("");
    setIsModalOpen(true);
  };

  const openEditModal = (member) => {
    if (member.membershipStatus === "pending") {
      return;
    }

    setEditingStaff(member);
    setForm({
      name: member.name || "",
      email: member.email || "",
      role: member.role || "Viewer",
      status: member.status || "invited",
      permissions: {
        ...emptyPermissions,
        ...(member.permissions || {}),
      },
    });
    setSubmitError("");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (isSubmitting) {
      return;
    }

    setIsModalOpen(false);
    setEditingStaff(null);
    setForm(emptyForm);
    setSubmitError("");
  };

  const updateField = (name, value) => {
    setForm((current) => ({ ...current, [name]: value }));
  };

  const updatePermission = (permission, value) => {
    setForm((current) => ({
      ...current,
      permissions: {
        ...current.permissions,
        [permission]: value,
      },
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError("");

    if (!form.name.trim() || !form.email.trim()) {
      setSubmitError("Name and email are required.");
      return;
    }

    setIsSubmitting(true);

    try {
      if (editingStaff?._id) {
        await updateStaff(editingStaff._id, form);
      } else {
        await createStaff(form);
      }

      await loadStaff();
      closeModal();
    } catch (error) {
      setSubmitError(
        error.response?.data?.message ||
          error.message ||
          "Unable to save staff member.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (member) => {
    if (!window.confirm(`Remove ${member.name}?`)) {
      return;
    }

    try {
      await deleteStaff(member._id);
      await loadStaff();
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message ||
          error.message ||
          "Unable to remove staff member.",
      );
    }
  };

  const handleApprove = async (member) => {
    try {
      await approveStaff(member._id);
      await loadStaff();
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message ||
          error.message ||
          "Unable to approve staff member.",
      );
    }
  };

  const handleReject = async (member) => {
    if (!window.confirm(`Reject ${member.name}?`)) {
      return;
    }

    try {
      await rejectStaff(member._id);
      await loadStaff();
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message ||
          error.message ||
          "Unable to reject staff member.",
      );
    }
  };

  const handleCopyJoinCode = async () => {
    if (!joinCode) {
      return;
    }

    try {
      await navigator.clipboard.writeText(joinCode);
      setCopiedJoinCode(true);
      window.setTimeout(() => setCopiedJoinCode(false), 1800);
    } catch {
      setErrorMessage("Unable to copy join code.");
    }
  };

  return (
    <div className="ops-page">
      <main
        className={`ops-main ${
          sidebarOpen ? "with-sidebar" : "with-collapsed-sidebar"
        }`}
      >
        <header className="ops-topbar">
          <h1 className="ops-page-title">Staff & Roles</h1>
          <div className="ops-topbar-right">
            <button
              type="button"
              className="ops-icon-btn"
              aria-label="Notifications"
            >
              <Bell size={18} />
            </button>
            <UserProfileMenu className="ops-profile-menu" />
          </div>
        </header>

        <section className="ops-hero">
          <div>
            <h2>Right access, right people.</h2>
            <p>Lock down permissions without slowing anyone.</p>
          </div>
          <div className="ops-hero-actions">
            {joinCode ? (
              <div className="ops-join-code">
                <span>Join code</span>
                <strong>{joinCode}</strong>
                <button
                  type="button"
                  className="ops-copy-btn"
                  onClick={handleCopyJoinCode}
                  aria-label="Copy company join code"
                >
                  {copiedJoinCode ? <Check size={15} /> : <Copy size={15} />}
                </button>
              </div>
            ) : null}
            <button
              type="button"
              className="ops-primary-btn"
              onClick={openCreateModal}
            >
              <CirclePlus size={16} />
              Add Staff
            </button>
          </div>
        </section>

        <section className="ops-stats-grid">
          {stats.map((card) => {
            const Icon = card.icon;

            return (
              <article className="ops-stat-card" key={card.label}>
                <div className="ops-stat-head">
                  <div>
                    <p>{card.label}</p>
                    <h3>{card.value}</h3>
                  </div>
                  <span className="ops-stat-icon">
                    <Icon size={18} />
                  </span>
                </div>
              </article>
            );
          })}
        </section>

        <section className="ops-panel">
          <div className="ops-panel-head">
            <div>
              <h3>Access Directory</h3>
              <p>{filteredStaff.length} people matched</p>
            </div>
            <div className="ops-search">
              <Search size={16} />
              <input
                type="text"
                placeholder="Search staff"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
          </div>

          <div className="ops-table-wrap">
            <table className="ops-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Source</th>
                  <th>Permissions</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan="7" className="ops-table-state">
                      Loading staff records...
                    </td>
                  </tr>
                ) : errorMessage ? (
                  <tr>
                    <td colSpan="7" className="ops-table-state error">
                      {errorMessage}
                    </td>
                  </tr>
                ) : filteredStaff.length ? (
                  filteredStaff.map((member) => {
                    const enabledPermissions = Object.entries(
                      member.permissions || {},
                    )
                      .filter(([, enabled]) => enabled)
                      .map(
                        ([permission]) =>
                          permissionLabels[permission] || permission,
                      );

                    return (
                      <tr key={member._id}>
                        <td>{member.name}</td>
                        <td>{member.email}</td>
                        <td>{member.role}</td>
                        <td>
                          <span className={`ops-badge ${member.status}`}>
                            {member.status}
                          </span>
                        </td>
                        <td>
                          {member.membershipStatus === "pending"
                            ? "Join request"
                            : member.source === "invite"
                              ? "Manual invite"
                              : "Company user"}
                        </td>
                        <td>
                          <div className="ops-permission-list">
                            {enabledPermissions.length
                              ? enabledPermissions.map((permission) => (
                                  <span
                                    className="ops-permission-chip"
                                    key={permission}
                                  >
                                    {permission}
                                  </span>
                                ))
                              : "-"}
                          </div>
                        </td>
                        <td>
                          <div className="ops-row-actions">
                            {member.membershipStatus === "pending" ? (
                              <>
                                <button
                                  type="button"
                                  className="ops-row-btn edit"
                                  onClick={() => handleApprove(member)}
                                >
                                  <UserCheck size={14} />
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  className="ops-row-btn delete"
                                  onClick={() => handleReject(member)}
                                >
                                  <X size={14} />
                                  Reject
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  className="ops-row-btn edit"
                                  onClick={() => openEditModal(member)}
                                >
                                  <Pencil size={14} />
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  className="ops-row-btn delete"
                                  onClick={() => handleDelete(member)}
                                >
                                  <Trash2 size={14} />
                                  Delete
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="7" className="ops-table-state">
                      No staff records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {isModalOpen ? (
          <div className="ops-modal-backdrop" onClick={closeModal}>
            <div
              className="ops-modal"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="ops-modal-head">
                <div>
                  <h2>
                    {editingStaff ? "Edit Staff Access" : "Add Staff Member"}
                  </h2>
                  <p>
                    Set role, status, and the exact areas this person can reach.
                  </p>
                </div>
                <button
                  type="button"
                  className="ops-modal-close"
                  onClick={closeModal}
                >
                  <X size={18} />
                </button>
              </div>

              <form className="ops-form" onSubmit={handleSubmit}>
                <label>
                  <span>Name</span>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(event) =>
                      updateField("name", event.target.value)
                    }
                  />
                </label>
                <label>
                  <span>Email</span>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) =>
                      updateField("email", event.target.value)
                    }
                  />
                </label>
                <label>
                  <span>Role</span>
                  <select
                    value={form.role}
                    onChange={(event) =>
                      updateField("role", event.target.value)
                    }
                  >
                    <option value="Admin">Admin</option>
                    <option value="Manager">Manager</option>
                    <option value="Warehouse">Warehouse</option>
                    <option value="Sales">Sales</option>
                    <option value="Viewer">Viewer</option>
                  </select>
                </label>
                <label>
                  <span>Status</span>
                  <select
                    value={form.status}
                    onChange={(event) =>
                      updateField("status", event.target.value)
                    }
                  >
                    <option value="active">Active</option>
                    <option value="invited">Invited</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </label>
                <div className="ops-form-full">
                  <div className="ops-check-grid">
                    {Object.entries(permissionLabels).map(
                      ([permission, label]) => (
                        <label className="ops-check" key={permission}>
                          <input
                            type="checkbox"
                            checked={Boolean(form.permissions[permission])}
                            onChange={(event) =>
                              updatePermission(permission, event.target.checked)
                            }
                          />
                          <span>{label}</span>
                        </label>
                      ),
                    )}
                  </div>
                </div>
                {submitError ? (
                  <p className="ops-form-error">{submitError}</p>
                ) : null}
                <div className="ops-form-actions">
                  <button
                    type="button"
                    className="ops-secondary-btn"
                    onClick={closeModal}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="ops-primary-btn"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Saving..." : "Save Access"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
