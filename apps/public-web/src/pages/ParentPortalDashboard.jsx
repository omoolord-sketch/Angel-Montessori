import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  addActivityComment,
  getActivities,
  getLmsVirtualClasses,
  getLmsVirtualNotifications,
  getParentFinanceFees,
  getParentPortalOverview,
  getParentPaymentSummary,
  initializeParentFeePayment,
  verifyPayment,
} from "../api/services";
import { buildReportCardHtml, getTermOptions } from "../utils/reportCard";

function formatCurrency(amount, currency = "NGN") {
  const value = Number(amount || 0);
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

function normalizeDecisionStatus(status) {
  return String(status || "").toLowerCase().replace(/[^a-z]/g, "");
}

function decisionLabel(status) {
  const key = normalizeDecisionStatus(status);
  if (key === "promoted") return "Promoted";
  if (key === "promotedconditionally") return "Promoted Conditionally";
  if (key === "probation") return "Probation";
  if (key === "repeated") return "Repeat";
  if (key === "graduated") return "Graduated";
  if (key === "pendingreview") return "Pending Review";
  if (key === "noteligible") return "Not Eligible";
  if (key === "withdrawn") return "Withdrawn";
  return "Pending Review";
}

function latestPromotionDecision(rows = []) {
  const list = Array.isArray(rows) ? rows : [];
  if (!list.length) return null;
  return [...list].sort((a, b) =>
    String(b.decidedAt || b.updatedAt || b.createdAt || "").localeCompare(
      String(a.decidedAt || a.updatedAt || a.createdAt || "")
    )
  )[0] || null;
}

function formatVirtualClassSchedule(row) {
  const date = String(row?.sessionDate || "").trim();
  const time = String(row?.startTime || "").trim();
  if (!date) return "Schedule not set";
  const parsed = new Date(`${date}T${time || "00:00"}:00`);
  if (Number.isNaN(parsed.getTime())) return [date, time].filter(Boolean).join(" at ");
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed);
}

function schoolTodayKey() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${byType.year || ""}-${byType.month || ""}-${byType.day || ""}`;
}

function prettyProviderLabel(value) {
  const safe = String(value || "").toUpperCase();
  if (!safe) return "";
  if (safe === "MOCK") return "Offline Demo";
  return safe;
}

export default function ParentPortalDashboard() {
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [selectedPrintTermByChild, setSelectedPrintTermByChild] = useState({});
  const [activities, setActivities] = useState([]);
  const [commentDrafts, setCommentDrafts] = useState({});
  const [paymentSummary, setPaymentSummary] = useState({ currency: "NGN", invoices: [], providers: ["MOCK"], defaultProvider: "MOCK" });
  const [selectedProviderByInvoice, setSelectedProviderByInvoice] = useState({});
  const [payingInvoiceId, setPayingInvoiceId] = useState("");
  const [verifyingReference, setVerifyingReference] = useState("");
  const [pendingReferenceByInvoice, setPendingReferenceByInvoice] = useState({});
  const [virtualClasses, setVirtualClasses] = useState([]);
  const [virtualNotifications, setVirtualNotifications] = useState([]);
  const [financeFeeSummary, setFinanceFeeSummary] = useState({ sessionId: "", termId: "", records: [] });

  const invoiceByStudentId = useMemo(() => {
    const map = new Map();
    for (const item of paymentSummary?.invoices || []) {
      map.set(String(item.studentId), item);
    }
    return map;
  }, [paymentSummary]);

  const financeFeeByStudentId = useMemo(() => {
    const map = new Map();
    for (const item of financeFeeSummary?.records || []) {
      map.set(String(item.studentId), item);
    }
    return map;
  }, [financeFeeSummary]);

  const load = async () => {
    try {
      setLoading(true);
      setError("");

      const [overviewRes, activityRes, paymentRes, financeFeeRes, virtualClassesRes, virtualNotificationsRes] = await Promise.allSettled([
        getParentPortalOverview(),
        getActivities(),
        getParentPaymentSummary(),
        getParentFinanceFees(),
        getLmsVirtualClasses(),
        getLmsVirtualNotifications(),
      ]);

      let nextError = "";

      if (overviewRes.status === "fulfilled") {
        setChildren(Array.isArray(overviewRes.value?.data?.children) ? overviewRes.value.data.children : []);
      } else {
        setChildren([]);
        nextError = overviewRes.reason?.response?.data?.message || "Failed to load linked children";
      }

      if (activityRes.status === "fulfilled") {
        setActivities(Array.isArray(activityRes.value?.data) ? activityRes.value.data : []);
      } else {
        setActivities([]);
        if (!nextError) {
          nextError = activityRes.reason?.response?.data?.message || "Failed to load activities";
        }
      }

      if (paymentRes.status === "fulfilled") {
        const providerList =
          Array.isArray(paymentRes.value?.data?.providers) && paymentRes.value.data.providers.length
            ? paymentRes.value.data.providers.map((item) => String(item || "").toUpperCase()).filter(Boolean)
            : ["MOCK"];
        const defaultProvider = String(paymentRes.value?.data?.defaultProvider || providerList[0] || "MOCK").toUpperCase();
        const invoices = Array.isArray(paymentRes.value?.data?.invoices) ? paymentRes.value.data.invoices : [];

        setPaymentSummary({
          currency: paymentRes.value?.data?.currency || "NGN",
          invoices,
          providers: providerList,
          defaultProvider,
        });

        setSelectedProviderByInvoice((prev) => {
          const next = { ...prev };
          for (const invoice of invoices) {
            const key = String(invoice.id || "");
            if (!key) continue;
            if (!providerList.includes(String(next[key] || "").toUpperCase())) {
              next[key] = defaultProvider;
            }
          }
          return next;
        });
      } else {
        setPaymentSummary({ currency: "NGN", invoices: [], providers: ["MOCK"], defaultProvider: "MOCK" });
        if (!nextError) {
          nextError = paymentRes.reason?.response?.data?.message || "Failed to load payment summary";
        }
      }

      if (financeFeeRes.status === "fulfilled") {
        setFinanceFeeSummary({
          sessionId: financeFeeRes.value?.data?.sessionId || "",
          termId: financeFeeRes.value?.data?.termId || "",
          records: Array.isArray(financeFeeRes.value?.data?.records) ? financeFeeRes.value.data.records : [],
        });
      } else {
        setFinanceFeeSummary({ sessionId: "", termId: "", records: [] });
        if (!nextError) {
          nextError = financeFeeRes.reason?.response?.data?.message || "Failed to load finance fee records";
        }
      }

      if (virtualClassesRes.status === "fulfilled") {
        setVirtualClasses(Array.isArray(virtualClassesRes.value?.data) ? virtualClassesRes.value.data : []);
      } else {
        setVirtualClasses([]);
        if (!nextError) {
          nextError = virtualClassesRes.reason?.response?.data?.message || "Failed to load virtual classes";
        }
      }

      if (virtualNotificationsRes.status === "fulfilled") {
        setVirtualNotifications(Array.isArray(virtualNotificationsRes.value?.data) ? virtualNotificationsRes.value.data : []);
      } else {
        setVirtualNotifications([]);
        if (!nextError) {
          nextError = virtualNotificationsRes.reason?.response?.data?.message || "Failed to load virtual class alerts";
        }
      }

      if (nextError) {
        setError(nextError);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const submitActivityComment = async (activityId) => {
    const text = String(commentDrafts[activityId] || "").trim();
    if (!text) return;

    try {
      await addActivityComment(activityId, text);
      setCommentDrafts((prev) => ({ ...prev, [activityId]: "" }));
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to add comment");
    }
  };

  const payChildFee = async (invoiceId) => {
    try {
      setPayingInvoiceId(String(invoiceId));
      setError("");
      setMessage("");
      const provider = String(selectedProviderByInvoice[String(invoiceId)] || paymentSummary.defaultProvider || "MOCK").toUpperCase();
      const res = await initializeParentFeePayment({ invoiceId, provider });
      const data = res?.data || {};

      if (String(data.provider || "").toUpperCase() === "MOCK") {
        await verifyPayment(data.reference);
        setMessage("Fee payment completed successfully.");
        await load();
        return;
      }

      if (data.authorizationUrl) {
        window.open(data.authorizationUrl, "_blank", "noopener,noreferrer");
      }

      setPendingReferenceByInvoice((prev) => ({ ...prev, [String(invoiceId)]: data.reference || "" }));
      setMessage("Payment initialized. Complete payment in the opened tab, then click Verify.");
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to initialize fee payment");
    } finally {
      setPayingInvoiceId("");
    }
  };

  const verifyPending = async (invoiceId) => {
    const reference = String(pendingReferenceByInvoice[String(invoiceId)] || "").trim();
    if (!reference) return;

    try {
      setVerifyingReference(reference);
      setError("");
      setMessage("");
      const res = await verifyPayment(reference);
      const status = res?.data?.status || "";
      if (status === "SUCCESS") {
        setMessage("Payment verified successfully.");
        setPendingReferenceByInvoice((prev) => ({ ...prev, [String(invoiceId)]: "" }));
      } else {
        setMessage("Payment verification completed but status is not successful yet.");
      }
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to verify payment");
    } finally {
      setVerifyingReference("");
    }
  };

  const printChildResult = (child) => {
    const schoolName = "Angel Montessori School";
    const schoolAddress = "152 Okedogbon Road, Owo, Ondo State, Nigeria";
    const logoUrl = `${window.location.origin}/logo.png`;

    const termOptions = getTermOptions(child.recentResults || [], child.summaries || [], child.reports || []);
    const selectedKey = selectedPrintTermByChild[String(child.id)] || "";
    const selectedTerm = termOptions.find((item) => `${item.session}__${item.term}` === selectedKey) || null;

    const html = buildReportCardHtml({
      student: child,
      results: child.recentResults || [],
      summaries: child.summaries || [],
      reports: child.reports || [],
      promotionDecisions: child.promotionDecisions || [],
      selectedTerm,
      schoolName,
      schoolAddress,
      logoUrl,
    });

    const win = window.open("", "_blank", "width=1100,height=800");
    if (!win) {
      setError("Please allow pop-ups to print child result.");
      return;
    }

    win.document.open();
    win.document.write(html);
    win.document.close();

    setTimeout(() => {
      win.focus();
      win.print();
    }, 500);
  };

  return (
    <div className="portal-dashboard-page">
      <section className="portal-dashboard-hero">
        <div className="portal-dashboard-hero-copy">
          <div className="portal-surface-kicker">Angel Montessori School</div>
          <h2 className="portal-dashboard-title">Parent Portal</h2>
          <p className="portal-dashboard-subtitle">
            Track attendance, school fees, homework, report cards, and daily class updates for each child from one Angel Montessori parent view.
          </p>
          <p className="portal-dashboard-meta">
            Follow transport, payment, homework, and academic updates from one family dashboard.
          </p>
        </div>
        <div className="portal-dashboard-actions">
          <Link to="/portal/parent/transport" className="portal-dashboard-link-btn">
            Child Transport
          </Link>
        </div>
      </section>
      {error ? <p style={{ color: "crimson" }}>{error}</p> : null}
      {message ? <p style={{ color: "#245b2a" }}>{message}</p> : null}
      {loading ? <p>Loading parent records...</p> : null}
      {!loading && !children.length ? <p style={{ color: "#4d647f" }}>No linked children have been added to this parent account yet.</p> : null}

      {children.map((child) => {
        const childActivities = (activities || []).filter((item) => {
          if (String(item.studentId || "") === String(child.id)) return true;
          return String(item.classId || "") === String(child.classId || "");
        });

        const childInvoice = invoiceByStudentId.get(String(child.id)) || null;
        const childFinanceFee = financeFeeByStudentId.get(String(child.id)) || null;
        const childPromotion = latestPromotionDecision(child.promotionDecisions || []);
        const childVirtualClasses = (virtualClasses || []).filter((row) => {
          const rowClassId = String(row?.classSubject?.classId || row?.classId || "");
          const rowClassName = String(row?.className || row?.classSubject?.className || "").toLowerCase();
          return rowClassId === String(child.classId || "") || rowClassName === String(child.className || "").toLowerCase();
        });
        const childVirtualNotifications = (virtualNotifications || []).filter((row) => String(row.studentId || "") === String(child.id));
        const childVirtualSummary = {
          upcoming: childVirtualClasses.filter((row) => ["scheduled", "live"].includes(String(row.status || "").toLowerCase())).length,
          recordings: childVirtualClasses.filter((row) => String(row.recordingLink || "").trim()).length,
          alerts: childVirtualNotifications.length,
          today: childVirtualClasses.filter((row) => String(row.sessionDate || "") === schoolTodayKey()).length,
        };

        return (
          <div key={child.id} style={{ border: "1px solid #d7e3f2", borderRadius: 10, padding: 12, marginBottom: 12, background: "#fff" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <div>
                <h3 style={{ marginBottom: 6 }}>{child.name}</h3>
                <p style={{ marginTop: 0 }}>Class: {child.className}</p>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <select
                  value={selectedPrintTermByChild[String(child.id)] || ""}
                  onChange={(e) => setSelectedPrintTermByChild((prev) => ({ ...prev, [String(child.id)]: e.target.value }))}
                >
                  <option value="">Latest Available Report</option>
                  {getTermOptions(child.recentResults || [], child.summaries || [], child.reports || []).map((item) => (
                    <option key={`${item.session}-${item.term}`} value={`${item.session}__${item.term}`}>
                      {item.term} - {item.session}
                    </option>
                  ))}
                </select>
                <button onClick={() => printChildResult(child)}>Print Child Report Card</button>
              </div>
            </div>

            <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: 10, background: "#f8fafc", marginBottom: 12 }}>
              <strong>Latest Promotion Decision</strong>
              {childPromotion ? (
                <>
                  <p style={{ margin: "6px 0" }}><strong>Status:</strong> {decisionLabel(childPromotion.decisionStatus || childPromotion.promotionStatus)}</p>
                  <p style={{ margin: "4px 0" }}><strong>Session:</strong> {childPromotion.sessionName || childPromotion.sessionId || "-"}</p>
                  <p style={{ margin: "4px 0" }}><strong>Next Class:</strong> {childPromotion.nextClassName || "-"}</p>
                  <p style={{ margin: "4px 0" }}><strong>Reason:</strong> {childPromotion.overrideReason || childPromotion.decisionReason || "-"}</p>
                </>
              ) : (
                <p style={{ margin: "6px 0", color: "#475569" }}>No finalized promotion decision yet.</p>
              )}
            </div>

            <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: 10, background: "#f8fafc", marginBottom: 12 }}>
              <strong>School Fees</strong>
              {childFinanceFee || childInvoice ? (
                <>
                  {childFinanceFee ? (
                    <>
                      <p style={{ margin: "6px 0" }}>
                        Finance view for <strong>{financeFeeSummary.termId || "Current Term"}</strong>
                        {financeFeeSummary.sessionId ? <> in <strong>{financeFeeSummary.sessionId}</strong></> : null}
                      </p>
                      <p style={{ margin: "4px 0" }}>
                        Total Fee: <strong>{formatCurrency(childFinanceFee.totalFee, paymentSummary.currency)}</strong>
                        {" | "}
                        Paid: <strong>{formatCurrency(childFinanceFee.amountPaid, paymentSummary.currency)}</strong>
                        {" | "}
                        Balance: <strong>{formatCurrency(childFinanceFee.balance, paymentSummary.currency)}</strong>
                        {" | "}
                        Status: <strong style={{ textTransform: "capitalize" }}>{childFinanceFee.status}</strong>
                      </p>
                      {Number(childFinanceFee.discount || 0) > 0 ? (
                        <p style={{ margin: "4px 0", color: "#475569" }}>
                          Discount Applied: <strong>{formatCurrency(childFinanceFee.discount, paymentSummary.currency)}</strong>
                        </p>
                      ) : null}
                    </>
                  ) : null}

                  {childInvoice ? (
                    <>
                      <p style={{ margin: "6px 0" }}>{childInvoice.label}</p>
                      <p style={{ margin: "4px 0" }}>
                        Online Invoice: <strong>{formatCurrency(childInvoice.amount, paymentSummary.currency)}</strong>
                        {" | "}
                        Paid: <strong>{formatCurrency(childInvoice.paidAmount, paymentSummary.currency)}</strong>
                        {" | "}
                        Due: <strong>{formatCurrency(childInvoice.dueAmount, paymentSummary.currency)}</strong>
                        {" | "}
                        Status: <strong>{childInvoice.status}</strong>
                      </p>
                    </>
                  ) : null}

                  {childInvoice && childInvoice.dueAmount > 0 ? (
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8, alignItems: "end" }}>
                      <label style={{ display: "grid", gap: 4, minWidth: 180 }}>
                        <span style={{ fontSize: 12, color: "#475569" }}>Payment Provider</span>
                        <select
                          value={selectedProviderByInvoice[String(childInvoice.id)] || paymentSummary.defaultProvider || "MOCK"}
                          onChange={(e) => setSelectedProviderByInvoice((prev) => ({ ...prev, [String(childInvoice.id)]: e.target.value }))}
                        >
                          {(paymentSummary.providers || ["MOCK"]).map((provider) => (
                            <option key={provider} value={provider}>{prettyProviderLabel(provider)}</option>
                          ))}
                        </select>
                      </label>
                      <button
                        onClick={() => payChildFee(childInvoice.id)}
                        disabled={payingInvoiceId === String(childInvoice.id)}
                      >
                        {payingInvoiceId === String(childInvoice.id) ? "Processing..." : "Pay School Fees"}
                      </button>

                      {pendingReferenceByInvoice[String(childInvoice.id)] ? (
                        <button
                          onClick={() => verifyPending(childInvoice.id)}
                          disabled={verifyingReference === pendingReferenceByInvoice[String(childInvoice.id)]}
                        >
                          {verifyingReference === pendingReferenceByInvoice[String(childInvoice.id)] ? "Verifying..." : "Verify Payment"}
                        </button>
                      ) : null}
                    </div>
                  ) : childFinanceFee && Number(childFinanceFee.balance || 0) > 0 ? (
                    <p style={{ margin: "6px 0", color: "#475569" }}>
                      Outstanding balance is visible in the finance record. The online payment invoice will appear here once the school raises it for this child.
                    </p>
                  ) : (
                    <p style={{ margin: "6px 0", color: "#245b2a" }}>No outstanding fee for this term.</p>
                  )}
                </>
              ) : (
                <p style={{ margin: "6px 0" }}>No finance fee record or invoice has been raised for this child yet.</p>
              )}
            </div>

            <strong>Attendance Snapshot</strong>
            <p style={{ margin: "6px 0" }}>
              Present: <strong>{child.attendanceSummary?.present || 0}</strong>
              {" | "}
              Absent: <strong>{child.attendanceSummary?.absent || 0}</strong>
              {" | "}
              Late: <strong>{child.attendanceSummary?.late || 0}</strong>
              {" | "}
              Excused: <strong>{child.attendanceSummary?.excused || 0}</strong>
              {" | "}
              Attendance Rate: <strong>{child.attendanceSummary?.attendanceRate || 0}%</strong>
            </p>

            <strong>Recent Attendance Log</strong>
            <div style={{ overflowX: "auto", marginTop: 6, marginBottom: 10 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ border: "1px solid #ddd", padding: 6 }}>Date</th>
                    <th style={{ border: "1px solid #ddd", padding: 6 }}>Status</th>
                    <th style={{ border: "1px solid #ddd", padding: 6 }}>Remark</th>
                    <th style={{ border: "1px solid #ddd", padding: 6 }}>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {(child.attendanceHistory || []).slice(0, 12).map((row, idx) => (
                    <tr key={`${row.attendanceDate}-${row.status}-${idx}`}>
                      <td style={{ border: "1px solid #ddd", padding: 6 }}>{row.attendanceDate}</td>
                      <td style={{ border: "1px solid #ddd", padding: 6, textTransform: "capitalize" }}>{row.status}</td>
                      <td style={{ border: "1px solid #ddd", padding: 6 }}>{row.remark || "-"}</td>
                      <td style={{ border: "1px solid #ddd", padding: 6 }}>{row.reason || "-"}</td>
                    </tr>
                  ))}
                  {(child.attendanceHistory || []).length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ border: "1px solid #ddd", padding: 8, textAlign: "center", color: "#666" }}>
                        No attendance records yet.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            <strong>Term Performance</strong>
            <ul>
              {(child.summaries || []).map((item) => (
                <li key={`${item.session}-${item.term}`}>
                  {item.session} - {item.term}: Average {item.average}
                </li>
              ))}
            </ul>

            <strong>Recent Results</strong>
            <div style={{ overflowX: "auto", marginTop: 6 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ border: "1px solid #ddd", padding: 6 }}>Session</th>
                    <th style={{ border: "1px solid #ddd", padding: 6 }}>Term</th>
                    <th style={{ border: "1px solid #ddd", padding: 6 }}>Subject</th>
                    <th style={{ border: "1px solid #ddd", padding: 6 }}>Score</th>
                  </tr>
                </thead>
                <tbody>
                  {(child.recentResults || []).slice(0, 12).map((row) => (
                    <tr key={row.id}>
                      <td style={{ border: "1px solid #ddd", padding: 6 }}>{row.session}</td>
                      <td style={{ border: "1px solid #ddd", padding: 6 }}>{row.term}</td>
                      <td style={{ border: "1px solid #ddd", padding: 6 }}>{row.subject}</td>
                      <td style={{ border: "1px solid #ddd", padding: 6, textAlign: "center" }}>{row.score}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <strong style={{ display: "block", marginTop: 12 }}>Homework & Assignments</strong>
            <p style={{ margin: "6px 0" }}>
              Pending: <strong>{child.homeworkSummary?.pendingTasks || 0}</strong>
              {" | "}
              Missed: <strong>{child.homeworkSummary?.overdue || child.homeworkSummary?.missedTasks || 0}</strong>
              {" | "}
              Graded: <strong>{child.homeworkSummary?.graded || child.homeworkSummary?.recentlyGraded || 0}</strong>
            </p>
            <div style={{ display: "grid", gap: 8 }}>
              {(child.homework || []).slice(0, 6).map((task) => (
                <div key={task.id} style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: 8, background: "#f8fafc" }}>
                  <strong>{task.title}</strong>
                  <p style={{ margin: "4px 0", fontSize: 13, color: "#334155" }}>
                    {task.subject} | {(task.submissionStatus || "not_submitted")} {task.timelinessStatus ? `| ${task.timelinessStatus}` : ""}
                  </p>
                  {task.dueDate ? <p style={{ margin: "4px 0", fontSize: 13 }}>Due: {new Date(task.dueDate).toLocaleString()}</p> : null}
                </div>
              ))}
              {(child.homework || []).length === 0 ? <p style={{ margin: "4px 0" }}>No homework has been posted for this child yet.</p> : null}
            </div>
            <strong style={{ display: "block", marginTop: 12 }}>Virtual Classroom</strong>
            <p style={{ margin: "6px 0" }}>
              Today: <strong>{childVirtualSummary.today || 0}</strong>
              {" | "}
              Upcoming: <strong>{childVirtualSummary.upcoming || 0}</strong>
              {" | "}
              Recordings: <strong>{childVirtualSummary.recordings || 0}</strong>
              {" | "}
              Alerts: <strong>{childVirtualSummary.alerts || 0}</strong>
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
              <Link to="/parent/lms/virtual-classes" style={{ textDecoration: "none", padding: "8px 12px", borderRadius: 10, background: "#163a70", color: "#fff", fontWeight: 700 }}>
                Open Virtual Classroom
              </Link>
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              {childVirtualClasses.slice(0, 4).map((row) => (
                <div key={row.id} style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: 8, background: "#f8fafc" }}>
                  <strong>{row.title}</strong>
                  <p style={{ margin: "4px 0", fontSize: 13, color: "#334155" }}>{row.subjectName} | {row.className}</p>
                  <p style={{ margin: "4px 0", fontSize: 13, color: "#475569" }}>{formatVirtualClassSchedule(row)} | {String(row.status || "scheduled").replace(/_/g, " ")}</p>
                </div>
              ))}
              {childVirtualClasses.length === 0 ? <p style={{ margin: "4px 0" }}>No live or scheduled virtual classes are visible for this child yet.</p> : null}
            </div>
            <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
              {childVirtualNotifications.slice(0, 3).map((notice) => (
                <div key={notice.id} style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: 8, background: "#f8fafc" }}>
                  <strong>{notice.title}</strong>
                  <p style={{ margin: "4px 0", fontSize: 13, color: "#334155" }}>{notice.message}</p>
                </div>
              ))}
              {childVirtualNotifications.length === 0 ? <p style={{ margin: "4px 0", color: "#64748b" }}>No virtual class alerts for this child right now.</p> : null}
            </div>

            <strong style={{ display: "block", marginTop: 12 }}>Daily Class Updates</strong>
            {childActivities.length === 0 ? <p style={{ marginTop: 6 }}>No class updates have been posted yet.</p> : null}
            <div style={{ display: "grid", gap: 10, marginTop: 8 }}>
              {childActivities.map((activity) => (
                <div key={activity.id} style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: 10, background: "#f8fafc" }}>
                  <strong>{activity.title}</strong>
                  <p style={{ margin: "6px 0" }}>{activity.description}</p>
                  <p style={{ margin: "4px 0", color: "#475569", fontSize: 13 }}>
                    {activity.activityDate || ""}
                    {activity.subject ? ` | ${activity.subject}` : ""}
                    {activity.studentName ? ` | ${activity.studentName}` : ""}
                  </p>

                  {activity.imageUrl ? (
                    <img
                      src={activity.imageUrl}
                      alt="Activity"
                      style={{ width: 140, height: 100, objectFit: "cover", borderRadius: 8, border: "1px solid #cbd5e1" }}
                    />
                  ) : null}

                  <div style={{ marginTop: 8 }}>
                    <strong>Comments</strong>
                    {(activity.comments || []).length === 0 ? <p style={{ margin: "4px 0" }}>No comments yet.</p> : null}
                    {(activity.comments || []).map((comment) => (
                      <p key={comment.id} style={{ margin: "4px 0", fontSize: 13 }}>
                        <strong>{comment.authorName}:</strong> {comment.comment}
                      </p>
                    ))}

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
                      <input
                        value={commentDrafts[activity.id] || ""}
                        onChange={(e) => setCommentDrafts((prev) => ({ ...prev, [activity.id]: e.target.value }))}
                        placeholder="Write a parent comment"
                        style={{ flex: 1, minWidth: 200 }}
                      />
                      <button onClick={() => submitActivityComment(activity.id)}>Post Comment</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}




















