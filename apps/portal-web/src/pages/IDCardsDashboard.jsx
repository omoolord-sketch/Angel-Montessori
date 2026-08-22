import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getAdminUsers, getClasses, getStudents } from "../api/services";
import {
  IDCardPreview,
  IDCardPrintLayout,
  IDCardTemplateSelector,
} from "../components/idCards/IDCardComponents";
import "./IDCardsDashboard.css";

const STAFF_EXCLUDED_ROLES = new Set(["STUDENT", "PARENT", "APPLICANT"]);

function getCurrentAcademicSession() {
  const now = new Date();
  const startYear = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
  return `${startYear}/${startYear + 1}`;
}

function getDefaultExpiryDate() {
  const now = new Date();
  const sessionEndYear = now.getMonth() >= 7 ? now.getFullYear() + 1 : now.getFullYear();
  return `${sessionEndYear}-07-31`;
}

function unwrapRows(response, keys = []) {
  const data = response?.data;
  if (Array.isArray(data)) return data;
  for (const key of keys) {
    if (Array.isArray(data?.[key])) return data[key];
  }
  return [];
}

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function getStudentName(student) {
  return (
    student?.name ||
    [student?.firstName, student?.otherName, student?.lastName].filter(Boolean).join(" ") ||
    "Unnamed student"
  );
}

function getStudentClassKey(student) {
  return String(student?.classId || student?.className || student?.class || "");
}

function getStudentClassLabel(student) {
  return String(student?.className || student?.class?.name || student?.class || "No class");
}

function getStaffName(staff) {
  return staff?.name || staff?.fullName || staff?.username || "Unnamed staff";
}

function formatRole(value) {
  return String(value || "Staff")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function uniqueOptions(rows, getter) {
  return Array.from(
    new Map(
      rows
        .map((row) => getter(row))
        .filter((item) => item?.value)
        .map((item) => [String(item.value), item])
    ).values()
  ).sort((a, b) => a.label.localeCompare(b.label));
}

export default function IDCardsDashboard({ mode = "overview" }) {
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [staff, setStaff] = useState([]);
  const [template, setTemplate] = useState("classic-navy");
  const [studentFilters, setStudentFilters] = useState({ classKey: "", status: "active", search: "" });
  const [staffFilters, setStaffFilters] = useState({ role: "", department: "", search: "" });
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [selectedStaffIds, setSelectedStaffIds] = useState([]);
  const [options, setOptions] = useState({
    academicSession: getCurrentAcademicSession(),
    issueDate: new Date().toISOString().slice(0, 10),
    expiryDate: getDefaultExpiryDate(),
    includeDob: false,
  });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const isStudentMode = mode === "students";
  const isStaffMode = mode === "staff";
  const isTemplateMode = mode === "templates";

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");
      const [studentsRes, classesRes, staffRes] = await Promise.allSettled([
        getStudents(),
        getClasses(),
        getAdminUsers({ status: "active" }),
      ]);

      if (studentsRes.status === "fulfilled") setStudents(unwrapRows(studentsRes.value, ["students", "items"]));
      if (classesRes.status === "fulfilled") setClasses(unwrapRows(classesRes.value, ["classes", "items"]));
      if (staffRes.status === "fulfilled") {
        const rows = unwrapRows(staffRes.value, ["users", "items"]);
        setStaff(rows.filter((user) => !STAFF_EXCLUDED_ROLES.has(String(user?.role || "").toUpperCase())));
      }

      const failed = [studentsRes, classesRes, staffRes].some((res) => res.status === "rejected");
      if (failed) setMessage("Some records could not be loaded. You can refresh this page after confirming the API is live.");
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load ID card data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const classOptions = useMemo(() => {
    const fromClasses = classes.map((item) => ({
      value: String(item?.id || item?.name || ""),
      label: item?.name || item?.className || String(item?.id || "Class"),
    }));
    const fromStudents = students.map((student) => ({
      value: getStudentClassKey(student),
      label: getStudentClassLabel(student),
    }));
    return uniqueOptions([...fromClasses, ...fromStudents], (item) => item);
  }, [classes, students]);

  const studentRows = useMemo(() => {
    return students.filter((student) => {
      const status = String(student?.status || "").toLowerCase();
      const archived = Boolean(student?.isArchived) || status === "archived";
      const statusOk =
        studentFilters.status === "all" ||
        (studentFilters.status === "active" && !archived) ||
        (studentFilters.status === "archived" && archived);
      const classOk = !studentFilters.classKey || getStudentClassKey(student) === studentFilters.classKey;
      const searchNeedle = normalize(`${getStudentName(student)} ${student?.admissionNumber || student?.admissionNo || ""}`);
      const searchOk = !studentFilters.search || searchNeedle.includes(normalize(studentFilters.search));
      return statusOk && classOk && searchOk;
    });
  }, [students, studentFilters]);

  const roleOptions = useMemo(
    () =>
      uniqueOptions(staff, (user) => ({
        value: String(user?.role || ""),
        label: formatRole(user?.role),
      })),
    [staff]
  );

  const departmentOptions = useMemo(
    () =>
      uniqueOptions(staff, (user) => ({
        value: String(user?.department || ""),
        label: user?.department || "No department",
      })),
    [staff]
  );

  const staffRows = useMemo(() => {
    return staff.filter((user) => {
      const roleOk = !staffFilters.role || String(user?.role || "") === staffFilters.role;
      const departmentOk = !staffFilters.department || String(user?.department || "") === staffFilters.department;
      const searchNeedle = normalize(`${getStaffName(user)} ${user?.username || ""} ${user?.phone || ""}`);
      const searchOk = !staffFilters.search || searchNeedle.includes(normalize(staffFilters.search));
      return roleOk && departmentOk && searchOk;
    });
  }, [staff, staffFilters]);

  const selectedStudents = useMemo(
    () => students.filter((student) => selectedStudentIds.includes(String(student.id))),
    [students, selectedStudentIds]
  );

  const selectedStaff = useMemo(
    () => staff.filter((user) => selectedStaffIds.includes(String(user.id))),
    [staff, selectedStaffIds]
  );

  const updateOption = (key, value) => setOptions((prev) => ({ ...prev, [key]: value }));

  const toggleStudent = (id) => {
    const key = String(id);
    setSelectedStudentIds((prev) => (prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]));
  };

  const toggleStaff = (id) => {
    const key = String(id);
    setSelectedStaffIds((prev) => (prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]));
  };

  const printSelected = (count) => {
    if (!count) {
      setError("Select at least one record before printing or exporting.");
      return;
    }
    setError("");
    window.setTimeout(() => window.print(), 60);
  };

  const renderTopNav = () => (
    <div className="id-cards-tabs">
      <Link className={mode === "overview" ? "active" : ""} to="/admin/id-cards">Overview</Link>
      <Link className={isStudentMode ? "active" : ""} to="/admin/id-cards/students">Student Cards</Link>
      <Link className={isStaffMode ? "active" : ""} to="/admin/id-cards/staff">Staff Cards</Link>
      <Link className={isTemplateMode ? "active" : ""} to="/admin/id-cards/templates">Templates</Link>
    </div>
  );

  const renderOptionsPanel = () => (
    <section className="id-cards-card">
      <div className="id-cards-card-head">
        <div>
          <p className="id-cards-kicker">Card settings</p>
          <h3>Session, validity and template</h3>
        </div>
      </div>
      <div className="id-cards-options-grid">
        <label>
          <span>Academic session</span>
          <input value={options.academicSession} onChange={(e) => updateOption("academicSession", e.target.value)} />
        </label>
        <label>
          <span>Issue date</span>
          <input type="date" value={options.issueDate} onChange={(e) => updateOption("issueDate", e.target.value)} />
        </label>
        <label>
          <span>Expiry date</span>
          <input type="date" value={options.expiryDate} onChange={(e) => updateOption("expiryDate", e.target.value)} />
        </label>
        <label className="id-cards-check">
          <input
            type="checkbox"
            checked={options.includeDob}
            onChange={(e) => updateOption("includeDob", e.target.checked)}
          />
          <span>Show student date of birth on the front card</span>
        </label>
      </div>
      <IDCardTemplateSelector value={template} onChange={setTemplate} />
    </section>
  );

  const renderOverview = () => (
    <>
      <section className="id-cards-overview-grid">
        <Link to="/admin/id-cards/students" className="id-cards-overview-card">
          <span>Students</span>
          <strong>Generate student ID cards</strong>
          <p>Print a single student card or batch cards by class with parent emergency contact on the back.</p>
        </Link>
        <Link to="/admin/id-cards/staff" className="id-cards-overview-card">
          <span>Staff</span>
          <strong>Generate staff ID cards</strong>
          <p>Prepare staff cards by role or department with school contact details and verification token.</p>
        </Link>
        <Link to="/admin/id-cards/templates" className="id-cards-overview-card">
          <span>Templates</span>
          <strong>Choose a printable design</strong>
          <p>Select a clean school-branded card design now, with room to add more templates later.</p>
        </Link>
      </section>
      {renderOptionsPanel()}
    </>
  );

  const renderStudents = () => {
    const previewRecord = selectedStudents[0] || studentRows[0];
    return (
      <>
        {renderOptionsPanel()}
        <section className="id-cards-workspace">
          <div className="id-cards-card">
            <div className="id-cards-card-head">
              <div>
                <p className="id-cards-kicker">Student ID cards</p>
                <h3>Select students</h3>
                <p>Choose one student, or filter by class and select all visible records for batch printing.</p>
              </div>
              <button type="button" onClick={loadData} disabled={loading}>Refresh Data</button>
            </div>

            <div className="id-cards-filter-grid">
              <label>
                <span>Class</span>
                <select
                  value={studentFilters.classKey}
                  onChange={(e) => setStudentFilters((prev) => ({ ...prev, classKey: e.target.value }))}
                >
                  <option value="">All classes</option>
                  {classOptions.map((item) => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Status</span>
                <select
                  value={studentFilters.status}
                  onChange={(e) => setStudentFilters((prev) => ({ ...prev, status: e.target.value }))}
                >
                  <option value="active">Active students</option>
                  <option value="archived">Archived students</option>
                  <option value="all">All students</option>
                </select>
              </label>
              <label>
                <span>Search</span>
                <input
                  value={studentFilters.search}
                  onChange={(e) => setStudentFilters((prev) => ({ ...prev, search: e.target.value }))}
                  placeholder="Name or admission number"
                />
              </label>
            </div>

            <div className="id-cards-bulk-actions">
              <button type="button" onClick={() => setSelectedStudentIds(studentRows.map((student) => String(student.id)))}>
                Select {studentRows.length} Filtered
              </button>
              <button type="button" onClick={() => setSelectedStudentIds([])}>Clear Selection</button>
              <button type="button" className="primary" onClick={() => printSelected(selectedStudents.length)}>
                Export PDF / Print {selectedStudents.length || ""} Cards
              </button>
            </div>

            <div className="id-cards-table-wrap">
              <table className="id-cards-table">
                <thead>
                  <tr>
                    <th>Select</th>
                    <th>Student</th>
                    <th>Admission No.</th>
                    <th>Class</th>
                    <th>Parent Phone</th>
                  </tr>
                </thead>
                <tbody>
                  {studentRows.map((student) => (
                    <tr key={student.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedStudentIds.includes(String(student.id))}
                          onChange={() => toggleStudent(student.id)}
                          aria-label={`Select ${getStudentName(student)}`}
                        />
                      </td>
                      <td>{getStudentName(student)}</td>
                      <td>{student.admissionNumber || student.admissionNo || "Not set"}</td>
                      <td>{getStudentClassLabel(student)}</td>
                      <td>{student.parentPhone || student.guardianPhone || "Not provided"}</td>
                    </tr>
                  ))}
                  {!studentRows.length ? (
                    <tr>
                      <td colSpan="5" className="id-cards-empty-cell">No students match the current filters.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>

          <aside className="id-cards-card id-cards-preview-panel">
            <div className="id-cards-card-head">
              <div>
                <p className="id-cards-kicker">Preview</p>
                <h3>Student card preview</h3>
                <p>{selectedStudents.length} selected for printing.</p>
              </div>
            </div>
            <IDCardPreview type="student" record={previewRecord} template={template} options={options} />
            <div className="id-cards-print-sheet">
              <h4>Selected print sheet</h4>
              <IDCardPrintLayout type="student" records={selectedStudents} template={template} options={options} />
            </div>
          </aside>
        </section>
      </>
    );
  };

  const renderStaff = () => {
    const previewRecord = selectedStaff[0] || staffRows[0];
    return (
      <>
        {renderOptionsPanel()}
        <section className="id-cards-workspace">
          <div className="id-cards-card">
            <div className="id-cards-card-head">
              <div>
                <p className="id-cards-kicker">Staff ID cards</p>
                <h3>Select staff members</h3>
                <p>Filter by role or department, then print individual or grouped staff cards.</p>
              </div>
              <button type="button" onClick={loadData} disabled={loading}>Refresh Data</button>
            </div>

            <div className="id-cards-filter-grid">
              <label>
                <span>Role</span>
                <select
                  value={staffFilters.role}
                  onChange={(e) => setStaffFilters((prev) => ({ ...prev, role: e.target.value }))}
                >
                  <option value="">All roles</option>
                  {roleOptions.map((item) => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Department</span>
                <select
                  value={staffFilters.department}
                  onChange={(e) => setStaffFilters((prev) => ({ ...prev, department: e.target.value }))}
                >
                  <option value="">All departments</option>
                  {departmentOptions.map((item) => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Search</span>
                <input
                  value={staffFilters.search}
                  onChange={(e) => setStaffFilters((prev) => ({ ...prev, search: e.target.value }))}
                  placeholder="Name, username or phone"
                />
              </label>
            </div>

            <div className="id-cards-bulk-actions">
              <button type="button" onClick={() => setSelectedStaffIds(staffRows.map((user) => String(user.id)))}>
                Select {staffRows.length} Filtered
              </button>
              <button type="button" onClick={() => setSelectedStaffIds([])}>Clear Selection</button>
              <button type="button" className="primary" onClick={() => printSelected(selectedStaff.length)}>
                Export PDF / Print {selectedStaff.length || ""} Cards
              </button>
            </div>

            <div className="id-cards-table-wrap">
              <table className="id-cards-table">
                <thead>
                  <tr>
                    <th>Select</th>
                    <th>Staff Member</th>
                    <th>Staff ID</th>
                    <th>Role</th>
                    <th>Department</th>
                  </tr>
                </thead>
                <tbody>
                  {staffRows.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedStaffIds.includes(String(user.id))}
                          onChange={() => toggleStaff(user.id)}
                          aria-label={`Select ${getStaffName(user)}`}
                        />
                      </td>
                      <td>{getStaffName(user)}</td>
                      <td>{user.staffId || user.username || user.id}</td>
                      <td>{formatRole(user.role)}</td>
                      <td>{user.department || "Not set"}</td>
                    </tr>
                  ))}
                  {!staffRows.length ? (
                    <tr>
                      <td colSpan="5" className="id-cards-empty-cell">No staff records match the current filters.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>

          <aside className="id-cards-card id-cards-preview-panel">
            <div className="id-cards-card-head">
              <div>
                <p className="id-cards-kicker">Preview</p>
                <h3>Staff card preview</h3>
                <p>{selectedStaff.length} selected for printing.</p>
              </div>
            </div>
            <IDCardPreview type="staff" record={previewRecord} template={template} options={options} />
            <div className="id-cards-print-sheet">
              <h4>Selected print sheet</h4>
              <IDCardPrintLayout type="staff" records={selectedStaff} template={template} options={options} />
            </div>
          </aside>
        </section>
      </>
    );
  };

  const renderTemplates = () => (
    <>
      {renderOptionsPanel()}
      <section className="id-cards-card">
        <p className="id-cards-kicker">Template support</p>
        <h3>Reusable card designs</h3>
        <p>
          The current template choice applies to both student and staff card previews. Future card designs can be added
          here without changing the student or staff selection workflow.
        </p>
        <div className="id-cards-template-preview-grid">
          <IDCardPreview
            type="student"
            template={template}
            options={options}
            record={{
              id: "DEMO-STUDENT",
              name: "Angel Montessori Pupil",
              admissionNumber: "AMS-2026-001",
              className: "Basic 1",
              parentPhone: "+234 803 506 7767",
            }}
          />
          <IDCardPreview
            type="staff"
            template={template}
            options={options}
            record={{
              id: "DEMO-STAFF",
              name: "Angel Montessori Staff",
              username: "AMS-STAFF-001",
              role: "CLASS_TEACHER",
              department: "Basic School",
              phone: "+234 803 506 7767",
            }}
          />
        </div>
      </section>
    </>
  );

  return (
    <main className="id-cards-page">
      <section className="id-cards-hero">
        <div>
          <p className="id-cards-kicker">Admin only</p>
          <h2>ID Cards</h2>
          <p>
            Generate secure, printable student and staff identity cards with school branding, front and back layouts,
            and non-sensitive verification marks.
          </p>
        </div>
        {renderTopNav()}
      </section>

      {loading ? <div className="id-cards-alert info">Loading ID card records...</div> : null}
      {message ? <div className="id-cards-alert info">{message}</div> : null}
      {error ? <div className="id-cards-alert error">{error}</div> : null}

      {isStudentMode ? renderStudents() : isStaffMode ? renderStaff() : isTemplateMode ? renderTemplates() : renderOverview()}
    </main>
  );
}
