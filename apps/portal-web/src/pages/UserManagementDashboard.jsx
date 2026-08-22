import { useEffect, useMemo, useState } from "react";
import {
  createAdminUser,
  deleteAdminUser,
  getAdminActivityLogs,
  getAdminUserDetail,
  getAdminUsers,
  getAdminUsersDashboard,
  getClasses,
  getStudents,
  getSubjectCatalog,
  runAdminUserAction,
  runAdminUsersBulkAction,
  updateAdminUser,
} from "../api/services";
import { TEACHER_ROLES, isTeacherRole } from "../utils/roleHelpers";
import "./PortalAdminModule.css";

const roles = [
  "ADMIN",
  "SUPER_ADMIN",
  "ICT_ADMIN",
  "ADMISSION_OFFICER",
  "ACADEMIC_OFFICER",
  "FINANCE_OFFICER",
  "TRANSPORT_ADMIN",
  "HR_OFFICER",
  "DRIVER",
  ...TEACHER_ROLES,
  "STUDENT",
  "PARENT",
  "APPLICANT",
];

const statuses = ["active", "inactive", "suspended", "archived"];

const userStatusTone = (status) => {
  const key = String(status || "").toLowerCase();
  if (key === "active") return "success";
  if (key === "suspended") return "danger";
  if (key === "inactive") return "warning";
  return "neutral";
};

const emptyForm = {
  name: "",
  username: "",
  password: "",
  phone: "",
  role: "TEACHER",
  status: "active",
  subjects: "",
  studentId: "",
  studentIds: "",
  department: "",
  mustChangePassword: true,
};

function parseCsv(text) {
  return String(text || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function UserManagementDashboard() {
  const [summary, setSummary] = useState(null);
  const [users, setUsers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [subjectCatalog, setSubjectCatalog] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);

  const [filters, setFilters] = useState({
    role: "",
    status: "",
    classId: "",
    search: "",
  });

  const [form, setForm] = useState(emptyForm);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkAction, setBulkAction] = useState("activate");

  const [userDetail, setUserDetail] = useState(null);
  const [draftById, setDraftById] = useState({});

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const selectedStudentOptions = useMemo(
    () => students.map((item) => ({ value: item.id, label: `${item.name} (${item.className})` })),
    [students]
  );

  const allVisibleSelected = useMemo(() => {
    const ids = users.map((u) => String(u.id));
    return ids.length > 0 && ids.every((id) => selectedIds.includes(id));
  }, [users, selectedIds]);

  const loadUsers = async (nextFilters = filters) => {
    const res = await getAdminUsers(nextFilters);
    const rows = Array.isArray(res.data) ? res.data : [];
    setUsers(rows);
    setSelectedIds((prev) => prev.filter((id) => rows.some((u) => String(u.id) === String(id))));
  };

  const loadSummary = async () => {
    const res = await getAdminUsersDashboard();
    setSummary(res.data || null);
  };

  const loadMeta = async () => {
    const [classesRes, studentsRes, catalogRes, logRes] = await Promise.allSettled([
      getClasses(),
      getStudents(),
      getSubjectCatalog(),
      getAdminActivityLogs(),
    ]);

    if (classesRes.status === "fulfilled") setClasses(Array.isArray(classesRes.value.data) ? classesRes.value.data : []);
    if (studentsRes.status === "fulfilled") setStudents(Array.isArray(studentsRes.value.data) ? studentsRes.value.data : []);
    if (catalogRes.status === "fulfilled") setSubjectCatalog(Array.isArray(catalogRes.value.data?.subjects) ? catalogRes.value.data.subjects : []);
    if (logRes.status === "fulfilled") setActivityLogs(Array.isArray(logRes.value.data) ? logRes.value.data : []);
  };

  const loadAll = async () => {
    try {
      setBusy(true);
      setError("");
      setMessage("");
      await Promise.all([loadSummary(), loadUsers(filters), loadMeta()]);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load user management dashboard");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    const run = async () => {
      try {
        setBusy(true);
        await loadUsers(filters);
      } catch (e) {
        setError(e?.response?.data?.message || "Failed to load users");
      } finally {
        setBusy(false);
      }
    };
    run();
  }, [filters.role, filters.status, filters.classId, filters.search]);

  const openDetail = async (userId) => {
    try {
      setBusy(true);
      setError("");
      const res = await getAdminUserDetail(userId);
      setUserDetail(res.data || null);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load user profile detail");
    } finally {
      setBusy(false);
    }
  };

  const createUser = async () => {
    try {
      setBusy(true);
      setError("");
      const payload = {
        ...form,
        subjects: isTeacherRole(form.role) ? parseCsv(form.subjects) : [],
        studentId: form.role === "STUDENT" ? String(form.studentId || "").trim() : "",
        studentIds: form.role === "PARENT" ? parseCsv(form.studentIds) : [],
      };
      await createAdminUser(payload);
      setForm(emptyForm);
      setMessage("User account created successfully.");
      await loadAll();
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to create user");
    } finally {
      setBusy(false);
    }
  };

  const performAction = async (userId, action, data = {}) => {
    try {
      setBusy(true);
      setError("");
      setMessage("");
      const res = await runAdminUserAction(userId, { action, ...data });
      if (res?.data?.temporaryPassword) {
        setMessage(`Temporary password for ${res?.data?.user?.username || "user"}: ${res.data.temporaryPassword}`);
      } else {
        setMessage("User action completed.");
      }
      await Promise.all([loadSummary(), loadUsers(filters), loadMeta()]);
      if (userDetail?.id === userId) await openDetail(userId);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to execute user action");
    } finally {
      setBusy(false);
    }
  };

  const saveInline = async (user) => {
    const draft = draftById[user.id] || {};
    try {
      setBusy(true);
      setError("");
      await updateAdminUser(user.id, {
        role: draft.role || user.role,
        status: draft.status || user.status,
        phone: draft.phone !== undefined ? draft.phone : user.phone,
        department: draft.department !== undefined ? draft.department : user.department,
      });
      setMessage("User profile updated.");
      await Promise.all([loadSummary(), loadUsers(filters), loadMeta()]);
      if (userDetail?.id === user.id) await openDetail(user.id);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to save user profile");
    } finally {
      setBusy(false);
    }
  };

  const applyBulkAction = async () => {
    if (!selectedIds.length) {
      setError("Select one or more users first.");
      return;
    }
    try {
      setBusy(true);
      setError("");
      if (bulkAction === "delete") {
        const approved = window.confirm(`Delete ${selectedIds.length} selected user account(s)? This cannot be undone.`);
        if (!approved) return;
        await Promise.all(selectedIds.map((id) => deleteAdminUser(id)));
        setMessage(`Bulk action complete. Deleted ${selectedIds.length} user(s).`);
      } else {
        const payload =
          bulkAction === "archive"
            ? { userIds: selectedIds, action: "set_status", status: "archived" }
            : { userIds: selectedIds, action: bulkAction };

        const res = await runAdminUsersBulkAction(payload);
        const count = Number(res?.data?.updatedCount || 0);
        setMessage(`Bulk action complete. Updated ${count} user(s).`);
      }
      await Promise.all([loadSummary(), loadUsers(filters), loadMeta()]);
    } catch (e) {
      setError(e?.response?.data?.message || "Bulk action failed");
    } finally {
      setBusy(false);
    }
  };

  const toggleSelect = (id) => {
    const key = String(id);
    setSelectedIds((prev) => (prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]));
  };

  const deleteUser = async (user) => {
    const approved = window.confirm(`Delete ${user.name} (${user.username})? This cannot be undone.`);
    if (!approved) return;
    try {
      setBusy(true);
      setError("");
      await deleteAdminUser(user.id);
      setMessage("User deleted successfully.");
      if (userDetail?.id === user.id) setUserDetail(null);
      await Promise.all([loadSummary(), loadUsers(filters), loadMeta()]);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to delete user");
    } finally {
      setBusy(false);
    }
  };

  const toggleSelectAll = () => {
    const visibleIds = users.map((u) => String(u.id));
    if (!visibleIds.length) return;
    if (allVisibleSelected) {
      setSelectedIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
      return;
    }
    setSelectedIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
  };

  return (
    <div className="admin-module-page">
      <div className="admin-module-shell">
        <section className="admin-module-hero">
          <div>
            <span className="admin-module-kicker">Access Control</span>
            <h1>User Accounts and Access</h1>
            <p>Manage school user accounts, roles, login access, and activity history for admin, staff, parents, students, and applicants.</p>
          </div>
          <div className="admin-module-actions">
            <button type="button" className="secondary" onClick={loadAll} disabled={busy}>{busy ? "Refreshing..." : "Refresh"}</button>
            <button type="button" onClick={applyBulkAction} disabled={busy || selectedIds.length === 0}>Apply Bulk Action ({selectedIds.length})</button>
          </div>
        </section>

        {error ? <div className="admin-alert error">{error}</div> : null}
        {message ? <div className="admin-alert success">{message}</div> : null}

        <section className="admin-stat-grid compact">
          <article className="admin-stat-card"><span>Total Users</span><strong>{summary?.totalUsers || 0}</strong><small>All portal accounts</small></article>
          <article className="admin-stat-card"><span>Active</span><strong>{summary?.activeUsers || 0}</strong><small>Can access portal</small></article>
          <article className="admin-stat-card"><span>Inactive</span><strong>{summary?.inactiveUsers || 0}</strong><small>Temporarily inactive</small></article>
          <article className="admin-stat-card"><span>Suspended</span><strong>{summary?.suspendedUsers || 0}</strong><small>Access blocked</small></article>
          <article className="admin-stat-card"><span>Recent Logins</span><strong>{summary?.recentLoginsToday || 0}</strong><small>Today</small></article>
        </section>

        <section className="admin-card">
          <div className="admin-card-header">
            <div>
              <span className="admin-section-tag">Filters</span>
              <h2>Find and Manage Accounts</h2>
              <p>Filter users by role, status, class, or search text before applying account actions.</p>
            </div>
            <div className="admin-mini-stat"><span>Selected</span><strong>{selectedIds.length}</strong></div>
          </div>
          <div className="admin-toolbar">
            <label className="admin-field"><span>Role</span><select value={filters.role} onChange={(e) => setFilters((prev) => ({ ...prev, role: e.target.value }))}><option value="">All Roles</option>{roles.map((role) => <option key={role} value={role}>{role}</option>)}</select></label>
            <label className="admin-field"><span>Status</span><select value={filters.status} onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}><option value="">All Status</option>{statuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
            <label className="admin-field"><span>Class</span><select value={filters.classId} onChange={(e) => setFilters((prev) => ({ ...prev, classId: e.target.value }))}><option value="">All Classes</option>{classes.map((cls) => <option key={cls.id} value={cls.id}>{cls.name}</option>)}</select></label>
            <label className="admin-field"><span>Search</span><input value={filters.search} onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))} placeholder="Search name/username/phone" /></label>
            <label className="admin-field"><span>Bulk action</span><select value={bulkAction} onChange={(e) => setBulkAction(e.target.value)}><option value="activate">Activate</option><option value="deactivate">Deactivate</option><option value="suspend">Suspend</option><option value="archive">Archive</option><option value="force_password_change">Force Password Change</option><option value="reset_password">Reset Password</option><option value="delete">Delete</option></select></label>
          </div>
        </section>

      <div style={{ overflowX: "auto", border: "1px solid #d8e2ef", borderRadius: 10, background: "#fff", marginBottom: 12 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={thStyle}><input type="checkbox" checked={allVisibleSelected} onChange={toggleSelectAll} /></th>
              <th style={thStyle}>User</th>
              <th style={thStyle}>Role</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Phone</th>
              <th style={thStyle}>Class / Link</th>
              <th style={thStyle}>Last Login</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const draft = draftById[user.id] || {};
              return (
                <tr key={user.id}>
                  <td style={tdStyle}>
                    <input type="checkbox" checked={selectedIds.includes(String(user.id))} onChange={() => toggleSelect(user.id)} />
                  </td>
                  <td style={tdStyle}>
                    <strong>{user.name}</strong>
                    <div style={{ color: "#54657d", fontSize: 12 }}>{user.username}</div>
                  </td>
                  <td style={tdStyle}>
                    <select
                      value={draft.role ?? user.role}
                      onChange={(e) => setDraftById((prev) => ({ ...prev, [user.id]: { ...prev[user.id], role: e.target.value } }))}
                    >
                      {roles.map((role) => <option key={role} value={role}>{role}</option>)}
                    </select>
                  </td>
                  <td style={tdStyle}>
                    <select
                      value={draft.status ?? (user.status || "active")}
                      onChange={(e) => setDraftById((prev) => ({ ...prev, [user.id]: { ...prev[user.id], status: e.target.value } }))}
                    >
                      {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
                    </select>
                  </td>
                  <td style={tdStyle}>
                    <input
                      value={draft.phone ?? (user.phone || "")}
                      onChange={(e) => setDraftById((prev) => ({ ...prev, [user.id]: { ...prev[user.id], phone: e.target.value } }))}
                      style={{ width: 130 }}
                    />
                  </td>
                  <td style={tdStyle}>{user.linkedClassName || (user.wardCount ? `${user.wardCount} ward(s)` : "-")}</td>
                  <td style={tdStyle}>{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : "Never"}</td>
                  <td style={tdStyle}>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <button onClick={() => openDetail(user.id)}>View</button>
                      <button onClick={() => saveInline(user)}>Save</button>
                      <button onClick={() => performAction(user.id, "reset_password")}>Reset</button>
                      <button onClick={() => performAction(user.id, "suspend")}>Suspend</button>
                      <button onClick={() => performAction(user.id, "activate")}>Activate</button>
                      <button onClick={() => performAction(user.id, "set_status", { status: "archived" })}>Archive</button>
                      <button onClick={() => deleteUser(user)} style={{ color: "crimson" }}>Delete</button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {users.length === 0 ? (
              <tr>
                <td style={tdStyle} colSpan={8}>No users found for current filters.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div style={{ border: "1px solid #d8e2ef", borderRadius: 10, padding: 12, marginBottom: 12, background: "#fff" }}>
        <h3 style={{ marginTop: 0 }}>Create New User</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 8 }}>
          <input placeholder="Full name" value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} />
          <input placeholder="Username" value={form.username} onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))} />
          <input placeholder="Temporary Password" type="text" value={form.password} onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))} />
          <input placeholder="Phone" value={form.phone} onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} />
          <select value={form.role} onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}>
            {roles.map((role) => <option key={role} value={role}>{role}</option>)}
          </select>
          <select value={form.status} onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}>
            {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
          <input placeholder="Department" value={form.department} onChange={(e) => setForm((prev) => ({ ...prev, department: e.target.value }))} />
          <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <input
              type="checkbox"
              checked={form.mustChangePassword}
              onChange={(e) => setForm((prev) => ({ ...prev, mustChangePassword: e.target.checked }))}
            />
            Force password change on first login
          </label>

          {isTeacherRole(form.role) ? (
            <input
              list="subject-catalog"
              placeholder="Subjects (comma separated)"
              value={form.subjects}
              onChange={(e) => setForm((prev) => ({ ...prev, subjects: e.target.value }))}
            />
          ) : null}

          {form.role === "STUDENT" ? (
            <input
              list="student-list"
              placeholder="Linked studentId"
              value={form.studentId}
              onChange={(e) => setForm((prev) => ({ ...prev, studentId: e.target.value }))}
            />
          ) : null}

          {form.role === "PARENT" ? (
            <input
              placeholder="Ward studentIds (comma separated)"
              value={form.studentIds}
              onChange={(e) => setForm((prev) => ({ ...prev, studentIds: e.target.value }))}
            />
          ) : null}
        </div>
        <button onClick={createUser} disabled={busy} style={{ marginTop: 10 }}>
          {busy ? "Saving..." : "Create User"}
        </button>
      </div>

      {userDetail ? (
        <div style={{ border: "1px solid #d8e2ef", borderRadius: 10, padding: 12, marginBottom: 12, background: "#fff" }}>
          <h3 style={{ marginTop: 0 }}>User Profile Detail</h3>
          <p><strong>Name:</strong> {userDetail.name}</p>
          <p><strong>Username:</strong> {userDetail.username}</p>
          <p><strong>Role:</strong> {userDetail.role}</p>
          <p><strong>Status:</strong> {userDetail.status}</p>
          <p><strong>Last Login:</strong> {userDetail.lastLoginAt ? new Date(userDetail.lastLoginAt).toLocaleString() : "Never"}</p>
          <p><strong>Must Change Password:</strong> {userDetail.mustChangePassword ? "Yes" : "No"}</p>

          {userDetail.linkedProfile ? (
            <div style={{ marginTop: 8, padding: 8, border: "1px solid #eef2f7", borderRadius: 8 }}>
              <strong>Linked Profile</strong>
              <pre style={{ whiteSpace: "pre-wrap", margin: "6px 0 0", fontSize: 12 }}>
                {JSON.stringify(userDetail.linkedProfile, null, 2)}
              </pre>
            </div>
          ) : null}
        </div>
      ) : null}

      <div style={{ border: "1px solid #d8e2ef", borderRadius: 10, padding: 12, background: "#fff" }}>
        <h3 style={{ marginTop: 0 }}>Recent User Activity Logs</h3>
        <div style={{ maxHeight: 220, overflowY: "auto" }}>
          {activityLogs.slice(0, 40).map((log) => (
            <div key={log.id} style={{ borderBottom: "1px dashed #e4eaf2", padding: "6px 0" }}>
              <strong>{log.action}</strong>
              <div style={{ fontSize: 12, color: "#475569" }}>
                by {log.userId || "system"} | target {log.targetUserId || "-"} | {log.createdAt ? new Date(log.createdAt).toLocaleString() : ""}
              </div>
            </div>
          ))}
          {activityLogs.length === 0 ? <p>No user activity logs have been recorded yet.</p> : null}
        </div>
      </div>

      <datalist id="subject-catalog">
        {subjectCatalog.map((subject) => <option key={subject} value={subject} />)}
      </datalist>
      <datalist id="student-list">
        {selectedStudentOptions.map((student) => <option key={student.value} value={student.value}>{student.label}</option>)}
      </datalist>
      </div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div style={{ border: "1px solid #d8e2ef", borderRadius: 10, padding: 10, background: "#fff" }}>
      <div style={{ fontSize: 12, color: "#54657d" }}>{label}</div>
      <strong style={{ fontSize: 22 }}>{value}</strong>
    </div>
  );
}

const thStyle = {
  borderBottom: "1px solid #d8e2ef",
  padding: 8,
  textAlign: "left",
  background: "#f8fbff",
};

const tdStyle = {
  borderBottom: "1px solid #eef2f7",
  padding: 8,
  verticalAlign: "top",
};















