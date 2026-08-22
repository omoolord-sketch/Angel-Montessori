import { useEffect, useMemo, useState } from "react";
import {
  addHomeworkItem,
  getHomework,
  getHomeworkDashboard,
  getHomeworkMetadata,
} from "../api/services";

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
    <div style={{ padding: 20 }}>
      <h2>Homework and Assignments</h2>
      {error ? <p style={{ color: "crimson" }}>{error}</p> : null}
      {message ? <p style={{ color: "#166534" }}>{message}</p> : null}
      {loading ? <p>Loading homework records...</p> : null}

      {dashboard?.summary ? (
        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", marginBottom: 14 }}>
          {Object.entries(dashboard.summary).map(([key, value]) => (
            <div key={key} style={{ border: "1px solid #dbe4f0", borderRadius: 8, padding: 10, background: "#fff" }}>
              <div style={{ fontSize: 12, color: "#4b5563", textTransform: "capitalize" }}>{key.replace(/([A-Z])/g, " $1")}</div>
              <strong style={{ fontSize: 18 }}>{value}</strong>
            </div>
          ))}
        </div>
      ) : null}

      <div style={{ border: "1px solid #cfdcec", borderRadius: 10, padding: 12, background: "#fff", marginBottom: 14 }}>
        <h3 style={{ marginTop: 0 }}>Create Class Task</h3>
        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
            <label>
              <span>Task Type</span>
              <select value={form.taskType} onChange={(e) => setForm((prev) => ({ ...prev, taskType: e.target.value }))}>
                <option value="homework">Homework</option>
                <option value="assignment">Assignment</option>
                <option value="project">Project</option>
                <option value="practice">Practice</option>
              </select>
            </label>

            <label>
              <span>Class</span>
              <select value={form.classId} onChange={(e) => setForm((prev) => ({ ...prev, classId: e.target.value }))}>
                <option value="">All Eligible Classes</option>
                {(metadata?.classes || []).map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            </label>

            <label>
              <span>Subject</span>
              <select value={form.subject} onChange={(e) => setForm((prev) => ({ ...prev, subject: e.target.value }))}>
                <option value="">Select Subject</option>
                {selectedClassSubjects.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </label>

            <label>
              <span>Status</span>
              <select value={form.status} onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="closed">Closed</option>
                <option value="archived">Archived</option>
              </select>
            </label>
          </div>

          <input
            value={form.title}
            onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
            placeholder="Task title"
          />

          <textarea
            rows={3}
            value={form.instructions}
            onChange={(e) => setForm((prev) => ({ ...prev, instructions: e.target.value }))}
            placeholder="Task instructions"
          />

          <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
            <label>
              <span>Available From</span>
              <input
                type="datetime-local"
                value={toDateInput(form.availableFrom)}
                onChange={(e) => setForm((prev) => ({ ...prev, availableFrom: e.target.value }))}
              />
            </label>

            <label>
              <span>Due Date</span>
              <input
                type="datetime-local"
                value={toDateInput(form.dueDate)}
                onChange={(e) => setForm((prev) => ({ ...prev, dueDate: e.target.value }))}
              />
            </label>

            <label>
              <span>Submission Type</span>
              <select value={form.submissionType} onChange={(e) => setForm((prev) => ({ ...prev, submissionType: e.target.value }))}>
                <option value="text">Text</option>
                <option value="file">File</option>
                <option value="text_and_file">Text and File</option>
                <option value="offline">Offline</option>
              </select>
            </label>

            <label>
              <span>Max Score</span>
              <input
                type="number"
                min={0}
                value={form.maxScore}
                onChange={(e) => setForm((prev) => ({ ...prev, maxScore: e.target.value }))}
                disabled={!form.isGraded}
              />
            </label>
          </div>

          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
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

            {form.allowLateSubmission ? (
              <label>
                Late Submission Deadline
                <input
                  type="datetime-local"
                  value={toDateInput(form.lateSubmissionDeadline)}
                  onChange={(e) => setForm((prev) => ({ ...prev, lateSubmissionDeadline: e.target.value }))}
                />
              </label>
            ) : null}
          </div>

          <div>
            <button onClick={createTask} disabled={saving || loading || !form.title.trim() || !form.subject.trim()}>
              {saving ? "Saving..." : "Create Task"}
            </button>
            <button onClick={load} disabled={loading || saving} style={{ marginLeft: 8 }}>
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div style={{ border: "1px solid #cfdcec", borderRadius: 10, padding: 12, background: "#fff" }}>
        <h3 style={{ marginTop: 0 }}>Tasks</h3>
        {tasks.length === 0 ? <p>No tasks found.</p> : null}
        <div style={{ display: "grid", gap: 10 }}>
          {tasks.map((task) => (
            <div key={task.id} style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: 10 }}>
              <strong>{task.title}</strong>
              <p style={{ margin: "6px 0" }}>
                {task.subject} | {task.className || "All Classes"} | {task.taskType}
              </p>
              <p style={{ margin: "6px 0", color: "#475569" }}>
                Status: <strong>{task.status}</strong>
                {task.dueDate ? ` | Due: ${new Date(task.dueDate).toLocaleString()}` : ""}
              </p>
              <p style={{ margin: "6px 0", color: "#475569" }}>
                Submitted: <strong>{task.totalSubmitted || 0}/{task.totalStudents || 0}</strong>
                {" | "}Submission Rate: <strong>{task.submissionRate || 0}%</strong>
                {" | "}Pending Grading: <strong>{Math.max((task.totalSubmitted || 0) - (task.totalGraded || 0), 0)}</strong>
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

