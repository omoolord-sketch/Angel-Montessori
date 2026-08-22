import { useEffect, useMemo, useState } from "react";
import {
  candidateCbtLogin,
  saveStudentCbtAnswer,
  startCandidateCbtExam,
  submitCandidateCbtExam,
} from "../api/services";
import "./CBTExamPage.css";

function formatTime(totalSeconds) {
  const safe = Math.max(0, Number(totalSeconds || 0));
  const minutes = Math.floor(safe / 60).toString().padStart(2, "0");
  const seconds = (safe % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function formatExamType(value) {
  return String(value || "Exam")
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatExamWindow(startDate, endDate) {
  const toDate = (value) => {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const start = toDate(startDate);
  const end = toDate(endDate);
  if (!start && !end) return "Scheduled by the school";

  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Lagos",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  if (start && end) return `${formatter.format(start)} WAT - ${formatter.format(end)} WAT`;
  if (start) return `Opens ${formatter.format(start)} WAT`;
  return `Closes ${formatter.format(end)} WAT`;
}

function isObjectiveQuestion(question) {
  return String(question?.questionType || "").trim().toLowerCase() === "mcq_single";
}

function responseHasAnswer(response) {
  if (!response || typeof response !== "object") return false;
  if (Number.isInteger(response.answerIndex)) return true;
  return Boolean(String(response.answerText || "").trim());
}

function buildInitialResponses(questions) {
  return Object.fromEntries(
    (Array.isArray(questions) ? questions : []).map((question) => [
      question.id,
      {
        answerIndex: Number.isInteger(question?.response?.answerIndex) ? question.response.answerIndex : null,
        answerText: String(question?.response?.answerText || ""),
      },
    ])
  );
}

export default function CBTExamPage() {
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [loginPreview, setLoginPreview] = useState(null);
  const [session, setSession] = useState(null);
  const [responses, setResponses] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const groupedQuestions = useMemo(() => {
    const map = new Map();
    for (const question of session?.questions || []) {
      const key = String(question.subject || "General");
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(question);
    }
    return Array.from(map.entries());
  }, [session]);

  const answeredCount = useMemo(
    () => Object.values(responses).filter((response) => responseHasAnswer(response)).length,
    [responses]
  );

  useEffect(() => {
    if (!session || result || timeLeft <= 0) return undefined;
    const timer = setInterval(() => setTimeLeft((prev) => Math.max(0, prev - 1)), 1000);
    return () => clearInterval(timer);
  }, [session, result, timeLeft]);

  useEffect(() => {
    if (!session || result || timeLeft > 0 || submitting) return;
    const trigger = async () => {
      setMessage("Time is up. Submitting your exam...");
      await submitExam();
    };
    trigger();
  }, [session, result, timeLeft, submitting]);

  const startExam = async (event) => {
    event.preventDefault();
    try {
      setError("");
      setMessage("");
      setResult(null);

      const previewResponse = await candidateCbtLogin({
        loginId: loginId.trim(),
        password: password.trim(),
      });
      const preview = previewResponse?.data || null;
      setLoginPreview(preview);

      const startResponse = await startCandidateCbtExam(preview?.exam?.id, {
        sessionToken: preview?.sessionToken,
      });
      const payload = startResponse?.data || null;
      setSession(payload);
      setResponses(buildInitialResponses(payload?.questions || []));
      setTimeLeft(Number(payload?.remainingSeconds || Number(payload?.exam?.durationMinutes || 40) * 60));
      setMessage("Credential verified. Your exam is now active.");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to start exam");
    }
  };

  const saveAnswer = async (questionId, nextResponse) => {
    if (!session) return;
    try {
      setSaving(true);
      const payload = {
        attemptId: session.attemptId,
        attemptToken: session.attemptToken,
        questionId,
      };
      if (Number.isInteger(nextResponse?.answerIndex)) {
        payload.answerIndex = nextResponse.answerIndex;
      }
      if (String(nextResponse?.answerText || "").trim()) {
        payload.answerText = String(nextResponse.answerText || "").trim();
      }
      await saveStudentCbtAnswer({
        ...payload,
      });
    } catch {
      // Silent autosave fallback
    } finally {
      setSaving(false);
    }
  };

  const submitExam = async () => {
    if (!session) return;
    try {
      setSubmitting(true);
      setError("");
      const payload = {
        attemptId: session.attemptId,
        attemptToken: session.attemptToken,
        responses: Object.entries(responses)
          .filter(([, response]) => responseHasAnswer(response))
          .map(([questionId, response]) => ({
            questionId,
            ...(Number.isInteger(response?.answerIndex) ? { answerIndex: Number(response.answerIndex) } : {}),
            ...(String(response?.answerText || "").trim() ? { answerText: String(response.answerText || "").trim() } : {}),
          })),
      };
      const response = await submitCandidateCbtExam(session.exam?.id, payload);
      setResult(response?.data || null);
      setMessage("Exam submitted successfully.");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to submit exam");
    } finally {
      setSubmitting(false);
    }
  };

  const resetAll = () => {
    setLoginPreview(null);
    setSession(null);
    setResponses({});
    setTimeLeft(0);
    setSubmitting(false);
    setSaving(false);
    setResult(null);
    setError("");
    setMessage("");
  };

  return (
    <div className="cbt-exam-page">
      <div className="cbt-exam-shell">
        {!session ? (
          <div className="cbt-exam-login-stage public">
            <img src="/logo.png" alt="Angel Montessori School logo" className="cbt-exam-logo" />

            <form onSubmit={startExam} className="cbt-exam-login-card">
              <div className="cbt-exam-card-head center">
                <div className="cbt-exam-kicker">Angel Montessori School</div>
                <h1>CBT Credential Login</h1>
                <p>
                  Enter the exam login ID and password issued on your CBT slip. These credentials are unique to one exam
                  and are required for both school CBT and interview access.
                </p>
              </div>

              {error ? <p className="cbt-exam-alert error">{error}</p> : null}
              {message ? <p className="cbt-exam-alert success">{message}</p> : null}

              <label className="cbt-exam-field">
                <span>Login ID</span>
                <input
                  value={loginId}
                  onChange={(event) => setLoginId(event.target.value)}
                  placeholder="AMS-CBT-2026-0001"
                  autoCapitalize="characters"
                  required
                />
              </label>

              <label className="cbt-exam-field">
                <span>Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Exam password"
                  required
                />
              </label>

              {loginPreview?.exam ? (
                <div className="cbt-exam-selected-card">
                  <strong>{loginPreview.exam.examTitle}</strong>
                  <p>{formatExamType(loginPreview.exam.workflowExamType || loginPreview.exam.examType)}</p>
                  <div className="cbt-exam-choice-meta compact">
                    <span>{loginPreview.exam.durationMinutes} mins</span>
                    <span>Attempt limit {loginPreview.exam.attemptLimit}</span>
                    <span>{loginPreview.candidate?.candidateType}</span>
                  </div>
                  <p className="cbt-exam-choice-window">
                    {formatExamWindow(loginPreview.exam.startTime, loginPreview.exam.endTime)}
                  </p>
                </div>
              ) : null}

              <button type="submit" className="cbt-exam-primary-btn">
                Enter Exam
              </button>
            </form>
          </div>
        ) : (
          <>
            {error ? <p className="cbt-exam-alert error">{error}</p> : null}
            {message ? <p className="cbt-exam-alert success">{message}</p> : null}

            <section className="cbt-exam-session-card">
              <div className="cbt-exam-session-top">
                <div className="cbt-exam-session-meta">
                  <div className="cbt-exam-kicker">Exam In Progress</div>
                  <h2>{session.exam?.title || session.exam?.examTitle}</h2>
                  <p>
                    Mode: {formatExamType(session.exam?.workflowExamType || session.exam?.examType)} | Answered: {answeredCount}/{session.questions?.length || 0}
                    {saving ? " | Saving..." : ""}
                  </p>
                </div>

                {!result ? <div className={timeLeft < 120 ? "cbt-exam-timer danger" : "cbt-exam-timer"}>{formatTime(timeLeft)}</div> : null}
              </div>

              {session.exam?.instructions ? <div className="cbt-exam-instructions">{session.exam.instructions}</div> : null}

              <div className="cbt-exam-candidate-summary">
                <div className="cbt-exam-profile-tile">
                  <span>Candidate Name</span>
                  <strong>{session.candidate?.name || "Candidate"}</strong>
                </div>
                <div className="cbt-exam-profile-tile">
                  <span>{session.candidate?.details?.referenceLabel || "Login ID"}</span>
                  <strong>{session.candidate?.details?.referenceValue || session.candidate?.loginId || "-"}</strong>
                </div>
                {session.candidate?.details?.secondaryValue ? (
                  <div className="cbt-exam-profile-tile full">
                    <span>{session.candidate?.details?.secondaryLabel || "Details"}</span>
                    <strong>{session.candidate?.details?.secondaryValue}</strong>
                  </div>
                ) : null}
              </div>

              {!result ? (
                <div className="cbt-exam-question-stack">
                  {groupedQuestions.map(([subject, rows]) => (
                    <div key={subject} className="cbt-exam-question-group">
                      <strong className="cbt-exam-group-title">{subject}</strong>
                      {rows.map((question, index) => (
                        <div key={question.id} className="cbt-exam-question-block">
                          <p className="cbt-exam-question-text">{index + 1}. {question.question}</p>
                          {question.scenarioContext ? (
                            <div className="cbt-exam-instructions" style={{ marginBottom: 12 }}>
                              <strong>Scenario:</strong> {question.scenarioContext}
                            </div>
                          ) : null}
                          {isObjectiveQuestion(question) ? (
                            <div className="cbt-exam-options-grid">
                              {(question.options || []).map((option, optionIndex) => (
                                <label key={`${question.id}-${optionIndex}`} className="cbt-exam-option">
                                  <input
                                    type="radio"
                                    name={`q-${question.id}`}
                                    checked={Number(responses[question.id]?.answerIndex) === optionIndex}
                                    onChange={() => {
                                      const nextResponse = { answerIndex: optionIndex, answerText: option };
                                      setResponses((prev) => ({ ...prev, [question.id]: nextResponse }));
                                      saveAnswer(question.id, nextResponse);
                                    }}
                                  />
                                  <span>{option}</span>
                                </label>
                              ))}
                            </div>
                          ) : (
                            <div style={{ display: "grid", gap: 10 }}>
                              {question.evaluationRubric ? (
                                <div className="cbt-exam-instructions">
                                  <strong>Rubric:</strong> {question.evaluationRubric}
                                </div>
                              ) : null}
                              {question.sampleAnswer ? (
                                <div className="cbt-exam-instructions">
                                  <strong>Guide:</strong> {question.sampleAnswer}
                                </div>
                              ) : null}
                              <textarea
                                rows={question.questionType === "essay" || question.questionType === "scenario" ? 7 : 4}
                                value={responses[question.id]?.answerText || ""}
                                onChange={(event) => {
                                  const nextResponse = {
                                    answerIndex: null,
                                    answerText: event.target.value,
                                  };
                                  setResponses((prev) => ({ ...prev, [question.id]: nextResponse }));
                                }}
                                onBlur={() => saveAnswer(question.id, responses[question.id] || { answerIndex: null, answerText: "" })}
                                placeholder="Type your answer here"
                                style={{
                                  width: "100%",
                                  borderRadius: 12,
                                  border: "1px solid #cbd5e1",
                                  padding: 12,
                                  resize: "vertical",
                                  boxSizing: "border-box",
                                }}
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}

                  <div className="cbt-exam-action-row">
                    <button type="button" onClick={submitExam} disabled={submitting} className="cbt-exam-primary-btn">
                      {submitting ? "Submitting..." : "Submit Exam"}
                    </button>
                    <button type="button" onClick={resetAll} disabled={submitting} className="cbt-exam-secondary-btn">
                      Exit
                    </button>
                  </div>
                </div>
              ) : (
                <div className="cbt-exam-result-card">
                  <h3>Result Summary</h3>
                  <p>Score: <strong>{result.finalScore ?? result.score}</strong> / {result.totalPoints ?? result.totalQuestions} ({result.percentage}%)</p>
                  <p>Auto Score: <strong>{result.autoScore ?? 0}</strong> | Manual Score: <strong>{result.manualScore ?? 0}</strong></p>
                  <p className={result.reviewStatus === "FINALIZED" || result.passed ? "cbt-exam-result-pass" : "cbt-exam-result-fail"}>
                    {result.reviewStatus === "PENDING_REVIEW"
                      ? "Pending Manual Review"
                      : result.passed
                        ? "PASSED"
                        : "FAILED"}{" "}
                    | Pass Mark: {result.passMark}% | Slip No: {result.resultSlipNo || "-"}
                  </p>
                  <div className="cbt-exam-breakdown-list">
                    {Object.entries(result.subjectBreakdown || {}).map(([subject, info]) => (
                      <p key={subject}><strong>{subject}:</strong> {info.finalScore ?? info.correct}/{info.totalPoints ?? info.total} ({info.percentage}%)</p>
                    ))}
                  </div>
                  <button type="button" onClick={resetAll} className="cbt-exam-primary-btn">Done</button>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
