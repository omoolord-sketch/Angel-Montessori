import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  assignAdminEnquiry,
  createAdminEnquiryTemplate,
  getAdminCallbackRequests,
  getAdminEnquiries,
  getAdminEnquiryReports,
  getAdminEnquiryTemplates,
  getAdminVisitRequests,
  getEnquiriesDashboard,
  replyToAdminEnquiry,
  updateAdminCallbackRequest,
  updateAdminEnquiryStatus,
  updateAdminVisitRequest,
} from "../api/services";

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function labelize(value) {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function getInitialTab(pathname) {
  if (pathname.includes("/callbacks")) return "callbacks";
  if (pathname.includes("/visits")) return "visits";
  if (pathname.includes("/reports")) return "reports";
  if (pathname.includes("/templates")) return "templates";
  if (pathname.endsWith("/dashboard")) return "dashboard";
  return "enquiries";
}

const shellStyle = {
  minHeight: "100vh",
  background: "linear-gradient(180deg, #eef4fb 0%, #f8fafc 100%)",
  padding: "24px 16px 40px",
};

const wrapStyle = {
  maxWidth: 1280,
  margin: "0 auto",
};

const cardStyle = {
  background: "#ffffff",
  border: "1px solid #d8e1ef",
  borderRadius: 20,
  padding: 20,
  boxShadow: "0 20px 45px rgba(15, 23, 42, 0.06)",
};

const mutedText = {
  color: "#5b6472",
  lineHeight: 1.6,
};

export default function EnquiriesDashboard() {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(() => getInitialTab(location.pathname));
  const [dashboard, setDashboard] = useState(null);
  const [enquiries, setEnquiries] = useState([]);
  const [callbacks, setCallbacks] = useState([]);
  const [visits, setVisits] = useState([]);
  const [reports, setReports] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [staffOptions, setStaffOptions] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [filters, setFilters] = useState({ search: "", type: "", status: "", priority: "", assignedTo: "" });
  const [replyForm, setReplyForm] = useState({ replyChannel: "email", replyMessage: "", replyMode: "reply" });
  const [templateForm, setTemplateForm] = useState({ templateName: "", enquiryType: "general", subjectLine: "", messageBody: "" });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    setActiveTab(getInitialTab(location.pathname));
  }, [location.pathname]);

  const loadAll = async (preserveId = "") => {
    try {
      setLoading(true);
      setError("");
      const [dashboardRes, enquiriesRes, callbacksRes, visitsRes, reportsRes, templatesRes] = await Promise.all([
        getEnquiriesDashboard(),
        getAdminEnquiries(filters),
        getAdminCallbackRequests(),
        getAdminVisitRequests(),
        getAdminEnquiryReports(),
        getAdminEnquiryTemplates(),
      ]);

      const nextEnquiries = enquiriesRes?.data?.enquiries || [];
      setDashboard(dashboardRes?.data || null);
      setEnquiries(nextEnquiries);
      setCallbacks(callbacksRes?.data?.callbacks || []);
      setVisits(visitsRes?.data?.visits || []);
      setReports(reportsRes?.data || null);
      setTemplates(templatesRes?.data?.templates || []);
      setStaffOptions(enquiriesRes?.data?.staffOptions || []);

      const nextId = preserveId && nextEnquiries.some((item) => item.id === preserveId)
        ? preserveId
        : nextEnquiries[0]?.id || "";
      setSelectedId(nextId);
    } catch (err) {
      setError(err?.response?.data?.message || "We could not load the enquiries dashboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll(selectedId);
  }, []);

  const selectedEnquiry = useMemo(
    () => enquiries.find((item) => item.id === selectedId) || enquiries[0] || null,
    [enquiries, selectedId],
  );

  const runAction = async (task, successMessage) => {
    try {
      setSaving(true);
      setNotice("");
      setError("");
      await task();
      await loadAll(selectedId);
      setNotice(successMessage);
    } catch (err) {
      setError(err?.response?.data?.message || "We could not complete that action.");
    } finally {
      setSaving(false);
    }
  };

  const summaryCards = dashboard?.summary
    ? [
        ["New Enquiries", dashboard.summary.newEnquiries, "#163A70"],
        ["In Progress", dashboard.summary.inProgress, "#b7791f"],
        ["Replied", dashboard.summary.replied, "#047857"],
        ["Closed", dashboard.summary.closed, "#475569"],
        ["Callbacks Pending", dashboard.summary.callbackPending, "#9a3412"],
        ["Visits Pending", dashboard.summary.visitPending, "#7c3aed"],
      ]
    : [];

  return (
    <div style={shellStyle}>
      <div style={wrapStyle}>
        <section
          style={{
            ...cardStyle,
            background: "linear-gradient(135deg, #163A70 0%, #1f4e79 58%, #254a92 100%)",
            color: "#ffffff",
            marginBottom: 20,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 18, flexWrap: "wrap", alignItems: "center" }}>
            <div>
              <div style={{ letterSpacing: "0.12em", textTransform: "uppercase", fontSize: 12, color: "#d7e5ff" }}>Enquiries Desk</div>
              <h1 style={{ margin: "10px 0 8px", fontSize: "clamp(2rem, 4vw, 3rem)" }}>Enquiries, callbacks, visits, and follow-up</h1>
              <p style={{ margin: 0, color: "#e7eefb", maxWidth: 760, lineHeight: 1.7 }}>
                Receive public questions, assign follow-up, log replies, manage callback requests, and coordinate school visits from one Angel Montessori enquiries desk.
              </p>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Link to="/contact" style={{ background: "#ffffff", color: "#163A70", padding: "10px 14px", borderRadius: 10, textDecoration: "none", fontWeight: 700 }}>Public Contact Page</Link>
              <Link to="/book-a-visit" style={{ background: "#f3d16b", color: "#3b2f07", padding: "10px 14px", borderRadius: 10, textDecoration: "none", fontWeight: 700 }}>Book Visit Page</Link>
            </div>
          </div>
        </section>

        {error ? <div style={{ ...cardStyle, borderColor: "#f3c7c7", color: "#b42318", marginBottom: 16 }}>{error}</div> : null}
        {notice ? <div style={{ ...cardStyle, borderColor: "#b7ebd0", color: "#027a48", marginBottom: 16 }}>{notice}</div> : null}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12, marginBottom: 20 }}>
          {summaryCards.map(([label, value, color]) => (
            <article key={label} style={{ ...cardStyle, padding: 18 }}>
              <div style={{ color, fontWeight: 800, fontSize: 30 }}>{value}</div>
              <div style={{ marginTop: 6, color: "#465063", fontWeight: 700 }}>{label}</div>
            </article>
          ))}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 18 }}>
          {["dashboard", "enquiries", "callbacks", "visits", "reports", "templates"].map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              style={{
                border: "1px solid #d7e0ee",
                background: activeTab === tab ? "#163A70" : "#ffffff",
                color: activeTab === tab ? "#ffffff" : "#163A70",
                borderRadius: 999,
                padding: "10px 16px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {labelize(tab)}
            </button>
          ))}
        </div>

        {loading ? <div style={cardStyle}>Loading enquiry records...</div> : null}

        {!loading && activeTab === "dashboard" ? (
          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 18 }}>
            <article style={cardStyle}>
              <h2 style={{ marginTop: 0 }}>Recent Enquiries</h2>
              <div style={{ display: "grid", gap: 12 }}>
                {(dashboard?.recentEnquiries || []).map((item) => (
                  <div key={item.id} style={{ border: "1px solid #e4e8ef", borderRadius: 16, padding: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                      <div>
                        <strong style={{ color: "#163A70" }}>{item.fullName}</strong>
                        <div style={mutedText}>{item.enquiryNumber} • {labelize(item.enquiryType)}</div>
                      </div>
                      <div style={{ fontWeight: 700, color: "#475467" }}>{labelize(item.status)}</div>
                    </div>
                    <p style={{ ...mutedText, marginBottom: 0 }}>{item.subject || item.priority}</p>
                  </div>
                ))}
              </div>
            </article>

            <article style={cardStyle}>
              <h2 style={{ marginTop: 0 }}>Quick Actions</h2>
              <div style={{ display: "grid", gap: 12 }}>
                {[
                  ["View New Enquiries", "Open fresh public enquiries and begin assignment."],
                  ["Assign Enquiries", "Route items to admissions, finance, ICT, or front desk."],
                  ["Log Callback", "Track call outcomes and callback completion."],
                  ["Schedule Visit", "Confirm school tour dates and keep the parent informed."],
                ].map(([title, copy]) => (
                  <div key={title} style={{ border: "1px solid #e4e8ef", borderRadius: 16, padding: 16 }}>
                    <strong style={{ color: "#163A70" }}>{title}</strong>
                    <p style={{ ...mutedText, margin: "8px 0 0" }}>{copy}</p>
                  </div>
                ))}
              </div>
            </article>
          </div>
        ) : null}

        {!loading && activeTab === "enquiries" ? (
          <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 18 }}>
            <article style={cardStyle}>
              <h2 style={{ marginTop: 0 }}>All Enquiries</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 10, marginBottom: 14 }}>
                <input value={filters.search} onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))} placeholder="Search" style={inputStyle()} />
                <input value={filters.type} onChange={(e) => setFilters((prev) => ({ ...prev, type: e.target.value }))} placeholder="Type" style={inputStyle()} />
                <input value={filters.status} onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))} placeholder="Status" style={inputStyle()} />
                <input value={filters.priority} onChange={(e) => setFilters((prev) => ({ ...prev, priority: e.target.value }))} placeholder="Priority" style={inputStyle()} />
                <button type="button" onClick={() => loadAll(selectedId)} style={primaryButtonStyle(false)}>Apply Filters</button>
              </div>

              <div style={{ display: "grid", gap: 10 }}>
                {enquiries.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedId(item.id)}
                    style={{
                      textAlign: "left",
                      border: item.id === selectedId ? "2px solid #163A70" : "1px solid #dbe4f0",
                      background: item.id === selectedId ? "#eff6ff" : "#ffffff",
                      borderRadius: 16,
                      padding: 16,
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                      <div>
                        <strong style={{ color: "#163A70" }}>{item.fullName}</strong>
                        <div style={mutedText}>{item.enquiryNumber} • {labelize(item.enquiryType)}</div>
                      </div>
                      <div style={{ fontWeight: 700, color: "#475467" }}>{labelize(item.status)}</div>
                    </div>
                    <p style={{ ...mutedText, margin: "8px 0 4px" }}>{item.subject || item.message}</p>
                    <div style={{ color: "#667085", fontSize: 13 }}>{formatDateTime(item.createdAt)}</div>
                  </button>
                ))}
              </div>
            </article>

            <article style={cardStyle}>
              {selectedEnquiry ? (
                <>
                  <h2 style={{ marginTop: 0 }}>Enquiry Details</h2>
                  <div style={{ display: "grid", gap: 8, marginBottom: 16 }}>
                    <DetailRow label="Enquiry No" value={selectedEnquiry.enquiryNumber} />
                    <DetailRow label="Name" value={selectedEnquiry.fullName} />
                    <DetailRow label="Phone" value={selectedEnquiry.phone || "-"} />
                    <DetailRow label="Email" value={selectedEnquiry.email || "-"} />
                    <DetailRow label="Type" value={labelize(selectedEnquiry.enquiryType)} />
                    <DetailRow label="Intended Class" value={selectedEnquiry.intendedClass || "-"} />
                    <DetailRow label="Source" value={labelize(selectedEnquiry.sourcePage)} />
                    <DetailRow label="Status" value={labelize(selectedEnquiry.status)} />
                    <DetailRow label="Priority" value={labelize(selectedEnquiry.priority)} />
                    <DetailRow label="Submitted" value={formatDateTime(selectedEnquiry.createdAt)} />
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <h3 style={{ marginBottom: 6 }}>Subject</h3>
                    <p style={mutedText}>{selectedEnquiry.subject || "-"}</p>
                    <h3 style={{ marginBottom: 6 }}>Message</h3>
                    <p style={mutedText}>{selectedEnquiry.message || "-"}</p>
                  </div>

                  <div style={{ display: "grid", gap: 10, marginBottom: 18 }}>
                    <label style={fieldLabelStyle()}>
                      Assign Staff
                      <select value={selectedEnquiry.assignedTo || ""} onChange={(e) => runAction(() => assignAdminEnquiry(selectedEnquiry.id, { assignedTo: e.target.value }), "Assignment updated.")} style={inputStyle()}>
                        <option value="">Unassigned</option>
                        {staffOptions.map((staff) => (
                          <option key={staff.id} value={staff.id}>{staff.name} ({labelize(staff.role)})</option>
                        ))}
                      </select>
                    </label>

                    <label style={fieldLabelStyle()}>
                      Change Status
                      <select value={selectedEnquiry.status} onChange={(e) => runAction(() => updateAdminEnquiryStatus(selectedEnquiry.id, { status: e.target.value }), "Status updated.")} style={inputStyle()}>
                        {['new', 'in_progress', 'replied', 'closed', 'spam'].map((item) => (
                          <option key={item} value={item}>{labelize(item)}</option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div style={{ borderTop: "1px solid #e4e8ef", paddingTop: 16 }}>
                    <h3 style={{ marginTop: 0 }}>Reply To Enquiry</h3>
                    <div style={{ display: "grid", gap: 10 }}>
                      <label style={fieldLabelStyle()}>
                        Reply Channel
                        <select value={replyForm.replyChannel} onChange={(e) => setReplyForm((prev) => ({ ...prev, replyChannel: e.target.value }))} style={inputStyle()}>
                          {['email', 'phone', 'whatsapp', 'sms', 'portal_note'].map((item) => (
                            <option key={item} value={item}>{labelize(item)}</option>
                          ))}
                        </select>
                      </label>
                      <label style={fieldLabelStyle()}>
                        Message
                        <textarea rows="5" value={replyForm.replyMessage} onChange={(e) => setReplyForm((prev) => ({ ...prev, replyMessage: e.target.value }))} style={inputStyle()} />
                      </label>
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <button type="button" onClick={() => runAction(async () => {
                          await replyToAdminEnquiry(selectedEnquiry.id, replyForm);
                          setReplyForm((prev) => ({ ...prev, replyMessage: "" }));
                        }, "Reply logged successfully.")} style={primaryButtonStyle(saving)} disabled={saving}>Send Reply</button>
                        <button type="button" onClick={() => runAction(async () => {
                          await replyToAdminEnquiry(selectedEnquiry.id, { ...replyForm, replyMode: 'note' });
                          setReplyForm((prev) => ({ ...prev, replyMessage: "" }));
                        }, "Internal note saved.")} style={secondaryButtonStyle()} disabled={saving}>Save Internal Note</button>
                      </div>
                    </div>
                  </div>

                  <div style={{ borderTop: "1px solid #e4e8ef", paddingTop: 16, marginTop: 18 }}>
                    <h3 style={{ marginTop: 0 }}>Reply History</h3>
                    <div style={{ display: "grid", gap: 10 }}>
                      {(selectedEnquiry.replies || []).length === 0 ? <p style={mutedText}>No replies yet.</p> : selectedEnquiry.replies.map((reply) => (
                        <div key={reply.id} style={{ border: "1px solid #e4e8ef", borderRadius: 14, padding: 14 }}>
                          <strong>{reply.repliedByName || "Staff"}</strong>
                          <div style={{ color: "#667085", fontSize: 13 }}>{labelize(reply.replyChannel)} • {formatDateTime(reply.createdAt)}</div>
                          <p style={{ ...mutedText, marginBottom: 0 }}>{reply.replyMessage}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <p style={mutedText}>Select an enquiry to view details.</p>
              )}
            </article>
          </div>
        ) : null}

        {!loading && activeTab === "callbacks" ? (
          <article style={cardStyle}>
            <h2 style={{ marginTop: 0 }}>Callback Requests</h2>
            <div style={{ display: "grid", gap: 12 }}>
              {callbacks.map((item) => (
                <div key={item.callback?.id || item.enquiry?.id} style={{ border: "1px solid #dbe4f0", borderRadius: 16, padding: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <div>
                      <strong style={{ color: "#163A70" }}>{item.enquiry?.fullName}</strong>
                      <div style={mutedText}>{item.enquiry?.phone || "-"} • {item.callback?.preferredCallTime || "Any time"}</div>
                    </div>
                    <div style={{ fontWeight: 700 }}>{labelize(item.callback?.callbackStatus)}</div>
                  </div>
                  <p style={{ ...mutedText, marginBottom: 12 }}>{item.enquiry?.message || item.enquiry?.subject}</p>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <select value={item.callback?.callbackStatus || 'pending'} onChange={(e) => runAction(() => updateAdminCallbackRequest(item.callback.id, { callbackStatus: e.target.value }), "Callback status updated.")} style={inputStyle()}>
                      {['pending', 'called', 'unreachable', 'completed'].map((status) => (
                        <option key={status} value={status}>{labelize(status)}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </article>
        ) : null}

        {!loading && activeTab === "visits" ? (
          <article style={cardStyle}>
            <h2 style={{ marginTop: 0 }}>Visit Requests</h2>
            <div style={{ display: "grid", gap: 12 }}>
              {visits.map((item) => (
                <div key={item.visit?.id || item.enquiry?.id} style={{ border: "1px solid #dbe4f0", borderRadius: 16, padding: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <div>
                      <strong style={{ color: "#163A70" }}>{item.enquiry?.fullName}</strong>
                      <div style={mutedText}>{item.enquiry?.intendedClass || "-"} • {item.visit?.preferredVisitDate || "No date"} {item.visit?.preferredVisitTime ? `• ${item.visit.preferredVisitTime}` : ""}</div>
                    </div>
                    <div style={{ fontWeight: 700 }}>{labelize(item.visit?.visitStatus)}</div>
                  </div>
                  <p style={{ ...mutedText, marginBottom: 12 }}>{item.enquiry?.message || 'Visit request'}</p>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <select value={item.visit?.visitStatus || 'pending'} onChange={(e) => runAction(() => updateAdminVisitRequest(item.visit.id, { visitStatus: e.target.value }), "Visit status updated.")} style={inputStyle()}>
                      {['pending', 'scheduled', 'completed', 'cancelled'].map((status) => (
                        <option key={status} value={status}>{labelize(status)}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </article>
        ) : null}

        {!loading && activeTab === "reports" ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
            <article style={cardStyle}>
              <h2 style={{ marginTop: 0 }}>Performance Snapshot</h2>
              <div style={{ display: "grid", gap: 10 }}>
                <DetailRow label="Total Enquiries" value={reports?.totalEnquiries || 0} />
                <DetailRow label="Average Response Time" value={`${reports?.avgResponseHours || 0} hrs`} />
                <DetailRow label="Callback Completion Rate" value={`${reports?.callbackCompletionRate || 0}%`} />
                <DetailRow label="Visit Scheduling Rate" value={`${reports?.visitSchedulingRate || 0}%`} />
              </div>
            </article>

            <article style={cardStyle}>
              <h2 style={{ marginTop: 0 }}>By Status</h2>
              <div style={{ display: "grid", gap: 10 }}>
                {(reports?.byStatus || []).map((row) => (
                  <DetailRow key={row.status} label={labelize(row.status)} value={row.count} />
                ))}
              </div>
            </article>

            <article style={cardStyle}>
              <h2 style={{ marginTop: 0 }}>By Type</h2>
              <div style={{ display: "grid", gap: 10 }}>
                {(reports?.byType || []).map((row) => (
                  <DetailRow key={row.type} label={labelize(row.type)} value={row.count} />
                ))}
              </div>
            </article>

            <article style={cardStyle}>
              <h2 style={{ marginTop: 0 }}>By Source Page</h2>
              <div style={{ display: "grid", gap: 10 }}>
                {(reports?.bySource || []).map((row) => (
                  <DetailRow key={row.sourcePage} label={labelize(row.sourcePage)} value={row.count} />
                ))}
              </div>
            </article>
          </div>
        ) : null}

        {!loading && activeTab === "templates" ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
            <article style={cardStyle}>
              <h2 style={{ marginTop: 0 }}>Reply Templates</h2>
              <div style={{ display: "grid", gap: 12 }}>
                {templates.map((template) => (
                  <div key={template.id} style={{ border: "1px solid #dbe4f0", borderRadius: 16, padding: 16 }}>
                    <strong style={{ color: "#163A70" }}>{template.templateName}</strong>
                    <div style={{ color: "#667085", fontSize: 13 }}>{labelize(template.enquiryType)} • {template.subjectLine || 'No subject line'}</div>
                    <p style={{ ...mutedText, marginBottom: 0 }}>{template.messageBody}</p>
                  </div>
                ))}
              </div>
            </article>

            <article style={cardStyle}>
              <h2 style={{ marginTop: 0 }}>Create Template</h2>
              <div style={{ display: "grid", gap: 10 }}>
                <label style={fieldLabelStyle()}>
                  Template Name
                  <input value={templateForm.templateName} onChange={(e) => setTemplateForm((prev) => ({ ...prev, templateName: e.target.value }))} style={inputStyle()} />
                </label>
                <label style={fieldLabelStyle()}>
                  Enquiry Type
                  <select value={templateForm.enquiryType} onChange={(e) => setTemplateForm((prev) => ({ ...prev, enquiryType: e.target.value }))} style={inputStyle()}>
                    {['general', 'admission', 'fees', 'transport', 'academics', 'result_support', 'partnership', 'complaint', 'callback_request', 'visit_request'].map((item) => (
                      <option key={item} value={item}>{labelize(item)}</option>
                    ))}
                  </select>
                </label>
                <label style={fieldLabelStyle()}>
                  Subject Line
                  <input value={templateForm.subjectLine} onChange={(e) => setTemplateForm((prev) => ({ ...prev, subjectLine: e.target.value }))} style={inputStyle()} />
                </label>
                <label style={fieldLabelStyle()}>
                  Message Body
                  <textarea rows="6" value={templateForm.messageBody} onChange={(e) => setTemplateForm((prev) => ({ ...prev, messageBody: e.target.value }))} style={inputStyle()} />
                </label>
                <button type="button" onClick={() => runAction(async () => {
                  await createAdminEnquiryTemplate(templateForm);
                  setTemplateForm({ templateName: '', enquiryType: 'general', subjectLine: '', messageBody: '' });
                }, "Template created.")} style={primaryButtonStyle(saving)} disabled={saving}>Save Template</button>
              </div>
            </article>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, borderBottom: "1px solid #edf1f6", paddingBottom: 8 }}>
      <span style={{ color: "#667085", fontWeight: 600 }}>{label}</span>
      <span style={{ color: "#111827", fontWeight: 700, textAlign: "right" }}>{value}</span>
    </div>
  );
}

function fieldLabelStyle() {
  return {
    display: "grid",
    gap: 6,
    color: "#465063",
    fontWeight: 700,
  };
}

function inputStyle() {
  return {
    width: "100%",
    borderRadius: 12,
    border: "1px solid #cdd6e3",
    padding: "11px 12px",
    font: "inherit",
    background: "#ffffff",
  };
}

function primaryButtonStyle(disabled) {
  return {
    border: "none",
    background: disabled ? "#9fb6d8" : "#163A70",
    color: "#ffffff",
    borderRadius: 12,
    padding: "11px 16px",
    fontWeight: 700,
    cursor: disabled ? "not-allowed" : "pointer",
  };
}

function secondaryButtonStyle() {
  return {
    border: "1px solid #cfd8e6",
    background: "#ffffff",
    color: "#163A70",
    borderRadius: 12,
    padding: "11px 16px",
    fontWeight: 700,
    cursor: "pointer",
  };
}


