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
    <div style={{ padding: 20 }}>
      <h2>Attendance Register</h2>
      <p>
        Take daily class attendance, track status history ({STATUS_OPTIONS.map((item) => item.label).join(", ")}), and prepare attendance reports for Angel Montessori.
      </p>

      {error ? <p style={{ color: "crimson" }}>{error}</p> : null}
      {message ? <p style={{ color: "#17643e" }}>{message}</p> : null}
      {loading ? <p>Loading attendance records...</p> : null}

      <div style={{ border: "1px solid #d7e3f2", borderRadius: 10, padding: 12, background: "#fff", marginBottom: 12 }}>
        <h3>Take Attendance</h3>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <select value={selectedClassId} onChange={(e) => setSelectedClassId(e.target.value)}>
            <option value="">Select Class</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name}
              </option>
            ))}
          </select>

          <input type="date" value={attendanceDate} onChange={(e) => setAttendanceDate(e.target.value)} />

          <input
            value={academicSession}
            onChange={(e) => setAcademicSession(e.target.value)}
            placeholder="Session e.g. 2025/2026"
            style={{ width: 130 }}
          />

          <select value={term} onChange={(e) => setTerm(e.target.value)}>
            <option>First Term</option>
            <option>Second Term</option>
            <option>Third Term</option>
          </select>

          <button onClick={submitRegister} disabled={submitting || !selectedClassId || students.length === 0}>
            {submitting ? "Submitting..." : "Submit Register"}
          </button>
          <button onClick={printCurrentRegister} disabled={!selectedClassId || students.length === 0}>Print Register</button>
        </div>

        {!selectedClassId ? <p style={{ marginTop: 10 }}>Select a class to load students.</p> : null}
        {selectedClassId && students.length === 0 ? (
          <p style={{ marginTop: 10, color: "#555" }}>
            No students found for this class. If you are a teacher, ask admin to assign you to a class teacher slot.
          </p>
        ) : null}

        {students.length > 0 ? (
          <div style={{ overflowX: "auto", marginTop: 10 }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ border: "1px solid #ddd", padding: 6 }}>Student</th>
                  <th style={{ border: "1px solid #ddd", padding: 6 }}>Status</th>
                  <th style={{ border: "1px solid #ddd", padding: 6 }}>Remark</th>
                  <th style={{ border: "1px solid #ddd", padding: 6 }}>Reason</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => {
                  const row = register[String(student.id)] || { status: "present", remark: "", reason: "" };
                  return (
                    <tr key={student.id}>
                      <td style={{ border: "1px solid #ddd", padding: 6 }}>{student.name}</td>
                      <td style={{ border: "1px solid #ddd", padding: 6 }}>
                        <select
                          value={row.status || "present"}
                          onChange={(e) => updateRegisterRow(String(student.id), { status: e.target.value })}
                        >
                          {STATUS_OPTIONS.map((item) => (
                            <option key={item.value} value={item.value}>
                              {item.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td style={{ border: "1px solid #ddd", padding: 6 }}>
                        <input
                          value={row.remark || ""}
                          onChange={(e) => updateRegisterRow(String(student.id), { remark: e.target.value })}
                          placeholder="Short note"
                          style={{ width: "100%" }}
                        />
                      </td>
                      <td style={{ border: "1px solid #ddd", padding: 6 }}>
                        <input
                          value={row.reason || ""}
                          onChange={(e) => updateRegisterRow(String(student.id), { reason: e.target.value })}
                          placeholder="Reason for absence/excuse"
                          style={{ width: "100%" }}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>

      <div style={{ border: "1px solid #d7e3f2", borderRadius: 10, padding: 12, background: "#fff", marginBottom: 12 }}>
        <h3>Attendance History</h3>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 8 }}>
          <label>
            From <input type="date" value={reportStartDate} onChange={(e) => setReportStartDate(e.target.value)} />
          </label>
          <label>
            To <input type="date" value={reportEndDate} onChange={(e) => setReportEndDate(e.target.value)} />
          </label>
          <button onClick={loadReport} disabled={!selectedClassId}>Load Class Report</button>
          <button onClick={printLoadedReport} disabled={!classReport}>Print Report</button>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ border: "1px solid #ddd", padding: 6 }}>Date</th>
                <th style={{ border: "1px solid #ddd", padding: 6 }}>Class</th>
                <th style={{ border: "1px solid #ddd", padding: 6 }}>Marked By</th>
                <th style={{ border: "1px solid #ddd", padding: 6 }}>Present</th>
                <th style={{ border: "1px solid #ddd", padding: 6 }}>Absent</th>
                <th style={{ border: "1px solid #ddd", padding: 6 }}>Late</th>
                <th style={{ border: "1px solid #ddd", padding: 6 }}>Excused</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((row) => (
                <tr key={row.id}>
                  <td style={{ border: "1px solid #ddd", padding: 6 }}>{row.attendanceDate}</td>
                  <td style={{ border: "1px solid #ddd", padding: 6 }}>{row.className}</td>
                  <td style={{ border: "1px solid #ddd", padding: 6 }}>{row.markedByName || "-"}</td>
                  <td style={{ border: "1px solid #ddd", padding: 6, textAlign: "center" }}>{row.summary?.present || 0}</td>
                  <td style={{ border: "1px solid #ddd", padding: 6, textAlign: "center" }}>{row.summary?.absent || 0}</td>
                  <td style={{ border: "1px solid #ddd", padding: 6, textAlign: "center" }}>{row.summary?.late || 0}</td>
                  <td style={{ border: "1px solid #ddd", padding: 6, textAlign: "center" }}>{row.summary?.excused || 0}</td>
                </tr>
              ))}
              {sessions.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ border: "1px solid #ddd", padding: 8, textAlign: "center", color: "#666" }}>
                    No attendance sessions found for selected range.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {classReport ? (
        <div style={{ border: "1px solid #d7e3f2", borderRadius: 10, padding: 12, background: "#fff", marginBottom: 12 }}>
          <h3>Class Attendance Report</h3>
          <p>
            <strong>{classReport.class?.name}</strong> | Sessions: {classReport.totals?.totalSessions || 0} | Records: {classReport.totals?.totalRecords || 0}
          </p>
          <p>
            Present: <strong>{classReport.totals?.present || 0}</strong> | Absent: <strong>{classReport.totals?.absent || 0}</strong> | Late: <strong>{classReport.totals?.late || 0}</strong> | Excused: <strong>{classReport.totals?.excused || 0}</strong>
          </p>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ border: "1px solid #ddd", padding: 6 }}>Student</th>
                  <th style={{ border: "1px solid #ddd", padding: 6 }}>Present</th>
                  <th style={{ border: "1px solid #ddd", padding: 6 }}>Absent</th>
                  <th style={{ border: "1px solid #ddd", padding: 6 }}>Late</th>
                  <th style={{ border: "1px solid #ddd", padding: 6 }}>Excused</th>
                  <th style={{ border: "1px solid #ddd", padding: 6 }}>Attendance %</th>
                  <th style={{ border: "1px solid #ddd", padding: 6 }}>Alert</th>
                </tr>
              </thead>
              <tbody>
                {(classReport.studentStats || []).map((row) => (
                  <tr key={row.studentId}>
                    <td style={{ border: "1px solid #ddd", padding: 6 }}>{row.studentName}</td>
                    <td style={{ border: "1px solid #ddd", padding: 6, textAlign: "center" }}>{row.present}</td>
                    <td style={{ border: "1px solid #ddd", padding: 6, textAlign: "center" }}>{row.absent}</td>
                    <td style={{ border: "1px solid #ddd", padding: 6, textAlign: "center" }}>{row.late}</td>
                    <td style={{ border: "1px solid #ddd", padding: 6, textAlign: "center" }}>{row.excused}</td>
                    <td style={{ border: "1px solid #ddd", padding: 6, textAlign: "center" }}>{row.attendancePercentage}%</td>
                    <td style={{ border: "1px solid #ddd", padding: 6, textAlign: "center" }}>
                      {row.absenceAlert ? "Needs follow-up" : "OK"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {role === "ADMIN" ? (
        <div style={{ border: "1px solid #d7e3f2", borderRadius: 10, padding: 12, background: "#fff" }}>
          <h3>Attendance Administration</h3>

          <h4>Class Teacher Assignment</h4>
          <div style={{ overflowX: "auto", marginBottom: 12 }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ border: "1px solid #ddd", padding: 6 }}>Class</th>
                  <th style={{ border: "1px solid #ddd", padding: 6 }}>Assigned Teacher</th>
                  <th style={{ border: "1px solid #ddd", padding: 6 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {classes.map((cls) => (
                  <tr key={cls.id}>
                    <td style={{ border: "1px solid #ddd", padding: 6 }}>{cls.name}</td>
                    <td style={{ border: "1px solid #ddd", padding: 6 }}>
                      <select
                        value={assignmentDrafts[String(cls.id)] ?? String(cls.teacherId || "")}
                        onChange={(e) =>
                          setAssignmentDrafts((prev) => ({ ...prev, [String(cls.id)]: e.target.value }))
                        }
                      >
                        <option value="">Unassigned</option>
                        {teachers.map((teacher) => (
                          <option key={teacher.id} value={teacher.id}>
                            {teacher.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td style={{ border: "1px solid #ddd", padding: 6 }}>
                      <button onClick={() => saveClassTeacher(cls.id)}>Save</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h4>Today Compliance ({adminOverview?.date || attendanceDate})</h4>
          <p>
            Marked Classes: <strong>{adminOverview?.markedClassesCount || 0}</strong> / {adminOverview?.totalClasses || 0}
          </p>

          <div style={{ marginBottom: 10 }}>
            <strong>Classes Not Marked Today</strong>
            <ul>
              {(adminOverview?.classesNotMarkedToday || []).map((row) => (
                <li key={row.classId}>{row.className}{row.teacherName ? ` (${row.teacherName})` : ""}</li>
              ))}
              {(adminOverview?.classesNotMarkedToday || []).length === 0 ? <li>All classes submitted.</li> : null}
            </ul>
          </div>

          <div style={{ marginBottom: 10 }}>
            <strong>Staff Compliance</strong>
            <ul>
              {(adminOverview?.staffCompliance || []).map((row) => (
                <li key={row.teacherId}>
                  {row.teacherName}: {row.markedToday}/{row.assignedClasses}
                  {row.compliancePercent !== null ? ` (${row.compliancePercent}%)` : " (No assigned classes)"}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      {role === "TEACHER" && classes.length === 0 ? (
        <p style={{ marginTop: 12, color: "#555" }}>
          No class assigned to your teacher account yet. Admin should assign your class in Attendance Control.
        </p>
      ) : null}

      {selectedClass ? (
        <p style={{ marginTop: 12, color: "#334155" }}>
          Active class: <strong>{selectedClass.name}</strong>
        </p>
      ) : null}
    </div>
  );
}


