import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import {
  assignAttendanceClassTeacher,
  getAttendanceAdminOverview,
  getAttendanceClassReport,
  getAttendanceClasses,
  getAttendanceSession,
  getAttendanceSessions,
  getAttendanceStudents,
  getAttendanceTeachers,
  submitAttendanceSession,
} from "../api/services";
import { isTeacherRole } from "../utils/roleHelpers";
import "./PortalAdminModule.css";

const STATUS_OPTIONS = [
  { value: "present", label: "Present" },
  { value: "absent", label: "Absent" },
  { value: "late", label: "Late" },
  { value: "excused", label: "Excused" },
];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function firstDayOfMonthIso() {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

function buildRegisterMap(students, existingRows = []) {
  const byStudent = new Map(
    (Array.isArray(existingRows) ? existingRows : []).map((row) => [String(row.studentId), row])
  );

  const out = {};
  for (const student of students) {
    const studentId = String(student.id || student.studentId || "");
    const existing = byStudent.get(studentId);
    out[studentId] = {
      status: existing?.status || "present",
      remark: existing?.remark || "",
      reason: existing?.reason || "",
    };
  }

  return out;
}

function statusTone(status) {
  if (status === "present") return "success";
  if (status === "absent") return "danger";
  if (status === "late") return "warning";
  return "neutral";
}

export default function AttendanceDashboard() {
  const { user } = useAuth();
  const role = user?.role || "";

  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [register, setRegister] = useState({});
  const [sessions, setSessions] = useState([]);
  const [classReport, setClassReport] = useState(null);
  const [adminOverview, setAdminOverview] = useState(null);

  const [selectedClassId, setSelectedClassId] = useState("");
  const [attendanceDate, setAttendanceDate] = useState(todayIso());
  const [academicSession, setAcademicSession] = useState("2025/2026");
  const [term, setTerm] = useState("First Term");
  const [reportStartDate, setReportStartDate] = useState(firstDayOfMonthIso());
  const [reportEndDate, setReportEndDate] = useState(todayIso());

  const [assignmentDrafts, setAssignmentDrafts] = useState({});

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const selectedClass = useMemo(
    () => classes.find((item) => String(item.id) === String(selectedClassId)),
    [classes, selectedClassId]
  );

  const attendanceStats = useMemo(() => {
    const totals = { present: 0, absent: 0, late: 0, excused: 0 };
    for (const student of students) {
      const status = register[String(student.id)]?.status || "present";
      if (totals[status] !== undefined) totals[status] += 1;
    }
    const attendanceRate = students.length ? Math.round((totals.present / students.length) * 100) : 0;
    return { ...totals, total: students.length, attendanceRate };
  }, [students, register]);

  const loadClasses = async () => {
    const classRes = await getAttendanceClasses();
    const classRows = Array.isArray(classRes.data) ? classRes.data : [];
    setClasses(classRows);

    if (!selectedClassId && classRows.length > 0) {
      setSelectedClassId(String(classRows[0].id));
    }

    setAssignmentDrafts((prev) => {
      const next = { ...prev };
      for (const cls of classRows) {
        const classId = String(cls.id);
        if (next[classId] === undefined) {
          next[classId] = String(cls.teacherId || "");
        }
      }
      return next;
    });

    return classRows;
  };

  const loadTeachers = async () => {
    if (role !== "ADMIN") return;
    const res = await getAttendanceTeachers();
    setTeachers(Array.isArray(res.data) ? res.data : []);
  };

  const loadAdminPanel = async () => {
    if (role !== "ADMIN") return;
    const res = await getAttendanceAdminOverview({ date: attendanceDate });
    setAdminOverview(res.data || null);
  };

  const loadClassRegister = async () => {
    if (!selectedClassId) {
      setStudents([]);
      setRegister({});
      return;
    }

    const [studentsRes, sessionRes] = await Promise.allSettled([
      getAttendanceStudents({ classId: selectedClassId }),
      getAttendanceSession({ classId: selectedClassId, attendanceDate }),
    ]);

    let roster = [];
    let rows = [];

    if (sessionRes.status === "fulfilled") {
      const data = sessionRes.value?.data || {};
      const sessionStudents = Array.isArray(data.students) ? data.students : [];
      if (sessionStudents.length > 0) {
        roster = sessionStudents.map((item) => ({
          id: String(item.studentId || ""),
          name: String(item.studentName || ""),
        }));
        rows = sessionStudents.map((item) => ({
          studentId: String(item.studentId || ""),
          status: String(item.status || ""),
          remark: String(item.remark || ""),
          reason: String(item.reason || ""),
        }));
      }
    }

    if (roster.length === 0 && studentsRes.status === "fulfilled") {
      roster = (Array.isArray(studentsRes.value?.data) ? studentsRes.value.data : []).map((item) => ({
        id: String(item.id || ""),
        name: String(item.name || ""),
      }));
    }

    if (roster.length === 0 && studentsRes.status === "rejected" && sessionRes.status === "rejected") {
      throw new Error(
        studentsRes.reason?.response?.data?.message ||
          sessionRes.reason?.response?.data?.message ||
          "Failed to load class register"
      );
    }

    setStudents(roster);
    setRegister(buildRegisterMap(roster, rows));
  };

  const loadSessionHistory = async () => {
    if (!selectedClassId) {
      setSessions([]);
      return;
    }

    const res = await getAttendanceSessions({
      classId: selectedClassId,
      startDate: reportStartDate,
      endDate: reportEndDate,
    });

    setSessions(Array.isArray(res.data) ? res.data : []);
  };

  const loadInitial = async () => {
    try {
      setLoading(true);
      setError("");
      setMessage("");
      await Promise.all([loadClasses(), loadTeachers(), loadAdminPanel()]);
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Failed to load attendance module");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitial();
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (!selectedClassId) return;

    const run = async () => {
      try {
        setLoading(true);
        setError("");
        await Promise.all([loadClassRegister(), loadSessionHistory()]);
      } catch (e) {
        setError(e?.response?.data?.message || e?.message || "Failed to load class attendance data");
      } finally {
        setLoading(false);
      }
    };

    run();
    // eslint-disable-next-line
  }, [selectedClassId, attendanceDate, reportStartDate, reportEndDate]);

  useEffect(() => {
    if (role !== "ADMIN") return;

    const run = async () => {
      try {
        const res = await getAttendanceAdminOverview({ date: attendanceDate });
        setAdminOverview(res.data || null);
      } catch {
        // keep previous admin overview silently
      }
    };

    run();
  }, [attendanceDate, role]);

  const updateRegisterRow = (studentId, patch) => {
    setRegister((prev) => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || { status: "present", remark: "", reason: "" }),
        ...patch,
      },
    }));
  };

  const submitRegister = async () => {
    if (!selectedClassId) {
      setError("Select class first.");
      return;
    }

    if (!students.length) {
      setError("No students found for selected class.");
      return;
    }

    const records = students.map((student) => {
      const row = register[String(student.id)] || {};
      return {
        studentId: String(student.id),
        status: row.status || "present",
        remark: row.remark || "",
        reason: row.reason || "",
      };
    });

    try {
      setSubmitting(true);
      setError("");
      setMessage("");

      await submitAttendanceSession({
        classId: selectedClassId,
        attendanceDate,
        academicSession,
        term,
        records,
      });

      setMessage("Attendance submitted successfully.");
      await Promise.all([loadClassRegister(), loadSessionHistory(), loadAdminPanel()]);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to submit attendance");
    } finally {
      setSubmitting(false);
    }
  };

  const loadReport = async () => {
    if (!selectedClassId) {
      setError("Select class first.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const res = await getAttendanceClassReport({
        classId: selectedClassId,
        startDate: reportStartDate,
        endDate: reportEndDate,
        term,
        academicSession,
      });
      setClassReport(res.data || null);
    } catch (e) {
      setClassReport(null);
      setError(e?.response?.data?.message || "Failed to load class attendance report");
    } finally {
      setLoading(false);
    }
  };

  const saveClassTeacher = async (classId) => {
    const teacherId = String(assignmentDrafts[String(classId)] || "");
    try {
      setError("");
      setMessage("");
      await assignAttendanceClassTeacher(classId, teacherId);
      setMessage("Class teacher assignment updated.");
      await Promise.all([loadClasses(), loadAdminPanel()]);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to update class teacher assignment");
    }
  };

  const printCurrentRegister = () => {
    if (!selectedClass || students.length === 0) return;

    const rows = students
      .map((student, index) => {
        const row = register[String(student.id)] || {};
        return `<tr><td>${index + 1}</td><td>${student.name}</td><td>${row.status || "present"}</td><td>${row.remark || ""}</td><td>${row.reason || ""}</td></tr>`;
      })
      .join("");

    const html = `
      <html>
        <head>
          <title>Attendance Register - ${selectedClass.name}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 16px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #333; padding: 6px; font-size: 12px; }
            th { background: #f2f2f2; }
          </style>
        </head>
        <body>
          <h2>Class Attendance Register</h2>
          <p><strong>Class:</strong> ${selectedClass.name}</p>
          <p><strong>Date:</strong> ${attendanceDate}</p>
          <p><strong>Session:</strong> ${academicSession} | <strong>Term:</strong> ${term}</p>
          <table>
            <thead>
              <tr><th>#</th><th>Student</th><th>Status</th><th>Remark</th><th>Reason</th></tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </body>
      </html>
    `;

    const win = window.open("", "_blank", "width=1000,height=700");
    if (!win) return;
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  };

  const printLoadedReport = () => {
    if (!classReport) return;

    const rows = (classReport.studentStats || [])
      .map(
        (row, index) =>
          `<tr><td>${index + 1}</td><td>${row.studentName}</td><td>${row.present}</td><td>${row.absent}</td><td>${row.late}</td><td>${row.excused}</td><td>${row.attendancePercentage}%</td></tr>`
      )
      .join("");

    const html = `
      <html>
        <head>
          <title>Attendance Report - ${classReport.class?.name || "Class"}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 16px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #333; padding: 6px; font-size: 12px; }
            th { background: #f2f2f2; }
          </style>
        </head>
        <body>
          <h2>Class Attendance Report</h2>
          <p><strong>Class:</strong> ${classReport.class?.name || ""}</p>
          <p><strong>Range:</strong> ${reportStartDate} to ${reportEndDate}</p>
          <p><strong>Term:</strong> ${term} | <strong>Session:</strong> ${academicSession}</p>
          <p><strong>Totals:</strong> Present ${classReport.totals?.present || 0}, Absent ${classReport.totals?.absent || 0}, Late ${classReport.totals?.late || 0}, Excused ${classReport.totals?.excused || 0}</p>
          <table>
            <thead>
              <tr><th>#</th><th>Student</th><th>Present</th><th>Absent</th><th>Late</th><th>Excused</th><th>Attendance %</th></tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </body>
      </html>
    `;

    const win = window.open("", "_blank", "width=1000,height=700");
    if (!win) return;
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  };

  return (
    <div className="admin-module-page attendance-module">
      <div className="admin-module-shell">
        <section className="admin-module-hero">
          <div>
            <div className="admin-module-kicker">Daily School Operations</div>
            <h1>Attendance Register</h1>
            <p>
              Take daily class attendance, track status history ({STATUS_OPTIONS.map((item) => item.label).join(", ")}), and prepare class attendance reports.
            </p>
          </div>
          <div className="admin-module-actions">
            <button type="button" onClick={loadInitial} disabled={loading}>
              {loading ? "Refreshing..." : "Refresh Data"}
            </button>
          </div>
        </section>

        {error ? <div className="admin-alert error">{error}</div> : null}
        {message ? <div className="admin-alert success">{message}</div> : null}
        {loading ? <div className="admin-alert">Loading attendance records...</div> : null}

        <section className="admin-stat-grid" aria-label="Attendance overview">
          <article className="admin-stat-card">
            <span>Active Class</span>
            <strong>{selectedClass?.name || "-"}</strong>
            <small>{students.length ? `${students.length} pupils loaded` : "Select a class to begin"}</small>
          </article>
          <article className="admin-stat-card">
            <span>Present</span>
            <strong>{attendanceStats.present}</strong>
            <small>{attendanceStats.attendanceRate}% attendance rate</small>
          </article>
          <article className="admin-stat-card">
            <span>Absent</span>
            <strong>{attendanceStats.absent}</strong>
            <small>Requires follow-up when needed</small>
          </article>
          <article className="admin-stat-card">
            <span>Late / Excused</span>
            <strong>{attendanceStats.late + attendanceStats.excused}</strong>
            <small>{attendanceStats.late} late, {attendanceStats.excused} excused</small>
          </article>
          <article className="admin-stat-card">
            <span>History</span>
            <strong>{sessions.length}</strong>
            <small>Sessions in selected date range</small>
          </article>
        </section>

        <section className="admin-card">
          <div className="admin-card-header">
            <div>
              <span className="admin-section-tag">Daily Register</span>
              <h2>Take Attendance</h2>
            </div>
            <p>Choose the class, date, session, and term, then mark each pupil as present, absent, late, or excused.</p>
          </div>

          <div className="admin-form-grid compact">
            <label className="admin-field">
              Class
              <select value={selectedClassId} onChange={(e) => setSelectedClassId(e.target.value)}>
                <option value="">Select Class</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>{cls.name}</option>
                ))}
              </select>
            </label>
            <label className="admin-field">
              Attendance Date
              <input type="date" value={attendanceDate} onChange={(e) => setAttendanceDate(e.target.value)} />
            </label>
            <label className="admin-field">
              Academic Session
              <input value={academicSession} onChange={(e) => setAcademicSession(e.target.value)} placeholder="2025/2026" />
            </label>
            <label className="admin-field">
              Term
              <select value={term} onChange={(e) => setTerm(e.target.value)}>
                <option>First Term</option>
                <option>Second Term</option>
                <option>Third Term</option>
              </select>
            </label>
          </div>

          <div className="admin-form-actions">
            <button type="button" onClick={submitRegister} disabled={submitting || !selectedClassId || students.length === 0}>
              {submitting ? "Submitting..." : "Submit Register"}
            </button>
            <button type="button" className="secondary" onClick={printCurrentRegister} disabled={!selectedClassId || students.length === 0}>
              Print Register
            </button>
          </div>

          {!selectedClassId ? (
            <div className="admin-empty-state">
              <strong>Select a class to load students.</strong>
              <span>The attendance register will appear here once a class is selected.</span>
            </div>
          ) : null}

          {selectedClassId && students.length === 0 ? (
            <div className="admin-empty-state">
              <strong>No students found for this class.</strong>
              <span>If this is a teacher account, ask admin to assign the correct class teacher slot.</span>
            </div>
          ) : null}

          {students.length > 0 ? (
            <div className="admin-table-scroll attendance-register-table">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Status</th>
                    <th>Remark</th>
                    <th>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => {
                    const row = register[String(student.id)] || { status: "present", remark: "", reason: "" };
                    return (
                      <tr key={student.id}>
                        <td>{student.name}</td>
                        <td>
                          <select
                            value={row.status || "present"}
                            onChange={(e) => updateRegisterRow(String(student.id), { status: e.target.value })}
                          >
                            {STATUS_OPTIONS.map((item) => (
                              <option key={item.value} value={item.value}>{item.label}</option>
                            ))}
                          </select>
                          <span className={`admin-status-pill ${statusTone(row.status || "present")}`}>{row.status || "present"}</span>
                        </td>
                        <td>
                          <input
                            value={row.remark || ""}
                            onChange={(e) => updateRegisterRow(String(student.id), { remark: e.target.value })}
                            placeholder="Short note"
                          />
                        </td>
                        <td>
                          <input
                            value={row.reason || ""}
                            onChange={(e) => updateRegisterRow(String(student.id), { reason: e.target.value })}
                            placeholder="Reason for absence/excuse"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>

        <section className="admin-card">
          <div className="admin-card-header">
            <div>
              <span className="admin-section-tag">History</span>
              <h2>Attendance History</h2>
            </div>
            <p>Review previous attendance submissions and load a class report for the selected date range.</p>
          </div>

          <div className="admin-toolbar">
            <label className="admin-field">
              From
              <input type="date" value={reportStartDate} onChange={(e) => setReportStartDate(e.target.value)} />
            </label>
            <label className="admin-field">
              To
              <input type="date" value={reportEndDate} onChange={(e) => setReportEndDate(e.target.value)} />
            </label>
          </div>

          <div className="admin-form-actions">
            <button type="button" onClick={loadReport} disabled={!selectedClassId}>Load Class Report</button>
            <button type="button" className="secondary" onClick={printLoadedReport} disabled={!classReport}>Print Report</button>
          </div>

          <div className="admin-table-scroll">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Class</th>
                  <th>Marked By</th>
                  <th className="number-cell">Present</th>
                  <th className="number-cell">Absent</th>
                  <th className="number-cell">Late</th>
                  <th className="number-cell">Excused</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((row) => (
                  <tr key={row.id}>
                    <td>{row.attendanceDate}</td>
                    <td>{row.className}</td>
                    <td>{row.markedByName || "-"}</td>
                    <td className="number-cell">{row.summary?.present || 0}</td>
                    <td className="number-cell">{row.summary?.absent || 0}</td>
                    <td className="number-cell">{row.summary?.late || 0}</td>
                    <td className="number-cell">{row.summary?.excused || 0}</td>
                  </tr>
                ))}
                {sessions.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <div className="admin-empty-inline">No attendance sessions found for selected range.</div>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        {classReport ? (
          <section className="admin-card">
            <div className="admin-card-header">
              <div>
                <span className="admin-section-tag">Class Report</span>
                <h2>{classReport.class?.name} Attendance Report</h2>
              </div>
              <p>Sessions: {classReport.totals?.totalSessions || 0} | Records: {classReport.totals?.totalRecords || 0}</p>
            </div>

            <div className="admin-stat-grid compact">
              <article className="admin-mini-stat"><span>Present</span><strong>{classReport.totals?.present || 0}</strong></article>
              <article className="admin-mini-stat"><span>Absent</span><strong>{classReport.totals?.absent || 0}</strong></article>
              <article className="admin-mini-stat"><span>Late</span><strong>{classReport.totals?.late || 0}</strong></article>
              <article className="admin-mini-stat"><span>Excused</span><strong>{classReport.totals?.excused || 0}</strong></article>
            </div>

            <div className="admin-table-scroll">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th className="number-cell">Present</th>
                    <th className="number-cell">Absent</th>
                    <th className="number-cell">Late</th>
                    <th className="number-cell">Excused</th>
                    <th className="number-cell">Attendance %</th>
                    <th>Alert</th>
                  </tr>
                </thead>
                <tbody>
                  {(classReport.studentStats || []).map((row) => (
                    <tr key={row.studentId}>
                      <td>{row.studentName}</td>
                      <td className="number-cell">{row.present}</td>
                      <td className="number-cell">{row.absent}</td>
                      <td className="number-cell">{row.late}</td>
                      <td className="number-cell">{row.excused}</td>
                      <td className="number-cell">{row.attendancePercentage}%</td>
                      <td>
                        <span className={`admin-status-pill ${row.absenceAlert ? "danger" : "success"}`}>
                          {row.absenceAlert ? "Needs follow-up" : "OK"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {role === "ADMIN" ? (
          <section className="admin-card">
            <div className="admin-card-header">
              <div>
                <span className="admin-section-tag">Control Desk</span>
                <h2>Attendance Administration</h2>
              </div>
              <p>Assign class teachers and monitor same-day attendance compliance across all classes.</p>
            </div>

            <div className="admin-table-scroll">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Class</th>
                    <th>Assigned Teacher</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {classes.map((cls) => (
                    <tr key={cls.id}>
                      <td>{cls.name}</td>
                      <td>
                        <select
                          value={assignmentDrafts[String(cls.id)] ?? String(cls.teacherId || "")}
                          onChange={(e) =>
                            setAssignmentDrafts((prev) => ({ ...prev, [String(cls.id)]: e.target.value }))
                          }
                        >
                          <option value="">Unassigned</option>
                          {teachers.map((teacher) => (
                            <option key={teacher.id} value={teacher.id}>{teacher.name}</option>
                          ))}
                        </select>
                      </td>
                      <td><button type="button" className="admin-table-action" onClick={() => saveClassTeacher(cls.id)}>Save</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="admin-compliance-grid">
              <article>
                <span className="admin-section-tag">Today Compliance</span>
                <h3>{adminOverview?.date || attendanceDate}</h3>
                <p>Marked Classes: <strong>{adminOverview?.markedClassesCount || 0}</strong> / {adminOverview?.totalClasses || 0}</p>
              </article>
              <article>
                <span className="admin-section-tag">Classes Not Marked</span>
                <ul>
                  {(adminOverview?.classesNotMarkedToday || []).map((row) => (
                    <li key={row.classId}>{row.className}{row.teacherName ? ` (${row.teacherName})` : ""}</li>
                  ))}
                  {(adminOverview?.classesNotMarkedToday || []).length === 0 ? <li>All classes submitted.</li> : null}
                </ul>
              </article>
              <article>
                <span className="admin-section-tag">Staff Compliance</span>
                <ul>
                  {(adminOverview?.staffCompliance || []).map((row) => (
                    <li key={row.teacherId}>
                      {row.teacherName}: {row.markedToday}/{row.assignedClasses}
                      {row.compliancePercent !== null ? ` (${row.compliancePercent}%)` : " (No assigned classes)"}
                    </li>
                  ))}
                  {(adminOverview?.staffCompliance || []).length === 0 ? <li>No staff compliance records yet.</li> : null}
                </ul>
              </article>
            </div>
          </section>
        ) : null}

        {isTeacherRole(role) && classes.length === 0 ? (
          <div className="admin-empty-state">
            <strong>No class assigned to this teacher account yet.</strong>
            <span>Admin should assign your class in Attendance Control.</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}


