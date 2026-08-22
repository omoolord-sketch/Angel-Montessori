import { useEffect, useMemo, useState } from "react";
import {
  getStudentCbtDashboard,
  saveStudentCbtAnswer,
  studentCbtLogin,
  studentCbtSubmit,
} from "../api/services";
import { useAuth } from "../auth/AuthContext";
import "./CBTExamPage.css";

function formatTime(totalSeconds) {
  const s = Math.max(0, Number(totalSeconds || 0));
  const minutes = Math.floor(s / 60).toString().padStart(2, "0");
  const seconds = (s % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function formatExamType(value) {
  return String(value || "Exam")
    .toLowerCase()
    .split("_")
    .map((part) => (part ? `${part[0].toUpperCase()}${part.slice(1)}` : part))
    .join(" ");
}

function formatExamWindow(startDate, endDate) {
  const format = (value) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date);
  };

  const start = format(startDate);
  const end = format(endDate);
  if (!start && !end) return "Scheduled by the school";
  if (!end || start === end) return start || end;
  return `${start} - ${end}`;
}

export default function CBTExamPage() {
  const { user } = useAuth();
  const isStudentMode = user?.role === "STUDENT";

  const [candidateLoginId, setCandidateLoginId] = useState("");
  const [accessPassword, setAccessPassword] = useState("");
  const [selectedExamId, setSelectedExamId] = useState("");

  const [studentDashboard, setStudentDashboard] = useState(null);

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
    for (const q of session?.questions || []) {
      const key = String(q.subject || "General");
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(q);
    }
    return Array.from(map.entries());
  }, [session]);

  const answeredCount = useMemo(() => Object.keys(responses).length, [responses]);

  const profile = studentDashboard?.profile || null;
  const visibleExams = useMemo(
    () => (Array.isArray(studentDashboard?.availableExams) ? studentDashboard.availableExams : []),
    [studentDashboard],
  );

  const selectedExam = useMemo(
    () => visibleExams.find((exam) => String(exam.id) === String(selectedExamId)) || visibleExams[0] || null,
    [selectedExamId, visibleExams],
  );

  useEffect(() => {
    const loadDashboard = async () => {
      if (!isStudentMode) {
        setStudentDashboard(null);
        return;
      }

      try {
        const res = await getStudentCbtDashboard();
        setStudentDashboard(res?.data || null);
      } catch {
        setStudentDashboard(null);
      }
    };

    loadDashboard();
  }, [isStudentMode]);

  useEffect(() => {
    if (!visibleExams.length) {
      setSelectedExamId("");
      return;
    }

    const exists = visibleExams.some((exam) => String(exam.id) === String(selectedExamId));
    if (!exists) setSelectedExamId(String(visibleExams[0].id));
  }, [selectedExamId, visibleExams]);

  useEffect(() => {
    if (!session || result || timeLeft <= 0) return undefined;
    const timer = setInterval(() => setTimeLeft((prev) => Math.max(0, prev - 1)), 1000);
    return () => clearInterval(timer);
  }, [session, result, timeLeft]);

  useEffect(() => {
    if (!session || result || timeLeft > 0 || submitting) return;
    const autoSubmit = async () => {
      setMessage("Time is up. Submitting your exam...");
      await submitExam();
    };
    autoSubmit();
  }, [timeLeft, session, result, submitting]);

  const startExam = async (e) => {
    e.preventDefault();
    try {
      setError("");
      setMessage("");
      setResult(null);

      if (isStudentMode && !selectedExam?.id) {
        setError("No published exam is currently assigned to your class.");
        return;
      }

      const payload = {
        accessPassword: accessPassword.trim(),
      };

      if (isStudentMode) {
        payload.examId = selectedExam.id;
      } else {
        payload.candidateLoginId = candidateLoginId.trim();
      }

      const res = await studentCbtLogin(payload);
      const data = res?.data;
      setSession(data);
      setResponses({});
      setTimeLeft(Number(data?.remainingSeconds || Number(data?.exam?.durationMinutes || 40) * 60));
      setMessage("Exam loaded. Start answering now.");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to start exam");
    }
  };

  const saveAnswer = async (questionId, answerIndex) => {
    if (!session) return;
    try {
      setSaving(true);
      await saveStudentCbtAnswer({
        attemptId: session.attemptId,
        attemptToken: session.attemptToken,
        questionId,
        answerIndex,
      });
    } catch {
      // silent autosave failure
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
        responses: Object.entries(responses).map(([questionId, answerIndex]) => ({
          questionId,
          answerIndex: Number(answerIndex),
        })),
      };

      const res = await studentCbtSubmit(payload);
      setResult(res?.data || null);
      setMessage("Exam submitted successfully.");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to submit exam");
    } finally {
      setSubmitting(false);
    }
  };

  const resetAll = () => {
    setSession(null);
    setResponses({});
    setTimeLeft(0);
    setSubmitting(false);
    setResult(null);
    setError("");
    setMessage("");
  };

  const profileName = profile?.name || user?.name || "Candidate";
  const profileId = profile?.studentId || user?.studentId || "-";
  const profileClass = profile?.className || "";

  return (
    <div className="cbt-exam-page">
      <div className="cbt-exam-shell">
        {!session ? (
          <div className={isStudentMode ? "cbt-exam-login-stage" : "cbt-exam-login-stage public"}>
            <img src="/logo.png" alt="Angel Montessori School logo" className="cbt-exam-logo" />

            <form onSubmit={startExam} className="cbt-exam-login-card">
              <div className="cbt-exam-card-head center">
                <div className="cbt-exam-kicker">Angel Montessori School</div>
                <h1>{isStudentMode ? "Student CBT Login" : "CBT User Login"}</h1>
                {isStudentMode ? (
                  <p>
                    Only the published exams assigned to your class appear here. Select your exam and enter the password provided by the school.
                  </p>
                ) : null}
              </div>

              {error ? <p className="cbt-exam-alert error">{error}</p> : null}
              {message ? <p className="cbt-exam-alert success">{message}</p> : null}

              {isStudentMode ? (
                <>
                  <div className="cbt-exam-login-profile">
                    <div className="cbt-exam-profile-tile">
                      <span>Student Name</span>
                      <strong>{profileName}</strong>
                    </div>
                    <div className="cbt-exam-profile-tile">
                      <span>Admission No.</span>
                      <strong>{profileId}</strong>
                    </div>
                    <div className="cbt-exam-profile-tile full">
                      <span>Class</span>
                      <strong>{profileClass || "Linked student class"}</strong>
                    </div>
                  </div>

                  <label className="cbt-exam-field">
                    <span>Select Exam</span>
                    <select
                      value={selectedExam?.id || ""}
                      onChange={(e) => setSelectedExamId(e.target.value)}
                      disabled={!visibleExams.length}
                      required
                    >
                      {!visibleExams.length ? <option value="">No published exam for your class</option> : null}
                      {visibleExams.map((exam) => (
                        <option key={exam.id} value={exam.id}>
                          {exam.examTitle} - {formatExamType(exam.examType)}
                        </option>
                      ))}
                    </select>
                  </label>

                  {selectedExam ? (
                    <div className="cbt-exam-selected-card">
                      <strong>{selectedExam.examTitle}</strong>
                      <p>{formatExamType(selectedExam.examType)} for {selectedExam.className || profileClass || "your class"}</p>
                      <div className="cbt-exam-choice-meta compact">
                        <span>{selectedExam.durationMinutes} mins</span>
                        <span>{selectedExam.totalQuestions} questions</span>
                        <span>Pass mark {selectedExam.passMark}%</span>
                      </div>
                      <div className="cbt-exam-choice-subjects">
                        {(selectedExam.subjects || []).slice(0, 4).map((subject) => (
                          <span key={subject} className="cbt-exam-chip">{subject}</span>
                        ))}
                      </div>
                      <p className="cbt-exam-choice-window">{formatExamWindow(selectedExam.startTime, selectedExam.endTime)}</p>
                    </div>
                  ) : (
                    <div className="cbt-exam-empty-state compact">
                      <strong>No published exam yet</strong>
                      <p>Your class exam will appear here once it is released by the school.</p>
                    </div>
                  )}
                </>
              ) : (
                <label className="cbt-exam-field">
                  <input
                    value={candidateLoginId}
                    onChange={(e) => setCandidateLoginId(e.target.value)}
                    placeholder="Candidate login ID"
                    required
                  />
                </label>
              )}

              <label className="cbt-exam-field">
                {isStudentMode ? <span>Exam password</span> : null}
                <input type="password" value={accessPassword} onChange={(e) => setAccessPassword(e.target.value)} placeholder="Exam password" required />
              </label>

              <button type="submit" className="cbt-exam-primary-btn" disabled={isStudentMode && !selectedExam}>
                {isStudentMode ? "Enter Exam" : "Login"}
              </button>
            </form>

            {isStudentMode ? (
              <section className="cbt-exam-published-panel">
                <div className="cbt-exam-card-head compact">
                  <h2>{`Published Exams${profileClass ? ` - ${profileClass}` : ""}`}</h2>
                  <p>Choose the exam you want to write. Only exams published to your class are shown here.</p>
                </div>

                {!visibleExams.length ? (
                  <div className="cbt-exam-empty-state">
                    <strong>No published exam available</strong>
                    <p>There is no active CBT exam for your class at the moment.</p>
                  </div>
                ) : (
                  <div className="cbt-exam-choice-grid">
                    {visibleExams.slice(0, 8).map((exam) => {
                      const active = String(selectedExam?.id || "") === String(exam.id);
                      const cardClass = active ? "cbt-exam-choice-card active" : "cbt-exam-choice-card";
                      return (
                        <button key={exam.id} type="button" className={cardClass} onClick={() => setSelectedExamId(exam.id)}>
                          <strong>{exam.examTitle}</strong>
                          <p>{formatExamType(exam.examType)}</p>
                          <div className="cbt-exam-choice-meta">
                            <span>{exam.durationMinutes} mins</span>
                            <span>{exam.totalQuestions} questions</span>
                            <span>{exam.className || profileClass || "Class exam"}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>
            ) : null}
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
                    Mode: {session.exam?.mode || "Scheduled exam"} | Answered: {answeredCount}/{session.questions?.length || 0}
                    {saving ? " | Saving..." : ""}
                  </p>
                </div>

                {!result ? <div className={timeLeft < 120 ? "cbt-exam-timer danger" : "cbt-exam-timer"}>{formatTime(timeLeft)}</div> : null}
              </div>

              {session.exam?.instructions ? <div className="cbt-exam-instructions">{session.exam.instructions}</div> : null}

              <div className="cbt-exam-candidate-summary">
                <div className="cbt-exam-profile-tile">
                  <span>Candidate Name</span>
                  <strong>{session.candidate?.name || profileName}</strong>
                </div>
                <div className="cbt-exam-profile-tile">
                  <span>{session.candidate?.details?.referenceLabel || "Candidate ID"}</span>
                  <strong>{session.candidate?.details?.referenceValue || session.candidate?.candidateId || profileId}</strong>
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
                      {rows.map((q, idx) => (
                        <div key={q.id} className="cbt-exam-question-block">
                          <p className="cbt-exam-question-text">{idx + 1}. {q.question}</p>
                          <div className="cbt-exam-options-grid">
                            {(q.options || []).map((opt, optionIdx) => (
                              <label key={`${q.id}-${optionIdx}`} className="cbt-exam-option">
                                <input
                                  type="radio"
                                  name={`q-${q.id}`}
                                  checked={Number(responses[q.id]) === optionIdx}
                                  onChange={() => {
                                    setResponses((prev) => ({ ...prev, [q.id]: optionIdx }));
                                    saveAnswer(q.id, optionIdx);
                                  }}
                                />
                                <span>{opt}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}

                  <div className="cbt-exam-action-row">
                    <button type="button" onClick={submitExam} disabled={submitting} className="cbt-exam-primary-btn">
                      {submitting ? "Submitting..." : "Submit Exam"}
                    </button>
                    <button type="button" onClick={resetAll} disabled={submitting} className="cbt-exam-secondary-btn">Exit</button>
                  </div>
                </div>
              ) : (
                <div className="cbt-exam-result-card">
                  <h3>Result Summary</h3>
                  <p>Score: <strong>{result.score}</strong> / {result.totalQuestions} ({result.percentage}%)</p>
                  <p className={result.passed ? "cbt-exam-result-pass" : "cbt-exam-result-fail"}>
                    {result.passed ? "PASSED" : "FAILED"} | Pass Mark: {result.passMark}% | Slip No: {result.resultSlipNo || "-"}
                  </p>
                  <div className="cbt-exam-breakdown-list">
                    {Object.entries(result.subjectBreakdown || {}).map(([subject, info]) => (
                      <p key={subject}><strong>{subject}:</strong> {info.correct}/{info.total} ({info.percentage}%)</p>
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




