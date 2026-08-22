import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import {
  addStudent,
  archiveStudent,
  deleteStudent,
  getClasses,
  getStudents,
  updateStudent,
} from "../api/services";
import "./StudentRegistryDashboard.css";

const steps = ["Student Information", "Parent/Guardian", "Academic Placement"];
const terms = ["First Term", "Second Term", "Third Term"];
const genders = ["Female", "Male"];
const studentTypes = ["New", "Returning"];

function currentSession() {
  const now = new Date();
  const year = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
  return `${year}/${year + 1}`;
}

function normalize(value) {
  return String(value || "").trim();
}

function normalizeLoose(value) {
  return normalize(value).toLowerCase().replace(/\s+/g, " ");
}

function validPhone(value) {
  const digits = normalize(value).replace(/\D+/g, "");
  return digits.length >= 10 && digits.length <= 15;
}

function createAdmissionNumber(students) {
  const year = String(new Date().getFullYear());
  const prefix = `ADM/${year}/`;
  let max = 0;

  for (const student of students || []) {
    const value = normalize(student.admissionNumber || student.admissionNo);
    if (!value.startsWith(prefix)) continue;
    const trailing = Number(value.slice(prefix.length));
    if (Number.isFinite(trailing) && trailing > max) max = trailing;
  }

  return `${prefix}${String(max + 1).padStart(4, "0")}`;
}

function newForm(students = []) {
  return {
    firstName: "",
    lastName: "",
    otherName: "",
    dateOfBirth: "",
    gender: "",
    admissionNumber: createAdmissionNumber(students),
    photoUrl: "",
    parentGuardianName: "",
    parentPhone: "",
    alternatePhone: "",
    parentEmail: "",
    homeAddress: "",
    studentType: "New",
    classId: "",
    academicSession: currentSession(),
    academicTerm: "First Term",
    previousSchool: "",
    generatePortalLogin: false,
  };
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Failed to read image file"));
    reader.readAsDataURL(file);
  });
}

function isArchived(student) {
  return Boolean(student?.isArchived || normalizeLoose(student?.status) === "archived");
}

function fullNameFromForm(form) {
  return [form.firstName, form.lastName].map(normalize).filter(Boolean).join(" ");
}

function validateStep(form, stepIndex) {
  if (stepIndex === 0) {
    if (!normalize(form.firstName)) return "First name is required.";
    if (!normalize(form.lastName)) return "Last name is required.";
    if (!normalize(form.dateOfBirth)) return "Date of birth is required.";
    if (!normalize(form.gender)) return "Gender is required.";
    if (!normalize(form.admissionNumber)) return "Admission number is required.";
  }

  if (stepIndex === 1) {
    if (!normalize(form.parentGuardianName)) return "Parent/guardian full name is required.";
    if (!normalize(form.parentPhone)) return "Parent/guardian phone number is required.";
    if (!validPhone(form.parentPhone)) return "Parent/guardian phone number is not valid.";
    if (form.alternatePhone && !validPhone(form.alternatePhone)) return "Alternate phone number is not valid.";
  }

  if (stepIndex === 2) {
    if (!normalize(form.studentType)) return "Student type is required.";
    if (!normalize(form.classId)) return "Class is required.";
    if (!normalize(form.academicSession)) return "Academic session is required.";
    if (!normalize(form.academicTerm)) return "Academic term is required.";
  }

  return "";
}

function findDuplicate(students, form, ignoreId = "") {
  const admission = normalizeLoose(form.admissionNumber || form.admissionNo);
  const first = normalizeLoose(form.firstName);
  const last = normalizeLoose(form.lastName);
  const dob = normalize(form.dateOfBirth);
  const fullName = normalizeLoose(fullNameFromForm(form) || form.name);

  return (students || []).find((student) => {
    if (ignoreId && String(student.id) === String(ignoreId)) return false;
    const existingAdmission = normalizeLoose(student.admissionNumber || student.admissionNo);
    if (admission && existingAdmission && admission === existingAdmission) return true;
    if (!dob || normalize(student.dateOfBirth) !== dob) return false;
    const existingFirst = normalizeLoose(student.firstName);
    const existingLast = normalizeLoose(student.lastName);
    const existingName = normalizeLoose(student.name);
    if (first && last && existingFirst === first && existingLast === last) return true;
    return Boolean(fullName && existingName === fullName);
  }) || null;
}

function buildStudentPayload(form) {
  const firstName = normalize(form.firstName);
  const lastName = normalize(form.lastName);
  return {
    firstName,
    lastName,
    name: [firstName, lastName].filter(Boolean).join(" "),
    otherName: normalize(form.otherName),
    dateOfBirth: normalize(form.dateOfBirth),
    gender: normalize(form.gender),
    admissionNumber: normalize(form.admissionNumber),
    photoUrl: form.photoUrl || "",
    parentGuardianName: normalize(form.parentGuardianName),
    parentPhone: normalize(form.parentPhone),
    alternatePhone: normalize(form.alternatePhone),
    parentEmail: normalize(form.parentEmail),
    homeAddress: normalize(form.homeAddress),
    studentType: normalize(form.studentType).toLowerCase(),
    classId: normalize(form.classId),
    academicSession: normalize(form.academicSession),
    academicTerm: normalize(form.academicTerm),
    previousSchool: normalize(form.previousSchool),
    generatePortalLogin: false,
  };
}

function toEditDraft(student) {
  return {
    firstName: student?.firstName || "",
    lastName: student?.lastName || "",
    otherName: student?.otherName || "",
    dateOfBirth: student?.dateOfBirth || "",
    gender: student?.gender || "",
    admissionNumber: student?.admissionNumber || student?.admissionNo || "",
    photoUrl: student?.photoUrl || "",
    parentGuardianName: student?.parentGuardianName || "",
    parentPhone: student?.parentPhone || "",
    alternatePhone: student?.alternatePhone || "",
    parentEmail: student?.parentEmail || "",
    homeAddress: student?.homeAddress || "",
    studentType: student?.studentType ? String(student.studentType).replace(/\b\w/g, (c) => c.toUpperCase()) : "Returning",
    classId: student?.classId || "",
    academicSession: student?.academicSession || currentSession(),
    academicTerm: student?.academicTerm || "First Term",
    previousSchool: student?.previousSchool || "",
    generatePortalLogin: false,
  };
}

export default function StudentRegistryDashboard() {
  const { user } = useAuth();
  const role = String(user?.originalRole || user?.role || "").toUpperCase();
  const canDeleteStudents = role === "ADMIN" || role === "SUPER_ADMIN";
  const canProvisionAccounts = role === "ADMIN" || role === "SUPER_ADMIN";
  const canOpenReportCards = role === "ADMIN";

  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [credentials, setCredentials] = useState(null);

  const [stepIndex, setStepIndex] = useState(0);
  const [form, setForm] = useState(() => newForm([]));
  const [filters, setFilters] = useState({ classId: "", status: "active", search: "" });
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [editDraft, setEditDraft] = useState(null);

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const [classRes, studentRes] = await Promise.all([getClasses(), getStudents({ archived: "all" })]);
      const classRows = Array.isArray(classRes?.data) ? classRes.data : [];
      const studentRows = Array.isArray(studentRes?.data) ? studentRes.data : [];
      setClasses(classRows);
      setStudents(studentRows);
      setForm((prev) => (prev.admissionNumber ? prev : { ...prev, admissionNumber: createAdmissionNumber(studentRows) }));
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load student registry");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const selectedStudent = useMemo(
    () => students.find((student) => String(student.id) === String(selectedStudentId)) || null,
    [students, selectedStudentId]
  );

  useEffect(() => {
    setEditDraft(selectedStudent ? toEditDraft(selectedStudent) : null);
  }, [selectedStudent]);

  const classNameById = useMemo(() => {
    const map = new Map();
    classes.forEach((cls) => map.set(String(cls.id), cls.name));
    return map;
  }, [classes]);

  const filteredStudents = useMemo(() => {
    const search = normalizeLoose(filters.search);
    return students.filter((student) => {
      const archived = isArchived(student);
      const matchesStatus =
        filters.status === "all" ||
        (filters.status === "archived" ? archived : !archived);
      const matchesClass = !filters.classId || String(student.classId) === String(filters.classId);
      const haystack = [
        student.name,
        student.admissionNumber,
        student.className,
        student.parentGuardianName,
        student.parentPhone,
        student.parentEmail,
      ].map(normalizeLoose).join(" ");
      return matchesStatus && matchesClass && (!search || haystack.includes(search));
    });
  }, [filters, students]);

  const counts = useMemo(() => {
    const active = students.filter((student) => !isArchived(student)).length;
    return { active, archived: students.length - active, total: students.length };
  }, [students]);

  const setField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));
  const setEditField = (field, value) => setEditDraft((prev) => ({ ...(prev || {}), [field]: value }));

  const handlePhoto = async (file, setter) => {
    if (!file) return;
    try {
      const photoUrl = await fileToDataUrl(file);
      setter(photoUrl);
    } catch {
      setError("Failed to read passport photo.");
    }
  };

  const goNext = () => {
    const validation = validateStep(form, stepIndex);
    if (validation) {
      setError(validation);
      return;
    }
    setError("");
    setStepIndex((prev) => Math.min(prev + 1, steps.length - 1));
  };

  const handleAddStudent = async () => {
    for (let i = 0; i < steps.length; i += 1) {
      const validation = validateStep(form, i);
      if (validation) {
        setStepIndex(i);
        setError(validation);
        return;
      }
    }

    const duplicate = findDuplicate(students, form);
    if (duplicate) {
      setError(`Possible duplicate found: ${duplicate.name} (${duplicate.admissionNumber || duplicate.id}).`);
      return;
    }

    try {
      setSaving(true);
      setError("");
      setMessage("");
      setCredentials(null);
      const response = await addStudent(buildStudentPayload(form));
      const created = response?.data || {};
      setSelectedStudentId(String(created.id || ""));
      setCredentials(null);
      setMessage("Student registered successfully. Use Account Provisioning to create the portal login.");
      setForm(newForm([...students, created]));
      setStepIndex(0);
      await load();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to register student");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveStudent = async () => {
    if (!selectedStudent || !editDraft) return;
    for (let i = 0; i < steps.length; i += 1) {
      const validation = validateStep(editDraft, i);
      if (validation) {
        setError(validation);
        return;
      }
    }

    const duplicate = findDuplicate(students, editDraft, selectedStudent.id);
    if (duplicate) {
      setError(`Possible duplicate found: ${duplicate.name} (${duplicate.admissionNumber || duplicate.id}).`);
      return;
    }

    try {
      setSaving(true);
      setError("");
      setMessage("");
      await updateStudent(selectedStudent.id, buildStudentPayload({ ...editDraft, generatePortalLogin: false }));
      setMessage("Student profile and class placement updated.");
      await load();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to update student profile");
    } finally {
      setSaving(false);
    }
  };

  const handleArchiveToggle = async (student, archived) => {
    if (!student) return;
    const label = archived ? "Archive" : "Restore";
    if (!window.confirm(`${label} ${student.name}?`)) return;
    try {
      setSaving(true);
      setError("");
      setMessage("");
      await archiveStudent(student.id, { archived });
      setMessage(archived ? "Student archived." : "Student restored.");
      await load();
    } catch (err) {
      setError(err?.response?.data?.message || `Failed to ${label.toLowerCase()} student`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteStudent = async () => {
    if (!selectedStudent || !canDeleteStudents) return;
    if (!window.confirm(`Delete ${selectedStudent.name} and linked records? Archive is safer unless this was a mistake.`)) return;
    try {
      setSaving(true);
      setError("");
      setMessage("");
      await deleteStudent(selectedStudent.id);
      setSelectedStudentId("");
      setMessage("Student deleted.");
      await load();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to delete student");
    } finally {
      setSaving(false);
    }
  };

  const renderWizardStep = () => {
    if (stepIndex === 0) {
      return (
        <div className="student-registry-form-grid">
          <label><span>First Name *</span><input value={form.firstName} onChange={(e) => setField("firstName", e.target.value)} /></label>
          <label><span>Last Name *</span><input value={form.lastName} onChange={(e) => setField("lastName", e.target.value)} /></label>
          <label><span>Other Name</span><input value={form.otherName} onChange={(e) => setField("otherName", e.target.value)} /></label>
          <label><span>Date of Birth *</span><input type="date" value={form.dateOfBirth} onChange={(e) => setField("dateOfBirth", e.target.value)} /></label>
          <label><span>Gender *</span><select value={form.gender} onChange={(e) => setField("gender", e.target.value)}><option value="">Select gender</option>{genders.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label><span>Admission Number *</span><input value={form.admissionNumber} onChange={(e) => setField("admissionNumber", e.target.value)} /></label>
          <label className="student-registry-wide"><span>Passport Photo Upload</span><input type="file" accept="image/*" onChange={(e) => handlePhoto(e.target.files?.[0], (photoUrl) => setField("photoUrl", photoUrl))} /></label>
          {form.photoUrl ? <img className="student-registry-photo-preview" src={form.photoUrl} alt="Passport preview" /> : null}
        </div>
      );
    }

    if (stepIndex === 1) {
      return (
        <div className="student-registry-form-grid">
          <label><span>Parent/Guardian Full Name *</span><input value={form.parentGuardianName} onChange={(e) => setField("parentGuardianName", e.target.value)} /></label>
          <label><span>Phone Number *</span><input value={form.parentPhone} onChange={(e) => setField("parentPhone", e.target.value)} /></label>
          <label><span>Alternate Phone</span><input value={form.alternatePhone} onChange={(e) => setField("alternatePhone", e.target.value)} /></label>
          <label><span>Email Address</span><input type="email" value={form.parentEmail} onChange={(e) => setField("parentEmail", e.target.value)} /></label>
          <label className="student-registry-wide"><span>Home Address</span><textarea value={form.homeAddress} onChange={(e) => setField("homeAddress", e.target.value)} rows={3} /></label>
        </div>
      );
    }

    return (
      <div className="student-registry-form-grid">
        <label><span>Student Type *</span><select value={form.studentType} onChange={(e) => setField("studentType", e.target.value)}>{studentTypes.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        <label><span>Class *</span><select value={form.classId} onChange={(e) => setField("classId", e.target.value)}><option value="">Select class</option>{classes.map((cls) => <option key={cls.id} value={cls.id}>{cls.name}</option>)}</select></label>
        <label><span>Academic Session *</span><input value={form.academicSession} onChange={(e) => setField("academicSession", e.target.value)} /></label>
        <label><span>Term *</span><select value={form.academicTerm} onChange={(e) => setField("academicTerm", e.target.value)}>{terms.map((term) => <option key={term} value={term}>{term}</option>)}</select></label>
        <label className="student-registry-wide"><span>Previous School</span><input value={form.previousSchool} onChange={(e) => setField("previousSchool", e.target.value)} /></label>
        <div className="student-registry-account-note">
          Portal login credentials are now created only from Account Provisioning after the student record has been saved.
        </div>
      </div>
    );
  };

  return (
    <div className="student-registry-page">
      <header className="student-registry-hero">
        <div>
          <p className="student-registry-kicker">Student Lifecycle Management</p>
          <h2>Student Registration</h2>
          <p>
            Register new pupils, place returning students, manage class movement, preserve archive history, and keep records compatible with CBT and report cards.
          </p>
        </div>
        <div className="student-registry-actions">
          {canOpenReportCards ? <Link to="/dashboard/report-card">Report Cards</Link> : null}
          {canProvisionAccounts ? <Link to="/dashboard/provisioning">Account Provisioning</Link> : null}
        </div>
      </header>

      {error ? <div className="student-registry-alert error">{error}</div> : null}
      {message ? <div className="student-registry-alert success">{message}</div> : null}
      {loading ? <div className="student-registry-alert info">Loading student registry...</div> : null}
      {credentials ? (
        <div className="student-registry-credentials">
          <strong>Portal credentials. Show once only:</strong>
          <span>Username: {credentials.username}</span>
          <span>Password: {credentials.password}</span>
        </div>
      ) : null}

      <section className="student-registry-card">
        <div className="student-registry-card-head">
          <div>
            <h3>Register Student</h3>
            <p>Complete the three steps, then save the student into the selected class.</p>
          </div>
          <div className="student-registry-step-pills">
            {steps.map((step, index) => (
              <button key={step} type="button" className={index === stepIndex ? "active" : ""} onClick={() => setStepIndex(index)}>
                {index + 1}. {step}
              </button>
            ))}
          </div>
        </div>

        {renderWizardStep()}

        <div className="student-registry-wizard-actions">
          <button type="button" disabled={stepIndex === 0 || saving} onClick={() => setStepIndex((prev) => Math.max(prev - 1, 0))}>Back</button>
          {stepIndex < steps.length - 1 ? (
            <button type="button" onClick={goNext} disabled={saving}>Continue</button>
          ) : (
            <button type="button" className="primary" onClick={handleAddStudent} disabled={saving}>{saving ? "Saving..." : "Create Student Record"}</button>
          )}
        </div>
      </section>

      <section className="student-registry-card">
        <div className="student-registry-card-head">
          <div>
            <h3>Returning Student Placement</h3>
            <p>Filter, edit, move class, archive, or restore student records.</p>
          </div>
          <div className="student-registry-counts">
            <span>Active {counts.active}</span>
            <span>Archived {counts.archived}</span>
            <span>Total {counts.total}</span>
          </div>
        </div>

        <div className="student-registry-filters">
          <select value={filters.classId} onChange={(e) => setFilters((prev) => ({ ...prev, classId: e.target.value }))}>
            <option value="">All classes</option>
            {classes.map((cls) => <option key={cls.id} value={cls.id}>{cls.name}</option>)}
          </select>
          <select value={filters.status} onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
            <option value="all">All statuses</option>
          </select>
          <input value={filters.search} onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))} placeholder="Search name, admission no, parent, phone" />
        </div>

        <div className="student-registry-table-wrap">
          <table className="student-registry-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Admission No</th>
                <th>Class</th>
                <th>Parent/Guardian</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student) => {
                const archived = isArchived(student);
                return (
                  <tr key={student.id} className={String(selectedStudentId) === String(student.id) ? "selected" : ""}>
                    <td>
                      <strong>{student.name}</strong>
                      <small>{student.gender || "-"} {student.dateOfBirth ? `| DOB ${student.dateOfBirth}` : ""}</small>
                    </td>
                    <td>{student.admissionNumber || student.admissionNo || "-"}</td>
                    <td>{student.className || classNameById.get(String(student.classId)) || "Not assigned"}</td>
                    <td>
                      <strong>{student.parentGuardianName || "-"}</strong>
                      <small>{student.parentPhone || "-"}</small>
                    </td>
                    <td><span className={`student-registry-status ${archived ? "archived" : "active"}`}>{archived ? "Archived" : "Active"}</span></td>
                    <td>
                      <div className="student-registry-row-actions">
                        <button type="button" onClick={() => setSelectedStudentId(String(student.id))}>Edit</button>
                        <button type="button" onClick={() => setSelectedStudentId(String(student.id))}>Move Class</button>
                        <button type="button" onClick={() => handleArchiveToggle(student, !archived)}>{archived ? "Restore" : "Archive"}</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredStudents.length === 0 ? (
                <tr><td colSpan="6">No students match the current filters.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="student-registry-card">
        <div className="student-registry-card-head">
          <div>
            <h3>Selected Student Details</h3>
            <p>View the full profile, edit lifecycle fields, reassign class, and archive or restore.</p>
          </div>
        </div>

        {!selectedStudent || !editDraft ? (
          <div className="student-registry-empty">Select a student from the table above to edit their profile.</div>
        ) : (
          <div className="student-registry-detail-grid">
            <div className="student-registry-profile-card">
              {editDraft.photoUrl ? <img src={editDraft.photoUrl} alt={selectedStudent.name} /> : <div className="student-registry-photo-empty">No photo</div>}
              <h4>{selectedStudent.name}</h4>
              <p>{selectedStudent.admissionNumber || selectedStudent.id}</p>
              <p>Portal username: {selectedStudent.portalUsername || "Not generated"}</p>
              <p>{selectedStudent.className || classNameById.get(String(selectedStudent.classId)) || "Not assigned"}</p>
              <span className={`student-registry-status ${isArchived(selectedStudent) ? "archived" : "active"}`}>{isArchived(selectedStudent) ? "Archived" : "Active"}</span>
            </div>

            <div className="student-registry-edit-grid">
              <label><span>First Name *</span><input value={editDraft.firstName} onChange={(e) => setEditField("firstName", e.target.value)} /></label>
              <label><span>Last Name *</span><input value={editDraft.lastName} onChange={(e) => setEditField("lastName", e.target.value)} /></label>
              <label><span>Other Name</span><input value={editDraft.otherName} onChange={(e) => setEditField("otherName", e.target.value)} /></label>
              <label><span>Date of Birth *</span><input type="date" value={editDraft.dateOfBirth} onChange={(e) => setEditField("dateOfBirth", e.target.value)} /></label>
              <label><span>Gender *</span><select value={editDraft.gender} onChange={(e) => setEditField("gender", e.target.value)}><option value="">Select gender</option>{genders.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
              <label><span>Admission Number *</span><input value={editDraft.admissionNumber} onChange={(e) => setEditField("admissionNumber", e.target.value)} /></label>
              <label><span>Class *</span><select value={editDraft.classId} onChange={(e) => setEditField("classId", e.target.value)}><option value="">Select class</option>{classes.map((cls) => <option key={cls.id} value={cls.id}>{cls.name}</option>)}</select></label>
              <label><span>Student Type *</span><select value={editDraft.studentType} onChange={(e) => setEditField("studentType", e.target.value)}>{studentTypes.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
              <label><span>Session *</span><input value={editDraft.academicSession} onChange={(e) => setEditField("academicSession", e.target.value)} /></label>
              <label><span>Term *</span><select value={editDraft.academicTerm} onChange={(e) => setEditField("academicTerm", e.target.value)}>{terms.map((term) => <option key={term} value={term}>{term}</option>)}</select></label>
              <label><span>Parent/Guardian *</span><input value={editDraft.parentGuardianName} onChange={(e) => setEditField("parentGuardianName", e.target.value)} /></label>
              <label><span>Phone *</span><input value={editDraft.parentPhone} onChange={(e) => setEditField("parentPhone", e.target.value)} /></label>
              <label><span>Alternate Phone</span><input value={editDraft.alternatePhone} onChange={(e) => setEditField("alternatePhone", e.target.value)} /></label>
              <label><span>Email</span><input type="email" value={editDraft.parentEmail} onChange={(e) => setEditField("parentEmail", e.target.value)} /></label>
              <label className="student-registry-wide"><span>Home Address</span><textarea rows={3} value={editDraft.homeAddress} onChange={(e) => setEditField("homeAddress", e.target.value)} /></label>
              <label className="student-registry-wide"><span>Previous School</span><input value={editDraft.previousSchool} onChange={(e) => setEditField("previousSchool", e.target.value)} /></label>
              <label className="student-registry-wide"><span>Replace Passport Photo</span><input type="file" accept="image/*" onChange={(e) => handlePhoto(e.target.files?.[0], (photoUrl) => setEditField("photoUrl", photoUrl))} /></label>
            </div>

            <div className="student-registry-detail-actions">
              <button type="button" className="primary" onClick={handleSaveStudent} disabled={saving}>{saving ? "Saving..." : "Save Full Profile"}</button>
              <button type="button" onClick={() => handleArchiveToggle(selectedStudent, !isArchived(selectedStudent))} disabled={saving}>
                {isArchived(selectedStudent) ? "Unarchive Student" : "Archive Student"}
              </button>
              {canDeleteStudents ? <button type="button" className="danger" onClick={handleDeleteStudent} disabled={saving}>Delete Student</button> : null}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
