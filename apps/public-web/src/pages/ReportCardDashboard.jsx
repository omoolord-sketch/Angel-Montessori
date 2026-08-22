import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  addResult,
  addStudent,
  archiveStudent,
  deleteResult,
  deleteStudent,
  getClasses,
  getReports,
  getResults,
  getStudents,
  getSubjectCatalog,
  upsertReport,
  updateResult,
} from "../api/services";

function normalizeClassKey(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function resolveClassSubjects(className, classSubjects, fallback = []) {
  const map = new Map(Object.entries(classSubjects || {}).map(([name, subjects]) => [normalizeClassKey(name), subjects]));
  const key = normalizeClassKey(className);
  const alias = {
    primary1: "basic1",
    primary2: "basic2",
    primary3: "basic3",
    primary4: "basic4",
    primary5: "basic5",
    primary6: "basic6",
    playgroup: "nursery1",
    prenursery: "nursery1",
  };

  return map.get(key) || map.get(alias[key]) || fallback;
}

function gradeFromScore(score) {
  const s = Number(score || 0);
  if (s >= 70) return "A";
  if (s >= 60) return "B";
  if (s >= 50) return "C";
  if (s >= 40) return "D";
  return "F";
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Failed to read image file"));
    reader.readAsDataURL(file);
  });
}

function parseBulkResultLine(line) {
  const clean = String(line || "")
    .trim()
    .replace(/^[\-*\u2022]+\s*/, "")
    .replace(/^\d+[\).\-\s]+/, "");

  const match = clean.match(/^(.*?)(?:\s*[:=,\-]\s*|\s+)(\d{1,3})\s*%?$/);
  if (!match) return null;

  const subject = String(match[1] || "").trim();
  const score = Number(match[2]);

  if (!subject || Number.isNaN(score) || score < 0 || score > 100) return null;
  return { subject, score };
}

function StudentResultCard({ student, results, onDelete, onUpdate }) {
  const total = results.reduce((sum, row) => sum + Number(row.score || 0), 0);
  const average = results.length ? Number((total / results.length).toFixed(2)) : 0;

  return (
    <div style={{ border: "1px solid #d7e3f2", borderRadius: 8, padding: 10, marginBottom: 10, background: "#fff" }}>
      <strong>{student.name}</strong> ({student.className})
      <div style={{ marginTop: 8 }}>
        {results.map((row) => (
          <ResultRow key={row.id} row={row} onDelete={onDelete} onUpdate={onUpdate} />
        ))}
        {results.length === 0 ? <p style={{ color: "#666" }}>No results yet.</p> : null}
      </div>
      <p style={{ marginBottom: 0 }}>
        <strong>Total:</strong> {total} | <strong>Average:</strong> {average}
      </p>
    </div>
  );
}

function ResultRow({ row, onDelete, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [subject, setSubject] = useState(row.subject || "");
  const [score, setScore] = useState(String(row.score ?? ""));
  const [term, setTerm] = useState(row.term || "First Term");
  const [session, setSession] = useState(row.session || "");

  useEffect(() => {
    setSubject(row.subject || "");
    setScore(String(row.score ?? ""));
    setTerm(row.term || "First Term");
    setSession(row.session || "");
  }, [row.id, row.subject, row.score, row.term, row.session]);

  if (!editing) {
    return (
      <div style={{ borderBottom: "1px dashed #ddd", padding: "6px 0", display: "flex", justifyContent: "space-between", gap: 8 }}>
        <span>
          {row.subject} ({row.term} | {row.session}) - {row.score} [{gradeFromScore(row.score)}]
        </span>
        <span>
          <button onClick={() => setEditing(true)} style={{ marginRight: 6 }}>Edit</button>
          <button onClick={() => onDelete(row)} style={{ color: "crimson" }}>Delete</button>
        </span>
      </div>
    );
  }

  return (
    <div style={{ borderBottom: "1px dashed #ddd", padding: "6px 0", display: "flex", gap: 8, flexWrap: "wrap" }}>
      <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" />
      <input type="number" value={score} onChange={(e) => setScore(e.target.value)} placeholder="Score" style={{ width: 90 }} />
      <select value={term} onChange={(e) => setTerm(e.target.value)}>
        <option>First Term</option>
        <option>Second Term</option>
        <option>Third Term</option>
      </select>
      <input value={session} onChange={(e) => setSession(e.target.value)} placeholder="Session" style={{ width: 120 }} />
      <button
        onClick={() => {
          onUpdate(row, { subject: subject.trim(), score: Number(score), term, session: session.trim() });
          setEditing(false);
        }}
      >
        Save
      </button>
      <button onClick={() => setEditing(false)}>Cancel</button>
    </div>
  );
}

export default function ReportCardDashboard() {
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [results, setResults] = useState([]);
  const [reports, setReports] = useState([]);
  const [subjectOptions, setSubjectOptions] = useState([]);
  const [classSubjects, setClassSubjects] = useState({});

  const [studentFirstName, setStudentFirstName] = useState("");
  const [studentLastName, setStudentLastName] = useState("");
  const [studentClassId, setStudentClassId] = useState("");
  const [studentPhone, setStudentPhone] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [studentPhotoData, setStudentPhotoData] = useState("");

  const [resultClassId, setResultClassId] = useState("");
  const [resultStudentId, setResultStudentId] = useState("");
  const [term, setTerm] = useState("First Term");
  const [session, setSession] = useState("2025/2026");
  const [subject, setSubject] = useState("");
  const [score, setScore] = useState("");
  const [bulkText, setBulkText] = useState("");

  const [nextTermBegins, setNextTermBegins] = useState("");
  const [teacherComment, setTeacherComment] = useState("");
  const [headTeacherComment, setHeadTeacherComment] = useState("");
  const [attPresent, setAttPresent] = useState("");
  const [attAbsent, setAttAbsent] = useState("");
  const [attTotal, setAttTotal] = useState("");

  const [filterClassId, setFilterClassId] = useState("");
  const [studentStatusFilter, setStudentStatusFilter] = useState("active");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedStudent = useMemo(
    () => students.find((s) => String(s.id) === String(resultStudentId)),
    [students, resultStudentId]
  );

  const studentsForResult = useMemo(() => {
    if (!resultClassId) return students;
    return students.filter((s) => String(s.classId) === String(resultClassId));
  }, [students, resultClassId]);

  const availableSubjectsForSelectedStudent = useMemo(() => {
    if (!selectedStudent) return subjectOptions;
    return resolveClassSubjects(selectedStudent.className, classSubjects, subjectOptions);
  }, [selectedStudent, classSubjects, subjectOptions]);

  const filteredStudents = useMemo(() => {
    if (!filterClassId) return students;
    return students.filter((s) => String(s.classId) === String(filterClassId));
  }, [students, filterClassId]);

  const load = async () => {
    try {
      setLoading(true);
      setError("");

      const [classRes, studentRes, resultRes, reportRes, catalogRes] = await Promise.allSettled([
        getClasses(),
        getStudents({ archived: "all" }),
        getResults(),
        getReports(),
        getSubjectCatalog(),
      ]);

      if (classRes.status === "fulfilled") {
        setClasses(Array.isArray(classRes.value?.data) ? classRes.value.data : []);
      }

      if (studentRes.status === "fulfilled") {
        setStudents(Array.isArray(studentRes.value?.data) ? studentRes.value.data : []);
      }

      if (resultRes.status === "fulfilled") {
        setResults(Array.isArray(resultRes.value?.data) ? resultRes.value.data : []);
      }

      if (reportRes.status === "fulfilled") {
        setReports(Array.isArray(reportRes.value?.data) ? reportRes.value.data : []);
      }

      if (catalogRes.status === "fulfilled") {
        setSubjectOptions(Array.isArray(catalogRes.value?.data?.subjects) ? catalogRes.value.data.subjects : []);
        setClassSubjects(catalogRes.value?.data?.classSubjects || {});
      }

      const errors = [classRes, studentRes, resultRes, reportRes, catalogRes]
        .filter((item) => item.status === "rejected")
        .map((item) => item.reason?.response?.data?.message || item.reason?.message)
        .filter(Boolean);

      if (errors.length) {
        setError(errors[0]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!resultClassId || !resultStudentId) return;
    const stillValid = studentsForResult.some((s) => String(s.id) === String(resultStudentId));
    if (!stillValid) setResultStudentId("");
  }, [resultClassId, resultStudentId, studentsForResult]);

  useEffect(() => {
    if (!availableSubjectsForSelectedStudent.length) return;
    if (!subject || !availableSubjectsForSelectedStudent.includes(subject)) {
      setSubject(availableSubjectsForSelectedStudent[0]);
    }
  }, [availableSubjectsForSelectedStudent, subject]);

  useEffect(() => {
    if (!resultStudentId) return;
    const existing = reports.find(
      (rep) =>
        String(rep.studentId) === String(resultStudentId) &&
        String(rep.term) === String(term) &&
        String(rep.session) === String(session)
    );

    setNextTermBegins(existing?.nextTermBegins || "");
    setTeacherComment(existing?.teacherComment || "");
    setHeadTeacherComment(existing?.headTeacherComment || "");
    setAttPresent(String(existing?.present ?? ""));
    setAttAbsent(String(existing?.absent ?? ""));
    setAttTotal(String(existing?.total ?? ""));
  }, [resultStudentId, term, session, reports]);

  const handleAddStudent = async () => {
    if (!studentFirstName.trim() || !studentLastName.trim() || !studentClassId) {
      return alert("Enter student first name, last name and class.");
    }
    if (!studentPhotoData) return alert("Upload student photo before adding student.");

    try {
      setLoading(true);
      setError("");

      await addStudent({
        firstName: studentFirstName.trim(),
        lastName: studentLastName.trim(),
        name: `${studentFirstName.trim()} ${studentLastName.trim()}`.trim(),
        classId: studentClassId,
        studentPhone: studentPhone.trim() || undefined,
        parentPhone: parentPhone.trim() || undefined,
        photoUrl: studentPhotoData || undefined,
      });

      setStudentFirstName("");
      setStudentLastName("");
      setStudentClassId("");
      setStudentPhone("");
      setParentPhone("");
      setStudentPhotoData("");
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to add student");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveResult = async () => {
    if (!resultStudentId || !term || !session || !subject.trim() || score === "") {
      return alert("Fill class, student, term, session, subject and score.");
    }

    try {
      setLoading(true);
      await addResult({
        studentId: resultStudentId,
        term,
        session,
        subject: subject.trim(),
        score: Number(score),
        date: new Date().toLocaleDateString(),
      });
      setScore("");
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to save result");
    } finally {
      setLoading(false);
    }
  };

  const handleBulkSave = async () => {
    if (!resultStudentId) return alert("Select a student first");

    const lines = bulkText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    if (!lines.length) return alert("Paste subject-score lines first.");

    const parsed = lines.map((line, index) => ({
      lineNumber: index + 1,
      raw: line,
      parsed: parseBulkResultLine(line),
    }));

    const invalidLines = parsed.filter((item) => !item.parsed);
    const validLines = parsed.filter((item) => item.parsed);

    if (!validLines.length) {
      setError("No valid bulk result lines found. Use format like: English Language 72");
      return;
    }

    const failures = [];
    let successCount = 0;

    try {
      setLoading(true);

      for (const item of validLines) {
        try {
          await addResult({
            studentId: resultStudentId,
            term,
            session,
            subject: item.parsed.subject,
            score: item.parsed.score,
            date: new Date().toLocaleDateString(),
          });
          successCount += 1;
        } catch (err) {
          failures.push({
            lineNumber: item.lineNumber,
            subject: item.parsed.subject,
            message: err?.response?.data?.message || err?.message || "Failed",
          });
        }
      }

      if (successCount > 0) {
        await load();
      }

      if (invalidLines.length === 0 && failures.length === 0) {
        setBulkText("");
        setError("");
        return;
      }

      const invalidText = invalidLines.length
        ? `Invalid format line(s): ${invalidLines.map((item) => item.lineNumber).join(", ")}.`
        : "";

      const failureText = failures.length
        ? ` Failed line(s): ${failures.map((item) => `${item.lineNumber} (${item.subject} - ${item.message})`).join("; ")}.`
        : "";

      setError(`Saved ${successCount} result(s). ${invalidText}${failureText}`.trim());
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Failed to save bulk results");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveReportMeta = async () => {
    if (!resultStudentId) return alert("Select a student first.");

    try {
      setLoading(true);
      await upsertReport({
        studentId: resultStudentId,
        term,
        session,
        nextTermBegins,
        teacherComment,
        headTeacherComment,
        attendance: {
          present: Number(attPresent || 0),
          absent: Number(attAbsent || 0),
          total: Number(attTotal || 0),
        },
      });
      await load();
      alert("Report metadata saved.");
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to save report metadata");
    } finally {
      setLoading(false);
    }
  };

  const handleArchiveStudent = async (student, archived) => {
    const actionText = archived ? "archive" : "restore";
    if (!window.confirm(`${actionText.charAt(0).toUpperCase()}${actionText.slice(1)} ${student.name}?`)) return;
    try {
      setLoading(true);
      await archiveStudent(student.id, { archived });
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || `Failed to ${actionText} student`);
    } finally {
      setLoading(false);
    }
  };
  const handleDeleteStudent = async (student) => {
    if (!window.confirm(`Delete ${student.name} and all linked records?`)) return;
    try {
      setLoading(true);
      await deleteStudent(student.id);
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to delete student");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteResult = async (row) => {
    if (!window.confirm(`Delete ${row.subject} result?`)) return;
    try {
      setLoading(true);
      await deleteResult(row.id);
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to delete result");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateResult = async (row, patch) => {
    try {
      setLoading(true);
      await updateResult(row.id, patch);
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to update result");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: 0 }}>Report Card Desk</h2>
          <p style={{ margin: "6px 0 0", color: "#4d647f", maxWidth: 760 }}>
            Enter subject results, attendance, teacher remarks, and report metadata before printing Angel Montessori report cards.
          </p>
        </div>
        <Link to="/dashboard/broadsheet">Termly Broadsheet</Link>
      </div>

      {error ? <p style={{ color: "crimson" }}>{error}</p> : null}

      <h3>Add Student Record</h3>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <input value={studentFirstName} onChange={(e) => setStudentFirstName(e.target.value)} placeholder="First Name" />
        <input value={studentLastName} onChange={(e) => setStudentLastName(e.target.value)} placeholder="Last Name" />
        <select value={studentClassId} onChange={(e) => setStudentClassId(e.target.value)}>
          <option value="">Select Class</option>
          {classes.map((cls) => (
            <option key={cls.id} value={cls.id}>{cls.name}</option>
          ))}
        </select>
        <input value={studentPhone} onChange={(e) => setStudentPhone(e.target.value)} placeholder="Student Phone (optional)" />
        <input value={parentPhone} onChange={(e) => setParentPhone(e.target.value)} placeholder="Parent Phone (optional)" />
        <input
          type="file"
          accept="image/*"
          title="Student photo (required)"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) {
              setStudentPhotoData("");
              return;
            }

            try {
              const dataUrl = await fileToDataUrl(file);
              setStudentPhotoData(dataUrl);
            } catch {
              setStudentPhotoData("");
              setError("Failed to read student photo.");
            }
          }}
        />
        <button onClick={handleAddStudent} disabled={loading}>Add Student</button>
      </div>
      {studentPhotoData ? (
        <div style={{ marginTop: 8 }}>
          <img src={studentPhotoData} alt="Student preview" style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 8, border: "1px solid #ccd6e0" }} />
        </div>
      ) : null}

      <hr />

      <h3>Enter Subject Result</h3>
      <select value={resultClassId} onChange={(e) => setResultClassId(e.target.value)}>
        <option value="">Select Class</option>
        {classes.map((cls) => (
          <option key={cls.id} value={cls.id}>{cls.name}</option>
        ))}
      </select>

      <select value={resultStudentId} onChange={(e) => setResultStudentId(e.target.value)} style={{ marginLeft: 8 }}>
        <option value="">Select Student</option>
        {studentsForResult.map((s) => (
          <option key={s.id} value={s.id}>{s.name} ({s.className})</option>
        ))}
      </select>

      <select value={term} onChange={(e) => setTerm(e.target.value)} style={{ marginLeft: 8 }}>
        <option>First Term</option>
        <option>Second Term</option>
        <option>Third Term</option>
      </select>

      <input value={session} onChange={(e) => setSession(e.target.value)} placeholder="Session" style={{ marginLeft: 8, width: 120 }} />

      <select value={subject} onChange={(e) => setSubject(e.target.value)} style={{ marginLeft: 8 }}>
        <option value="">Select Subject</option>
        {availableSubjectsForSelectedStudent.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>

      <input type="number" value={score} onChange={(e) => setScore(e.target.value)} placeholder="Score" style={{ marginLeft: 8, width: 90 }} />
      <button onClick={handleSaveResult} disabled={loading} style={{ marginLeft: 8 }}>Save Result</button>

      <div style={{ marginTop: 12 }}>
        <strong>Bulk Add Results</strong>
        <textarea
          rows={5}
          value={bulkText}
          onChange={(e) => setBulkText(e.target.value)}
          placeholder={"Mathematics 80\nEnglish Language: 72\nBasic Science - 67"}
          style={{ width: "100%", marginTop: 6 }}
        />
        <button onClick={handleBulkSave} disabled={loading}>Save Bulk Results</button>
      </div>

      <hr />

      <h3>Report Notes and Attendance</h3>
      <input value={nextTermBegins} onChange={(e) => setNextTermBegins(e.target.value)} placeholder="Next term begins" style={{ width: 220 }} />
      <input value={attPresent} onChange={(e) => setAttPresent(e.target.value)} type="number" placeholder="Present" style={{ width: 90, marginLeft: 8 }} />
      <input value={attAbsent} onChange={(e) => setAttAbsent(e.target.value)} type="number" placeholder="Absent" style={{ width: 90, marginLeft: 8 }} />
      <input value={attTotal} onChange={(e) => setAttTotal(e.target.value)} type="number" placeholder="Total" style={{ width: 90, marginLeft: 8 }} />
      <textarea value={teacherComment} onChange={(e) => setTeacherComment(e.target.value)} placeholder="Teacher Comment" rows={2} style={{ width: "100%", marginTop: 8 }} />
      <textarea value={headTeacherComment} onChange={(e) => setHeadTeacherComment(e.target.value)} placeholder="Head Teacher Comment" rows={2} style={{ width: "100%", marginTop: 8 }} />
      <button onClick={handleSaveReportMeta} disabled={loading || !resultStudentId} style={{ marginTop: 8 }}>
        Save Report Metadata
      </button>

      <hr />

      <h3>Student Report Results</h3>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <label style={{ marginRight: 4 }}>Filter Class:</label>
        <select value={filterClassId} onChange={(e) => setFilterClassId(e.target.value)}>
          <option value="">All Classes</option>
          {classes.map((cls) => (
            <option key={cls.id} value={cls.id}>{cls.name}</option>
          ))}
        </select>

        <label style={{ marginLeft: 8 }}>Student Status:</label>
        <select value={studentStatusFilter} onChange={(e) => setStudentStatusFilter(e.target.value)}>
          <option value="active">Active</option>
          <option value="all">All</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      <div style={{ marginTop: 10 }}>
        {filteredStudents.map((student) => (
          <div key={student.id}>
            <StudentResultCard
              student={student}
              results={results.filter((r) => String(r.studentId) === String(student.id))}
              onDelete={handleDeleteResult}
              onUpdate={handleUpdateResult}
            />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
              {student.isArchived ? (
                <button onClick={() => handleArchiveStudent(student, false)}>Restore Student</button>
              ) : (
                <button onClick={() => handleArchiveStudent(student, true)}>Archive Student</button>
              )}
              <button onClick={() => handleDeleteStudent(student)} style={{ color: "crimson" }}>
                Delete Student
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}























