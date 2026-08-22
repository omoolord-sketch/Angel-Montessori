import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  createAdminSiteRoleProfile,
  deleteAdminSiteRoleProfile,
  getAdminSiteRoleProfiles,
  updateAdminSiteRoleProfile,
} from "../api/services";
import { FIXED_SITE_ROLE_TITLES, getFixedSiteRoleProfiles } from "../content/siteRoleProfiles";
import "./PortalSurface.css";
import "./SiteRoleProfilesDashboard.css";

const PAGE_TABS = [
  { key: "leadership", label: "Leadership" },
  { key: "governance", label: "Governance" },
];

const emptyForm = {
  roleTitle: "",
  name: "",
  description: "",
  sortOrder: "",
  imagePreview: "",
  imageDataUrl: "",
  imageFileName: "",
  imageMimeType: "",
};

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Failed to read selected image."));
    reader.readAsDataURL(file);
  });
}

function safeLower(value) {
  return String(value || "").trim().toLowerCase();
}

function bySortOrder(records = []) {
  return [...records].sort((left, right) => {
    const sortDelta = Number(left.sortOrder || 0) - Number(right.sortOrder || 0);
    if (sortDelta !== 0) return sortDelta;
    return String(left.roleTitle || "").localeCompare(String(right.roleTitle || ""));
  });
}

export default function SiteRoleProfilesDashboard() {
  const [activePage, setActivePage] = useState("leadership");
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState(emptyForm);

  const fixedProfiles = useMemo(() => getFixedSiteRoleProfiles(activePage), [activePage]);
  const filteredRecords = useMemo(
    () => bySortOrder(records.filter((item) => safeLower(item.page) === activePage)),
    [records, activePage]
  );

  const loadRecords = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await getAdminSiteRoleProfiles();
      setRecords(Array.isArray(res?.data?.records) ? res.data.records : []);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load leadership and governance profiles.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecords();
  }, []);

  const resetForm = (page = activePage) => {
    setEditingId("");
    setForm(emptyForm);
    setActivePage(page);
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const dataUrl = await readFileAsDataUrl(file);
      setForm((current) => ({
        ...current,
        imagePreview: dataUrl,
        imageDataUrl: dataUrl,
        imageFileName: file.name,
        imageMimeType: file.type || "image/jpeg",
      }));
    } catch (err) {
      setError(err?.message || "Failed to read the selected image.");
    } finally {
      event.target.value = "";
    }
  };

  const startEdit = (record) => {
    setEditingId(record.id);
    setActivePage(safeLower(record.page));
    setForm({
      roleTitle: record.roleTitle || "",
      name: record.name || "",
      description: record.description || "",
      sortOrder: String(record.sortOrder ?? ""),
      imagePreview: record.imagePath || "",
      imageDataUrl: "",
      imageFileName: "",
      imageMimeType: "",
    });
    setMessage("");
    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const payload = {
      page: activePage,
      roleTitle: form.roleTitle,
      name: form.name,
      description: form.description,
      sortOrder: form.sortOrder,
    };

    if (form.imageDataUrl) {
      payload.imageFile = {
        fileName: form.imageFileName || `${activePage}-profile.jpg`,
        mimeType: form.imageMimeType || "image/jpeg",
        dataUrl: form.imageDataUrl,
      };
    }

    try {
      setSaving(true);
      setError("");
      setMessage("");

      if (editingId) {
        await updateAdminSiteRoleProfile(editingId, payload);
        setMessage("Role profile updated.");
      } else {
        await createAdminSiteRoleProfile(payload);
        setMessage("Role profile added.");
      }

      await loadRecords();
      resetForm(activePage);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to save role profile.");
    } finally {
      setSaving(false);
    }
  };

  const removeRecord = async (recordId) => {
    try {
      setSaving(true);
      setError("");
      setMessage("");
      await deleteAdminSiteRoleProfile(recordId);
      setMessage("Role profile removed.");
      if (editingId === recordId) resetForm(activePage);
      await loadRecords();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to remove role profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="portal-surface-page">
      <div className="portal-surface-shell">
        <section className="portal-surface-hero">
          <div className="portal-surface-hero-copy">
            <div className="portal-surface-kicker">School Website Profiles</div>
            <h1 className="portal-surface-title">Leadership & Governance Role Holders</h1>
            <p className="portal-surface-subtitle">
              Use this super admin workspace to keep the changing leadership and governance positions up to date on the
              public website without editing code.
            </p>
            <p className="portal-surface-meta">
              Fixed roles: <strong>{FIXED_SITE_ROLE_TITLES.join(" and ")}</strong>. These remain locked outside this
              workspace.
            </p>
          </div>

          <div className="portal-surface-actions">
            <Link to="/portal" className="portal-surface-action secondary">Portal Home</Link>
            <button type="button" className="portal-surface-action primary" onClick={() => resetForm(activePage)}>
              Add New Profile
            </button>
          </div>
        </section>

        <div className="site-role-tabs">
          {PAGE_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`site-role-tab ${activePage === tab.key ? "active" : ""}`}
              onClick={() => resetForm(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {error ? <div className="site-role-feedback error">{error}</div> : null}
        {message ? <div className="site-role-feedback success">{message}</div> : null}

        <section className="site-role-grid">
          <article className="site-role-panel">
            <div className="site-role-panel-header">
              <div>
                <div className="portal-surface-kicker">Fixed Profiles</div>
                <h2>{activePage === "leadership" ? "Head and Deputy" : "Locked Governance Role"}</h2>
              </div>
            </div>
            <p className="site-role-panel-copy">
              These profiles stay managed directly in the site build so they do not get changed accidentally.
            </p>
            <div className="site-role-fixed-grid">
              {fixedProfiles.map((profile) => (
                <article key={profile.id} className="site-role-fixed-card">
                  <img src={profile.imagePath} alt={`${profile.name}, ${profile.roleTitle}`} />
                  <div>
                    <strong>{profile.name}</strong>
                    <span>{profile.roleTitle}</span>
                    <p>{profile.description}</p>
                  </div>
                </article>
              ))}
            </div>
          </article>

          <article className="site-role-panel">
            <div className="site-role-panel-header">
              <div>
                <div className="portal-surface-kicker">{editingId ? "Update Profile" : "Add Profile"}</div>
                <h2>{activePage === "leadership" ? "Current Leadership Appointments" : "Current Governance Appointments"}</h2>
              </div>
            </div>
            <form className="site-role-form" onSubmit={handleSubmit}>
              <label>
                Role title
                <input
                  type="text"
                  value={form.roleTitle}
                  onChange={(event) => setForm((current) => ({ ...current, roleTitle: event.target.value }))}
                  placeholder={activePage === "leadership" ? "Academic Coordinator" : "Proprietor / Proprietress"}
                  required
                />
              </label>

              <label>
                Full name
                <input
                  type="text"
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Enter the name of the person in charge"
                  required
                />
              </label>

              <label>
                Short profile note
                <textarea
                  rows="4"
                  value={form.description}
                  onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                  placeholder="Briefly explain the responsibility of this role holder"
                />
              </label>

              <div className="site-role-form-row">
                <label>
                  Sort order
                  <input
                    type="number"
                    min="0"
                    value={form.sortOrder}
                    onChange={(event) => setForm((current) => ({ ...current, sortOrder: event.target.value }))}
                    placeholder="1"
                  />
                </label>

                <label>
                  Profile image
                  <input type="file" accept="image/*" onChange={handleFileChange} />
                </label>
              </div>

              {form.imagePreview ? (
                <div className="site-role-image-preview">
                  <img src={form.imagePreview} alt="Selected profile" />
                </div>
              ) : null}

              <div className="site-role-form-actions">
                <button type="submit" className="portal-surface-action primary" disabled={saving}>
                  {saving ? "Saving..." : editingId ? "Update Profile" : "Add Profile"}
                </button>
                {(editingId || form.roleTitle || form.name || form.description || form.imagePreview) ? (
                  <button
                    type="button"
                    className="portal-surface-action secondary"
                    onClick={() => resetForm(activePage)}
                    disabled={saving}
                  >
                    Clear Form
                  </button>
                ) : null}
              </div>
            </form>
          </article>
        </section>

        <section className="site-role-panel">
          <div className="site-role-panel-header">
            <div>
              <div className="portal-surface-kicker">Managed Profiles</div>
              <h2>{activePage === "leadership" ? "Editable Leadership Role Holders" : "Editable Governance Role Holders"}</h2>
            </div>
          </div>

          {loading ? (
            <p className="site-role-panel-copy">Loading current records...</p>
          ) : filteredRecords.length ? (
            <div className="site-role-card-grid">
              {filteredRecords.map((record) => (
                <article key={record.id} className="site-role-card">
                  <div className="site-role-card-media">
                    <img src={record.imagePath || "/assets/logo.png"} alt={`${record.name}, ${record.roleTitle}`} />
                  </div>
                  <div className="site-role-card-copy">
                    <div className="site-role-card-meta">
                      <span>{record.roleTitle}</span>
                      <strong>{record.name}</strong>
                    </div>
                    <p>{record.description || "No profile note added yet."}</p>
                    <small>Sort order: {record.sortOrder || 0}</small>
                  </div>
                  <div className="site-role-card-actions">
                    <button type="button" onClick={() => startEdit(record)} className="portal-surface-action secondary">
                      Edit
                    </button>
                    <button type="button" onClick={() => removeRecord(record.id)} className="site-role-danger-btn" disabled={saving}>
                      Remove
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="portal-surface-empty">
              No editable {activePage} role-holder profiles have been added yet. Add the current position holders here
              and the website will use them automatically.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
