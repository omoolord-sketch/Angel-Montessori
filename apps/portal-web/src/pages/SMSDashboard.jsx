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
import "./PortalAdminModule.css";

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
    <div className="admin-module-page">
      <div className="admin-module-shell">
        <section className="admin-module-hero">
          <div>
            <span className="admin-module-kicker">Communication Centre</span>
            <h1>School Messaging Desk</h1>
            <p>Send class, parent, staff, and whole-school text messages with templates, campaign history, and delivery tracking.</p>
          </div>
          <div className="admin-module-actions">
            <button type="button" className="secondary" onClick={loadAll} disabled={busy}>
              {busy ? "Refreshing..." : "Refresh SMS Data"}
            </button>
            <button type="button" onClick={sendNow} disabled={busy || selectedContacts.length === 0}>
              {busy ? "Sending..." : `Send to ${selectedContacts.length}`}
            </button>
          </div>
        </section>

        {error ? <div className="admin-alert error">{error}</div> : null}
        {status ? <div className="admin-alert success">{status}</div> : null}
        {providerStatus?.providerConfigured === false ? (
          <div className="admin-alert error">
            <strong>Provider configuration incomplete:</strong> {(providerStatus.providerConfigIssues || []).join(", ")}
            {providerStatus?.fallbackToSimulation ? " Fallback to simulated mode is currently ON." : ""}
          </div>
        ) : null}

        <section className="admin-stat-grid compact">
          <article className="admin-stat-card"><span>SMS Balance</span><strong>{summary?.smsBalance ?? 0}</strong><small>Available credits</small></article>
          <article className="admin-stat-card"><span>Provider</span><strong>{summary?.providerMode || providerStatus?.providerMode || "SIMULATED"}</strong><small>Current delivery mode</small></article>
          <article className="admin-stat-card"><span>Sent Today</span><strong>{summary?.messagesSentToday ?? 0}</strong><small>Messages sent today</small></article>
          <article className="admin-stat-card"><span>Success Rate</span><strong>{summary?.deliverySuccessRate ?? 0}%</strong><small>Delivery performance</small></article>
          <article className="admin-stat-card"><span>Failed</span><strong>{summary?.failedMessages ?? 0}</strong><small>Needs retry or review</small></article>
          <article className="admin-stat-card"><span>Queued</span><strong>{summary?.queuedCampaigns ?? 0}</strong><small>Campaigns waiting</small></article>
        </section>

        <section className="admin-two-column">
          <article className="admin-card">
            <div className="admin-card-header">
              <div>
                <span className="admin-section-tag">Compose</span>
                <h2>Message Campaign</h2>
                <p>Select recipients, apply a template, preview unit usage, and send the campaign.</p>
              </div>
              <div className="admin-mini-stat"><span>SMS Units</span><strong>{estimatedUnits}</strong></div>
            </div>
            <div className="admin-form-grid">
              <label className="admin-field"><span>Campaign title</span><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Campaign title" /></label>
              <label className="admin-field"><span>Recipients</span><select value={recipientType} onChange={(e) => setRecipientType(e.target.value)}>{recipientTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label className="admin-field"><span>Class</span><select value={classId} onChange={(e) => setClassId(e.target.value)}><option value="">All Classes</option>{classes.map((cls) => <option key={cls.id} value={cls.id}>{cls.name}</option>)}</select></label>
              <label className="admin-field"><span>Filter</span><select value={filter} onChange={(e) => setFilter(e.target.value)}><option value="all">All</option><option value="unpaid_fees">Unpaid Fees</option><option value="missing_homework">Missing Homework</option><option value="absence_today">Absence Today</option></select></label>
              <label className="admin-field admin-form-span"><span>Message body</span><textarea rows={5} value={message} onChange={(e) => setMessage(e.target.value)} /></label>
            </div>
            <div className="admin-result-summary">
              <span>Characters: <strong>{message.length}</strong></span>
              <span>Recipients: <strong>{selectedContacts.length}</strong></span>
              <span>Estimated SMS Units: <strong>{estimatedUnits}</strong></span>
            </div>
            <div className="admin-form-actions">
              <button type="button" onClick={sendNow} disabled={busy || selectedContacts.length === 0}>
                {busy ? "Sending..." : `Send Campaign to ${selectedContacts.length} Recipient(s)`}
              </button>
            </div>
          </article>

          <article className="admin-card">
            <div className="admin-card-header">
              <div>
                <span className="admin-section-tag">Recipients</span>
                <h2>Matched Contacts</h2>
                <p>Fine-tune the recipients before sending the message.</p>
              </div>
              <div className="admin-mini-stat"><span>Selected</span><strong>{selectedContactIds.length}</strong></div>
            </div>
            <div className="admin-form-grid compact">
              <label className="admin-field"><span>Apply template</span><select value={selectedTemplateId} onChange={(e) => setSelectedTemplateId(e.target.value)}><option value="">Apply Template (optional)</option>{templates.filter((t) => t.isActive !== false).map((t) => <option key={t.id} value={t.id}>{t.templateName}</option>)}</select></label>
            </div>
            <div className="admin-form-actions">
              <button type="button" className="secondary" onClick={applyTemplate}>Apply Template</button>
              <button type="button" className="secondary" onClick={() => setSelectedContactIds(contacts.map((item) => String(item.id)))}>Select All</button>
              <button type="button" className="secondary" onClick={() => setSelectedContactIds([])}>Clear</button>
            </div>
            <div className="sms-contact-list">
              {contacts.length === 0 ? <div className="admin-empty-state">No contacts matched the current filters.</div> : null}
              {contacts.map((contact) => (
                <label key={contact.id} className="sms-contact-row">
                  <input type="checkbox" checked={selectedContactIds.includes(String(contact.id))} onChange={() => toggleContact(contact.id)} />
                  <span>
                    <strong>{contact.name}</strong>
                    <small>{contact.phone}{Array.isArray(contact.classNames) && contact.classNames.length ? ` (${contact.classNames.join(", ")})` : ""}</small>
                  </span>
                </label>
              ))}
            </div>
          </article>
        </section>

        <section className="admin-two-column">
          <article className="admin-card">
            <div className="admin-card-header">
              <div>
                <span className="admin-section-tag">Templates</span>
                <h2>SMS Templates</h2>
                <p>Create reusable message templates for common school communication.</p>
              </div>
            </div>
            <div className="admin-form-grid compact">
              <label className="admin-field"><span>Template name</span><input value={templateForm.templateName} onChange={(e) => setTemplateForm((prev) => ({ ...prev, templateName: e.target.value }))} placeholder="Template name" /></label>
              <label className="admin-field"><span>Template type</span><select value={templateForm.templateType} onChange={(e) => setTemplateForm((prev) => ({ ...prev, templateType: e.target.value }))}><option value="broadcast">Broadcast</option><option value="attendance">Attendance</option><option value="finance">Finance</option><option value="admissions">Admissions</option><option value="academics">Academics</option><option value="emergency">Emergency</option></select></label>
              <label className="admin-field admin-form-span"><span>Template body</span><textarea rows={3} value={templateForm.messageBody} onChange={(e) => setTemplateForm((prev) => ({ ...prev, messageBody: e.target.value }))} placeholder="Template message body" /></label>
            </div>
            <div className="admin-form-actions">
              <button type="button" onClick={saveTemplate} disabled={busy}>Create Template</button>
            </div>
            <div className="sms-card-list">
              {templates.map((template) => (
                <div key={template.id} className="sms-card-item">
                  <div>
                    <strong>{template.templateName}</strong>
                    <span>{template.templateType}</span>
                    <p>{template.messageBody}</p>
                  </div>
                  <button type="button" className="admin-table-action" onClick={() => toggleTemplate(template)}>
                    {template.isActive === false ? "Enable" : "Disable"}
                  </button>
                </div>
              ))}
              {templates.length === 0 ? <div className="admin-empty-state">No templates available yet.</div> : null}
            </div>
          </article>

          <article className="admin-card">
            <div className="admin-card-header">
              <div>
                <span className="admin-section-tag">Campaigns</span>
                <h2>Campaign History</h2>
                <p>Review sent campaigns and retry failed messages where needed.</p>
              </div>
            </div>
            <div className="sms-card-list">
              {campaigns.map((campaign) => (
                <div key={campaign.id} className="sms-card-item">
                  <div>
                    <strong>{campaign.title}</strong>
                    <span>{campaign.recipientType}</span>
                    <p>Sent: {campaign.totalSent} | Failed: {campaign.totalFailed}</p>
                    <small>{campaign.createdAt ? new Date(campaign.createdAt).toLocaleString() : ""}</small>
                  </div>
                  {Number(campaign.totalFailed || 0) > 0 ? (
                    <button type="button" className="admin-table-action danger" onClick={() => retryFailed(campaign.id)}>Retry Failed</button>
                  ) : (
                    <span className="admin-status-pill success">Clear</span>
                  )}
                </div>
              ))}
              {campaigns.length === 0 ? <div className="admin-empty-state">No message campaigns have been created yet.</div> : null}
            </div>
          </article>
        </section>

        <section className="admin-card">
          <div className="admin-card-header">
            <div>
              <span className="admin-section-tag">Delivery</span>
              <h2>Delivery Logs</h2>
              <p>Track the latest message delivery status from the SMS provider.</p>
            </div>
          </div>
          <div className="admin-table-scroll">
            <table className="admin-table">
              <thead>
                <tr><th>Recipient</th><th>Phone</th><th>Status</th><th>Sent At</th></tr>
              </thead>
              <tbody>
                {messages.slice(0, 80).map((msg) => (
                  <tr key={msg.id}>
                    <td><strong>{msg.recipientName || msg.phone}</strong></td>
                    <td>{msg.phone}</td>
                    <td><span className={`admin-status-pill ${String(msg.deliveryStatus || "").toLowerCase().includes("fail") ? "danger" : "success"}`}>{msg.deliveryStatus}</span></td>
                    <td>{msg.sentAt ? new Date(msg.sentAt).toLocaleString() : ""}</td>
                  </tr>
                ))}
                {messages.length === 0 ? <tr><td colSpan="4"><div className="admin-empty-inline">No delivery logs have been recorded yet.</div></td></tr> : null}
              </tbody>
            </table>
          </div>

          <div className="admin-divider" />
          <div className="admin-card-header">
            <div>
              <span className="admin-section-tag">Legacy Logs</span>
              <h2>SMS Log Entries</h2>
            </div>
          </div>
          <div className="sms-legacy-log">
            {logs.slice(0, 20).map((log) => (
              <div key={log.id}>
                <strong>{new Date(log.sentAt).toLocaleString()}</strong>
                <span>{log.group || log.recipientType} | {log.recipientCount} recipient(s)</span>
              </div>
            ))}
            {logs.length === 0 ? <div className="admin-empty-state">No legacy SMS log entries yet.</div> : null}
          </div>
        </section>
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


