import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  closeCbtExam,
  finalizeRecruitmentSubmission,
  generateCbtExamCredentials,
  getCbtExamDetail,
  getExams,
  getRecruitmentApplicants,
  getRecruitmentSubmissionDetail,
  getRecruitmentSubmissions,
  publishCbtExam,
  reviewRecruitmentSubmission,
  seedRecruitmentDemoAssessments,
  updateRecruitmentSubmissionDecision,
} from "../api/services";

const shellStyle = {
  minHeight: "100vh",
  background: "#f4f8fd",
  padding: "24px 20px 40px",
};

const cardStyle = {
  border: "1px solid #d7e3f2",
  borderRadius: 18,
  background: "#ffffff",
  boxShadow: "0 20px 45px rgba(15, 23, 42, 0.06)",
  padding: 18,
};

const primaryButtonStyle = {
  padding: "11px 15px",
  borderRadius: 12,
  border: "none",
  background: "#0f172a",
  color: "#fff",
  fontWeight: 700,
  cursor: "pointer",
};

const secondaryButtonStyle = {
  padding: "11px 15px",
  borderRadius: 12,
  border: "1px solid #cbd5e1",
  background: "#fff",
  color: "#0f172a",
  fontWeight: 700,
  cursor: "pointer",
};

function formatDateTime(value) {
  if (!value) return "Not scheduled";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not scheduled";
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

function titleCase(value) {
  return String(value || "")
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getStatusTone(status) {
  const clean = String(status || "").trim().toUpperCase();
  if (["FINALIZED", "PUBLISHED", "SHORTLISTED"].includes(clean)) {
    return { background: "#dcfce7", color: "#166534" };
  }
  if (["READY_FOR_GENERATION", "CREDENTIALS_GENERATED", "IN_REVIEW", "UNDER_REVIEW"].includes(clean)) {
    return { background: "#fef3c7", color: "#92400e" };
  }
  if (["REJECTED", "CLOSED", "REVOKED"].includes(clean)) {
    return { background: "#fee2e2", color: "#b91c1c" };
  }
  return { background: "#e2e8f0", color: "#334155" };
}

function isSubjectiveResponse(item) {
  const type = String(item?.questionType || "").trim().toLowerCase();
  return ["short_answer", "essay", "scenario"].includes(type);
}

function buildReviewDraft(detail) {
  return Object.fromEntries(
    (detail?.responses || [])
      .filter((row) => isSubjectiveResponse(row))
      .map((row) => [
        row.questionId,
        {
          manualScore: row.response?.manualScore ?? 0,
          reviewComment: row.response?.reviewComment || "",
          reviewStatus: row.response?.reviewStatus || "PENDING_REVIEW",
        },
      ])
  );
}

export default function RecruitmentAssessmentDashboard() {
  const [exams, setExams] = useState([]);
  const [applicants, setApplicants] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState("");
  const [selectedAttemptId, setSelectedAttemptId] = useState("");
  const [examDetail, setExamDetail] = useState(null);
  const [submissionDetail, setSubmissionDetail] = useState(null);
  const [reviewDraft, setReviewDraft] = useState({});
  const [reviewerComment, setReviewerComment] = useState("");
  const [decisionNote, setDecisionNote] = useState("");
  const [filters, setFilters] = useState({
    examId: "",
    reviewStatus: "",
    applicationStatus: "",
  });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadBase = async () => {
    const [examRes, applicantRes] = await Promise.all([
      getExams({ assessmentMode: "RECRUITMENT_EXAM" }),
      getRecruitmentApplicants(),
    ]);
    const nextExams = Array.isArray(examRes?.data) ? examRes.data : [];
    const nextApplicants = Array.isArray(applicantRes?.data?.applicants) ? applicantRes.data.applicants : [];
    setExams(nextExams);
    setApplicants(nextApplicants);
    setSelectedExamId((prev) => (prev && nextExams.some((exam) => String(exam.id) === String(prev)) ? prev : String(nextExams[0]?.id || "")));
  };

  const loadSubmissions = async (nextFilters = filters) => {
    const response = await getRecruitmentSubmissions(nextFilters);
    const items = Array.isArray(response?.data?.submissions) ? response.data.submissions : [];
    setSubmissions(items);
    setSelectedAttemptId((prev) => (prev && items.some((item) => String(item.attemptId) === String(prev)) ? prev : String(items[0]?.attemptId || "")));
  };

  const refreshAll = async () => {
    try {
      setLoading(true);
      setError("");
      await Promise.all([loadBase(), loadSubmissions()]);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load recruitment assessments.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAll();
  }, []);

  useEffect(() => {
    if (!selectedExamId) {
      setExamDetail(null);
      return;
    }
    const load = async () => {
      try {
        const response = await getCbtExamDetail(selectedExamId);
        setExamDetail(response?.data || null);
      } catch (err) {
        setError(err?.response?.data?.message || "Failed to load the selected assessment.");
      }
    };
    load();
  }, [selectedExamId]);

  useEffect(() => {
    if (!selectedAttemptId) {
      setSubmissionDetail(null);
      setReviewDraft({});
      setReviewerComment("");
      setDecisionNote("");
      return;
    }
    const load = async () => {
      try {
        const response = await getRecruitmentSubmissionDetail(selectedAttemptId);
        const detail = response?.data || null;
        setSubmissionDetail(detail);
        setReviewDraft(buildReviewDraft(detail));
        setReviewerComment(detail?.summary?.reviewerComment || "");
        setDecisionNote(detail?.summary?.decisionNote || "");
      } catch (err) {
        setError(err?.response?.data?.message || "Failed to load submission review detail.");
      }
    };
    load();
  }, [selectedAttemptId]);

  const summary = useMemo(() => {
    const readyForGeneration = exams.filter((exam) => String(exam.status || "").toUpperCase() === "READY_FOR_GENERATION").length;
    const awaitingReview = submissions.filter((item) => String(item.reviewStatus || "").toUpperCase() !== "FINALIZED").length;
    const shortlisted = applicants.filter((item) => String(item.applicationStatus || "").toLowerCase() === "shortlisted").length;
    return { readyForGeneration, awaitingReview, shortlisted };
  }, [applicants, exams, submissions]);

  const selectedExam = exams.find((exam) => String(exam.id) === String(selectedExamId)) || null;
  const selectedSubmission = submissions.find((item) => String(item.attemptId) === String(selectedAttemptId)) || null;

  const handleExamAction = async (action, examId) => {
    try {
      setBusy(true);
      setError("");
      setMessage("");
      if (action === "seed") {
        await seedRecruitmentDemoAssessments();
        setMessage("Demo recruitment assessments seeded.");
      }
      if (action === "generate_missing") {
        await generateCbtExamCredentials(examId, { mode: "missing_only", passwordLength: 8 });
        setMessage("Missing recruitment credentials generated.");
      }
      if (action === "regenerate_all") {
        await generateCbtExamCredentials(examId, { mode: "regenerate_all", passwordLength: 8 });
        setMessage("All recruitment credentials regenerated.");
      }
      if (action === "publish") {
        await publishCbtExam(examId);
        setMessage("Recruitment assessment published.");
      }
      if (action === "close") {
        await closeCbtExam(examId);
        setMessage("Recruitment assessment closed.");
      }
      await Promise.all([loadBase(), loadSubmissions()]);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to update recruitment assessment.");
    } finally {
      setBusy(false);
    }
  };

  const handleReviewSave = async (finalize = false) => {
    if (!selectedAttemptId) return;
    try {
      setBusy(true);
      setError("");
      setMessage("");
      const payload = {
        reviewerComment,
        responses: Object.entries(reviewDraft).map(([questionId, row]) => ({
          questionId,
          manualScore: Number(row.manualScore || 0),
          reviewComment: row.reviewComment || "",
          reviewStatus: row.reviewStatus || "PENDING_REVIEW",
        })),
      };

      if (finalize) {
        await finalizeRecruitmentSubmission(selectedAttemptId, payload);
        setMessage("Recruitment submission finalized.");
      } else {
        await reviewRecruitmentSubmission(selectedAttemptId, payload);
        setMessage("Recruitment review saved.");
      }

      await loadSubmissions();
      const detail = await getRecruitmentSubmissionDetail(selectedAttemptId);
      setSubmissionDetail(detail?.data || null);
      setReviewDraft(buildReviewDraft(detail?.data));
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to save recruitment review.");
    } finally {
      setBusy(false);
    }
  };

  const handleDecision = async (decision) => {
    if (!selectedAttemptId) return;
    try {
      setBusy(true);
      setError("");
      setMessage("");
      await updateRecruitmentSubmissionDecision(selectedAttemptId, {
        decision,
        note: decisionNote,
      });
      setMessage(`Applicant marked as ${titleCase(decision)}.`);
      await Promise.all([loadBase(), loadSubmissions()]);
      const detail = await getRecruitmentSubmissionDetail(selectedAttemptId);
      setSubmissionDetail(detail?.data || null);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to update applicant decision.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={shellStyle}>
      <div style={{ maxWidth: 1400, margin: "0 auto", display: "grid", gap: 18 }}>
        <section style={{ ...cardStyle, display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div style={{ maxWidth: 820 }}>
            <div style={{ color: "#b88716", fontWeight: 800, fontSize: 12, letterSpacing: "0.08em" }}>RECRUITMENT ASSESSMENTS</div>
            <h1 style={{ margin: "8px 0 10px", fontSize: "clamp(2rem, 4vw, 3rem)", color: "#0f172a", lineHeight: 1.02 }}>
              Review teacher assessments, publish credentials, and manage shortlist outcomes
            </h1>
            <p style={{ margin: 0, color: "#475569", fontSize: 16, lineHeight: 1.7 }}>
              This workspace keeps recruitment assessment operations separate from student CBT. Academic Officers, HR,
              and senior admins can control credentials, review subjective answers, finalize scores, and move applicants
              into shortlist or rejection decisions from one secure desk.
            </p>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-start" }}>
            <button type="button" style={secondaryButtonStyle} onClick={refreshAll} disabled={loading || busy}>
              {loading ? "Refreshing..." : "Refresh"}
            </button>
            <button type="button" style={primaryButtonStyle} onClick={() => handleExamAction("seed")} disabled={busy}>
              Seed Demo Assessments
            </button>
          </div>
        </section>

        {error ? <div style={{ ...cardStyle, borderColor: "#fecaca", background: "#fff1f2", color: "#991b1b" }}>{error}</div> : null}
        {message ? <div style={{ ...cardStyle, borderColor: "#bbf7d0", background: "#f0fdf4", color: "#166534" }}>{message}</div> : null}

        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          {[
            ["Recruitment Exams", exams.length],
            ["Ready For Generation", summary.readyForGeneration],
            ["Awaiting Manual Review", summary.awaitingReview],
            ["Shortlisted Applicants", summary.shortlisted],
          ].map(([label, value]) => (
            <div key={label} style={cardStyle}>
              <div style={{ color: "#64748b", fontSize: 13 }}>{label}</div>
              <strong style={{ display: "block", marginTop: 8, fontSize: 32, color: "#0f172a" }}>{value}</strong>
            </div>
          ))}
        </section>

        <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, alignItems: "start" }}>
          <article style={{ ...cardStyle, display: "grid", gap: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <h2 style={{ margin: 0, color: "#0f172a" }}>Recruitment Assessment Queue</h2>
                <p style={{ margin: "6px 0 0", color: "#64748b" }}>Interview assessments grouped away from student exams.</p>
              </div>
            </div>

            {!exams.length ? <p style={{ margin: 0, color: "#64748b" }}>No recruitment assessments have been created yet.</p> : null}
            {exams.map((exam) => {
              const tone = getStatusTone(exam.status);
              const isActive = String(selectedExamId) === String(exam.id);
              return (
                <button
                  key={exam.id}
                  type="button"
                  onClick={() => setSelectedExamId(exam.id)}
                  style={{
                    textAlign: "left",
                    border: isActive ? "2px solid #0ea5e9" : "1px solid #d7e3f2",
                    background: isActive ? "#f0f9ff" : "#fff",
                    borderRadius: 16,
                    padding: 14,
                    cursor: "pointer",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <div>
                      <strong style={{ color: "#0f172a", fontSize: 17 }}>{exam.examTitle || exam.title}</strong>
                      <p style={{ margin: "6px 0 0", color: "#475569" }}>
                        {exam.recruitmentCategoryLabel || titleCase(exam.recruitmentCategory)} • {exam.subjects?.join(", ") || "General"}
                      </p>
                    </div>
                    <span style={{ ...pillStyle, ...tone }}>{titleCase(exam.status)}</span>
                  </div>
                  <p style={{ margin: "10px 0 0", color: "#475569" }}>
                    Candidates: {exam.totalCandidates || 0} • Generated: {exam.generatedCount || 0} • Duration: {exam.durationMinutes} mins
                  </p>
                </button>
              );
            })}

            {selectedExam ? (
              <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 14, display: "grid", gap: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <h3 style={{ margin: 0, color: "#0f172a" }}>{selectedExam.examTitle || selectedExam.title}</h3>
                    <p style={{ margin: "6px 0 0", color: "#475569" }}>
                      Window: {formatDateTime(selectedExam.startTime)} - {formatDateTime(selectedExam.endTime)}
                    </p>
                  </div>
                  <Link to={`/admin/cbt/exams/${selectedExam.id}/credentials`} style={{ ...secondaryButtonStyle, textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
                    Open Credential Desk
                  </Link>
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button type="button" style={secondaryButtonStyle} onClick={() => handleExamAction("generate_missing", selectedExam.id)} disabled={busy}>
                    Generate Missing
                  </button>
                  <button type="button" style={secondaryButtonStyle} onClick={() => handleExamAction("regenerate_all", selectedExam.id)} disabled={busy}>
                    Regenerate All
                  </button>
                  <button type="button" style={primaryButtonStyle} onClick={() => handleExamAction("publish", selectedExam.id)} disabled={busy}>
                    Publish Exam
                  </button>
                  <button type="button" style={secondaryButtonStyle} onClick={() => handleExamAction("close", selectedExam.id)} disabled={busy}>
                    Close Exam
                  </button>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
                  <div style={miniTileStyle}><span>Assessment Mode</span><strong>{titleCase(selectedExam.assessmentMode)}</strong></div>
                  <div style={miniTileStyle}><span>Recruitment Category</span><strong>{selectedExam.recruitmentCategoryLabel || titleCase(selectedExam.recruitmentCategory)}</strong></div>
                  <div style={miniTileStyle}><span>Applied Role Filter</span><strong>{selectedExam.appliedRoleFilter || "Any applied role"}</strong></div>
                  <div style={miniTileStyle}><span>Subject Filter</span><strong>{selectedExam.subjectSpecializationFilter || "Any subject specialization"}</strong></div>
                </div>

                {examDetail?.candidates?.length ? (
                  <div style={{ display: "grid", gap: 10 }}>
                    <strong style={{ color: "#0f172a" }}>Candidate Access Summary</strong>
                    {examDetail.candidates.slice(0, 8).map((candidate) => (
                      <div key={`${candidate.candidateType}-${candidate.candidateId}`} style={{ border: "1px solid #e2e8f0", borderRadius: 14, padding: 12 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                          <div>
                            <strong>{candidate.fullNameSnapshot || candidate.candidateName}</strong>
                            <p style={{ margin: "6px 0 0", color: "#475569" }}>
                              {titleCase(candidate.candidateType)} • {candidate.classOrBatchSnapshot || "Recruitment cohort"}
                            </p>
                          </div>
                          <span style={{ ...pillStyle, ...getStatusTone(candidate.accessStatus) }}>{titleCase(candidate.accessStatus)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </article>

          <article style={{ ...cardStyle, display: "grid", gap: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <h2 style={{ margin: 0, color: "#0f172a" }}>Submission Review Workflow</h2>
                <p style={{ margin: "6px 0 0", color: "#64748b" }}>Score subjective answers, comment, finalize, and decide.</p>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8 }}>
              <select value={filters.examId} onChange={(event) => setFilters((prev) => ({ ...prev, examId: event.target.value }))} style={inputStyle}>
                <option value="">All recruitment exams</option>
                {exams.map((exam) => <option key={exam.id} value={exam.id}>{exam.examTitle || exam.title}</option>)}
              </select>
              <select value={filters.reviewStatus} onChange={(event) => setFilters((prev) => ({ ...prev, reviewStatus: event.target.value }))} style={inputStyle}>
                <option value="">All review states</option>
                <option value="PENDING_REVIEW">Pending Review</option>
                <option value="IN_REVIEW">In Review</option>
                <option value="FINALIZED">Finalized</option>
                <option value="AUTO_GRADED">Auto Graded</option>
              </select>
              <select value={filters.applicationStatus} onChange={(event) => setFilters((prev) => ({ ...prev, applicationStatus: event.target.value }))} style={inputStyle}>
                <option value="">All applicant statuses</option>
                <option value="submitted">Submitted</option>
                <option value="under_review">Under Review</option>
                <option value="shortlisted">Shortlisted</option>
                <option value="rejected">Rejected</option>
              </select>
              <button type="button" style={secondaryButtonStyle} onClick={() => loadSubmissions(filters)} disabled={busy}>
                Apply Filters
              </button>
            </div>

            {!submissions.length ? <p style={{ margin: 0, color: "#64748b" }}>No recruitment submissions match the current filters.</p> : null}
            <div style={{ display: "grid", gap: 10 }}>
              {submissions.map((submission) => (
                <button
                  key={submission.attemptId}
                  type="button"
                  onClick={() => setSelectedAttemptId(submission.attemptId)}
                  style={{
                    textAlign: "left",
                    border: String(selectedAttemptId) === String(submission.attemptId) ? "2px solid #0ea5e9" : "1px solid #d7e3f2",
                    background: String(selectedAttemptId) === String(submission.attemptId) ? "#f0f9ff" : "#fff",
                    borderRadius: 16,
                    padding: 14,
                    cursor: "pointer",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                    <div>
                      <strong style={{ color: "#0f172a" }}>{submission.candidateName}</strong>
                      <p style={{ margin: "6px 0 0", color: "#475569" }}>
                        {submission.examTitle} • {submission.recruitmentCategoryLabel || titleCase(submission.recruitmentCategory)}
                      </p>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ ...pillStyle, ...getStatusTone(submission.reviewStatus) }}>{titleCase(submission.reviewStatus)}</span>
                      <span style={{ ...pillStyle, ...getStatusTone(submission.applicationStatus) }}>{titleCase(submission.applicationStatus)}</span>
                    </div>
                  </div>
                  <p style={{ margin: "10px 0 0", color: "#475569" }}>
                    Score: {submission.finalScore}/{submission.totalPoints} • Submitted: {formatDateTime(submission.submittedAt)}
                  </p>
                </button>
              ))}
            </div>
          </article>
        </section>

        {submissionDetail ? (
          <section style={{ ...cardStyle, display: "grid", gap: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <div style={{ color: "#b88716", fontWeight: 800, fontSize: 12, letterSpacing: "0.08em" }}>SUBMISSION REVIEW</div>
                <h2 style={{ margin: "8px 0 0", color: "#0f172a" }}>{selectedSubmission?.candidateName || submissionDetail?.profile?.fullName}</h2>
                <p style={{ margin: "6px 0 0", color: "#475569" }}>
                  {submissionDetail?.exam?.examTitle || selectedSubmission?.examTitle} • {submissionDetail?.profile?.appliedRole || "Teaching applicant"}
                </p>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ color: "#64748b", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 700 }}>Current Score</div>
                <strong style={{ display: "block", marginTop: 8, fontSize: 28, color: "#0f172a" }}>
                  {submissionDetail?.summary?.finalScore}/{submissionDetail?.summary?.totalPoints}
                </strong>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
              <div style={miniTileStyle}><span>Teaching Category</span><strong>{titleCase(submissionDetail?.profile?.teachingCategory)}</strong></div>
              <div style={miniTileStyle}><span>Qualification</span><strong>{submissionDetail?.profile?.qualification || "Not provided"}</strong></div>
              <div style={miniTileStyle}><span>Experience</span><strong>{submissionDetail?.profile?.experience || "Not provided"}</strong></div>
              <div style={miniTileStyle}><span>Application Status</span><strong>{titleCase(submissionDetail?.profile?.applicationStatus)}</strong></div>
            </div>

            <label style={{ display: "grid", gap: 8 }}>
              <span style={labelStyle}>Reviewer Summary</span>
              <textarea
                rows={3}
                value={reviewerComment}
                onChange={(event) => setReviewerComment(event.target.value)}
                style={inputStyle}
                placeholder="Add a review summary for the hiring team."
              />
            </label>

            <div style={{ display: "grid", gap: 12 }}>
              {submissionDetail.responses.map((row) => {
                const subjective = isSubjectiveResponse(row);
                const draft = reviewDraft[row.questionId] || { manualScore: 0, reviewComment: "", reviewStatus: row.response?.reviewStatus || "PENDING_REVIEW" };
                return (
                  <div key={row.questionId} style={{ border: "1px solid #d7e3f2", borderRadius: 16, padding: 16, background: "#fbfdff" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                      <div>
                        <div style={{ color: "#64748b", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 700 }}>
                          {row.subjectName} • {titleCase(row.questionType)}
                        </div>
                        <h3 style={{ margin: "8px 0 0", color: "#0f172a", fontSize: 18 }}>Q{row.order}. {row.questionText}</h3>
                      </div>
                      <span style={{ ...pillStyle, ...getStatusTone(row.response?.reviewStatus) }}>{titleCase(row.response?.reviewStatus)}</span>
                    </div>

                    {row.scenarioContext ? (
                      <div style={hintBoxStyle}>
                        <strong>Scenario</strong>
                        <p style={{ margin: "6px 0 0" }}>{row.scenarioContext}</p>
                      </div>
                    ) : null}

                    {Array.isArray(row.options) && row.options.length ? (
                      <div style={hintBoxStyle}>
                        <strong>Options</strong>
                        <ol style={{ margin: "8px 0 0", paddingLeft: 18 }}>
                          {row.options.map((option, index) => <li key={`${row.questionId}-${index}`}>{option}</li>)}
                        </ol>
                      </div>
                    ) : null}

                    <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
                      <div style={hintBoxStyle}>
                        <strong>Applicant Response</strong>
                        <p style={{ margin: "6px 0 0", whiteSpace: "pre-wrap" }}>
                          {row.response?.answerText || (Number.isInteger(row.response?.answerIndex) ? row.options?.[row.response.answerIndex] : "No response provided")}
                        </p>
                      </div>

                      {row.sampleAnswer ? (
                        <div style={hintBoxStyle}>
                          <strong>Suggested Answer Guide</strong>
                          <p style={{ margin: "6px 0 0", whiteSpace: "pre-wrap" }}>{row.sampleAnswer}</p>
                        </div>
                      ) : null}

                      {row.evaluationRubric ? (
                        <div style={hintBoxStyle}>
                          <strong>Evaluation Rubric</strong>
                          <p style={{ margin: "6px 0 0", whiteSpace: "pre-wrap" }}>{row.evaluationRubric}</p>
                        </div>
                      ) : null}

                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
                        <div style={miniTileStyle}>
                          <span>Auto Score</span>
                          <strong>{row.response?.autoScore || 0}/{row.maxScore}</strong>
                        </div>
                        <div style={miniTileStyle}>
                          <span>Current Final Score</span>
                          <strong>{row.response?.finalScore || 0}/{row.maxScore}</strong>
                        </div>
                      </div>

                      {subjective ? (
                        <div style={{ display: "grid", gap: 10 }}>
                          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 180px) 1fr", gap: 10, alignItems: "center" }}>
                            <label style={labelStyle}>Manual Score</label>
                            <input
                              type="number"
                              min="0"
                              max={row.maxScore}
                              value={draft.manualScore}
                              onChange={(event) => setReviewDraft((prev) => ({
                                ...prev,
                                [row.questionId]: {
                                  ...draft,
                                  manualScore: event.target.value,
                                },
                              }))}
                              style={inputStyle}
                            />
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 180px) 1fr", gap: 10, alignItems: "start" }}>
                            <label style={labelStyle}>Review Comment</label>
                            <textarea
                              rows={3}
                              value={draft.reviewComment}
                              onChange={(event) => setReviewDraft((prev) => ({
                                ...prev,
                                [row.questionId]: {
                                  ...draft,
                                  reviewComment: event.target.value,
                                },
                              }))}
                              style={inputStyle}
                              placeholder="Score justification or teaching observations."
                            />
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button type="button" style={secondaryButtonStyle} onClick={() => handleReviewSave(false)} disabled={busy}>
                Save Review Draft
              </button>
              <button type="button" style={primaryButtonStyle} onClick={() => handleReviewSave(true)} disabled={busy}>
                Finalize Review
              </button>
            </div>

            <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 14, display: "grid", gap: 10 }}>
              <label style={{ display: "grid", gap: 8 }}>
                <span style={labelStyle}>Decision Note</span>
                <textarea
                  rows={3}
                  value={decisionNote}
                  onChange={(event) => setDecisionNote(event.target.value)}
                  style={inputStyle}
                  placeholder="Add a note for shortlist or rejection decisions."
                />
              </label>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button type="button" style={primaryButtonStyle} onClick={() => handleDecision("shortlisted")} disabled={busy}>
                  Shortlist Applicant
                </button>
                <button type="button" style={secondaryButtonStyle} onClick={() => handleDecision("under_review")} disabled={busy}>
                  Mark Under Review
                </button>
                <button type="button" style={{ ...secondaryButtonStyle, borderColor: "#fecaca", color: "#b91c1c" }} onClick={() => handleDecision("rejected")} disabled={busy}>
                  Reject Applicant
                </button>
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}

const pillStyle = {
  display: "inline-flex",
  alignItems: "center",
  padding: "6px 10px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 800,
};

const labelStyle = {
  color: "#475569",
  fontWeight: 700,
  fontSize: 14,
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px solid #d7e3f2",
  background: "#fff",
  color: "#0f172a",
};

const miniTileStyle = {
  border: "1px solid #e2e8f0",
  borderRadius: 14,
  padding: 12,
  display: "grid",
  gap: 8,
  background: "#fff",
  color: "#0f172a",
};

const hintBoxStyle = {
  border: "1px solid #dbe7f5",
  borderRadius: 14,
  background: "#f8fbff",
  padding: 12,
  color: "#334155",
};
