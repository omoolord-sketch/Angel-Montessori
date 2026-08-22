import { useEffect, useMemo, useState } from "react";
import {
  createSMSTemplate,
  getClasses,
  getSMSCampaigns,
  getSMSContacts,
  getSMSDashboard,
  getSMSProviderStatus,
  getSMSLogs,
  getSMSMessages,
  getSMSTemplates,
  retryFailedSMSMessages,
  sendSMSCampaign,
  updateSMSTemplate,
} from "../api/services";

const recipientTypes = [
  ["all_parents", "All Parents"],
  ["all_teachers", "All Teachers"],
  ["all_students", "All Students"],
  ["class_parents", "Class Parents"],
  ["class_students", "Class Students"],
  ["unpaid_invoices", "Unpaid Invoices (Parents)"],
  ["absent_students", "Absent Students (Parents)"],
  ["applicants", "Applicants"],
];

export default function SMSDashboard() {
  const [summary, setSummary] = useState(null);
  const [providerStatus, setProviderStatus] = useState(null);
  const [classes, setClasses] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [logs, setLogs] = useState([]);
  const [messages, setMessages] = useState([]);
  const [templates, setTemplates] = useState([]);

  const [recipientType, setRecipientType] = useState("all_parents");
  const [classId, setClassId] = useState("");
  const [filter, setFilter] = useState("all");
  const [selectedContactIds, setSelectedContactIds] = useState([]);

  const [message, setMessage] = useState("School resumption reminder: classes continue tomorrow by 7:45AM.");
  const [title, setTitle] = useState("School Notice");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");

  const [templateForm, setTemplateForm] = useState({ templateName: "", templateType: "broadcast", messageBody: "" });

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  const selectedContacts = useMemo(
    () => contacts.filter((item) => selectedContactIds.includes(String(item.id))),
    [contacts, selectedContactIds]
  );

  const estimatedUnits = useMemo(() => {
    const unitsPerRecipient = Math.max(1, Math.ceil(String(message || "").length / 160));
    return unitsPerRecipient * selectedContacts.length;
  }, [message, selectedContacts.length]);

  const loadDashboard = async () => {
    const [dashboardRes, providerRes, classesRes, logsRes, templatesRes, campaignRes, messageRes] = await Promise.all([
      getSMSDashboard(),
      getSMSProviderStatus(),
      getClasses(),
      getSMSLogs(),
      getSMSTemplates(),
      getSMSCampaigns(),
      getSMSMessages(),
    ]);

    setSummary(dashboardRes.data || null);
    setProviderStatus(providerRes.data || null);
    setClasses(Array.isArray(classesRes.data) ? classesRes.data : []);
    setLogs(Array.isArray(logsRes.data) ? logsRes.data : []);
    setTemplates(Array.isArray(templatesRes.data) ? templatesRes.data : []);
    setCampaigns(Array.isArray(campaignRes.data) ? campaignRes.data : []);
    setMessages(Array.isArray(messageRes.data) ? messageRes.data : []);
  };

  const loadContacts = async (nextRecipientType = recipientType, nextClassId = classId, nextFilter = filter) => {
    const group =
      nextRecipientType.includes("parent") || nextRecipientType === "unpaid_invoices" || nextRecipientType === "absent_students"
        ? "PARENTS"
        : nextRecipientType.includes("teacher")
          ? "TEACHERS"
          : nextRecipientType.includes("student")
            ? "STUDENTS"
            : "APPLICANTS";

    const res = await getSMSContacts({
      group,
      recipientType: nextRecipientType,
      classId: nextClassId,
      filter: nextFilter,
      date: new Date().toISOString().slice(0, 10),
    });

    const rows = Array.isArray(res?.data?.contacts) ? res.data.contacts : [];
    setContacts(rows);
    setSelectedContactIds(rows.map((item) => String(item.id)));
  };

  const loadAll = async () => {
    try {
      setBusy(true);
      setError("");
      await loadDashboard();
      await loadContacts(recipientType, classId, filter);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load SMS dashboard");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    const run = async () => {
      try {
        setBusy(true);
        await loadContacts(recipientType, classId, filter);
      } catch (e) {
        setError(e?.response?.data?.message || "Failed to load contacts");
      } finally {
        setBusy(false);
      }
    };
    run();
  }, [recipientType, classId, filter]);

  const applyTemplate = () => {
    if (!selectedTemplateId) return;
    const template = templates.find((item) => String(item.id) === String(selectedTemplateId));
    if (!template) return;
    setMessage(String(template.messageBody || ""));
    setTitle(String(template.templateName || "SMS Campaign"));
  };

  const sendNow = async () => {
    if (!message.trim()) {
      setError("Message body is required.");
      return;
    }

    try {
      setBusy(true);
      setError("");
      setStatus("");
      const res = await sendSMSCampaign({
        title,
        messageBody: message,
        recipientType,
        classId,
        filter,
        contacts: selectedContacts.map((item) => ({ id: item.id, name: item.name, phone: item.phone })),
      });

      setStatus(`Campaign sent. Delivered: ${res?.data?.sent || 0}, Failed: ${res?.data?.failed || 0}`);
      await loadDashboard();
      await loadContacts(recipientType, classId, filter);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to send SMS campaign");
    } finally {
      setBusy(false);
    }
  };

  const saveTemplate = async () => {
    if (!templateForm.templateName.trim() || !templateForm.messageBody.trim()) {
      setError("Template name and body are required.");
      return;
    }

    try {
      setBusy(true);
      setError("");
      await createSMSTemplate(templateForm);
      setTemplateForm({ templateName: "", templateType: "broadcast", messageBody: "" });
      await loadDashboard();
      setStatus("Template created successfully.");
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to create template");
    } finally {
      setBusy(false);
    }
  };

  const toggleTemplate = async (template) => {
    try {
      setBusy(true);
      await updateSMSTemplate(template.id, { isActive: !template.isActive });
      await loadDashboard();
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to update template");
    } finally {
      setBusy(false);
    }
  };

  const retryFailed = async (campaignId = "") => {
    try {
      setBusy(true);
      await retryFailedSMSMessages({ campaignId });
      await loadDashboard();
      setStatus("Failed SMS retry completed.");
    } catch (e) {
      setError(e?.response?.data?.message || "Retry failed");
    } finally {
      setBusy(false);
    }
  };

  const toggleContact = (id) => {
    const key = String(id);
    setSelectedContactIds((prev) => (prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]));
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>School Messaging Desk</h2>
      <p>Send class, parent, staff, and whole-school text messages with templates, campaign history, and delivery tracking.</p>

      {error ? <p style={{ color: "crimson" }}>{error}</p> : null}
      {status ? <p style={{ color: "#166534" }}>{status}</p> : null}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, marginBottom: 12 }}>
        <StatCard label="SMS Balance" value={summary?.smsBalance ?? 0} />
        <StatCard label="Provider" value={summary?.providerMode || providerStatus?.providerMode || "SIMULATED"} />
        <StatCard label="Sent Today" value={summary?.messagesSentToday ?? 0} />
        <StatCard label="Success Rate" value={`${summary?.deliverySuccessRate ?? 0}%`} />
        <StatCard label="Failed Messages" value={summary?.failedMessages ?? 0} />
        <StatCard label="Queued Campaigns" value={summary?.queuedCampaigns ?? 0} />
      </div>

      {providerStatus?.providerConfigured === false ? (
        <div style={{ border: "1px solid #fecaca", background: "#fff1f2", color: "#9f1239", borderRadius: 10, padding: 10, marginBottom: 12 }}>
          <strong>Provider configuration incomplete:</strong> {(providerStatus.providerConfigIssues || []).join(", ")}
          {providerStatus?.fallbackToSimulation ? " (Fallback to simulated mode is currently ON.)" : ""}
        </div>
      ) : null}

      <div style={{ border: "1px solid #d8e2ef", borderRadius: 10, padding: 12, marginBottom: 12, background: "#fff" }}>
        <h3 style={{ marginTop: 0 }}>Compose Message Campaign</h3>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Campaign title" style={{ minWidth: 200 }} />
          <select value={recipientType} onChange={(e) => setRecipientType(e.target.value)}>
            {recipientTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <select value={classId} onChange={(e) => setClassId(e.target.value)}>
            <option value="">All Classes</option>
            {classes.map((cls) => <option key={cls.id} value={cls.id}>{cls.name}</option>)}
          </select>
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">All</option>
            <option value="unpaid_fees">Unpaid Fees</option>
            <option value="missing_homework">Missing Homework</option>
            <option value="absence_today">Absence Today</option>
          </select>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
          <select value={selectedTemplateId} onChange={(e) => setSelectedTemplateId(e.target.value)}>
            <option value="">Apply Template (optional)</option>
            {templates.filter((t) => t.isActive !== false).map((t) => <option key={t.id} value={t.id}>{t.templateName}</option>)}
          </select>
          <button onClick={applyTemplate}>Apply Template</button>
          <button onClick={() => setSelectedContactIds(contacts.map((item) => String(item.id)))}>Select All Recipients</button>
          <button onClick={() => setSelectedContactIds([])}>Clear Selection</button>
        </div>

        <textarea rows={4} style={{ width: "100%" }} value={message} onChange={(e) => setMessage(e.target.value)} />
        <p style={{ color: "#475569", margin: "6px 0" }}>
          Characters: <strong>{message.length}</strong> | Recipients: <strong>{selectedContacts.length}</strong> | Estimated SMS Units: <strong>{estimatedUnits}</strong>
        </p>

        <button onClick={sendNow} disabled={busy || selectedContacts.length === 0}>
          {busy ? "Sending..." : `Send Campaign to ${selectedContacts.length} Recipient(s)`}
        </button>

        <div style={{ marginTop: 10, maxHeight: 220, overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: 8, padding: 8 }}>
          {contacts.length === 0 ? <p style={{ margin: 0 }}>No contacts matched the current filters.</p> : null}
          {contacts.map((contact) => (
            <label key={contact.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <input type="checkbox" checked={selectedContactIds.includes(String(contact.id))} onChange={() => toggleContact(contact.id)} />
              <span>
                <strong>{contact.name}</strong> - {contact.phone}
                {Array.isArray(contact.classNames) && contact.classNames.length ? ` (${contact.classNames.join(", ")})` : ""}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div style={{ border: "1px solid #d8e2ef", borderRadius: 10, padding: 12, marginBottom: 12, background: "#fff" }}>
        <h3 style={{ marginTop: 0 }}>SMS Templates</h3>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
          <input
            value={templateForm.templateName}
            onChange={(e) => setTemplateForm((prev) => ({ ...prev, templateName: e.target.value }))}
            placeholder="Template name"
          />
          <select
            value={templateForm.templateType}
            onChange={(e) => setTemplateForm((prev) => ({ ...prev, templateType: e.target.value }))}
          >
            <option value="broadcast">Broadcast</option>
            <option value="attendance">Attendance</option>
            <option value="finance">Finance</option>
            <option value="admissions">Admissions</option>
            <option value="academics">Academics</option>
            <option value="emergency">Emergency</option>
          </select>
        </div>
        <textarea
          rows={3}
          style={{ width: "100%" }}
          value={templateForm.messageBody}
          onChange={(e) => setTemplateForm((prev) => ({ ...prev, messageBody: e.target.value }))}
          placeholder="Template message body"
        />
        <button onClick={saveTemplate} disabled={busy} style={{ marginTop: 8 }}>Create Template</button>

        <div style={{ marginTop: 10, maxHeight: 200, overflowY: "auto" }}>
          {templates.map((template) => (
            <div key={template.id} style={{ borderBottom: "1px dashed #e4eaf2", padding: "6px 0" }}>
              <strong>{template.templateName}</strong> ({template.templateType})
              <div style={{ color: "#475569", fontSize: 13 }}>{template.messageBody}</div>
              <button onClick={() => toggleTemplate(template)} style={{ marginTop: 4 }}>
                {template.isActive === false ? "Enable" : "Disable"}
              </button>
            </div>
          ))}
          {templates.length === 0 ? <p>No templates available.</p> : null}
        </div>
      </div>

      <div style={{ border: "1px solid #d8e2ef", borderRadius: 10, padding: 12, marginBottom: 12, background: "#fff" }}>
        <h3 style={{ marginTop: 0 }}>Campaigns</h3>
        <div style={{ maxHeight: 220, overflowY: "auto" }}>
          {campaigns.map((campaign) => (
            <div key={campaign.id} style={{ borderBottom: "1px dashed #e4eaf2", padding: "6px 0" }}>
              <strong>{campaign.title}</strong> | {campaign.recipientType} | Sent: {campaign.totalSent} | Failed: {campaign.totalFailed}
              <div style={{ color: "#475569", fontSize: 12 }}>{campaign.createdAt ? new Date(campaign.createdAt).toLocaleString() : ""}</div>
              {Number(campaign.totalFailed || 0) > 0 ? (
                <button onClick={() => retryFailed(campaign.id)} style={{ marginTop: 4 }}>Retry Failed</button>
              ) : null}
            </div>
          ))}
          {campaigns.length === 0 ? <p>No message campaigns have been created yet.</p> : null}
        </div>
      </div>

      <div style={{ border: "1px solid #d8e2ef", borderRadius: 10, padding: 12, background: "#fff" }}>
        <h3 style={{ marginTop: 0 }}>Delivery Logs</h3>
        <div style={{ maxHeight: 220, overflowY: "auto" }}>
          {messages.slice(0, 80).map((msg) => (
            <div key={msg.id} style={{ borderBottom: "1px dashed #e4eaf2", padding: "6px 0" }}>
              <strong>{msg.recipientName || msg.phone}</strong> ({msg.phone}) - {msg.deliveryStatus}
              <div style={{ fontSize: 12, color: "#475569" }}>{msg.sentAt ? new Date(msg.sentAt).toLocaleString() : ""}</div>
            </div>
          ))}
          {messages.length === 0 ? <p>No delivery logs have been recorded yet.</p> : null}
        </div>

        <div style={{ marginTop: 12 }}>
          <h4 style={{ marginBottom: 6 }}>Legacy SMS Log Entries</h4>
          {logs.slice(0, 20).map((log) => (
            <div key={log.id} style={{ fontSize: 12, color: "#475569", marginBottom: 4 }}>
              {new Date(log.sentAt).toLocaleString()} | {log.group || log.recipientType} | {log.recipientCount} recipient(s)
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div style={{ border: "1px solid #d8e2ef", borderRadius: 10, padding: 10, background: "#fff" }}>
      <div style={{ fontSize: 12, color: "#54657d" }}>{label}</div>
      <strong style={{ fontSize: 20 }}>{value}</strong>
    </div>
  );
}


