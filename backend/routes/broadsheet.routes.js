const express = require("express");
const { nanoid } = require("nanoid");
const XLSX = require("xlsx");
const { auth, requireRole } = require("../middleware/auth");
const { readDB, writeDB } = require("../lib/jsonStore");
const { normalizeSubject, getSubjectsForClassName } = require("../lib/subjects");
const { ensureAcademicSystemShape, sortAcademicClasses, supportsNigerianCA } = require("../lib/academicSystems");

const router = express.Router();

const SCHOOL_NAME = String(process.env.SCHOOL_NAME || "Angel Montessori School").trim();
const SCHOOL_ADDRESS = String(process.env.SCHOOL_ADDRESS || "152 Okedogbon Road, Owo, Ondo State, Nigeria").trim();
const SCHOOL_EMAIL = String(process.env.SCHOOL_EMAIL || "info@angelmontessori.ng").trim();
const SCHOOL_PHONE = String(process.env.SCHOOL_PHONE || "+234 803 506 7767").trim();

function s(v) { return String(v || "").trim(); }
function n(v, d = 0) { const x = Number(v); return Number.isFinite(x) ? x : d; }
function pct(a, b) { return b ? Number(((a / b) * 100).toFixed(2)) : 0; }
function now() { return new Date().toISOString(); }
function bool(v, fallback = false) {
  if (v === undefined || v === null || v === "") return fallback;
  if (typeof v === "boolean") return v;
  return ["1", "true", "yes", "on", "y"].includes(s(v).toLowerCase());
}

function gradeFrom(score) {
  const x = n(score);
  if (x >= 70) return { grade: "A", remark: "Excellent" };
  if (x >= 60) return { grade: "B", remark: "Very Good" };
  if (x >= 50) return { grade: "C", remark: "Good" };
  if (x >= 45) return { grade: "D", remark: "Fair" };
  if (x >= 40) return { grade: "E", remark: "Pass" };
  return { grade: "F", remark: "Fail" };
}

function ensureCollections(db) {
  if (!Array.isArray(db.broadsheetSnapshots)) db.broadsheetSnapshots = [];
  if (!Array.isArray(db.broadsheetSnapshotItems)) db.broadsheetSnapshotItems = [];
  if (!Array.isArray(db.broadsheetLogs)) db.broadsheetLogs = [];
}

function userSubjectSet(user) {
  if (s(user?.role).toUpperCase() !== "TEACHER") return null;
  return new Set((user.subjects || []).map((x) => normalizeSubject(x)).filter(Boolean));
}

function resolveStudentId(db, ref) {
  const r = s(ref);
  if (!r) return "";
  const direct = (db.students || []).find((x) => s(x.id) === r);
  if (direct) return s(direct.id);
  const u = (db.users || []).find((x) => s(x.id) === r && s(x.studentId));
  if (u) return s(u.studentId);
  return r;
}

function buildLines(payload, detailed = false) {
  const headers = ["S/N", "Adm No", "Student Name"];
  const subjects = payload.subjects || [];
  if (detailed) {
    subjects.forEach((x) => headers.push(`${x} CA`, `${x} Exam`, `${x} Total`));
  } else {
    headers.push(...subjects);
  }
  headers.push("Total", "Avg", "Pos", "Remark");

  const widths = headers.map((h, i) => Math.min(i < 3 ? (i === 2 ? 24 : 10) : 14, Math.max(6, h.length + 1)));
  const pad = (v, w) => {
    const t = s(v);
    if (t.length === w) return t;
    if (t.length < w) return `${t}${" ".repeat(w - t.length)}`;
    return w <= 1 ? t.slice(0, w) : `${t.slice(0, w - 1)}~`;
  };

  const line = (arr) => arr.map((v, i) => pad(v, widths[i])).join(" | ");
  const out = [line(headers), widths.map((w) => "-".repeat(w)).join("-+-")];

  (payload.rows || []).forEach((row, idx) => {
    const vals = [idx + 1, row.admissionNo, row.studentName];
    if (detailed) {
      subjects.forEach((subject) => {
        const o = row.subjectScores?.[subject] || {};
        vals.push(o.ca == null ? "" : n(o.ca), o.exam == null ? "" : n(o.exam), o.total == null ? "" : n(o.total));
      });
    } else {
      subjects.forEach((subject) => {
        const t = row.subjectScores?.[subject]?.total;
        vals.push(t == null ? "" : n(t));
      });
    }
    vals.push(n(row.totalScore), n(row.averageScore).toFixed(2), row.overallPosition, row.overallRemark || row.remark);
    out.push(line(vals));
  });

  return out;
}
function normalizeClassKey(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function classMap(db) {
  ensureAcademicSystemShape(db);
  const rows = sortAcademicClasses(Array.isArray(db.classes) ? db.classes : [])
    .filter((row) => row.isActive !== false && (supportsNigerianCA(row.id) || supportsNigerianCA(row.name)));
  const byId = new Map();
  const byName = new Map();
  rows.forEach((row) => {
    const id = s(row.id);
    const name = s(row.name || row.className);
    if (!id || !name) return;
    byId.set(id, { id, name, section: s(row.section), order: n(row.order, 999) });
    byName.set(normalizeClassKey(name), { id, name, section: s(row.section), order: n(row.order, 999) });
  });
  return { rows: Array.from(byId.values()).sort((a, b) => a.order - b.order || a.name.localeCompare(b.name)), byId, byName };
}

function buildPayload(req, source = {}, fallbackType = "summary") {
  const classId = s(source.classId);
  const session = s(source.session);
  const term = s(source.term);
  if (!classId || !session || !term) {
    const err = new Error("classId, session and term are required");
    err.status = 400;
    throw err;
  }

  const type = s(source.broadsheetType || source.type || fallbackType).toLowerCase() || "summary";
  const detailed = type === "detailed" || bool(source.includeCAExamSplit, false);
  const includeGrades = bool(source.includeGrades, true);
  const includeAttendance = bool(source.includeAttendance, true);
  const includeComments = bool(source.includeComments, true);
  const sortBy = s(source.sortBy || "position").toLowerCase();
  const canonicalSubject = s(source.subject) ? normalizeSubject(source.subject) : "";

  if (s(source.subject) && !canonicalSubject) {
    const err = new Error("Invalid subject. Use a standard subject name.");
    err.status = 400;
    throw err;
  }

  if (s(req.user?.role).toUpperCase() === "TEACHER" && canonicalSubject && !new Set((req.user.subjects || []).map((x) => normalizeSubject(x))).has(canonicalSubject)) {
    const err = new Error("You can only access broadsheet data for your assigned subject(s).");
    err.status = 403;
    throw err;
  }

  const db = readDB();
  ensureCollections(db);
  const classes = classMap(db);
  const cls = classes.byId.get(classId);
  if (!cls) {
    const err = new Error("Class not found");
    err.status = 404;
    throw err;
  }

  const students = (db.students || []).filter((x) => s(x.classId) === classId).sort((a, b) => s(a.name).localeCompare(s(b.name)));
  const studentIds = new Set(students.map((x) => s(x.id)));

  const teacherSubjects = userSubjectSet(req.user);
  const curriculum = (getSubjectsForClassName(cls.name) || []).map((x) => normalizeSubject(x)).filter(Boolean);

  const resultRows = (db.results || [])
    .filter((r) => studentIds.has(s(r.studentId)) && s(r.session) === session && s(r.term) === term)
    .map((r) => ({ studentId: s(r.studentId), subject: normalizeSubject(r.subject) || s(r.subject), total: n(r.score), ca: null, exam: null, grade: "", remark: "" }));

  const offeringById = new Map(
    (db.classSubjectOfferings || [])
      .filter((o) => s(o.classId) === classId && s(o.sessionId) === session && s(o.termId) === term)
      .map((o) => [s(o.id), normalizeSubject(o.subject || o.subjectName || o.subjectId) || s(o.subject || o.subjectName || o.subjectId)])
  );

  const computedRows = (db.computedResults || [])
    .filter((r) => offeringById.has(s(r.classSubjectOfferingId)))
    .map((r) => ({
      studentId: resolveStudentId(db, r.studentUserId),
      subject: offeringById.get(s(r.classSubjectOfferingId)) || "",
      total: n(r.totalScore),
      ca: Number.isFinite(Number(r.caTotal)) ? n(r.caTotal) : null,
      exam: Number.isFinite(Number(r.examTotal)) ? n(r.examTotal) : null,
      grade: s(r.gradeLabel),
      remark: s(r.remark),
    }))
    .filter((r) => studentIds.has(r.studentId) && s(r.subject));

  const allSubSet = new Set([...curriculum, ...resultRows.map((x) => x.subject), ...computedRows.map((x) => x.subject)]);
  let subjects = canonicalSubject ? [canonicalSubject] : Array.from(allSubSet);
  if (teacherSubjects) subjects = subjects.filter((sub) => teacherSubjects.has(sub));

  const scoreMap = new Map();
  resultRows.forEach((r) => scoreMap.set(`${r.studentId}::${r.subject}`, { ...r, source: "results" }));
  computedRows.forEach((r) => scoreMap.set(`${r.studentId}::${r.subject}`, { ...r, source: "computed" }));

  const reportMap = new Map();
  (db.reports || []).forEach((row) => {
    if (s(row.session) !== session || s(row.term) !== term) return;
    if (!studentIds.has(s(row.studentId))) return;
    reportMap.set(s(row.studentId), row);
  });

  const termSummaryMap = new Map();
  (db.termResultSummaries || []).forEach((row) => {
    if (s(row.sessionId) !== session || s(row.termId) !== term) return;
    if (s(row.classId) && s(row.classId) !== classId) return;
    const sid = resolveStudentId(db, row.studentUserId);
    if (!studentIds.has(sid)) return;
    termSummaryMap.set(sid, row);
  });

  const rows = students.map((student) => {
    const scores = {};
    const subjectScores = {};
    let totalScore = 0;
    let count = 0;

    subjects.forEach((sub) => {
      const hit = scoreMap.get(`${s(student.id)}::${sub}`);
      if (!hit) {
        subjectScores[sub] = { ca: null, exam: null, total: null, grade: "", remark: "" };
        return;
      }

      const total = n(hit.total);
      totalScore += total;
      count += 1;

      const g = gradeFrom(total);
      const grade = includeGrades ? (s(hit.grade) || g.grade) : "";
      const remark = includeGrades ? (s(hit.remark) || g.remark) : "";
      const ca = detailed ? (hit.ca == null ? 0 : n(hit.ca)) : null;
      const exam = detailed ? (hit.exam == null ? total : n(hit.exam)) : null;

      subjectScores[sub] = { ca, exam, total, grade, remark };
      scores[sub] = total;
    });

    const avg = count ? Number((totalScore / count).toFixed(2)) : 0;
    const gAvg = gradeFrom(avg);
    const report = reportMap.get(s(student.id)) || {};
    const sum = termSummaryMap.get(s(student.id)) || {};

    return {
      studentId: s(student.id),
      admissionNo: s(student.admissionNo || student.admissionNumber || student.id),
      studentName: s(student.name),
      scores,
      subjectScores,
      totalScore,
      averageScore: avg,
      total: totalScore,
      average: avg,
      overallPosition: n(sum.overallPosition, 0),
      overallGrade: s(sum.overallGrade || gAvg.grade),
      overallRemark: s(gAvg.remark),
      remark: s(gAvg.remark),
      attendanceSummary: includeAttendance ? s(sum.attendanceSummary || report.attendanceSummary) : "",
      classTeacherComment: includeComments ? s(sum.classTeacherComment || report.classTeacherComment) : "",
      principalComment: includeComments ? s(sum.principalComment || report.principalComment) : "",
    };
  });

  const ranked = [...rows].sort((a, b) => b.averageScore - a.averageScore || b.totalScore - a.totalScore || a.studentName.localeCompare(b.studentName));
  let prev = "";
  let prevPos = 0;
  ranked.forEach((row, i) => {
    const key = `${row.averageScore}|${row.totalScore}`;
    const pos = key === prev ? prevPos : i + 1;
    row.overallPosition = pos;
    prev = key;
    prevPos = pos;
  });

  let ordered = [...ranked];
  if (sortBy === "name") ordered = [...rows].sort((a, b) => a.studentName.localeCompare(b.studentName));
  if (sortBy === "admission_no") ordered = [...rows].sort((a, b) => a.admissionNo.localeCompare(b.admissionNo));

  const avgs = rows.map((x) => n(x.averageScore));
  const pass = rows.filter((x) => n(x.averageScore) >= 50).length;
  const fail = rows.length - pass;

  const gradeDistribution = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 };
  rows.forEach((x) => {
    const g = gradeFrom(x.averageScore).grade;
    gradeDistribution[g] = (gradeDistribution[g] || 0) + 1;
  });

  const subjectStats = subjects.map((sub) => {
    const vals = rows.map((x) => x.subjectScores?.[sub]?.total).filter((v) => Number.isFinite(Number(v))).map((v) => n(v));
    const high = vals.length ? Math.max(...vals) : 0;
    const low = vals.length ? Math.min(...vals) : 0;
    const avg = vals.length ? Number((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2)) : 0;
    const p = vals.filter((v) => v >= 50).length;
    const f = vals.length - p;
    return { subject: sub, highest: high, lowest: low, average: avg, passRate: pct(p, vals.length), failRate: pct(f, vals.length) };
  });

  return {
    class: { id: cls.id, name: cls.name, section: cls.section },
    session,
    term,
    broadsheetType: detailed ? "detailed" : type,
    subjects,
    rows: ordered,
    classStats: {
      students: rows.length,
      subjectsOffered: subjects.length,
      highestAverage: avgs.length ? Math.max(...avgs) : 0,
      lowestAverage: avgs.length ? Math.min(...avgs) : 0,
      classAverage: avgs.length ? Number((avgs.reduce((a, b) => a + b, 0) / avgs.length).toFixed(2)) : 0,
      passRate: pct(pass, rows.length),
      failRate: pct(fail, rows.length),
      gradeDistribution,
    },
    subjectStats,
    strongestSubject: subjectStats.length ? [...subjectStats].sort((a, b) => b.average - a.average)[0].subject : "",
    weakestSubject: subjectStats.length ? [...subjectStats].sort((a, b) => a.average - b.average)[0].subject : "",
    includeCAExamSplit: detailed,
    includeGrades,
    includeAttendance,
    includeComments,
    sortBy,
    generatedAt: now(),
    generatedBy: s(req.user?.id),
  };
}

function payloadFromSnapshot(db, snapshot) {
  const classes = classMap(db);
  const cls = classes.byId.get(s(snapshot.classId));
  const metadata = snapshot.metadataJson && typeof snapshot.metadataJson === "object" ? snapshot.metadataJson : {};
  const subjects = Array.isArray(metadata.subjects) ? metadata.subjects : [];

  const items = (db.broadsheetSnapshotItems || [])
    .filter((x) => s(x.broadsheetSnapshotId) === s(snapshot.id))
    .sort((a, b) => n(a.overallPosition, 9999) - n(b.overallPosition, 9999));

  const rows = items.map((x) => ({
    studentId: s(x.studentUserId),
    admissionNo: s(x.admissionNo),
    studentName: s(x.studentName),
    subjectScores: x.subjectScoresJson || {},
    scores: Object.fromEntries(Object.entries(x.subjectScoresJson || {}).map(([k, v]) => [k, v?.total])),
    totalScore: n(x.totalScore),
    averageScore: n(x.averageScore),
    total: n(x.totalScore),
    average: n(x.averageScore),
    overallPosition: n(x.overallPosition),
    overallGrade: s(x.overallGrade),
    overallRemark: s(x.overallRemark),
    remark: s(x.overallRemark),
    attendanceSummary: s(x.attendanceSummary),
    classTeacherComment: s(x.teacherComment),
    principalComment: s(x.principalComment),
  }));

  return {
    class: { id: s(snapshot.classId), name: s(cls?.name || snapshot.className), section: s(cls?.section || snapshot.classSection) },
    session: s(snapshot.session),
    term: s(snapshot.term),
    broadsheetType: s(snapshot.broadsheetType || "summary"),
    subjects,
    rows,
    classStats: metadata.classStats || {},
    subjectStats: metadata.subjectStats || [],
    strongestSubject: metadata.strongestSubject || "",
    weakestSubject: metadata.weakestSubject || "",
    includeCAExamSplit: bool(snapshot.includeCAExamSplit, false),
    includeGrades: bool(snapshot.includeGrades, true),
    includeAttendance: bool(snapshot.includeAttendance, true),
    includeComments: bool(snapshot.includeComments, true),
    sortBy: s(metadata.sortBy || "position"),
    generatedAt: s(snapshot.generatedAt || snapshot.createdAt),
    generatedBy: s(snapshot.generatedBy),
    snapshotId: s(snapshot.id),
    snapshotStatus: s(snapshot.status || "DRAFT"),
  };
}

function saveSnapshot(db, payload, reqUser) {
  const id = `bs-${nanoid(10)}`;
  const ts = now();
  const snapshot = {
    id,
    classId: s(payload.class?.id),
    className: s(payload.class?.name),
    classSection: s(payload.class?.section),
    session: s(payload.session),
    term: s(payload.term),
    broadsheetType: s(payload.broadsheetType),
    includeCAExamSplit: bool(payload.includeCAExamSplit, false),
    includeGrades: bool(payload.includeGrades, true),
    includeAttendance: bool(payload.includeAttendance, true),
    includeComments: bool(payload.includeComments, true),
    generatedBy: s(reqUser?.id),
    approvedBy: "",
    status: "DRAFT",
    generatedAt: ts,
    approvedAt: "",
    lockedAt: "",
    filePathPdf: "",
    filePathExcel: "",
    metadataJson: {
      sortBy: payload.sortBy,
      subjects: payload.subjects || [],
      classStats: payload.classStats || {},
      subjectStats: payload.subjectStats || [],
      strongestSubject: payload.strongestSubject || "",
      weakestSubject: payload.weakestSubject || "",
    },
    createdAt: ts,
    updatedAt: ts,
  };

  const items = (payload.rows || []).map((row) => ({
    id: `bsi-${nanoid(10)}`,
    broadsheetSnapshotId: id,
    studentUserId: s(row.studentId),
    admissionNo: s(row.admissionNo),
    studentName: s(row.studentName),
    subjectScoresJson: row.subjectScores || {},
    totalScore: n(row.totalScore),
    averageScore: n(row.averageScore),
    overallPosition: n(row.overallPosition),
    overallGrade: s(row.overallGrade),
    overallRemark: s(row.overallRemark || row.remark),
    attendanceSummary: s(row.attendanceSummary),
    teacherComment: s(row.classTeacherComment),
    principalComment: s(row.principalComment),
    createdAt: ts,
    updatedAt: ts,
  }));

  db.broadsheetSnapshots.unshift(snapshot);
  db.broadsheetSnapshotItems.unshift(...items);
  db.broadsheetLogs.unshift({
    id: `bsl-${nanoid(10)}`,
    userId: s(reqUser?.id),
    action: "generated_broadsheet",
    broadsheetSnapshotId: id,
    metadata: { classId: snapshot.classId, session: snapshot.session, term: snapshot.term },
    createdAt: ts,
  });

  return snapshot;
}

function excelBuffer(payload, detailed = false) {
  const wb = XLSX.utils.book_new();
  const subjects = payload.subjects || [];
  const top = [
    [SCHOOL_NAME],
    ["Termly Broadsheet"],
    [`Class: ${s(payload.class?.name)}`],
    [`Session: ${s(payload.session)} | Term: ${s(payload.term)}`],
    [""],
  ];

  const headers = ["S/N", "Adm No", "Student Name"];
  if (detailed) subjects.forEach((sub) => headers.push(`${sub} CA`, `${sub} Exam`, `${sub} Total`));
  else headers.push(...subjects);
  headers.push("Total", "Average", "Position", "Remark");

  const rows = (payload.rows || []).map((row, idx) => {
    const r = [idx + 1, row.admissionNo, row.studentName];
    if (detailed) {
      subjects.forEach((sub) => {
        const o = row.subjectScores?.[sub] || {};
        r.push(o.ca == null ? "" : n(o.ca), o.exam == null ? "" : n(o.exam), o.total == null ? "" : n(o.total));
      });
    } else {
      subjects.forEach((sub) => r.push(row.subjectScores?.[sub]?.total == null ? "" : n(row.subjectScores[sub].total)));
    }
    r.push(n(row.totalScore), Number(n(row.averageScore).toFixed(2)), n(row.overallPosition), row.overallRemark || row.remark);
    return r;
  });

  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([...top, headers, ...rows]), "Broadsheet");
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      ["Class Statistics"],
      ["Students", n(payload.classStats?.students)],
      ["Subjects", n(payload.classStats?.subjectsOffered)],
      ["Highest Average", n(payload.classStats?.highestAverage)],
      ["Lowest Average", n(payload.classStats?.lowestAverage)],
      ["Class Average", n(payload.classStats?.classAverage)],
      ["Pass Rate", `${n(payload.classStats?.passRate)}%`],
      ["Fail Rate", `${n(payload.classStats?.failRate)}%`],
    ]),
    "Class Statistics"
  );

  const statRows = [["Subject Statistics"], ["Subject", "Highest", "Lowest", "Average", "Pass Rate", "Fail Rate"]];
  (payload.subjectStats || []).forEach((r) => statRows.push([r.subject, n(r.highest), n(r.lowest), n(r.average), `${n(r.passRate)}%`, `${n(r.failRate)}%`]));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(statRows), "Subject Statistics");

  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}

function pdfEscape(t) { return String(t || "").replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)").replace(/[\r\n]+/g, " "); }
function pdfText(x, y, f, z, t, c = "0 0 0") { return `${c} rg\nBT /${f} ${z} Tf ${x} ${y} Td (${pdfEscape(t)}) Tj ET`; }

function pdfBuffer(payload, detailed = false) {
  const lines = [
    SCHOOL_NAME,
    SCHOOL_ADDRESS,
    `Email: ${SCHOOL_EMAIL} | Phone: ${SCHOOL_PHONE}`,
    "",
    `Termly Broadsheet (${detailed ? "Detailed" : "Summary"})`,
    `Class: ${s(payload.class?.name)} | Session: ${s(payload.session)} | Term: ${s(payload.term)}`,
    "",
    ...buildLines(payload, detailed),
  ];

  const pages = [];
  for (let i = 0; i < lines.length; i += 54) pages.push(lines.slice(i, i + 54));
  if (!pages.length) pages.push(["No broadsheet rows available"]);

  const objs = {};
  objs[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objs[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
  objs[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>";
  objs[5] = "<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>";

  let id = 6;
  const pageIds = [];
  pages.forEach((pageLines, idx) => {
    const pid = id; const cid = id + 1; id += 2; pageIds.push(pid);
    const ops = [];
    ops.push("0.11 0.31 0.56 rg\n36 792 523 28 re f");
    ops.push(pdfText(46, 801, "F4", 13, `BROADSHEET - ${s(payload.class?.name)} (Page ${idx + 1}/${pages.length})`, "1 1 1"));
    let y = 778;
    pageLines.forEach((line) => { ops.push(pdfText(40, y, "F5", 8.2, line)); y -= 12; });
    ops.push(pdfText(42, 42, "F3", 9, "Prepared By: __________________   Checked By: __________________   Principal: __________________"));
    const stream = ops.join("\n");
    objs[cid] = `<< /Length ${Buffer.byteLength(stream, "utf8")} >>\nstream\n${stream}\nendstream`;
    objs[pid] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F3 3 0 R /F4 4 0 R /F5 5 0 R >> >> /Contents ${cid} 0 R >>`;
  });

  objs[2] = `<< /Type /Pages /Kids [${pageIds.map((x) => `${x} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;

  let pdf = "%PDF-1.4\n";
  const max = id - 1;
  const offs = new Array(max + 1).fill(0);
  for (let i = 1; i <= max; i += 1) { offs[i] = Buffer.byteLength(pdf, "utf8"); pdf += `${i} 0 obj\n${objs[i] || "<<>>"}\nendobj\n`; }
  const xr = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${max + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= max; i += 1) pdf += `${String(offs[i]).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${max + 1} /Root 1 0 R >>\nstartxref\n${xr}\n%%EOF`;
  return Buffer.from(pdf, "utf8");
}

function resolvePayload(req, source = {}, fallbackType = "summary") {
  const db = readDB();
  ensureCollections(db);
  const snapshotId = s(source.snapshotId);

  if (snapshotId) {
    const snap = (db.broadsheetSnapshots || []).find((x) => s(x.id) === snapshotId);
    if (!snap) { const err = new Error("Broadsheet snapshot not found"); err.status = 404; throw err; }
    if (s(req.user?.role).toUpperCase() === "TEACHER") { const err = new Error("Teachers cannot open archived class-wide snapshots."); err.status = 403; throw err; }
    return { payload: payloadFromSnapshot(db, snap), snapshot: snap, db };
  }

  const payload = buildPayload(req, source, fallbackType);
  const classes = classMap(db);
  if (!classes.byId.has(s(payload.class?.id || payload.classId))) {
    const err = new Error("Broadsheets are available for Basic, JSS and SS classes only.");
    err.status = 400;
    throw err;
  }
  return { payload, snapshot: null, db };
}

router.get("/broadsheet/dashboard", auth(), requireRole("ADMIN", "TEACHER"), (req, res) => {
  const db = readDB();
  ensureCollections(db);
  const session = s(req.query.session);
  const term = s(req.query.term);
  const classes = classMap(db).rows;
  const snaps = (db.broadsheetSnapshots || []).filter((x) => (!session || s(x.session) === session) && (!term || s(x.term) === term));
  const logs = (db.broadsheetLogs || []).filter((x) => (!session || s(x.metadata?.session) === session) && (!term || s(x.metadata?.term) === term)).sort((a, b) => s(b.createdAt).localeCompare(s(a.createdAt))).slice(0, 8);
  const users = new Map((db.users || []).map((u) => [s(u.id), u]));
  return res.json({
    cards: {
      availableClassesThisTerm: classes.length,
      broadsheetsGenerated: snaps.length,
      broadsheetsLocked: snaps.filter((x) => s(x.status).toUpperCase() === "LOCKED").length,
      pendingApproval: snaps.filter((x) => s(x.status).toUpperCase() === "DRAFT").length,
    },
    recentActivity: logs.map((x) => ({ ...x, userName: s(users.get(s(x.userId))?.name) })),
  });
});

router.post("/broadsheet/generate", auth(), requireRole("ADMIN", "TEACHER"), (req, res) => {
  try {
    const payload = buildPayload(req, req.body || {}, s(req.body?.broadsheetType || "summary"));
    const db = readDB();
    ensureCollections(db);
    if (!classMap(db).byId.has(s(payload.class?.id || payload.classId))) {
      return res.status(400).json({ message: "Broadsheets are available for Basic, JSS and SS classes only." });
    }
    const snapshot = bool(req.body?.createSnapshot, true) ? saveSnapshot(db, payload, req.user) : null;
    if (snapshot) writeDB(db);
    return res.json({ payload: { ...payload, snapshotId: s(snapshot?.id), snapshotStatus: s(snapshot?.status) }, snapshot });
  } catch (err) {
    return res.status(err.status || 400).json({ message: err.message || "Failed to generate broadsheet" });
  }
});

router.get("/broadsheet/preview", auth(), requireRole("ADMIN", "TEACHER"), (req, res) => {
  try { return res.json(resolvePayload(req, req.query || {}, "summary").payload); }
  catch (err) { return res.status(err.status || 400).json({ message: err.message || "Failed to load broadsheet preview" }); }
});

router.get("/broadsheet/detailed", auth(), requireRole("ADMIN", "TEACHER"), (req, res) => {
  try { return res.json(resolvePayload(req, { ...req.query, broadsheetType: "detailed", includeCAExamSplit: true }, "detailed").payload); }
  catch (err) { return res.status(err.status || 400).json({ message: err.message || "Failed to load detailed broadsheet" }); }
});

router.get("/broadsheet/statistics/class", auth(), requireRole("ADMIN", "TEACHER"), (req, res) => {
  try {
    const payload = resolvePayload(req, req.query || {}, "summary").payload;
    return res.json({ class: payload.class, session: payload.session, term: payload.term, classStats: payload.classStats });
  } catch (err) {
    return res.status(err.status || 400).json({ message: err.message || "Failed to load class statistics" });
  }
});

router.get("/broadsheet/statistics/subject", auth(), requireRole("ADMIN", "TEACHER"), (req, res) => {
  try {
    const payload = resolvePayload(req, req.query || {}, "summary").payload;
    return res.json({ class: payload.class, session: payload.session, term: payload.term, strongestSubject: payload.strongestSubject, weakestSubject: payload.weakestSubject, subjectStats: payload.subjectStats });
  } catch (err) {
    return res.status(err.status || 400).json({ message: err.message || "Failed to load subject statistics" });
  }
});

router.post("/broadsheet/approve", auth(), requireRole("ADMIN"), (req, res) => {
  const snapshotId = s(req.body?.snapshotId);
  if (!snapshotId) return res.status(400).json({ message: "snapshotId is required" });
  const db = readDB();
  ensureCollections(db);
  const idx = (db.broadsheetSnapshots || []).findIndex((x) => s(x.id) === snapshotId);
  if (idx < 0) return res.status(404).json({ message: "Broadsheet snapshot not found" });
  if (s(db.broadsheetSnapshots[idx].status).toUpperCase() === "LOCKED") return res.status(409).json({ message: "Locked broadsheet cannot be approved" });
  db.broadsheetSnapshots[idx] = { ...db.broadsheetSnapshots[idx], status: "APPROVED", approvedBy: s(req.user?.id), approvedAt: now(), updatedAt: now() };
  db.broadsheetLogs.unshift({ id: `bsl-${nanoid(10)}`, userId: s(req.user?.id), action: "approved_broadsheet", broadsheetSnapshotId: snapshotId, metadata: { classId: s(db.broadsheetSnapshots[idx].classId), session: s(db.broadsheetSnapshots[idx].session), term: s(db.broadsheetSnapshots[idx].term) }, createdAt: now() });
  writeDB(db);
  return res.json(db.broadsheetSnapshots[idx]);
});

router.post("/broadsheet/lock", auth(), requireRole("ADMIN"), (req, res) => {
  const snapshotId = s(req.body?.snapshotId);
  if (!snapshotId) return res.status(400).json({ message: "snapshotId is required" });
  const db = readDB();
  ensureCollections(db);
  const idx = (db.broadsheetSnapshots || []).findIndex((x) => s(x.id) === snapshotId);
  if (idx < 0) return res.status(404).json({ message: "Broadsheet snapshot not found" });
  const status = s(db.broadsheetSnapshots[idx].status).toUpperCase();
  if (!["APPROVED", "LOCKED"].includes(status)) return res.status(409).json({ message: "Only approved broadsheets can be locked" });
  db.broadsheetSnapshots[idx] = { ...db.broadsheetSnapshots[idx], status: "LOCKED", lockedAt: now(), filePathPdf: s(req.body?.filePathPdf || db.broadsheetSnapshots[idx].filePathPdf), filePathExcel: s(req.body?.filePathExcel || db.broadsheetSnapshots[idx].filePathExcel), updatedAt: now() };
  db.broadsheetLogs.unshift({ id: `bsl-${nanoid(10)}`, userId: s(req.user?.id), action: "locked_broadsheet", broadsheetSnapshotId: snapshotId, metadata: { classId: s(db.broadsheetSnapshots[idx].classId), session: s(db.broadsheetSnapshots[idx].session), term: s(db.broadsheetSnapshots[idx].term) }, createdAt: now() });
  writeDB(db);
  return res.json(db.broadsheetSnapshots[idx]);
});

router.get("/broadsheet/archive", auth(), requireRole("ADMIN"), (req, res) => {
  const db = readDB();
  ensureCollections(db);
  const classes = classMap(db).byId;
  const users = new Map((db.users || []).map((u) => [s(u.id), u]));
  let rows = [...(db.broadsheetSnapshots || [])];
  if (s(req.query.classId)) rows = rows.filter((x) => s(x.classId) === s(req.query.classId));
  if (s(req.query.session)) rows = rows.filter((x) => s(x.session) === s(req.query.session));
  if (s(req.query.term)) rows = rows.filter((x) => s(x.term) === s(req.query.term));
  if (s(req.query.status)) rows = rows.filter((x) => s(x.status).toUpperCase() === s(req.query.status).toUpperCase());
  rows.sort((a, b) => s(b.generatedAt || b.createdAt).localeCompare(s(a.generatedAt || a.createdAt)));
  return res.json(rows.map((x) => ({ ...x, className: s(classes.get(s(x.classId))?.name || x.className), classSection: s(classes.get(s(x.classId))?.section || x.classSection), generatedByName: s(users.get(s(x.generatedBy))?.name), approvedByName: s(users.get(s(x.approvedBy))?.name) })));
});

router.get("/broadsheet/export/excel", auth(), requireRole("ADMIN", "TEACHER"), (req, res) => {
  try {
    const detailed = bool(req.query?.detailed, false) || s(req.query?.broadsheetType).toLowerCase() === "detailed";
    const resolved = resolvePayload(req, req.query || {}, detailed ? "detailed" : "summary");
    const buffer = excelBuffer(resolved.payload, detailed);
    const name = `broadsheet-${s(resolved.payload.class?.name || "class").replace(/\s+/g, "-").toLowerCase()}-${s(resolved.payload.term).replace(/\s+/g, "-").toLowerCase()}.xlsx`;
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${name}"`);
    return res.status(200).send(buffer);
  } catch (err) {
    return res.status(err.status || 400).json({ message: err.message || "Failed to export broadsheet Excel" });
  }
});

router.get("/broadsheet/export/pdf", auth(), requireRole("ADMIN", "TEACHER"), (req, res) => {
  try {
    const detailed = bool(req.query?.detailed, false) || s(req.query?.broadsheetType).toLowerCase() === "detailed";
    const resolved = resolvePayload(req, req.query || {}, detailed ? "detailed" : "summary");
    const buffer = pdfBuffer(resolved.payload, detailed);
    const name = `broadsheet-${s(resolved.payload.class?.name || "class").replace(/\s+/g, "-").toLowerCase()}-${s(resolved.payload.term).replace(/\s+/g, "-").toLowerCase()}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${name}"`);
    return res.status(200).send(buffer);
  } catch (err) {
    return res.status(err.status || 400).json({ message: err.message || "Failed to export broadsheet PDF" });
  }
});

module.exports = router;
