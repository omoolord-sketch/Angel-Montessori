import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  addActivityComment,
  getActivities,
  getLmsVirtualClasses,
  getLmsVirtualNotifications,
  getParentFinanceFees,
  getParentPaymentSummary,
  getParentPortalOverview,
  getParentTransportOverview,
  initializeParentFeePayment,
  verifyPayment,
} from "../api/services";
import { useAuth } from "../auth/AuthContext";
import { buildReportCardHtml, getTermOptions } from "../utils/reportCard";
import "./ParentPortalDashboard.css";

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

function formatDate(value) {
  const safe = String(value || "").trim();
  if (!safe) return "-";
  const parsed = new Date(safe);
  if (Number.isNaN(parsed.getTime())) return safe;
  return parsed.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value) {
  const safe = String(value || "").trim();
  if (!safe) return "-";
  const parsed = new Date(safe);
  if (Number.isNaN(parsed.getTime())) return safe;
  return parsed.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function cleanLabel(value, fallback = "-") {
  const safe = String(value || "").replace(/_/g, " ").trim();
  if (!safe) return fallback;
  return safe.replace(/\b\w/g, (char) => char.toUpperCase());
}

function getResultScore(row = {}) {
  const candidates = [row.totalScore, row.score, row.percentage, row.average];
  for (const value of candidates) {
    const number = Number(value);
    if (Number.isFinite(number)) return number;
  }
  return null;
}

function getComponentScore(row = {}, keys = []) {
  for (const key of keys) {
    if (row[key] === "" || row[key] == null) continue;
    const number = Number(row[key]);
    if (Number.isFinite(number)) return Number.isInteger(number) ? String(number) : number.toFixed(2).replace(/\.?0+$/, "");
  }
  return "-";
}

function financeStatusInfo(financeRecord, invoice) {
  const balance = Number(financeRecord?.balance ?? invoice?.dueAmount ?? 0);
  const paid = Number(financeRecord?.amountPaid ?? invoice?.paidAmount ?? 0);
  const raw = String(financeRecord?.status || invoice?.status || "").toLowerCase();

  if (balance <= 0 && (financeRecord || invoice)) {
    return { label: "Paid", tone: "success" };
  }
  if (paid > 0 || raw.includes("part")) {
    return { label: "Part Payment", tone: "warning" };
  }
  if (financeRecord || invoice) {
    return { label: "Unpaid", tone: "danger" };
  }
  return { label: "Not Raised", tone: "neutral" };
}

function invoiceDueAmount(invoice) {
  return Number(invoice?.dueAmount ?? invoice?.balance ?? 0);
}

function invoiceStatusKey(invoice) {
  return String(invoice?.status || "").trim().toUpperCase();
}

function isCancelledInvoice(invoice) {
  return invoiceStatusKey(invoice) === "CANCELLED";
}

function isPayableInvoice(invoice) {
  return !isCancelledInvoice(invoice) && invoiceDueAmount(invoice) > 0;
}

function invoiceMatchesScope(invoice, scope) {
  if (!invoice || !scope) return false;
  const sessionMatch = scope.sessionId && String(invoice.sessionId || "") === String(scope.sessionId);
  const termMatch = scope.termId && String(invoice.termId || "") === String(scope.termId);
  return Boolean(sessionMatch && termMatch);
}

function invoiceSessionLabel(invoice, fallback = "Session not set") {
  return String(invoice?.sessionName || invoice?.session || invoice?.sessionLabel || "").trim() || fallback;
}

function invoiceTermLabel(invoice, fallback = "Term not set") {
  return String(invoice?.termName || invoice?.term || invoice?.termLabel || "").trim() || fallback;
}

function sortInvoicesForParent(rows = [], scope = {}) {
  return [...rows].sort((a, b) => {
    const aCurrent = invoiceMatchesScope(a, scope) ? 1 : 0;
    const bCurrent = invoiceMatchesScope(b, scope) ? 1 : 0;
    if (aCurrent !== bCurrent) return bCurrent - aCurrent;

    const aPayable = isPayableInvoice(a) ? 1 : 0;
    const bPayable = isPayableInvoice(b) ? 1 : 0;
    if (aPayable !== bPayable) return bPayable - aPayable;

    return String(b.updatedAt || b.createdAt || "").localeCompare(String(a.updatedAt || a.createdAt || ""));
  });
}

function generalStatusTone(status) {
  const key = String(status || "").toLowerCase();
  if (["paid", "present", "submitted", "graded", "active", "live", "success", "promoted"].includes(key)) return "success";
  if (["part payment", "pending", "late", "scheduled", "pending review", "open"].includes(key)) return "warning";
  if (["unpaid", "absent", "missed", "overdue", "failed", "inactive", "revoked"].includes(key)) return "danger";
  return "neutral";
}

function StatusBadge({ children, tone = "neutral" }) {
  return <span className={`parent-status-badge ${tone}`}>{children}</span>;
}

function EmptyState({ title, text }) {
  return (
    <div className="parent-empty-state">
      <strong>{title}</strong>
      {text ? <p>{text}</p> : null}
    </div>
  );
}

function SectionHeader({ kicker, title, text, action }) {
  return (
    <div className="parent-section-header">
      <div>
        {kicker ? <span className="parent-section-kicker">{kicker}</span> : null}
        <h2>{title}</h2>
        {text ? <p>{text}</p> : null}
      </div>
      {action ? <div className="parent-section-action">{action}</div> : null}
    </div>
  );
}

function StatCard({ label, value, hint, tone = "navy" }) {
  return (
    <article className={`parent-stat-card ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {hint ? <p>{hint}</p> : null}
    </article>
  );
}

function ModuleCard({ item, onOpen }) {
  return (
    <button type="button" className="parent-module-card" onClick={() => onOpen(item.target)}>
      <span className="parent-module-icon">{item.icon}</span>
      <span className="parent-module-copy">
        <strong>{item.title}</strong>
        <small>{item.description}</small>
        {item.badge ? <StatusBadge tone={item.tone || "neutral"}>{item.badge}</StatusBadge> : null}
      </span>
      <span className="parent-module-action">{item.action || "Open"}</span>
    </button>
  );
}

export default function ParentPortalDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [children, setChildren] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState("");
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
  const [financeFeeSummary, setFinanceFeeSummary] = useState({ sessionId: "", termId: "", sessionName: "", termName: "", records: [] });
  const [transportOverview, setTransportOverview] = useState({ summary: {}, children: [] });

  const invoicesByStudentId = useMemo(() => {
    const map = new Map();
    for (const item of paymentSummary?.invoices || []) {
      if (isCancelledInvoice(item)) continue;
      const key = String(item.studentId || "");
      if (!key) continue;
      const existing = map.get(key) || [];
      existing.push(item);
      map.set(key, existing);
    }
    for (const [key, rows] of map) {
      map.set(key, sortInvoicesForParent(rows, financeFeeSummary));
    }
    return map;
  }, [financeFeeSummary, paymentSummary]);

  const financeFeeByStudentId = useMemo(() => {
    const map = new Map();
    for (const item of financeFeeSummary?.records || []) {
      map.set(String(item.studentId), item);
    }
    return map;
  }, [financeFeeSummary]);

  const selectedChild = useMemo(() => {
    if (!children.length) return null;
    return children.find((child) => String(child.id) === String(selectedChildId)) || children[0];
  }, [children, selectedChildId]);

  useEffect(() => {
    if (children.length && !children.some((child) => String(child.id) === String(selectedChildId))) {
      setSelectedChildId(String(children[0].id));
    }
  }, [children, selectedChildId]);

  const load = async () => {
    try {
      setLoading(true);
      setError("");

      const [
        overviewRes,
        activityRes,
        paymentRes,
        financeFeeRes,
        virtualClassesRes,
        virtualNotificationsRes,
        transportRes,
      ] = await Promise.allSettled([
        getParentPortalOverview(),
        getActivities(),
        getParentPaymentSummary(),
        getParentFinanceFees(),
        getLmsVirtualClasses(),
        getLmsVirtualNotifications(),
        getParentTransportOverview(),
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
          sessionName: financeFeeRes.value?.data?.sessionName || "",
          termName: financeFeeRes.value?.data?.termName || "",
          records: Array.isArray(financeFeeRes.value?.data?.records) ? financeFeeRes.value.data.records : [],
        });
      } else {
        setFinanceFeeSummary({ sessionId: "", termId: "", sessionName: "", termName: "", records: [] });
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

      if (transportRes.status === "fulfilled") {
        setTransportOverview(transportRes.value?.data || { summary: {}, children: [] });
      } else {
        setTransportOverview({ summary: {}, children: [] });
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

  const selectedData = useMemo(() => {
    if (!selectedChild) return null;

    const childActivities = (activities || []).filter((item) => {
      if (String(item.studentId || "") === String(selectedChild.id)) return true;
      return String(item.classId || "") === String(selectedChild.classId || "");
    });

    const childInvoices = invoicesByStudentId.get(String(selectedChild.id)) || [];
    const currentScope = {
      sessionId: financeFeeSummary.sessionId,
      termId: financeFeeSummary.termId,
      sessionName: financeFeeSummary.sessionName,
      termName: financeFeeSummary.termName,
    };
    const currentInvoice =
      childInvoices.find((invoice) => invoiceMatchesScope(invoice, currentScope)) ||
      childInvoices.find((invoice) => isPayableInvoice(invoice)) ||
      childInvoices[0] ||
      null;
    const payableInvoices = childInvoices.filter((invoice) => isPayableInvoice(invoice));
    const childFinanceFee = financeFeeByStudentId.get(String(selectedChild.id)) || null;
    const childPromotion = latestPromotionDecision(selectedChild.promotionDecisions || []);
    const childVirtualClasses = (virtualClasses || []).filter((row) => {
      const rowClassId = String(row?.classSubject?.classId || row?.classId || "");
      const rowClassName = String(row?.className || row?.classSubject?.className || "").toLowerCase();
      return rowClassId === String(selectedChild.classId || "") || rowClassName === String(selectedChild.className || "").toLowerCase();
    });
    const childVirtualNotifications = (virtualNotifications || []).filter((row) => String(row.studentId || "") === String(selectedChild.id));
    const transportChild = (transportOverview.children || []).find((row) => String(row.studentId) === String(selectedChild.id));
    const termOptions = getTermOptions(selectedChild.recentResults || [], selectedChild.summaries || [], selectedChild.reports || []);
    const latestSummary = Array.isArray(selectedChild.summaries) && selectedChild.summaries.length ? selectedChild.summaries[0] : null;
    const financeStatus = financeStatusInfo(childFinanceFee, currentInvoice);
    const balance = Number(childFinanceFee?.balance ?? (currentInvoice && invoiceMatchesScope(currentInvoice, currentScope) ? invoiceDueAmount(currentInvoice) : 0));
    const totalFee = Number(childFinanceFee?.totalFee ?? (currentInvoice && invoiceMatchesScope(currentInvoice, currentScope) ? currentInvoice.amount : 0));
    const paid = Number(childFinanceFee?.amountPaid ?? (currentInvoice && invoiceMatchesScope(currentInvoice, currentScope) ? currentInvoice.paidAmount : 0));
    const outstandingTotal = payableInvoices.reduce((sum, invoice) => sum + invoiceDueAmount(invoice), 0);
    const currentSessionLabel = financeFeeSummary.sessionName || childFinanceFee?.sessionName || latestSummary?.session || "Current session";
    const currentTermLabel = financeFeeSummary.termName || childFinanceFee?.termName || latestSummary?.term || "Current term";
    const homeworkSummary = selectedChild.homeworkSummary || {};
    const attendanceSummary = selectedChild.attendanceSummary || {};
    const virtualSummary = {
      upcoming: childVirtualClasses.filter((row) => ["scheduled", "live"].includes(String(row.status || "").toLowerCase())).length,
      recordings: childVirtualClasses.filter((row) => String(row.recordingLink || "").trim()).length,
      alerts: childVirtualNotifications.length,
      today: childVirtualClasses.filter((row) => String(row.sessionDate || "") === schoolTodayKey()).length,
    };

    return {
      activities: childActivities,
      invoice: currentInvoice,
      invoices: childInvoices,
      payableInvoices,
      financeFee: childFinanceFee,
      financeStatus,
      totalFee,
      paid,
      balance,
      outstandingTotal,
      promotion: childPromotion,
      virtualClasses: childVirtualClasses,
      virtualNotifications: childVirtualNotifications,
      virtualSummary,
      transportChild,
      termOptions,
      latestSummary,
      homeworkSummary,
      attendanceSummary,
      sessionLabel: currentSessionLabel,
      termLabel: currentTermLabel,
    };
  }, [
    activities,
    financeFeeByStudentId,
    financeFeeSummary.sessionId,
    financeFeeSummary.termId,
    financeFeeSummary.sessionName,
    financeFeeSummary.termName,
    invoicesByStudentId,
    selectedChild,
    transportOverview.children,
    virtualClasses,
    virtualNotifications,
  ]);

  const scrollToSection = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

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

  const handleLogout = () => {
    logout();
    navigate("/portal/login");
  };

  const navItems = [
    { label: "Overview", target: "parent-overview" },
    { label: "School Fees", target: "parent-fees" },
    { label: "Attendance", target: "parent-attendance" },
    { label: "Homework", target: "parent-homework" },
    { label: "Results", target: "parent-results" },
    { label: "Transport", target: "parent-transport" },
    { label: "Virtual Classroom", target: "parent-virtual-classroom" },
    { label: "Class Updates", target: "parent-updates" },
  ];

  const quickCards = selectedData
    ? [
        {
          icon: "FE",
          title: "School Fees",
          description: (selectedData.outstandingTotal || selectedData.balance) > 0 ? `Outstanding balance: ${formatCurrency(selectedData.outstandingTotal || selectedData.balance, paymentSummary.currency)}` : "No outstanding balance for the current view.",
          badge: selectedData.financeStatus.label,
          tone: selectedData.financeStatus.tone,
          action: selectedData.payableInvoices.length ? "Pay / View" : "View",
          target: "parent-fees",
        },
        {
          icon: "AT",
          title: "Attendance",
          description: `${selectedData.attendanceSummary?.attendanceRate || 0}% attendance rate`,
          badge: `${selectedData.attendanceSummary?.present || 0} present`,
          tone: Number(selectedData.attendanceSummary?.attendanceRate || 0) >= 80 ? "success" : "warning",
          target: "parent-attendance",
        },
        {
          icon: "HW",
          title: "Homework & Assignments",
          description: `${selectedData.homeworkSummary?.pendingTasks || 0} pending assignment(s)`,
          badge: `${selectedData.homeworkSummary?.graded || selectedData.homeworkSummary?.recentlyGraded || 0} graded`,
          tone: Number(selectedData.homeworkSummary?.pendingTasks || 0) > 0 ? "warning" : "success",
          target: "parent-homework",
        },
        {
          icon: "RC",
          title: "Results / Report Card",
          description: selectedData.termOptions.length ? "Latest report card is available for printing." : "No report card has been published yet.",
          badge: selectedData.termOptions.length ? "Available" : "Not Ready",
          tone: selectedData.termOptions.length ? "success" : "neutral",
          target: "parent-results",
        },
        {
          icon: "TR",
          title: "Transport",
          description: selectedData.transportChild?.assignment?.routeName || "Open child transport details.",
          badge: selectedData.transportChild?.assignment?.status ? cleanLabel(selectedData.transportChild.assignment.status) : "View",
          tone: selectedData.transportChild?.assignment ? "success" : "neutral",
          target: "parent-transport",
        },
        {
          icon: "VC",
          title: "Virtual Classroom",
          description: `${selectedData.virtualSummary.upcoming} upcoming class(es), ${selectedData.virtualSummary.recordings} recording(s)`,
          badge: `${selectedData.virtualSummary.alerts} alert(s)`,
          tone: selectedData.virtualSummary.upcoming ? "success" : "neutral",
          target: "parent-virtual-classroom",
        },
        {
          icon: "UP",
          title: "Daily Class Updates",
          description: `${selectedData.activities.length} update(s) visible for this child.`,
          badge: selectedData.activities.length ? "Posted" : "No Updates",
          tone: selectedData.activities.length ? "success" : "neutral",
          target: "parent-updates",
        },
        {
          icon: "AN",
          title: "Announcements",
          description: "Latest classroom and virtual learning notices.",
          badge: `${selectedData.virtualSummary.alerts} notice(s)`,
          tone: selectedData.virtualSummary.alerts ? "warning" : "neutral",
          target: "parent-updates",
        },
      ]
    : [];

  const profileName = user?.fullName || user?.name || user?.username || "Parent";

  return (
    <div className="parent-dashboard-page">
      <div className="parent-dashboard-shell">
        <header className="parent-topbar">
          <div className="parent-brand-block">
            <span className="parent-brand-mark">AM</span>
            <div>
              <strong>Angel Montessori School</strong>
              <small>Parent Dashboard</small>
            </div>
          </div>
          <div className="parent-topbar-actions">
            <button type="button" className="parent-notification-pill" onClick={() => scrollToSection("parent-updates")}>
              Alerts <span>{selectedData?.virtualSummary?.alerts || 0}</span>
            </button>
            <div className="parent-profile-pill">
              <span>{String(profileName).slice(0, 1).toUpperCase()}</span>
              <strong>{profileName}</strong>
            </div>
            <button type="button" className="parent-logout-btn" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </header>

        <section className="parent-hero-card">
          <div>
            <span className="parent-kicker">Angel Montessori School</span>
            <h1>Parent Dashboard</h1>
            <p>
              A calm, structured view for fees, attendance, homework, results, transport, virtual classes, and daily class updates.
            </p>
          </div>
          <Link to="/portal/parent/transport" className="parent-primary-link">
            Open Child Transport
          </Link>
        </section>

        {error ? <div className="parent-alert error">{error}</div> : null}
        {message ? <div className="parent-alert success">{message}</div> : null}
        {loading ? <div className="parent-alert neutral">Loading parent records...</div> : null}

        {!loading && !children.length ? (
          <EmptyState
            title="No linked children yet."
            text="No child profile has been connected to this parent account. Please contact the school office if this should already be available."
          />
        ) : null}

        {selectedChild && selectedData ? (
          <div className="parent-dashboard-layout">
            <aside className="parent-sidebar">
              <div className="parent-sidebar-card">
                <span className="parent-section-kicker">Navigate</span>
                <strong>Parent Menu</strong>
                <nav>
                  {navItems.map((item) => (
                    <button key={item.target} type="button" onClick={() => scrollToSection(item.target)}>
                      {item.label}
                    </button>
                  ))}
                </nav>
              </div>
            </aside>

            <main className="parent-main-content">
              <section id="parent-overview" className="parent-child-summary">
                <div className="parent-child-copy">
                  <span className="parent-section-kicker">Selected Child</span>
                  <h2>{selectedChild.name}</h2>
                  <p>{selectedChild.className || "Class not assigned"} | {selectedData.sessionLabel} | {selectedData.termLabel}</p>
                  {children.length > 1 ? (
                    <label className="parent-child-switcher">
                      <span>Switch child</span>
                      <select value={String(selectedChild.id)} onChange={(event) => setSelectedChildId(event.target.value)}>
                        {children.map((child) => (
                          <option key={child.id} value={String(child.id)}>
                            {child.name} {child.className ? `- ${child.className}` : ""}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                </div>
                <div className="parent-child-badges">
                  <StatusBadge tone={selectedData.financeStatus.tone}>Fees: {selectedData.financeStatus.label}</StatusBadge>
                  <StatusBadge tone={Number(selectedData.attendanceSummary?.attendanceRate || 0) >= 80 ? "success" : "warning"}>
                    Attendance: {selectedData.attendanceSummary?.attendanceRate || 0}%
                  </StatusBadge>
                  <StatusBadge tone={Number(selectedData.homeworkSummary?.pendingTasks || 0) > 0 ? "warning" : "success"}>
                    Homework: {selectedData.homeworkSummary?.pendingTasks || 0} pending
                  </StatusBadge>
                  <StatusBadge tone={selectedData.termOptions.length ? "success" : "neutral"}>
                    Report: {selectedData.termOptions.length ? "Available" : "Not ready"}
                  </StatusBadge>
                </div>
              </section>

              <section className="parent-summary-grid">
                <StatCard label="Outstanding Fees" value={formatCurrency(selectedData.outstandingTotal || selectedData.balance, paymentSummary.currency)} hint={selectedData.payableInvoices.length ? `${selectedData.payableInvoices.length} payable invoice(s)` : selectedData.financeStatus.label} tone={(selectedData.outstandingTotal || selectedData.balance) > 0 ? "gold" : "green"} />
                <StatCard label="Attendance Rate" value={`${selectedData.attendanceSummary?.attendanceRate || 0}%`} hint={`${selectedData.attendanceSummary?.present || 0} present records`} />
                <StatCard label="Pending Homework" value={selectedData.homeworkSummary?.pendingTasks || 0} hint={`${selectedData.homeworkSummary?.overdue || selectedData.homeworkSummary?.missedTasks || 0} missed or overdue`} tone="amber" />
                <StatCard label="Virtual Classes" value={selectedData.virtualSummary.upcoming} hint={`${selectedData.virtualSummary.today} scheduled today`} tone="blue" />
              </section>

              <section className="parent-module-grid" aria-label="Parent quick navigation">
                {quickCards.map((item) => (
                  <ModuleCard key={item.title} item={item} onOpen={scrollToSection} />
                ))}
              </section>

              <section id="parent-fees" className="parent-dashboard-section">
                <SectionHeader
                  kicker="Finance"
                  title="School Fees"
                  text="Current term fees are shown first, with any outstanding online invoices listed by session and term for payment."
                />
                <div className="parent-fee-highlight">
                  <div>
                    <span>Current Term Balance</span>
                    <strong>{formatCurrency(selectedData.balance, paymentSummary.currency)}</strong>
                    <StatusBadge tone={selectedData.financeStatus.tone}>{selectedData.financeStatus.label}</StatusBadge>
                  </div>
                  <div className="parent-fee-metrics">
                    <span>Current Term Fee <strong>{formatCurrency(selectedData.totalFee, paymentSummary.currency)}</strong></span>
                    <span>Current Term Paid <strong>{formatCurrency(selectedData.paid, paymentSummary.currency)}</strong></span>
                    <span>Total Online Outstanding <strong>{formatCurrency(selectedData.outstandingTotal, paymentSummary.currency)}</strong></span>
                  </div>
                </div>

                {selectedData.financeFee || selectedData.invoice ? (
                  <div className="parent-details-grid">
                    {selectedData.financeFee ? (
                      <>
                        <div><span>Finance Term</span><strong>{selectedData.termLabel}</strong></div>
                        <div><span>Finance Session</span><strong>{selectedData.sessionLabel}</strong></div>
                        <div><span>Discount</span><strong>{formatCurrency(selectedData.financeFee.discount, paymentSummary.currency)}</strong></div>
                      </>
                    ) : null}
                    {selectedData.invoice ? (
                      <>
                        <div><span>Latest Online Invoice</span><strong>{selectedData.invoice.label || selectedData.invoice.id}</strong></div>
                        <div><span>Invoice Term</span><strong>{invoiceSessionLabel(selectedData.invoice)} / {invoiceTermLabel(selectedData.invoice)}</strong></div>
                        <div><span>Online Status</span><strong>{cleanLabel(selectedData.invoice.status)}</strong></div>
                      </>
                    ) : null}
                  </div>
                ) : (
                  <EmptyState title="No fee record yet." text="No finance fee record or online invoice has been raised for this child yet." />
                )}

                {selectedData.payableInvoices.length ? (
                  <div className="parent-invoice-list">
                    <div className="parent-invoice-list-head">
                      <div>
                        <h3>Outstanding Term Invoices</h3>
                        <p>Parents can choose the exact session and term to pay. Old or cancelled invoices are not shown here.</p>
                      </div>
                      <StatusBadge tone="warning">{selectedData.payableInvoices.length} payable</StatusBadge>
                    </div>
                    {selectedData.payableInvoices.map((invoice) => {
                      const invoiceId = String(invoice.id || "");
                      return (
                        <article key={invoiceId} className="parent-invoice-card">
                          <div className="parent-invoice-meta">
                            <span>{invoiceSessionLabel(invoice)} / {invoiceTermLabel(invoice)}</span>
                            <strong>{invoice.label || invoice.invoiceNumber || invoiceId}</strong>
                            <small>Due date: {formatDate(invoice.dueDate)}</small>
                          </div>
                          <div className="parent-invoice-amount">
                            <span>Balance</span>
                            <strong>{formatCurrency(invoiceDueAmount(invoice), paymentSummary.currency)}</strong>
                            <StatusBadge tone={generalStatusTone(invoice.status)}>{cleanLabel(invoice.status)}</StatusBadge>
                          </div>
                          <div className="parent-payment-panel compact">
                            <label>
                              <span>Provider</span>
                              <select
                                value={selectedProviderByInvoice[invoiceId] || paymentSummary.defaultProvider || "MOCK"}
                                onChange={(event) => setSelectedProviderByInvoice((prev) => ({ ...prev, [invoiceId]: event.target.value }))}
                              >
                                {(paymentSummary.providers || ["MOCK"]).map((provider) => (
                                  <option key={provider} value={provider}>{prettyProviderLabel(provider)}</option>
                                ))}
                              </select>
                            </label>
                            <button
                              type="button"
                              className="parent-primary-action"
                              onClick={() => payChildFee(invoiceId)}
                              disabled={payingInvoiceId === invoiceId}
                            >
                              {payingInvoiceId === invoiceId ? "Processing..." : "Pay This Term"}
                            </button>
                            {pendingReferenceByInvoice[invoiceId] ? (
                              <button
                                type="button"
                                className="parent-secondary-action"
                                onClick={() => verifyPending(invoiceId)}
                                disabled={verifyingReference === pendingReferenceByInvoice[invoiceId]}
                              >
                                {verifyingReference === pendingReferenceByInvoice[invoiceId] ? "Verifying..." : "Verify Payment"}
                              </button>
                            ) : null}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : selectedData.financeFee && Number(selectedData.financeFee.balance || 0) > 0 ? (
                  <EmptyState
                    title="Invoice not yet available online."
                    text="The current term balance is visible in the finance record. The Pay button will appear once the school raises or syncs an online invoice for this child."
                  />
                ) : (
                  <EmptyState
                    title="No payable invoice right now."
                    text="There are no unpaid online invoices available for this child at the moment."
                  />
                )}
              </section>

              <section id="parent-attendance" className="parent-dashboard-section">
                <SectionHeader kicker="Attendance" title="Attendance Snapshot" text="Present, absent, late, and excused records for this child." />
                <div className="parent-summary-grid compact">
                  <StatCard label="Present" value={selectedData.attendanceSummary?.present || 0} tone="green" />
                  <StatCard label="Absent" value={selectedData.attendanceSummary?.absent || 0} tone="red" />
                  <StatCard label="Late" value={selectedData.attendanceSummary?.late || 0} tone="amber" />
                  <StatCard label="Excused" value={selectedData.attendanceSummary?.excused || 0} />
                  <StatCard label="Rate" value={`${selectedData.attendanceSummary?.attendanceRate || 0}%`} tone="blue" />
                </div>
                <div className="parent-table-wrap">
                  <table className="parent-data-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Status</th>
                        <th>Remark</th>
                        <th>Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedChild.attendanceHistory || []).slice(0, 12).map((row, index) => (
                        <tr key={`${row.attendanceDate}-${row.status}-${index}`}>
                          <td>{formatDate(row.attendanceDate)}</td>
                          <td><StatusBadge tone={generalStatusTone(row.status)}>{cleanLabel(row.status)}</StatusBadge></td>
                          <td>{row.remark || "-"}</td>
                          <td>{row.reason || "-"}</td>
                        </tr>
                      ))}
                      {(selectedChild.attendanceHistory || []).length === 0 ? (
                        <tr>
                          <td colSpan={4}>
                            <EmptyState title="No attendance records yet." text="Attendance entries will appear here after the class teacher marks attendance." />
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </section>

              <section id="parent-homework" className="parent-dashboard-section">
                <SectionHeader kicker="Assignments" title="Homework & Assignments" text="Track pending, missed, submitted, and graded work." />
                <div className="parent-summary-grid compact">
                  <StatCard label="Pending" value={selectedData.homeworkSummary?.pendingTasks || 0} tone="amber" />
                  <StatCard label="Missed" value={selectedData.homeworkSummary?.overdue || selectedData.homeworkSummary?.missedTasks || 0} tone="red" />
                  <StatCard label="Graded" value={selectedData.homeworkSummary?.graded || selectedData.homeworkSummary?.recentlyGraded || 0} tone="green" />
                </div>
                <div className="parent-card-list">
                  {(selectedChild.homework || []).slice(0, 8).map((task) => (
                    <article key={task.id} className="parent-homework-card">
                      <div>
                        <span>{task.subject || "General"}</span>
                        <h3>{task.title}</h3>
                        <p>{task.dueDate ? `Due ${formatDateTime(task.dueDate)}` : "No due date set"}</p>
                      </div>
                      <div className="parent-homework-status">
                        <StatusBadge tone={generalStatusTone(task.submissionStatus || "not submitted")}>{cleanLabel(task.submissionStatus || "not submitted")}</StatusBadge>
                        {task.timelinessStatus ? <StatusBadge tone={generalStatusTone(task.timelinessStatus)}>{cleanLabel(task.timelinessStatus)}</StatusBadge> : null}
                      </div>
                    </article>
                  ))}
                  {(selectedChild.homework || []).length === 0 ? (
                    <EmptyState title="No homework posted yet." text="Homework and assignment cards will appear here once teachers publish them." />
                  ) : null}
                </div>
              </section>

              <section id="parent-results" className="parent-dashboard-section">
                <SectionHeader
                  kicker="Academics"
                  title="Results / Report Card"
                  text="Review recent scores, term summaries, and print the latest available report card."
                  action={
                    <div className="parent-report-actions">
                      <select
                        value={selectedPrintTermByChild[String(selectedChild.id)] || ""}
                        onChange={(event) => setSelectedPrintTermByChild((prev) => ({ ...prev, [String(selectedChild.id)]: event.target.value }))}
                      >
                        <option value="">Latest Available Report</option>
                        {selectedData.termOptions.map((item) => (
                          <option key={`${item.session}-${item.term}`} value={`${item.session}__${item.term}`}>
                            {item.term} - {item.session}
                          </option>
                        ))}
                      </select>
                      <button type="button" className="parent-secondary-action" onClick={() => printChildResult(selectedChild)}>
                        Print Child Report Card
                      </button>
                    </div>
                  }
                />

                <div className="parent-promotion-card">
                  <strong>Latest Promotion Decision</strong>
                  {selectedData.promotion ? (
                    <div className="parent-details-grid">
                      <div><span>Status</span><strong>{decisionLabel(selectedData.promotion.decisionStatus || selectedData.promotion.promotionStatus)}</strong></div>
                      <div><span>Session</span><strong>{selectedData.promotion.sessionName || selectedData.promotion.sessionId || "-"}</strong></div>
                      <div><span>Next Class</span><strong>{selectedData.promotion.nextClassName || "-"}</strong></div>
                      <div><span>Reason</span><strong>{selectedData.promotion.overrideReason || selectedData.promotion.decisionReason || "-"}</strong></div>
                    </div>
                  ) : (
                    <p>No finalized promotion decision yet.</p>
                  )}
                </div>

                {(selectedChild.summaries || []).length ? (
                  <div className="parent-summary-strip">
                    {(selectedChild.summaries || []).slice(0, 4).map((item) => (
                      <div key={`${item.session}-${item.term}`}>
                        <span>{item.session} - {item.term}</span>
                        <strong>Average {item.average}</strong>
                      </div>
                    ))}
                  </div>
                ) : null}

                <div className="parent-table-wrap">
                  <table className="parent-data-table">
                    <thead>
                      <tr>
                        <th>Session</th>
                        <th>Term</th>
                        <th>Subject</th>
                        <th>CA1</th>
                        <th>CA2</th>
                        <th>CA3</th>
                        <th>Exam</th>
                        <th>Total</th>
                        <th>Grade</th>
                        <th>Position</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedChild.recentResults || []).slice(0, 12).map((row, index) => {
                        const score = getResultScore(row);
                        return (
                          <tr key={row.id || [row.session, row.term, row.subject || row.subjectName, index].join("-")}>
                            <td>{row.session || "-"}</td>
                            <td>{row.term || "-"}</td>
                            <td>{row.subject || row.subjectName || "-"}</td>
                            <td>{getComponentScore(row, ["ca1", "CA1"])}</td>
                            <td>{getComponentScore(row, ["ca2", "CA2"])}</td>
                            <td>{getComponentScore(row, ["ca3", "CA3"])}</td>
                            <td>{getComponentScore(row, ["examScore", "exam", "exam_score"])}</td>
                            <td>{score !== null ? score : "-"}</td>
                            <td><StatusBadge tone="neutral">{row.grade || row.gradeLetter || "Pending"}</StatusBadge></td>
                            <td>{row.positionInSubject || row.subjectPosition || row.position || "-"}</td>
                          </tr>
                        );
                      })}
                      {(selectedChild.recentResults || []).length === 0 ? (
                        <tr>
                          <td colSpan={10}>
                            <EmptyState title="No results published yet." text="Recent results and report card data will appear once released by the school." />
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </section>

              <section id="parent-transport" className="parent-dashboard-section">
                <SectionHeader kicker="Transport" title="Child Transport" text="Open the dedicated transport page for driver, route, pickup, and dropoff details." />
                <div className="parent-transport-card">
                  <div>
                    <span>{selectedData.transportChild?.assignment ? "Active Transport Record" : "Transport Information"}</span>
                    <h3>{selectedData.transportChild?.assignment?.routeName || "Child transport dashboard"}</h3>
                    <p>
                      {selectedData.transportChild?.assignment
                        ? `${selectedData.transportChild.assignment.vehicleName || "Vehicle"} | ${selectedData.transportChild.assignment.driverName || "Driver not assigned"}`
                        : "Route, driver, and trip status will show on the transport page when assigned."}
                    </p>
                  </div>
                  <Link to="/portal/parent/transport" className="parent-primary-link">Open Transport</Link>
                </div>
              </section>

              <section id="parent-virtual-classroom" className="parent-dashboard-section">
                <SectionHeader kicker="Online Learning" title="Virtual Classroom" text="Monitor today's virtual classes, upcoming lessons, recordings, and alerts." />
                <div className="parent-summary-grid compact">
                  <StatCard label="Today" value={selectedData.virtualSummary.today} tone="blue" />
                  <StatCard label="Upcoming" value={selectedData.virtualSummary.upcoming} tone="green" />
                  <StatCard label="Recordings" value={selectedData.virtualSummary.recordings} />
                  <StatCard label="Alerts" value={selectedData.virtualSummary.alerts} tone="amber" />
                </div>
                <div className="parent-section-toolbar">
                  <Link to="/parent/lms/virtual-classes" className="parent-primary-link">Open Virtual Classroom</Link>
                </div>
                <div className="parent-card-list">
                  {selectedData.virtualClasses.slice(0, 4).map((row) => (
                    <article key={row.id} className="parent-update-card">
                      <div>
                        <h3>{row.title}</h3>
                        <p>{row.subjectName || "Virtual class"} | {row.className || selectedChild.className}</p>
                        <small>{formatVirtualClassSchedule(row)}</small>
                      </div>
                      <StatusBadge tone={generalStatusTone(row.status || "scheduled")}>{cleanLabel(row.status || "scheduled")}</StatusBadge>
                    </article>
                  ))}
                  {selectedData.virtualClasses.length === 0 ? (
                    <EmptyState title="No virtual classes scheduled today." text="Live classes and recordings will appear here when teachers publish them." />
                  ) : null}
                </div>
              </section>

              <section id="parent-updates" className="parent-dashboard-section">
                <SectionHeader kicker="Classroom" title="Daily Class Updates" text="Daily activities, announcements, and teacher-parent comments for this child." />

                {selectedData.virtualNotifications.length ? (
                  <div className="parent-card-list">
                    {selectedData.virtualNotifications.slice(0, 3).map((notice) => (
                      <article key={notice.id} className="parent-notice-card">
                        <strong>{notice.title}</strong>
                        <p>{notice.message}</p>
                      </article>
                    ))}
                  </div>
                ) : null}

                {selectedData.activities.length === 0 ? (
                  <EmptyState title="No class updates have been posted yet." text="Daily class notes and classroom activity updates will appear here." />
                ) : null}

                <div className="parent-card-list">
                  {selectedData.activities.map((activity) => (
                    <article key={activity.id} className="parent-activity-card">
                      <div className="parent-activity-main">
                        <div>
                          <span>{activity.activityDate || "Class update"}</span>
                          <h3>{activity.title}</h3>
                          <p>{activity.description}</p>
                          <small>
                            {[activity.subject, activity.studentName].filter(Boolean).join(" | ")}
                          </small>
                        </div>
                        {activity.imageUrl ? (
                          <img src={activity.imageUrl} alt="Activity" />
                        ) : null}
                      </div>

                      <div className="parent-comment-box">
                        <strong>Comments</strong>
                        {(activity.comments || []).length === 0 ? <p>No comments yet.</p> : null}
                        {(activity.comments || []).map((comment) => (
                          <p key={comment.id}>
                            <strong>{comment.authorName}:</strong> {comment.comment}
                          </p>
                        ))}
                        <div className="parent-comment-form">
                          <input
                            value={commentDrafts[activity.id] || ""}
                            onChange={(event) => setCommentDrafts((prev) => ({ ...prev, [activity.id]: event.target.value }))}
                            placeholder="Write a parent comment"
                          />
                          <button type="button" onClick={() => submitActivityComment(activity.id)}>Post Comment</button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            </main>
          </div>
        ) : null}
      </div>
    </div>
  );
}
