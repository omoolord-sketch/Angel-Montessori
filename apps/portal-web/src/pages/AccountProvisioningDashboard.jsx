import { useEffect, useMemo, useState } from "react";
import {
  getProvisioningClasses,
  getProvisioningLogs,
  getProvisioningOverview,
  getProvisioningStudents,
  provisionClassAccounts,
  provisionParentAccounts,
  provisionTeacherAccounts,
  rebuildStudentProvisioningAccounts,
  reissueProvisioningCredentials,
} from "../api/services";
import { TEACHER_ROLES } from "../utils/roleHelpers";
import "./PortalAdminModule.css";

function downloadCsv(filename, rows) {
  if (!rows || rows.length === 0) return;
  const escape = (value) => {
    const text = String(value ?? "");
    if (text.includes(",") || text.includes("\n") || text.includes('"')) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  };

  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((key) => escape(row[key])).join(","));
  }

  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function AccountProvisioningDashboard() {
  const [overview, setOverview] = useState(null);
  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState("");
  const [classData, setClassData] = useState(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);

  const [studentPrefix, setStudentPrefix] = useState("student");
  const [studentPassword, setStudentPassword] = useState("Student@123");
  const [parentPrefix, setParentPrefix] = useState("parent");
  const [parentPassword, setParentPassword] = useState("Parent@123");
  const [mergeSiblings, setMergeSiblings] = useState(true);
  const [forceChange, setForceChange] = useState(true);

  const [teacherPrefix, setTeacherPrefix] = useState("teacher");
  const [teacherPassword, setTeacherPassword] = useState("Teacher@123");
  const [teacherRole, setTeacherRole] = useState("TEACHER");
  const [teacherSeed, setTeacherSeed] = useState("");

  const [reissueRole, setReissueRole] = useState("STUDENT");
  const [reissueClassId, setReissueClassId] = useState("");
  const [reissuePassword, setReissuePassword] = useState("");

  const [logs, setLogs] = useState([]);
  const [lastCredentials, setLastCredentials] = useState([]);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const stats = useMemo(() => {
    const students = classData?.students || [];
    const withStudentAccount = students.filter((s) => Boolean(s.studentAccount)).length;
    const withParentAccount = students.filter((s) => (s.parentAccounts || []).length > 0).length;

    return {
      total: students.length,
      withStudentAccount,
      withParentAccount,
      missingStudentAccount: students.length - withStudentAccount,
      missingParentAccount: students.length - withParentAccount,
    };
  }, [classData]);

  const parseTeacherSeed = () => {
    return String(teacherSeed || "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [name = "", phone = "", department = "", subjects = ""] = line.split(",").map((item) => item.trim());
        return {
          name,
          phone,
          department,
          subjects: subjects ? subjects.split("|").map((item) => item.trim()).filter(Boolean) : [],
        };
      })
      .filter((item) => item.name);
  };

  const loadOverview = async () => {
    const res = await getProvisioningOverview();
    setOverview(res.data || null);
  };

  const loadClasses = async () => {
    const res = await getProvisioningClasses();
    setClasses(Array.isArray(res.data) ? res.data : []);
  };

  const loadClassStudents = async (nextClassId) => {
    if (!nextClassId) {
      setClassData(null);
      return;
    }
    const res = await getProvisioningStudents(nextClassId);
    const nextData = res.data || null;
    setClassData(nextData);
    setSelectedStudentIds((prev) => {
      const allowed = new Set((nextData?.students || []).map((student) => String(student.id)));
      return prev.filter((id) => allowed.has(String(id)));
    });
  };

  const loadLogs = async () => {
    const res = await getProvisioningLogs();
    setLogs(Array.isArray(res.data) ? res.data : []);
  };

  const loadAll = async () => {
    try {
      setBusy(true);
      setError("");
      await Promise.all([loadOverview(), loadClasses(), loadLogs()]);
      if (classId) await loadClassStudents(classId);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load provisioning dashboard");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const runClassProvision = async (createStudents, createParents) => {
    if (!classId) {
      setError("Select class before provisioning.");
      return;
    }
    try {
      setBusy(true);
      setError("");
      setMessage("");
      const res = await provisionClassAccounts({
        classId,
        studentIds: selectedStudentIds,
        createStudents,
        createParents,
        studentUsernamePrefix: studentPrefix,
        studentPassword,
        parentUsernamePrefix: parentPrefix,
        parentPassword,
        mergeSiblings,
        forcePasswordChange: forceChange,
      });

      const created = [...(res.data?.createdStudents || []), ...(res.data?.createdParents || [])];
      setLastCredentials(created);
      setMessage(`Provisioning complete. Students: ${res.data?.summary?.createdStudentAccounts || 0}, Parents: ${res.data?.summary?.createdParentAccounts || 0}`);
      await Promise.all([loadOverview(), loadLogs(), loadClassStudents(classId)]);
    } catch (e) {
      setError(e?.response?.data?.message || "Class provisioning failed");
    } finally {
      setBusy(false);
    }
  };

  const runParentProvision = async () => {
    try {
      setBusy(true);
      setError("");
      setMessage("");
      const res = await provisionParentAccounts({
        classId,
        parentUsernamePrefix: parentPrefix,
        parentPassword,
        mergeSiblings,
        forcePasswordChange: forceChange,
      });
      setLastCredentials(Array.isArray(res.data?.created) ? res.data.created : []);
      setMessage(`Parent provisioning complete. Created: ${res.data?.createdCount || 0}`);
      await Promise.all([loadOverview(), loadLogs(), loadClassStudents(classId)]);
    } catch (e) {
      setError(e?.response?.data?.message || "Parent provisioning failed");
    } finally {
      setBusy(false);
    }
  };

  const runTeacherProvision = async () => {
    const teachers = parseTeacherSeed();
    if (teachers.length === 0) {
      setError("Enter at least one teacher row: Name,Phone,Department,Subject1|Subject2");
      return;
    }

    try {
      setBusy(true);
      setError("");
      setMessage("");
      const res = await provisionTeacherAccounts({
        teachers,
        teacherUsernamePrefix: teacherPrefix,
        teacherPassword,
        teacherRole,
        forcePasswordChange: forceChange,
      });
      setLastCredentials(Array.isArray(res.data?.created) ? res.data.created : []);
      setMessage(`Teacher provisioning complete. Created: ${res.data?.createdCount || 0}, Skipped: ${res.data?.skippedCount || 0}`);
      await Promise.all([loadOverview(), loadLogs()]);
    } catch (e) {
      setError(e?.response?.data?.message || "Teacher provisioning failed");
    } finally {
      setBusy(false);
    }
  };

  const toggleStudentSelection = (studentId) => {
    const safeId = String(studentId || "");
    setSelectedStudentIds((prev) =>
      prev.includes(safeId) ? prev.filter((item) => item !== safeId) : [...prev, safeId]
    );
  };

  const selectStudentsBy = (predicate) => {
    const nextIds = (classData?.students || [])
      .filter((student) => predicate(student))
      .map((student) => String(student.id));
    setSelectedStudentIds(nextIds);
  };

  const runStudentAccountRebuild = async () => {
    if (!classId) {
      setError("Select class before rebuilding student logins.");
      return;
    }

    const scopeText = selectedStudentIds.length
      ? `${selectedStudentIds.length} selected student account(s)`
      : `all student accounts in ${classData?.class?.name || "this class"}`;
    const confirmed = window.confirm(
      `This will archive old broken student login records and create fresh login credentials for ${scopeText}. Student profiles, fees, reports, attendance, and CBT records will remain intact. Continue?`
    );
    if (!confirmed) return;

    try {
      setBusy(true);
      setError("");
      setMessage("");
      const res = await rebuildStudentProvisioningAccounts({
        classId,
        studentIds: selectedStudentIds,
        studentUsernamePrefix: studentPrefix,
        password: studentPassword,
        forcePasswordChange: forceChange,
      });

      setLastCredentials(Array.isArray(res.data?.credentials) ? res.data.credentials : []);
      setMessage(
        `Student login rebuild complete. Rebuilt: ${res.data?.rebuiltCount || 0}, archived old login records: ${res.data?.archivedCount || 0}.`
      );
      await Promise.all([loadOverview(), loadLogs(), loadClassStudents(classId)]);
    } catch (e) {
      setError(e?.response?.data?.message || "Student login rebuild failed");
    } finally {
      setBusy(false);
    }
  };

  const runReissue = async () => {
    try {
      setBusy(true);
      setError("");
      setMessage("");
      const res = await reissueProvisioningCredentials({
        role: reissueRole,
        classId: reissueClassId,
        password: reissuePassword || undefined,
      });
      setLastCredentials(Array.isArray(res.data?.credentials) ? res.data.credentials : []);
      setMessage(`Credentials reissued for ${res.data?.updatedCount || 0} account(s).`);
      await Promise.all([loadOverview(), loadLogs()]);
    } catch (e) {
      setError(e?.response?.data?.message || "Credential reissue failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="admin-module-page">
      <div className="admin-module-shell">
        <section className="admin-module-hero">
          <div>
            <span className="admin-module-kicker">Credentials Desk</span>
            <h1>Account Provisioning</h1>
            <p>Create student, parent, and teacher accounts in batches, issue credentials, and review provisioning logs for Angel Montessori users.</p>
          </div>
          <div className="admin-module-actions">
            <button type="button" className="secondary" onClick={loadAll} disabled={busy}>{busy ? "Refreshing..." : "Refresh"}</button>
            <button type="button" onClick={runReissue} disabled={busy}>Reissue Credentials</button>
          </div>
        </section>

        {error ? <div className="admin-alert error">{error}</div> : null}
        {message ? <div className="admin-alert success">{message}</div> : null}

        <section className="admin-stat-grid compact">
          <article className="admin-stat-card"><span>Students Without Accounts</span><strong>{overview?.studentsWithoutAccounts || 0}</strong><small>Need portal login</small></article>
          <article className="admin-stat-card"><span>Teachers Without Accounts</span><strong>{overview?.teachersWithoutAccounts || 0}</strong><small>Need staff login</small></article>
          <article className="admin-stat-card"><span>Parents Without Accounts</span><strong>{overview?.parentsWithoutAccounts || 0}</strong><small>Need parent access</small></article>
          <article className="admin-stat-card"><span>Provisioned This Week</span><strong>{overview?.accountsProvisionedThisWeek || 0}</strong><small>Recently issued</small></article>
          <article className="admin-stat-card"><span>Failed Jobs</span><strong>{overview?.failedProvisioningJobs || 0}</strong><small>Needs review</small></article>
        </section>

      <div style={{ border: "1px solid #d8e2ef", borderRadius: 10, padding: 12, marginBottom: 12, background: "#fff" }}>
        <h3 style={{ marginTop: 0 }}>Student and Parent Class Provisioning</h3>
        <p style={{ marginTop: 0, color: "#475569" }}>
          Use the class-wide buttons for a full batch, or select one or more returning students below to create only those portal accounts.
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
          <select value={classId} onChange={(e) => { setClassId(e.target.value); loadClassStudents(e.target.value); }}>
            <option value="">Select Class</option>
            {classes.map((cls) => <option key={cls.id} value={cls.id}>{cls.name} ({cls.studentCount})</option>)}
          </select>
          <input value={studentPrefix} onChange={(e) => setStudentPrefix(e.target.value)} placeholder="Student username prefix" />
          <input value={studentPassword} onChange={(e) => setStudentPassword(e.target.value)} placeholder="Student temp password" />
          <input value={parentPrefix} onChange={(e) => setParentPrefix(e.target.value)} placeholder="Parent username prefix" />
          <input value={parentPassword} onChange={(e) => setParentPassword(e.target.value)} placeholder="Parent temp password" />
          <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <input type="checkbox" checked={mergeSiblings} onChange={(e) => setMergeSiblings(e.target.checked)} />
            Merge siblings
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <input type="checkbox" checked={forceChange} onChange={(e) => setForceChange(e.target.checked)} />
            Force password change
          </label>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => runClassProvision(true, false)} disabled={busy || !classId}>Provision Students</button>
          <button onClick={() => runClassProvision(false, true)} disabled={busy || !classId}>Provision Parents</button>
          <button onClick={() => runClassProvision(true, true)} disabled={busy || !classId}>Provision Both</button>
          <button onClick={runParentProvision} disabled={busy}>Provision Parents (Global / Class)</button>
          <button onClick={runStudentAccountRebuild} disabled={busy || !classId} style={{ background: "#9f1239", color: "#fff", borderColor: "#9f1239" }}>
            Rebuild Student Logins
          </button>
        </div>
        <p style={{ marginTop: 8, color: "#9f1239", fontWeight: 700 }}>
          Use Rebuild Student Logins only for older student accounts that were created from Student Registration and cannot open the student dashboard. It archives the broken login only, not the student profile.
        </p>

        {classData ? (
          <div style={{ marginTop: 10 }}>
            <strong>{classData.class?.name} coverage</strong>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 8, marginTop: 8 }}>
              <StatCard label="Total" value={stats.total} />
              <StatCard label="With Student Account" value={stats.withStudentAccount} />
              <StatCard label="With Parent Account" value={stats.withParentAccount} />
              <StatCard label="Missing Student" value={stats.missingStudentAccount} />
              <StatCard label="Missing Parent" value={stats.missingParentAccount} />
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12, marginBottom: 8 }}>
              <button type="button" onClick={() => selectStudentsBy((student) => !student.studentAccount)}>
                Select Missing Student Accounts
              </button>
              <button type="button" onClick={() => selectStudentsBy((student) => (student.parentAccounts || []).length === 0)}>
                Select Missing Parent Accounts
              </button>
              <button type="button" onClick={() => setSelectedStudentIds((classData.students || []).map((student) => String(student.id)))}>
                Select All in Class
              </button>
              <button type="button" onClick={() => setSelectedStudentIds([])}>
                Clear Selection
              </button>
            </div>

            <p style={{ marginTop: 0, color: "#475569" }}>
              Selected returning students: <strong>{selectedStudentIds.length}</strong>
            </p>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Select</th>
                    <th style={thStyle}>Student</th>
                    <th style={thStyle}>Student Account</th>
                    <th style={thStyle}>Parent Account</th>
                  </tr>
                </thead>
                <tbody>
                  {(classData.students || []).map((student) => {
                    const selected = selectedStudentIds.includes(String(student.id));
                    return (
                      <tr key={student.id}>
                        <td style={tdStyle}>
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleStudentSelection(student.id)}
                          />
                        </td>
                        <td style={tdStyle}>
                          <strong>{student.name}</strong>
                        </td>
                        <td style={tdStyle}>
                          {student.studentAccount ? student.studentAccount.username : "Missing"}
                        </td>
                        <td style={tdStyle}>
                          {(student.parentAccounts || []).length
                            ? student.parentAccounts.map((account) => account.username).join(", ")
                            : "Missing"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </div>

      <div style={{ border: "1px solid #d8e2ef", borderRadius: 10, padding: 12, marginBottom: 12, background: "#fff" }}>
        <h3 style={{ marginTop: 0 }}>Teacher Bulk Provisioning</h3>
        <p style={{ marginTop: 0, color: "#475569" }}>Enter one teacher per line: <code>Name,Phone,Department,Subject1|Subject2</code></p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
          <input value={teacherPrefix} onChange={(e) => setTeacherPrefix(e.target.value)} placeholder="Teacher username prefix" />
          <input value={teacherPassword} onChange={(e) => setTeacherPassword(e.target.value)} placeholder="Teacher temp password" />
          <select value={teacherRole} onChange={(e) => setTeacherRole(e.target.value)}>
            {TEACHER_ROLES.map((role) => <option key={role} value={role}>{role}</option>)}
          </select>
        </div>
        <textarea
          rows={6}
          style={{ width: "100%" }}
          value={teacherSeed}
          onChange={(e) => setTeacherSeed(e.target.value)}
          placeholder={"Adebayo Grace,08030000001,Science,Mathematics|Basic Science\nBello Musa,08030000002,Arts,English Language|Literature in English"}
        />
        <button onClick={runTeacherProvision} disabled={busy} style={{ marginTop: 8 }}>Provision Teacher Accounts</button>
      </div>

      <div style={{ border: "1px solid #d8e2ef", borderRadius: 10, padding: 12, marginBottom: 12, background: "#fff" }}>
        <h3 style={{ marginTop: 0 }}>Credential Reissue</h3>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <select value={reissueRole} onChange={(e) => setReissueRole(e.target.value)}>
            <option value="STUDENT">STUDENT</option>
            <option value="PARENT">PARENT</option>
            <option value="TEACHER">TEACHER</option>
            <option value="CLASS_TEACHER">CLASS_TEACHER</option>
            <option value="ASSIST_CLASS_TEACHER">ASSIST_CLASS_TEACHER</option>
            <option value="APPLICANT">APPLICANT</option>
          </select>
          <select value={reissueClassId} onChange={(e) => setReissueClassId(e.target.value)}>
            <option value="">All Classes</option>
            {classes.map((cls) => <option key={cls.id} value={cls.id}>{cls.name}</option>)}
          </select>
          <input value={reissuePassword} onChange={(e) => setReissuePassword(e.target.value)} placeholder="Optional fixed temp password" />
          <button onClick={runReissue} disabled={busy}>Reissue Credentials</button>
        </div>
      </div>

      <div style={{ border: "1px solid #d8e2ef", borderRadius: 10, padding: 12, marginBottom: 12, background: "#fff" }}>
        <h3 style={{ marginTop: 0 }}>Issued Credentials (Current Batch)</h3>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <button onClick={() => downloadCsv("provisioned_credentials.csv", lastCredentials)} disabled={!lastCredentials.length}>Download CSV</button>
          <button onClick={() => window.print()} disabled={!lastCredentials.length}>Print Login Slips</button>
        </div>
        {lastCredentials.length === 0 ? <p>No credentials have been issued in the current batch yet.</p> : null}
        {lastCredentials.length > 0 ? (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={thStyle}>Name / Student</th>
                  <th style={thStyle}>Username</th>
                  <th style={thStyle}>Phone</th>
                  <th style={thStyle}>Temporary Password</th>
                </tr>
              </thead>
              <tbody>
                {lastCredentials.map((row, index) => (
                  <tr key={`${row.username || row.userId || index}-${index}`}>
                    <td style={tdStyle}>{row.studentName || row.name || (Array.isArray(row.students) ? row.students.join(", ") : "-")}</td>
                    <td style={tdStyle}>{row.username || "-"}</td>
                    <td style={tdStyle}>{row.phone || "-"}</td>
                    <td style={tdStyle}>{row.password || row.temporaryPassword || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>

      <div style={{ border: "1px solid #d8e2ef", borderRadius: 10, padding: 12, background: "#fff" }}>
        <h3 style={{ marginTop: 0 }}>Provisioning Logs</h3>
        <div style={{ maxHeight: 260, overflowY: "auto" }}>
          {logs.slice(0, 80).map((log) => (
            <div key={log.id} style={{ borderBottom: "1px dashed #e4eaf2", padding: "6px 0" }}>
              <strong>{log.userType}</strong> | {log.generatedUsername || "-"} | {log.status}
              <div style={{ fontSize: 12, color: "#54657d" }}>
                by {log.provisionedBy || "system"} at {log.provisionedAt ? new Date(log.provisionedAt).toLocaleString() : ""}
              </div>
            </div>
          ))}
          {logs.length === 0 ? <p>No provisioning logs have been recorded yet.</p> : null}
        </div>
      </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div style={{ border: "1px solid #d8e2ef", borderRadius: 8, padding: 10, background: "#fff" }}>
      <div style={{ fontSize: 12, color: "#516d8d" }}>{label}</div>
      <strong style={{ fontSize: 18 }}>{value}</strong>
    </div>
  );
}

const thStyle = {
  border: "1px solid #dce6f3",
  padding: 8,
  background: "#f5f9ff",
  textAlign: "left",
};

const tdStyle = {
  border: "1px solid #dce6f3",
  padding: 8,
};

