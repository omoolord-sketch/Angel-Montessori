import { useEffect, useMemo, useState } from "react";
import {
  addHomeworkItem,
  getHomework,
  getHomeworkDashboard,
  getHomeworkMetadata,
} from "../api/services";
import "./PortalAdminModule.css";

const initialForm = {
  taskType: "homework",
  classId: "",
  subject: "",
  title: "",
  instructions: "",
  availableFrom: "",
  dueDate: "",
  submissionType: "text",
  isGraded: true,
  maxScore: 20,
  allowLateSubmission: true,
  lateSubmissionDeadline: "",
  status: "published",
};

function toDateInput(value) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 16);
}

function labelize(value) {
  return String(value || "")
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]+/g, " ")
    .trim();
}

function homeworkStatusTone(status) {
  const key = String(status || "").toLowerCase();
  if (key === "published" || key === "open") return "success";
  if (key === "draft") return "warning";
  if (key === "closed" || key === "archived") return "neutral";
  return "neutral";
}

export default function HomeworkDashboard() {
  const [metadata, setMetadata] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const selectedClassSubjects = useMemo(() => {
    if (!metadata) return [];
    if (form.classId && metadata.subjectsByClass?.[form.classId]?.length) {
      return metadata.subjectsByClass[form.classId];
    }
    if (metadata.role === "TEACHER" && Array.isArray(metadata.teacherSubjects) && metadata.teacherSubjects.length) {
      return metadata.teacherSubjects;
    }
    const values = Object.values(metadata.subjectsByClass || {}).flat();
    return Array.from(new Set(values));
  }, [metadata, form.classId]);

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const [metaRes, dashRes, taskRes] = await Promise.all([
        getHomeworkMetadata(),
        getHomeworkDashboard(),
        getHomework(),
      ]);

      const nextMeta = metaRes?.data || null;
      setMetadata(nextMeta);
      setDashboard(dashRes?.data || null);
      setTasks(Array.isArray(taskRes?.data) ? taskRes.data : []);

      if (nextMeta?.classes?.length && !form.classId) {
        const firstClass = nextMeta.classes[0];
        setForm((prev) => ({
          ...prev,
          classId: prev.classId || firstClass.id,
          subject: prev.subject || selectedClassSubjects[0] || "",
        }));
      }
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load assignments dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!selectedClassSubjects.length) return;
    if (!selectedClassSubjects.includes(form.subject)) {
      setForm((prev) => ({ ...prev, subject: selectedClassSubjects[0] }));
    }
  }, [selectedClassSubjects, form.subject]);

  const createTask = async () => {
    if (!form.title.trim() || !form.subject.trim()) {
      setError("Title and subject are required.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const payload = {
        taskType: form.taskType,
        type: String(form.taskType || "homework").toUpperCase(),
        classId: form.classId || undefined,
        subject: form.subject,
        title: form.title.trim(),
        instructions: form.instructions.trim(),
        availableFrom: form.availableFrom ? new Date(form.availableFrom).toISOString() : "",
        dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : "",
        submissionType: form.submissionType,
        isGraded: Boolean(form.isGraded),
        maxScore: Number(form.maxScore || 0),
        allowLateSubmission: Boolean(form.allowLateSubmission),
        lateSubmissionDeadline: form.lateSubmissionDeadline ? new Date(form.lateSubmissionDeadline).toISOString() : "",
        status: form.status,
      };

      await addHomeworkItem(payload);
      setMessage("Task created successfully.");
      setForm((prev) => ({ ...initialForm, classId: prev.classId, subject: prev.subject }));
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to create task");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-module-page homework-module">
      <div className="admin-module-shell">
        <section className="admin-module-hero">
          <div>
            <div className="admin-module-kicker">Class Workflows</div>
            <h1>Homework and Assignments</h1>
            <p>Create class tasks, track submission progress, and keep homework, assignments, projects, and practice work organised.</p>
          </div>
          <div className="admin-module-actions">
            <button type="button" onClick={load} disabled={loading || saving}>
              {loading ? "Refreshing..." : "Refresh Tasks"}
            </button>
          </div>
        </section>

        {error ? <div className="admin-alert error">{error}</div> : null}
        {message ? <div className="admin-alert success">{message}</div> : null}
        {loading ? <div className="admin-alert">Loading homework records...</div> : null}

        {dashboard?.summary ? (
          <section className="admin-stat-grid" aria-label="Homework overview">
            {Object.entries(dashboard.summary).map(([key, value]) => (
              <article key={key} className="admin-stat-card">
                <span>{labelize(key)}</span>
                <strong>{value}</strong>
                <small>Current assignment dashboard</small>
              </article>
            ))}
          </section>
        ) : null}

        <section className="admin-card">
          <div className="admin-card-header">
            <div>
              <span className="admin-section-tag">Create Task</span>
              <h2>Create Class Task</h2>
            </div>
            <p>Set task type, class, subject, availability, due date, scoring, and late-submission rules.</p>
          </div>

          <div className="admin-form-grid">
            <label className="admin-field">
              Task Type
              <select value={form.taskType} onChange={(e) => setForm((prev) => ({ ...prev, taskType: e.target.value }))}>
                <option value="homework">Homework</option>
                <option value="assignment">Assignment</option>
                <option value="project">Project</option>
                <option value="practice">Practice</option>
              </select>
            </label>

            <label className="admin-field">
              Class
              <select value={form.classId} onChange={(e) => setForm((prev) => ({ ...prev, classId: e.target.value }))}>
                <option value="">All Eligible Classes</option>
                {(metadata?.classes || []).map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            </label>

            <label className="admin-field">
              Subject
              <select value={form.subject} onChange={(e) => setForm((prev) => ({ ...prev, subject: e.target.value }))}>
                <option value="">Select Subject</option>
                {selectedClassSubjects.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </label>

            <label className="admin-field">
              Status
              <select value={form.status} onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="closed">Closed</option>
                <option value="archived">Archived</option>
              </select>
            </label>

            <label className="admin-field admin-form-span">
              Task Title
              <input
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Task title"
              />
            </label>

            <label className="admin-field admin-form-span">
              Instructions
              <textarea
                rows={4}
                value={form.instructions}
                onChange={(e) => setForm((prev) => ({ ...prev, instructions: e.target.value }))}
                placeholder="Task instructions"
              />
            </label>

            <label className="admin-field">
              Available From
              <input
                type="datetime-local"
                value={toDateInput(form.availableFrom)}
                onChange={(e) => setForm((prev) => ({ ...prev, availableFrom: e.target.value }))}
              />
            </label>

            <label className="admin-field">
              Due Date
              <input
                type="datetime-local"
                value={toDateInput(form.dueDate)}
                onChange={(e) => setForm((prev) => ({ ...prev, dueDate: e.target.value }))}
              />
            </label>

            <label className="admin-field">
              Submission Type
              <select value={form.submissionType} onChange={(e) => setForm((prev) => ({ ...prev, submissionType: e.target.value }))}>
                <option value="text">Text</option>
                <option value="file">File</option>
                <option value="text_and_file">Text and File</option>
                <option value="offline">Offline</option>
              </select>
            </label>

            <label className="admin-field">
              Max Score
              <input
                type="number"
                min={0}
                value={form.maxScore}
                onChange={(e) => setForm((prev) => ({ ...prev, maxScore: e.target.value }))}
                disabled={!form.isGraded}
              />
            </label>
          </div>

          <div className="admin-check-grid">
            <label>
              <input
                type="checkbox"
                checked={form.isGraded}
                onChange={(e) => setForm((prev) => ({ ...prev, isGraded: e.target.checked }))}
              />
              Graded Task
            </label>

            <label>
              <input
                type="checkbox"
                checked={form.allowLateSubmission}
                onChange={(e) => setForm((prev) => ({ ...prev, allowLateSubmission: e.target.checked }))}
              />
              Allow Late Submission
            </label>
          </div>

          {form.allowLateSubmission ? (
            <div className="admin-form-grid compact late-deadline-grid">
              <label className="admin-field">
                Late Submission Deadline
                <input
                  type="datetime-local"
                  value={toDateInput(form.lateSubmissionDeadline)}
                  onChange={(e) => setForm((prev) => ({ ...prev, lateSubmissionDeadline: e.target.value }))}
                />
              </label>
            </div>
          ) : null}

          <div className="admin-form-actions">
            <button type="button" onClick={createTask} disabled={saving || loading || !form.title.trim() || !form.subject.trim()}>
              {saving ? "Saving..." : "Create Task"}
            </button>
            <button type="button" className="secondary" onClick={load} disabled={loading || saving}>
              Refresh
            </button>
          </div>
        </section>

        <section className="admin-card">
          <div className="admin-card-header">
            <div>
              <span className="admin-section-tag">Task Board</span>
              <h2>Tasks</h2>
            </div>
            <p>Quickly review assignment status, due dates, submission rates, and pending grading count.</p>
          </div>

          {tasks.length === 0 ? (
            <div className="admin-empty-state">
              <strong>No tasks found.</strong>
              <span>Create a homework or assignment task and it will appear here.</span>
            </div>
          ) : null}

          <div className="admin-card-grid">
            {tasks.map((task) => {
              const pendingGrading = Math.max((task.totalSubmitted || 0) - (task.totalGraded || 0), 0);
              return (
                <article key={task.id} className="admin-task-card">
                  <div className="admin-task-head">
                    <div>
                      <span className="admin-section-tag">{task.taskType || "Task"}</span>
                      <h3>{task.title}</h3>
                    </div>
                    <span className={`admin-status-pill ${homeworkStatusTone(task.status)}`}>{task.status}</span>
                  </div>
                  <p>{task.subject} | {task.className || "All Classes"}</p>
                  <div className="admin-task-meta">
                    <span>Due: <strong>{task.dueDate ? new Date(task.dueDate).toLocaleString() : "Not set"}</strong></span>
                    <span>Submitted: <strong>{task.totalSubmitted || 0}/{task.totalStudents || 0}</strong></span>
                    <span>Submission Rate: <strong>{task.submissionRate || 0}%</strong></span>
                    <span>Pending Grading: <strong>{pendingGrading}</strong></span>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

