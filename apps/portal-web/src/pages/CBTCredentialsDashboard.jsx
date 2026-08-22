import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  closeCbtExam,
  exportCbtExamCredentialsCsv,
  exportCbtExamCredentialsPdf,
  generateCbtExamCredentials,
  getCbtExamDetail,
  getExams,
  publishCbtExam,
  resetCbtExamCredential,
  revokeCbtExamCredential,
} from "../api/services";

function formatDateTime(value) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Lagos",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function formatRoleLabel(value) {
  return String(value || "")
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function downloadBlob(response, fallbackName) {
  const blob = new Blob([response?.data], {
    type: response?.headers?.["content-type"] || "application/octet-stream",
  });
  const header = response?.headers?.["content-disposition"] || "";
  const match = /filename="?([^"]+)"?/i.exec(header);
  const fileName = match?.[1] || fallbackName;
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

const cardStyle = {
  border: "1px solid #d7e3f2",
  borderRadius: 18,
  background: "#ffffff",
  boxShadow: "0 20px 45px rgba(15, 23, 42, 0.06)",
};

export default function CBTCredentialsDashboard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [detail, setDetail] = useState(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [lastGenerated, setLastGenerated] = useState([]);
  const [form, setForm] = useState({
    mode: "missing_only",
    passwordLength: 8,
    expiresAt: "",
  });

  const loadExams = async (status = statusFilter) => {
    const response = await getExams(status ? { status } : {});
    setExams(Array.isArray(response?.data) ? response.data : []);
  };

  const loadDetail = async () => {
    if (!id) {
      setDetail(null);
      return;
    }
    const response = await getCbtExamDetail(id);
    setDetail(response?.data || null);
  };

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setError("");
        await loadExams();
        await loadDetail();
      } catch (err) {
        setError(err?.response?.data?.message || "Failed to load CBT credential workspace");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [id]);

  const statusCounts = useMemo(() => {
    const counts = {};
    for (const exam of exams) {
      const key = String(exam.status || "DRAFT").toUpperCase();
      counts[key] = Number(counts[key] || 0) + 1;
    }
    return counts;
  }, [exams]);

  const handleFilterChange = async (nextStatus) => {
    try {
      setStatusFilter(nextStatus);
      setLoading(true);
      setError("");
      const response = await getExams(nextStatus ? { status: nextStatus } : {});
      setExams(Array.isArray(response?.data) ? response.data : []);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to filter exams");
    } finally {
      setLoading(false);
    }
  };

  const refreshCurrent = async () => {
    await loadExams();
    if (id) await loadDetail();
  };

  const handleGenerate = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError("");
      setMessage("");
      const response = await generateCbtExamCredentials(id, form);
      setLastGenerated(Array.isArray(response?.data?.generated) ? response.data.generated : []);
      setMessage(`Credential generation completed. ${response?.data?.generated?.length || 0} row(s) were issued.`);
      await refreshCurrent();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to generate credentials");
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError("");
      setMessage("");
      await publishCbtExam(id);
      setMessage("Exam published successfully.");
      await refreshCurrent();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to publish exam");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError("");
      setMessage("");
      await closeCbtExam(id);
      setMessage("Exam closed successfully.");
      await refreshCurrent();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to close exam");
    } finally {
      setLoading(false);
    }
  };

  const handleResetCandidate = async (candidate) => {
    if (!id || !candidate?.candidateType || !candidate?.candidateId) return;
    try {
      setLoading(true);
      setError("");
      setMessage("");
      const response = await resetCbtExamCredential(id, candidate.candidateType, candidate.candidateId, {
        passwordLength: form.passwordLength,
        expiresAt: form.expiresAt,
      });
      const issued = response?.data?.credential ? [response.data.credential] : [];
      setLastGenerated(issued);
      setMessage(`Credential reset completed for ${candidate.fullNameSnapshot || candidate.candidateId}.`);
      await refreshCurrent();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to reset credential");
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeCandidate = async (candidate) => {
    if (!id || !candidate?.candidateType || !candidate?.candidateId) return;
    try {
      setLoading(true);
      setError("");
      setMessage("");
      await revokeCbtExamCredential(id, candidate.candidateType, candidate.candidateId);
      setMessage(`Credential revoked for ${candidate.fullNameSnapshot || candidate.candidateId}.`);
      await refreshCurrent();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to revoke credential");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format) => {
    if (!id || !detail?.exam) return;
    try {
      setLoading(true);
      setError("");
      setMessage("");
      const response = format === "pdf"
        ? await exportCbtExamCredentialsPdf(id)
        : await exportCbtExamCredentialsCsv(id);
      const suffix = format === "pdf" ? "pdf" : "csv";
      downloadBlob(response, `${detail.exam.examCode || detail.exam.id}-credentials.${suffix}`);
      setMessage(`Credential ${format.toUpperCase()} downloaded.`);
    } catch (err) {
      setError(err?.response?.data?.message || `Failed to export ${format.toUpperCase()}`);
    } finally {
      setLoading(false);
    }
  };

  const exam = detail?.exam || null;
  const candidates = Array.isArray(detail?.candidates) ? detail.candidates : [];
  const audits = Array.isArray(detail?.auditLogs) ? detail.auditLogs : [];

  return (
    <div style={{ minHeight: "100vh", background: "#f8fbff", padding: "24px 20px 40px" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", display: "grid", gap: 18 }}>
        <section style={{ ...cardStyle, padding: 24, display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div style={{ maxWidth: 760 }}>
            <div style={{ color: "#b88716", fontWeight: 800, letterSpacing: "0.08em", fontSize: 12 }}>ACADEMIC OFFICER CBT CONTROL</div>
            <h1 style={{ margin: "8px 0 10px", fontSize: "clamp(2rem, 4vw, 3rem)", color: "#0f172a", lineHeight: 1.05 }}>
              CBT Credential Generation and Exam Access Control
            </h1>
            <p style={{ margin: 0, color: "#475569", fontSize: 16, lineHeight: 1.7 }}>
              Review submitted exams, generate secure per-exam candidate credentials, publish access, reset lost passwords,
              revoke compromised credentials, and export printable slips from one controlled officer desk.
            </p>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-start" }}>
            <Link to="/dashboard/cbt" style={{ textDecoration: "none", padding: "12px 16px", borderRadius: 12, background: "#e2e8f0", color: "#0f172a", fontWeight: 700 }}>
              Teacher CBT Workspace
            </Link>
            <Link to="/portal" style={{ textDecoration: "none", padding: "12px 16px", borderRadius: 12, background: "#0f172a", color: "#fff", fontWeight: 700 }}>
              Portal Home
            </Link>
          </div>
        </section>

        {error ? <div style={{ ...cardStyle, padding: 16, borderColor: "#fecaca", background: "#fff1f2", color: "#991b1b" }}>{error}</div> : null}
        {message ? <div style={{ ...cardStyle, padding: 16, borderColor: "#bbf7d0", background: "#f0fdf4", color: "#166534" }}>{message}</div> : null}

        {!id ? (
          <>
            <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
              {[
                ["All Exams", exams.length],
                ["Ready for Generation", statusCounts.READY_FOR_GENERATION || 0],
                ["Credentials Generated", statusCounts.CREDENTIALS_GENERATED || 0],
                ["Published", statusCounts.PUBLISHED || 0],
                ["In Progress", statusCounts.IN_PROGRESS || 0],
                ["Closed", statusCounts.CLOSED || 0],
              ].map(([label, value]) => (
                <div key={label} style={{ ...cardStyle, padding: 18 }}>
                  <div style={{ color: "#64748b", fontSize: 13 }}>{label}</div>
                  <strong style={{ display: "block", marginTop: 10, fontSize: 30, color: "#0f172a" }}>{value}</strong>
                </div>
              ))}
            </section>

            <section style={{ ...cardStyle, padding: 18, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
              <strong style={{ color: "#0f172a" }}>Filter status</strong>
              <select value={statusFilter} onChange={(event) => handleFilterChange(event.target.value)} style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #cbd5e1" }}>
                <option value="">All statuses</option>
                <option value="READY_FOR_GENERATION">READY_FOR_GENERATION</option>
                <option value="CREDENTIALS_GENERATED">CREDENTIALS_GENERATED</option>
                <option value="PUBLISHED">PUBLISHED</option>
                <option value="IN_PROGRESS">IN_PROGRESS</option>
                <option value="CLOSED">CLOSED</option>
                <option value="ARCHIVED">ARCHIVED</option>
              </select>
              {loading ? <span style={{ color: "#64748b" }}>Loading exams...</span> : null}
            </section>

            <section style={{ display: "grid", gap: 14 }}>
              {exams.map((row) => (
                <article key={row.id} style={{ ...cardStyle, padding: 20, display: "grid", gap: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <div>
                      <div style={{ color: "#b88716", fontWeight: 800, fontSize: 12, letterSpacing: "0.06em" }}>{row.examCode || row.id}</div>
                      <h3 style={{ margin: "6px 0 4px", fontSize: 24, color: "#0f172a" }}>{row.examTitle || row.title}</h3>
                      <p style={{ margin: 0, color: "#475569" }}>
                        {formatRoleLabel(row.workflowExamType || row.examType)} • {row.className || row.applicantBatchId || "Open cohort"} • {row.candidateType}
                      </p>
                    </div>
                    <div style={{ alignSelf: "flex-start", padding: "8px 12px", borderRadius: 999, background: "#eff6ff", color: "#1d4ed8", fontWeight: 800 }}>
                      {row.status}
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
                    <div><div style={{ color: "#64748b", fontSize: 12 }}>Candidates</div><strong>{row.totalCandidates || 0}</strong></div>
                    <div><div style={{ color: "#64748b", fontSize: 12 }}>Generated</div><strong>{row.generatedCount || 0}</strong></div>
                    <div><div style={{ color: "#64748b", fontSize: 12 }}>Published</div><strong>{row.publishedCount || 0}</strong></div>
                    <div><div style={{ color: "#64748b", fontSize: 12 }}>Questions</div><strong>{row.assignedQuestions || 0}</strong></div>
                    <div><div style={{ color: "#64748b", fontSize: 12 }}>Window</div><strong>{formatDateTime(row.startTime)}</strong></div>
                  </div>

                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button type="button" onClick={() => navigate(`/admin/cbt/exams/${row.id}`)} style={{ padding: "10px 14px", borderRadius: 10, border: "none", background: "#0f172a", color: "#fff", fontWeight: 700 }}>
                      Open Exam Detail
                    </button>
                    <button type="button" onClick={() => navigate(`/admin/cbt/exams/${row.id}/credentials`)} style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #cbd5e1", background: "#fff", color: "#0f172a", fontWeight: 700 }}>
                      Credential Desk
                    </button>
                  </div>
                </article>
              ))}

              {!loading && exams.length === 0 ? (
                <div style={{ ...cardStyle, padding: 24, color: "#475569" }}>
                  No exams matched the current officer filter.
                </div>
              ) : null}
            </section>
          </>
        ) : (
          <>
            <section style={{ ...cardStyle, padding: 22, display: "grid", gap: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <button type="button" onClick={() => navigate("/admin/cbt/exams")} style={{ border: "none", background: "transparent", color: "#1d4ed8", fontWeight: 700, padding: 0 }}>
                    ← Back to CBT Exams
                  </button>
                  <h2 style={{ margin: "8px 0 4px", fontSize: 30, color: "#0f172a" }}>{exam?.examTitle || "CBT Exam Detail"}</h2>
                  <p style={{ margin: 0, color: "#475569" }}>
                    {exam?.examCode || ""} • {formatRoleLabel(exam?.workflowExamType || exam?.examType)} • {exam?.className || exam?.applicantBatchId || "Open cohort"}
                  </p>
                </div>
                <div style={{ alignSelf: "flex-start", padding: "8px 12px", borderRadius: 999, background: "#eff6ff", color: "#1d4ed8", fontWeight: 800 }}>
                  {exam?.status || "DRAFT"}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
                <div><div style={{ color: "#64748b", fontSize: 12 }}>Candidates</div><strong>{exam?.totalCandidates || 0}</strong></div>
                <div><div style={{ color: "#64748b", fontSize: 12 }}>Credentials Generated</div><strong>{exam?.generatedCount || 0}</strong></div>
                <div><div style={{ color: "#64748b", fontSize: 12 }}>Active Credentials</div><strong>{exam?.activeCredentialCount || 0}</strong></div>
                <div><div style={{ color: "#64748b", fontSize: 12 }}>Attempt Limit</div><strong>{exam?.attemptLimit || 1}</strong></div>
                <div><div style={{ color: "#64748b", fontSize: 12 }}>Submitted</div><strong>{formatDateTime(exam?.submittedAt)}</strong></div>
                <div><div style={{ color: "#64748b", fontSize: 12 }}>Window</div><strong>{formatDateTime(exam?.startTime)} - {formatDateTime(exam?.endTime)}</strong></div>
              </div>

              <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ color: "#334155", fontWeight: 700 }}>Generation mode</span>
                  <select value={form.mode} onChange={(event) => setForm((prev) => ({ ...prev, mode: event.target.value }))} style={{ padding: "11px 12px", borderRadius: 10, border: "1px solid #cbd5e1" }}>
                    <option value="missing_only">Generate Missing Only</option>
                    <option value="regenerate_all">Regenerate All</option>
                  </select>
                </label>
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ color: "#334155", fontWeight: 700 }}>Password length</span>
                  <input type="number" min="8" max="10" value={form.passwordLength} onChange={(event) => setForm((prev) => ({ ...prev, passwordLength: Number(event.target.value || 8) }))} style={{ padding: "11px 12px", borderRadius: 10, border: "1px solid #cbd5e1" }} />
                </label>
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ color: "#334155", fontWeight: 700 }}>Credential expiry</span>
                  <input type="datetime-local" value={form.expiresAt} onChange={(event) => setForm((prev) => ({ ...prev, expiresAt: event.target.value }))} style={{ padding: "11px 12px", borderRadius: 10, border: "1px solid #cbd5e1" }} />
                </label>
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button type="button" onClick={handleGenerate} style={{ padding: "12px 16px", borderRadius: 12, border: "none", background: "#0ea5e9", color: "#fff", fontWeight: 800 }}>
                  Generate Credentials
                </button>
                <button type="button" onClick={handlePublish} style={{ padding: "12px 16px", borderRadius: 12, border: "1px solid #cbd5e1", background: "#fff", color: "#0f172a", fontWeight: 800 }}>
                  Publish Exam
                </button>
                <button type="button" onClick={handleClose} style={{ padding: "12px 16px", borderRadius: 12, border: "1px solid #fecaca", background: "#fff1f2", color: "#991b1b", fontWeight: 800 }}>
                  Close Exam
                </button>
                <button type="button" onClick={() => handleExport("csv")} style={{ padding: "12px 16px", borderRadius: 12, border: "1px solid #cbd5e1", background: "#fff", color: "#0f172a", fontWeight: 800 }}>
                  Export CSV
                </button>
                <button type="button" onClick={() => handleExport("pdf")} style={{ padding: "12px 16px", borderRadius: 12, border: "1px solid #cbd5e1", background: "#fff", color: "#0f172a", fontWeight: 800 }}>
                  Export PDF / Print Slips
                </button>
              </div>
            </section>

            {lastGenerated.length ? (
              <section style={{ ...cardStyle, padding: 22, display: "grid", gap: 12 }}>
                <h3 style={{ margin: 0, color: "#0f172a" }}>Latest Issued Credentials</h3>
                <p style={{ margin: 0, color: "#64748b" }}>
                  Plain passwords are shown only at issue time. Export immediately if you need printable slips.
                </p>
                <div style={{ display: "grid", gap: 10 }}>
                  {lastGenerated.map((row) => (
                    <div key={`${row.candidateType}-${row.candidateId}-${row.loginId}`} style={{ padding: 14, borderRadius: 14, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                      <strong>{row.candidateName}</strong>
                      <div style={{ color: "#475569", marginTop: 4 }}>{row.classOrBatch} • {row.candidateType}</div>
                      <div style={{ marginTop: 8, fontFamily: "monospace", color: "#0f172a" }}>
                        {row.loginId} / {row.password}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            <section style={{ ...cardStyle, padding: 22, display: "grid", gap: 14 }}>
              <h3 style={{ margin: 0, color: "#0f172a" }}>Candidate Credentials</h3>
              <div style={{ display: "grid", gap: 10 }}>
                {candidates.map((candidate) => (
                  <article key={`${candidate.candidateType}-${candidate.candidateId}`} style={{ padding: 16, borderRadius: 14, background: "#f8fafc", border: "1px solid #e2e8f0", display: "grid", gap: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                      <div>
                        <strong style={{ color: "#0f172a" }}>{candidate.fullNameSnapshot || candidate.candidateId}</strong>
                        <div style={{ color: "#64748b", marginTop: 4 }}>
                          {candidate.candidateType} • {candidate.classOrBatchSnapshot || "Candidate group"} • {candidate.accessStatus}
                        </div>
                      </div>
                      <div style={{ color: "#475569", fontSize: 14 }}>
                        {candidate.loginId ? <div><strong>Login ID:</strong> {candidate.loginId}</div> : <div>No credential generated yet</div>}
                        {candidate.expiresAt ? <div><strong>Expiry:</strong> {formatDateTime(candidate.expiresAt)}</div> : null}
                        {candidate.failedAttempts ? <div><strong>Failed Attempts:</strong> {candidate.failedAttempts}</div> : null}
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <button type="button" onClick={() => handleResetCandidate(candidate)} style={{ padding: "10px 14px", borderRadius: 10, border: "none", background: "#0f172a", color: "#fff", fontWeight: 700 }}>
                        Reset Credential
                      </button>
                      <button type="button" onClick={() => handleRevokeCandidate(candidate)} style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #fecaca", background: "#fff1f2", color: "#991b1b", fontWeight: 700 }}>
                        Revoke Access
                      </button>
                    </div>
                  </article>
                ))}
                {!candidates.length ? <div style={{ color: "#64748b" }}>No synced candidates found for this exam yet.</div> : null}
              </div>
            </section>

            <section style={{ ...cardStyle, padding: 22, display: "grid", gap: 12 }}>
              <h3 style={{ margin: 0, color: "#0f172a" }}>Audit Trail</h3>
              {audits.length ? audits.map((row) => (
                <div key={row.id} style={{ padding: "10px 0", borderTop: "1px solid #e2e8f0" }}>
                  <strong style={{ color: "#0f172a" }}>{row.action}</strong>
                  <div style={{ color: "#64748b", marginTop: 4 }}>
                    {formatDateTime(row.createdAt)} • User {row.performedByUserId || "candidate"} • {row.candidateType ? `${row.candidateType}/${row.candidateId}` : "exam-wide"}
                  </div>
                </div>
              )) : <div style={{ color: "#64748b" }}>No audit events recorded for this exam yet.</div>}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
