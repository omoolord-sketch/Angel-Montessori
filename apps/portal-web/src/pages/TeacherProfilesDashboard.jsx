import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  createTeacherProfile,
  deactivateTeacherProfile,
  deleteTeacherProfile,
  getTeacherProfileSetup,
  getTeacherProfiles,
  reactivateTeacherProfile,
  updateTeacherProfile,
} from "../api/services";
import "./TeacherProfilesDashboard.css";

const emptyForm = {
  linked_user_id: "",
  career_application_id: "",
  full_name: "",
  role: "",
  department: "",
  qualification: "",
  experience_years: 0,
  bio: "",
  photo_url: "",
  date_joined: "",
  status: "active",
};

function profileValue(profile, key, fallback = "") {
  return profile?.[key] ?? profile?.[key.replace(/_([a-z])/g, (_, char) => char.toUpperCase())] ?? fallback;
}

function formatStatus(value) {
  return String(value || "active").toLowerCase() === "inactive" ? "Inactive" : "Active";
}

function formatRoleLabel(value) {
  return String(value || "Staff")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function initials(name) {
  return String(name || "AM")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "AM";
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Unable to read selected photo."));
    reader.readAsDataURL(file);
  });
}

function applyStaffDefaults(prev, staff) {
  if (!staff) return prev;
  return {
    ...prev,
    linked_user_id: staff.id || "",
    full_name: prev.full_name || staff.name || "",
    role: prev.role || staff.jobTitle || formatRoleLabel(staff.role),
    department: prev.department || staff.department || "",
    qualification: prev.qualification || staff.qualification || "",
    experience_years: Number(prev.experience_years || staff.experienceYears || 0) || 0,
    photo_url: prev.photo_url || staff.photoUrl || "",
  };
}

function applyRecruitmentDefaults(prev, application) {
  if (!application) return prev;
  return {
    ...prev,
    career_application_id: application.id || "",
    full_name: prev.full_name || application.fullName || "",
    role: prev.role || application.vacancyTitle || "Teacher",
    department: prev.department || application.department || application.teachingCategory || "",
    qualification: prev.qualification || application.qualification || "",
    experience_years: Number(prev.experience_years || application.experienceYears || 0) || 0,
    photo_url: prev.photo_url || application.passportPhotoUrl || "",
  };
}

export default function TeacherProfilesDashboard() {
  const [profiles, setProfiles] = useState([]);
  const [staffUsers, setStaffUsers] = useState([]);
  const [recruitmentApplications, setRecruitmentApplications] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [photoUpload, setPhotoUpload] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [editingId, setEditingId] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);

  const activeCount = useMemo(() => profiles.filter((profile) => profile.status === "active").length, [profiles]);
  const inactiveCount = profiles.length - activeCount;

  const loadProfiles = async () => {
    try {
      setLoading(true);
      setError("");
      const params = {
        search: search.trim() || undefined,
        status: statusFilter === "all" ? undefined : statusFilter,
      };
      const res = await getTeacherProfiles(params);
      setProfiles(res?.data?.teachers || []);
      if (Array.isArray(res?.data?.staffUsers)) setStaffUsers(res.data.staffUsers);
      if (Array.isArray(res?.data?.recruitmentApplications)) setRecruitmentApplications(res.data.recruitmentApplications);
    } catch (err) {
      setError(err?.response?.data?.message || "We could not load teacher profiles.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    async function loadInitialData() {
      try {
        const setupRes = await getTeacherProfileSetup();
        setStaffUsers(setupRes?.data?.staffUsers || []);
        setRecruitmentApplications(setupRes?.data?.recruitmentApplications || []);
      } catch (err) {
        setError(err?.response?.data?.message || "We could not load account and recruitment links.");
      }
      await loadProfiles();
    }

    loadInitialData();
  }, []);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId("");
    setPhotoUpload(null);
    setPhotoPreview("");
  };

  const handleEdit = (profile) => {
    setEditingId(profile.id);
    setForm({
      linked_user_id: profileValue(profile, "linked_user_id"),
      career_application_id: profileValue(profile, "career_application_id"),
      full_name: profileValue(profile, "full_name"),
      role: profileValue(profile, "role"),
      department: profileValue(profile, "department"),
      qualification: profileValue(profile, "qualification"),
      experience_years: Number(profileValue(profile, "experience_years", 0)) || 0,
      bio: profileValue(profile, "bio"),
      photo_url: profileValue(profile, "photo_url"),
      date_joined: profileValue(profile, "date_joined"),
      status: profileValue(profile, "status", "active"),
    });
    setPhotoUpload(null);
    setPhotoPreview(profileValue(profile, "photo_url"));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePhotoChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!String(file.type || "").startsWith("image/")) {
      setError("Please choose a valid image file for the profile photo.");
      return;
    }

    try {
      const dataUrl = await fileToDataUrl(file);
      setPhotoUpload({
        dataUrl,
        fileName: file.name || "teacher-profile-photo",
        mimeType: file.type || "image/jpeg",
      });
      setPhotoPreview(String(dataUrl));
      setError("");
    } catch (err) {
      setError(err.message || "Unable to read selected photo.");
    }
  };

  const handleStaffLinkChange = (event) => {
    const linkedUserId = event.target.value;
    const staff = staffUsers.find((item) => String(item.id) === String(linkedUserId));
    setForm((prev) => applyStaffDefaults({ ...prev, linked_user_id: linkedUserId }, staff));
    if (staff?.photoUrl) setPhotoPreview((current) => current || staff.photoUrl);
  };

  const handleRecruitmentLinkChange = (event) => {
    const careerApplicationId = event.target.value;
    const application = recruitmentApplications.find((item) => String(item.id) === String(careerApplicationId));
    setForm((prev) => applyRecruitmentDefaults({ ...prev, career_application_id: careerApplicationId }, application));
    if (application?.passportPhotoUrl) setPhotoPreview((current) => current || application.passportPhotoUrl);
  };

  const validateForm = () => {
    if (!form.full_name.trim()) return "Full name is required.";
    if (!form.role.trim()) return "Role or job title is required.";
    if (Number(form.experience_years) < 0) return "Experience years cannot be negative.";
    return "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationMessage = validateForm();
    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    const payload = {
      ...form,
      experience_years: Number(form.experience_years) || 0,
      photoUpload,
    };

    try {
      setSaving(true);
      setError("");
      setNotice("");
      if (editingId) {
        await updateTeacherProfile(editingId, payload);
        setNotice("Teacher profile updated successfully.");
      } else {
        await createTeacherProfile(payload);
        setNotice("Teacher profile created successfully.");
      }
      resetForm();
      await loadProfiles();
    } catch (err) {
      setError(err?.response?.data?.message || "We could not save this teacher profile.");
    } finally {
      setSaving(false);
    }
  };

  const runStatusAction = async (profile, action) => {
    try {
      setSaving(true);
      setError("");
      setNotice("");
      if (action === "deactivate") {
        await deactivateTeacherProfile(profile.id);
        setNotice(`${profile.full_name || profile.fullName} has been deactivated.`);
      } else {
        await reactivateTeacherProfile(profile.id);
        setNotice(`${profile.full_name || profile.fullName} has been reactivated.`);
      }
      await loadProfiles();
    } catch (err) {
      setError(err?.response?.data?.message || "We could not update this profile status.");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      setSaving(true);
      setError("");
      setNotice("");
      await deleteTeacherProfile(deleteTarget.id);
      setDeleteTarget(null);
      setNotice("Teacher profile permanently deleted.");
      if (editingId === deleteTarget.id) resetForm();
      await loadProfiles();
    } catch (err) {
      setError(err?.response?.data?.message || "We could not delete this teacher profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="teacher-profiles-page">
      <div className="teacher-profiles-shell">
        <section className="teacher-profiles-hero">
          <div>
            <div className="teacher-profiles-kicker">Careers / Staff Profiles</div>
            <h1>Teacher and staff registration profiles</h1>
            <p>
              Add, update, deactivate, reactivate, and safely remove the staff profiles shown on the public Careers page.
              Inactive staff remain available here for internal records but are hidden publicly.
            </p>
          </div>
          <div className="teacher-profiles-hero-actions">
            <Link to="/dashboard/careers">Careers Dashboard</Link>
            <Link to="/careers">Public Careers Page</Link>
          </div>
        </section>

        {error ? <div className="teacher-profiles-alert error">{error}</div> : null}
        {notice ? <div className="teacher-profiles-alert success">{notice}</div> : null}

        <div className="teacher-profiles-summary">
          <article>
            <strong>{profiles.length}</strong>
            <span>Total Profiles</span>
          </article>
          <article>
            <strong>{activeCount}</strong>
            <span>Active Public Profiles</span>
          </article>
          <article>
            <strong>{inactiveCount}</strong>
            <span>Inactive Records</span>
          </article>
        </div>

        <section className="teacher-profiles-grid">
          <form className="teacher-profiles-form-card" onSubmit={handleSubmit}>
            <div className="teacher-profiles-form-heading">
              <div>
                <div className="teacher-profiles-kicker">{editingId ? "Edit Profile" : "New Profile"}</div>
                <h2>{editingId ? "Update teacher profile" : "Register teacher or staff"}</h2>
              </div>
              {editingId ? (
                <button type="button" className="teacher-profiles-light-button" onClick={resetForm}>
                  Cancel Edit
                </button>
              ) : null}
            </div>

            <div className="teacher-profiles-link-panel">
              <label>
                <span>Link existing portal account</span>
                <select value={form.linked_user_id} onChange={handleStaffLinkChange}>
                  <option value="">Create profile without account link</option>
                  {staffUsers.map((staff) => (
                    <option key={staff.id} value={staff.id}>
                      {staff.name} - {formatRoleLabel(staff.role)}{staff.username ? ` (${staff.username})` : ""}
                    </option>
                  ))}
                </select>
                <small>Use this when the teacher/staff login account already exists. ID Cards will read this linked profile photo and details.</small>
              </label>

              <label>
                <span>Link recruitment application</span>
                <select value={form.career_application_id} onChange={handleRecruitmentLinkChange}>
                  <option value="">No recruitment application linked</option>
                  {recruitmentApplications.map((application) => (
                    <option key={application.id} value={application.id}>
                      {application.fullName} - {application.vacancyTitle || "Recruitment"} [{formatStatus(application.status)}]
                    </option>
                  ))}
                </select>
                <small>Use this after a candidate is shortlisted, interviewed, offered, or hired through Careers/Recruitment.</small>
              </label>
            </div>

            <div className="teacher-profiles-photo-row">
              {photoPreview ? (
                <img src={photoPreview} alt="Teacher preview" className="teacher-profiles-photo-preview" />
              ) : (
                <div className="teacher-profiles-photo-placeholder">{initials(form.full_name)}</div>
              )}
              <label className="teacher-profiles-upload">
                <span>Upload / update photo</span>
                <input type="file" accept="image/*" onChange={handlePhotoChange} />
              </label>
            </div>

            <div className="teacher-profiles-form-fields">
              <label>
                <span>Full Name *</span>
                <input value={form.full_name} onChange={(event) => setForm((prev) => ({ ...prev, full_name: event.target.value }))} placeholder="e.g. Deborah Ayomikun Olorunnibe" required />
              </label>
              <label>
                <span>Role / Job Title *</span>
                <input value={form.role} onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value }))} placeholder="e.g. Class Teacher" required />
              </label>
              <label>
                <span>Department</span>
                <input value={form.department} onChange={(event) => setForm((prev) => ({ ...prev, department: event.target.value }))} placeholder="e.g. Basic School" />
              </label>
              <label>
                <span>Qualification</span>
                <input value={form.qualification} onChange={(event) => setForm((prev) => ({ ...prev, qualification: event.target.value }))} placeholder="e.g. NCE, B.Ed, Montessori Diploma" />
              </label>
              <label>
                <span>Experience Years</span>
                <input type="number" min="0" value={form.experience_years} onChange={(event) => setForm((prev) => ({ ...prev, experience_years: event.target.value }))} />
              </label>
              <label>
                <span>Date Joined</span>
                <input type="date" value={form.date_joined} onChange={(event) => setForm((prev) => ({ ...prev, date_joined: event.target.value }))} />
              </label>
              <label>
                <span>Status</span>
                <select value={form.status} onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>
              <label className="teacher-profiles-wide-field">
                <span>Bio</span>
                <textarea value={form.bio} onChange={(event) => setForm((prev) => ({ ...prev, bio: event.target.value }))} placeholder="Brief professional profile for the public Careers page." rows={5} />
              </label>
            </div>

            <button type="submit" className="teacher-profiles-primary-button" disabled={saving}>
              {saving ? "Saving..." : editingId ? "Save Profile Changes" : "Add Teacher Profile"}
            </button>
          </form>

          <section className="teacher-profiles-list-card">
            <div className="teacher-profiles-list-heading">
              <div>
                <div className="teacher-profiles-kicker">Profile Records</div>
                <h2>Manage active and inactive staff</h2>
              </div>
            </div>

            <div className="teacher-profiles-filters">
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, role, department..." />
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="all">All statuses</option>
                <option value="active">Active only</option>
                <option value="inactive">Inactive only</option>
              </select>
              <button type="button" onClick={loadProfiles}>Apply</button>
            </div>

            {loading ? <div className="teacher-profiles-empty">Loading teacher profiles...</div> : null}

            {!loading && !profiles.length ? (
              <div className="teacher-profiles-empty">
                No teacher profiles found yet. Add the first profile using the form beside this list.
              </div>
            ) : null}

            <div className="teacher-profiles-list">
              {profiles.map((profile) => {
                const name = profile.full_name || profile.fullName;
                const photo = profile.photo_url || profile.photoUrl;
                const isActive = profile.status === "active";
                return (
                  <article key={profile.id} className={`teacher-profiles-row ${isActive ? "" : "inactive"}`}>
                    {photo ? (
                      <img src={photo} alt={name} className="teacher-profiles-avatar" />
                    ) : (
                      <div className="teacher-profiles-avatar placeholder">{initials(name)}</div>
                    )}
                    <div className="teacher-profiles-row-main">
                      <div className="teacher-profiles-row-title">
                        <strong>{name}</strong>
                        <span className={isActive ? "active" : "inactive"}>{formatStatus(profile.status)}</span>
                      </div>
                      <p>{profile.role || "Staff"} {profile.department ? `- ${profile.department}` : ""}</p>
                      <div className="teacher-profiles-row-meta">
                        <span>{profile.qualification || "Qualification not added"}</span>
                        <span>{Number(profile.experience_years || profile.experienceYears || 0)} years experience</span>
                        <span>Joined: {formatDate(profile.date_joined || profile.dateJoined)}</span>
                        {!isActive ? <span>Left: {formatDate(profile.date_left || profile.dateLeft)}</span> : null}
                        {profile.linkedUser ? <span>Account: {profile.linkedUser.username || profile.linkedUser.name}</span> : <span>No account linked</span>}
                        {profile.linkedRecruitmentApplication ? <span>Recruitment: {profile.linkedRecruitmentApplication.applicationNumber || profile.linkedRecruitmentApplication.fullName}</span> : null}
                      </div>
                      {profile.bio ? <p className="teacher-profiles-bio">{profile.bio}</p> : null}
                      <div className="teacher-profiles-actions">
                        <button type="button" onClick={() => handleEdit(profile)}>Edit</button>
                        {isActive ? (
                          <button type="button" onClick={() => runStatusAction(profile, "deactivate")}>Deactivate</button>
                        ) : (
                          <button type="button" onClick={() => runStatusAction(profile, "reactivate")}>Reactivate</button>
                        )}
                        <button type="button" className="danger" onClick={() => setDeleteTarget(profile)}>Delete Permanently</button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </section>
      </div>

      {deleteTarget ? (
        <div className="teacher-profiles-modal-backdrop" role="presentation">
          <div className="teacher-profiles-modal" role="dialog" aria-modal="true" aria-labelledby="delete-teacher-title">
            <h2 id="delete-teacher-title">Delete teacher profile permanently?</h2>
            <p>
              This will remove <strong>{deleteTarget.full_name || deleteTarget.fullName}</strong> from the school records in this module.
              If the person only left the school, use Deactivate instead.
            </p>
            <div className="teacher-profiles-modal-actions">
              <button type="button" onClick={() => setDeleteTarget(null)} disabled={saving}>Cancel</button>
              <button type="button" className="danger" onClick={confirmDelete} disabled={saving}>
                {saving ? "Deleting..." : "Yes, Delete Permanently"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
