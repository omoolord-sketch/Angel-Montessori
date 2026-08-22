import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  exportAdminDonations,
  getAdminDonationDetail,
  getAdminDonations,
  updateAdminDonationNote,
} from "../api/services";

const cardStyle = {
  border: "1px solid #dbe5f1",
  borderRadius: 12,
  padding: 16,
  background: "#ffffff",
  boxShadow: "0 18px 45px rgba(15, 35, 60, 0.06)",
};

const defaultFilters = {
  status: "ALL",
  campaign: "",
  provider: "",
  search: "",
  from: "",
  to: "",
};

function cleanParams(filters) {
  const out = {};
  for (const [key, value] of Object.entries(filters || {})) {
    if (value === undefined || value === null) continue;
    const safe = String(value).trim();
    if (!safe || safe === "ALL") continue;
    out[key] = safe;
  }
  return out;
}

function formatCurrency(amount, currency = "NGN") {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));
}

function formatDateTime(value) {
  const safe = String(value || "").trim();
  if (!safe) return "-";
  const date = new Date(safe);
  if (Number.isNaN(date.getTime())) return safe;
  return date.toLocaleString("en-GB");
}

function InfoCard({ label, value, note }) {
  return (
    <div style={cardStyle}>
      <div style={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", color: "#7a8798" }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: "#17325c", marginTop: 8 }}>{value}</div>
      {note ? <div style={{ marginTop: 8, color: "#4f6279" }}>{note}</div> : null}
    </div>
  );
}

export default function DonationsDashboard() {
  const [filters, setFilters] = useState(defaultFilters);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [overview, setOverview] = useState(null);
  const [records, setRecords] = useState([]);
  const [campaignOptions, setCampaignOptions] = useState([]);
  const [providerOptions, setProviderOptions] = useState([]);
  const [statusOptions, setStatusOptions] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [detail, setDetail] = useState(null);
  const [noteDraft, setNoteDraft] = useState("");

  const currency = overview?.currency || "NGN";

  const loadDashboard = async (nextFilters = filters, nextSelectedId = selectedId) => {
    try {
      setLoading(true);
      setError("");

      const res = await getAdminDonations(cleanParams(nextFilters));
      const data = res?.data || {};
      const nextRecords = Array.isArray(data.records) ? data.records : [];
      const activeId = nextSelectedId || nextRecords[0]?.id || "";

      setOverview(data.overview || null);
      setRecords(nextRecords);
      setCampaignOptions(Array.isArray(data.campaignOptions) ? data.campaignOptions : []);
      setProviderOptions(Array.isArray(data.providerOptions) ? data.providerOptions : []);
      setStatusOptions(Array.isArray(data.statusOptions) ? data.statusOptions : []);
      setSelectedId(activeId);

      if (activeId) {
        const detailRes = await getAdminDonationDetail(activeId);
        const detailData = detailRes?.data || null;
        setDetail(detailData);
        setNoteDraft(detailData?.donation?.adminNote || "");
      } else {
        setDetail(null);
        setNoteDraft("");
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load donations dashboard");
    } finally {
      setLoading(false);
    }
  };

  const loadDetail = async (donationId) => {
    if (!donationId) {
      setDetail(null);
      setNoteDraft("");
      return;
    }

    try {
      setBusy("detail");
      const res = await getAdminDonationDetail(donationId);
      const data = res?.data || null;
      setDetail(data);
      setNoteDraft(data?.donation?.adminNote || "");
      setSelectedId(donationId);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load donation detail");
    } finally {
      setBusy("");
    }
  };

  useEffect(() => {
    loadDashboard(defaultFilters, "");
  }, []);

  const applyFilters = async () => {
    await loadDashboard(filters, "");
  };

  const resetFilters = async () => {
    setFilters(defaultFilters);
    await loadDashboard(defaultFilters, "");
  };

  const downloadExport = async () => {
    try {
      setBusy("export");
      setError("");
      const res = await exportAdminDonations(cleanParams(filters));
      const blob = new Blob([res.data], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `donations-export-${Date.now()}.csv`;
      anchor.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to export donations");
    } finally {
      setBusy("");
    }
  };

  const saveNote = async () => {
    if (!selectedId) return;
    try {
      setBusy("note");
      setError("");
      setMessage("");
      await updateAdminDonationNote(selectedId, { adminNote: noteDraft });
      setMessage("Donation note updated.");
      await loadDetail(selectedId);
      await loadDashboard(filters, selectedId);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to update donation note");
    } finally {
      setBusy("");
    }
  };

  const breakdown = Array.isArray(overview?.campaignBreakdown) ? overview.campaignBreakdown : [];

  return (
    <div style={{ padding: 20, display: "grid", gap: 16 }}>
      <section style={{ ...cardStyle, display: "flex", justifyContent: "space-between", gap: 16, alignItems: "start" }}>
        <div>
          <div style={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", color: "#7a8798" }}>
            Angel Montessori School
          </div>
          <h1 style={{ margin: "8px 0 10px", color: "#17325c" }}>Donations Desk</h1>
          <p style={{ margin: 0, color: "#4f6279", maxWidth: 720 }}>
            Track verified donations, donor history, campaign performance, payment status, and reconciliation notes from one
            school management desk.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link to="/portal" style={{ ...buttonStyle("secondary") }}>Portal Home</Link>
          <button type="button" onClick={downloadExport} style={buttonStyle("primary")} disabled={busy === "export"}>
            {busy === "export" ? "Exporting..." : "Export CSV"}
          </button>
        </div>
      </section>

      {error ? <div style={{ ...cardStyle, borderColor: "#f1b0b7", color: "#8a1c2d" }}>{error}</div> : null}
      {message ? <div style={{ ...cardStyle, borderColor: "#bedec5", color: "#1b6b2a" }}>{message}</div> : null}
      {loading ? <div style={cardStyle}>Loading donations...</div> : null}

      {!loading ? (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12 }}>
            <InfoCard label="Total Raised" value={formatCurrency(overview?.totalRaised, currency)} note="Verified successful donations" />
            <InfoCard label="This Month" value={formatCurrency(overview?.monthRaised, currency)} note="Current month support" />
            <InfoCard label="Pending" value={Number(overview?.pendingCount || 0)} note="Awaiting verification" />
            <InfoCard label="Failed" value={Number(overview?.failedCount || 0)} note="Needs follow-up or retry" />
            <InfoCard label="Donors" value={Number(overview?.donorCount || 0)} note="Distinct verified supporters" />
          </div>

          <section style={{ ...cardStyle, display: "grid", gap: 12 }}>
            <h2 style={{ margin: 0, color: "#17325c" }}>Filters</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
              <select value={filters.status} onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}>
                <option value="ALL">All Statuses</option>
                {statusOptions.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>

              <select value={filters.campaign} onChange={(event) => setFilters((prev) => ({ ...prev, campaign: event.target.value }))}>
                <option value="">All Campaigns</option>
                {campaignOptions.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>

              <select value={filters.provider} onChange={(event) => setFilters((prev) => ({ ...prev, provider: event.target.value }))}>
                <option value="">All Providers</option>
                {providerOptions.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>

              <input
                placeholder="Search donor, reference, email"
                value={filters.search}
                onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
              />
              <input type="date" value={filters.from} onChange={(event) => setFilters((prev) => ({ ...prev, from: event.target.value }))} />
              <input type="date" value={filters.to} onChange={(event) => setFilters((prev) => ({ ...prev, to: event.target.value }))} />
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button type="button" onClick={applyFilters} style={buttonStyle("primary")}>Apply Filters</button>
              <button type="button" onClick={resetFilters} style={buttonStyle("secondary")}>Reset Filters</button>
            </div>
          </section>

          <section style={{ display: "grid", gridTemplateColumns: "1.8fr 1fr", gap: 16, alignItems: "start" }}>
            <div style={{ ...cardStyle, overflowX: "auto" }}>
              <h2 style={{ marginTop: 0, color: "#17325c" }}>Donor Records</h2>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 960 }}>
                <thead>
                  <tr>
                    {["Donor", "Campaign", "Reference", "Status", "Amount", "Provider", "Created", "Paid"].map((heading) => (
                      <th key={heading} style={tableHeadStyle}>{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {records.length ? (
                    records.map((row) => (
                      <tr
                        key={row.id}
                        onClick={() => loadDetail(row.id)}
                        style={{
                          background: String(row.id) === String(selectedId) ? "#eef4ff" : "#fff",
                          cursor: "pointer",
                        }}
                      >
                        <td style={tableCellStyle}>
                          <strong>{row.donorName}</strong>
                          <div style={{ color: "#62748a", marginTop: 4 }}>{row.email || row.phone || "-"}</div>
                        </td>
                        <td style={tableCellStyle}>{row.campaignLabel}</td>
                        <td style={tableCellStyle}>{row.paymentReference}</td>
                        <td style={tableCellStyle}>
                          <span style={pillStyle(row.status)}>{row.status}</span>
                        </td>
                        <td style={tableCellStyle}>{formatCurrency(row.amount, row.currency || currency)}</td>
                        <td style={tableCellStyle}>{row.provider}</td>
                        <td style={tableCellStyle}>{formatDateTime(row.createdAt)}</td>
                        <td style={tableCellStyle}>{formatDateTime(row.paidAt)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} style={{ ...tableCellStyle, textAlign: "center", color: "#62748a" }}>
                        No donations match the current filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ display: "grid", gap: 16 }}>
              <section style={cardStyle}>
                <h2 style={{ marginTop: 0, color: "#17325c" }}>Campaign Performance</h2>
                {breakdown.length ? (
                  <div style={{ display: "grid", gap: 12 }}>
                    {breakdown.map((item) => (
                      <div key={item.id} style={{ borderLeft: `4px solid ${item.accent || "#1c4d8c"}`, paddingLeft: 12 }}>
                        <strong>{item.name}</strong>
                        <div style={{ marginTop: 4 }}>{formatCurrency(item.totalRaised, currency)}</div>
                        <div style={{ marginTop: 4, color: "#62748a" }}>{item.donationCount} verified donations</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ margin: 0, color: "#62748a" }}>Campaign summaries will appear here once donations are recorded.</p>
                )}
              </section>

              <section style={cardStyle}>
                <h2 style={{ marginTop: 0, color: "#17325c" }}>Donation Detail</h2>
                {detail?.donation ? (
                  <div style={{ display: "grid", gap: 12 }}>
                    <div>
                      <strong>{detail.donation.donorName}</strong>
                      <div style={{ color: "#62748a", marginTop: 4 }}>{detail.donation.email || detail.donation.phone || "-"}</div>
                    </div>
                    <div><strong>Campaign:</strong> {detail.donation.campaignLabel}</div>
                    <div><strong>Reference:</strong> {detail.donation.paymentReference}</div>
                    <div><strong>Status:</strong> <span style={pillStyle(detail.donation.status)}>{detail.donation.status}</span></div>
                    <div><strong>Amount:</strong> {formatCurrency(detail.donation.amount, detail.donation.currency || currency)}</div>
                    <div><strong>Receipt Email:</strong> {detail.donation.thankYouEmailStatus || "pending"}</div>
                    <div><strong>Message:</strong> {detail.donation.message || "-"}</div>

                    <label style={{ display: "grid", gap: 8 }}>
                      <strong>Manual Reconciliation Note</strong>
                      <textarea
                        rows="4"
                        value={noteDraft}
                        onChange={(event) => setNoteDraft(event.target.value)}
                        placeholder="Add internal finance or reconciliation note"
                      />
                    </label>

                    <button type="button" onClick={saveNote} style={buttonStyle("primary")} disabled={busy === "note"}>
                      {busy === "note" ? "Saving..." : "Save Note"}
                    </button>

                    <div>
                      <strong>Related Donor History</strong>
                      <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
                        {(detail.donorHistory || []).slice(0, 4).map((item) => (
                          <div key={item.id} style={{ border: "1px solid #e3ebf5", borderRadius: 10, padding: 10 }}>
                            <div>{item.paymentReference}</div>
                            <div style={{ color: "#62748a", marginTop: 4 }}>
                              {formatCurrency(item.amount, item.currency || currency)} • {item.status}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <strong>Recent Logs</strong>
                      <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
                        {[...(detail.logs?.audit || []).slice(0, 3), ...(detail.logs?.email || []).slice(0, 2)].map((item) => (
                          <div key={item.id} style={{ border: "1px solid #e3ebf5", borderRadius: 10, padding: 10 }}>
                            <div style={{ fontWeight: 600 }}>{item.action || item.deliveryStatus}</div>
                            <div style={{ color: "#62748a", marginTop: 4 }}>{item.notes || item.subject || item.errorMessage || "-"}</div>
                            <div style={{ color: "#8a98a8", marginTop: 4 }}>{formatDateTime(item.createdAt)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p style={{ margin: 0, color: "#62748a" }}>
                    Select a donation row to review donor history, webhook/email activity, and reconciliation notes.
                  </p>
                )}
              </section>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}

function buttonStyle(tone) {
  if (tone === "secondary") {
    return {
      padding: "10px 16px",
      borderRadius: 999,
      border: "1px solid #c8d7ea",
      background: "#fff",
      color: "#17325c",
      textDecoration: "none",
      cursor: "pointer",
      fontWeight: 600,
    };
  }

  return {
    padding: "10px 16px",
    borderRadius: 999,
    border: "1px solid #1c4d8c",
    background: "#1c4d8c",
    color: "#fff",
    textDecoration: "none",
    cursor: "pointer",
    fontWeight: 600,
  };
}

function pillStyle(status) {
  const safe = String(status || "").toUpperCase();
  const map = {
    SUCCESS: { background: "#e8f6ec", color: "#1b6b2a" },
    PENDING: { background: "#fff5de", color: "#8f5f05" },
    FAILED: { background: "#fdecef", color: "#9f1d35" },
  };
  const tone = map[safe] || { background: "#eef2f6", color: "#506174" };
  return {
    display: "inline-flex",
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
    ...tone,
  };
}

const tableHeadStyle = {
  borderBottom: "1px solid #d8e2ef",
  padding: 10,
  textAlign: "left",
  background: "#f8fbff",
  color: "#43556d",
};

const tableCellStyle = {
  borderBottom: "1px solid #e6edf5",
  padding: 10,
  verticalAlign: "top",
};
