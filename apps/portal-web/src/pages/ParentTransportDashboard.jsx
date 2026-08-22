import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getParentTransportOverview } from "../api/services";

const shellStyle = {
  minHeight: "100vh",
  background: "linear-gradient(180deg, #f5f7fb 0%, #eef3fa 100%)",
  padding: 20,
};

const panelStyle = {
  background: "#ffffff",
  border: "1px solid #d9e3f2",
  borderRadius: 18,
  boxShadow: "0 20px 50px rgba(17, 38, 73, 0.08)",
  padding: 20,
};

const cardStyle = {
  background: "#fff",
  border: "1px solid #dbe5f1",
  borderRadius: 16,
  padding: 16,
  boxShadow: "0 10px 24px rgba(17, 38, 73, 0.06)",
};

function formatDateTime(value) {
  const safe = String(value || "").trim();
  if (!safe) return "-";
  const date = new Date(safe);
  if (Number.isNaN(date.getTime())) return safe;
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function badgeStyle(background, color = "#173153") {
  return {
    display: "inline-flex",
    alignItems: "center",
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
    background,
    color,
  };
}

function statusBadge(status) {
  const key = String(status || "").toLowerCase();
  if (["active", "picked", "dropped"].includes(key)) return badgeStyle("#dcfce7", "#166534");
  if (["open", "delay", "reviewed", "medium"].includes(key)) return badgeStyle("#fef3c7", "#92400e");
  if (["critical", "high", "missed", "absent", "inactive"].includes(key)) return badgeStyle("#fee2e2", "#991b1b");
  return badgeStyle("#e2e8f0", "#334155");
}

function SummaryCard({ label, value, hint }) {
  return (
    <div style={cardStyle}>
      <div style={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", color: "#6b7280", marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 30, fontWeight: 800, color: "#163a70" }}>{value}</div>
      <div style={{ marginTop: 8, color: "#52607a", fontSize: 13 }}>{hint}</div>
    </div>
  );
}

function SectionTitle({ title, text }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <h3 style={{ margin: 0, color: "#163a70" }}>{title}</h3>
      {text ? <p style={{ margin: "6px 0 0", color: "#52607a" }}>{text}</p> : null}
    </div>
  );
}

export default function ParentTransportDashboard() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [overview, setOverview] = useState({ summary: {}, children: [] });

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await getParentTransportOverview();
        setOverview(res.data || { summary: {}, children: [] });
      } catch (err) {
        setError(err?.response?.data?.message || err?.message || "Failed to load child transport information.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const summaryCards = useMemo(() => [
    ["Children With Transport", overview.summary?.childrenWithTransport || 0, "Children currently assigned to a bus route"],
    ["Active Routes", overview.summary?.activeRoutes || 0, "Route coverage across your linked children"],
    ["Open Alerts", overview.summary?.openAlerts || 0, "Transport updates that may need attention"],
  ], [overview]);

  const totalHistory = (overview.children || []).reduce((sum, child) => sum + (child.recentHistory || []).length, 0);

  return (
    <div style={shellStyle}>
      <div style={{ maxWidth: 1260, margin: "0 auto" }}>
        <div style={{ ...panelStyle, marginBottom: 18, background: "linear-gradient(135deg, #163a70 0%, #244c88 70%, #c79a2b 180%)", color: "#fff" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <div>
              <div style={{ letterSpacing: "0.12em", textTransform: "uppercase", fontSize: 12, opacity: 0.85 }}>Angel Montessori School</div>
              <h1 style={{ margin: "10px 0 6px", fontSize: 34 }}>Child Transport</h1>
              <p style={{ margin: 0, maxWidth: 760, color: "rgba(255,255,255,0.86)" }}>
                Track your child&apos;s bus assignment, pickup and dropoff history, driver contact details, and transport alerts from one Angel Montessori parent view.
              </p>
            </div>
            <div style={{ display: "grid", gap: 8, minWidth: 260 }}>
              <div style={{ background: "rgba(255,255,255,0.14)", borderRadius: 14, padding: 14 }}>
                <div style={{ fontSize: 12, opacity: 0.8 }}>Recent Trip Records</div>
                <div style={{ fontSize: 28, fontWeight: 800 }}>{totalHistory}</div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <Link to="/portal/parent" style={{ textDecoration: "none", background: "#fff", color: "#163a70", padding: "10px 14px", borderRadius: 12, fontWeight: 700 }}>Back to Parent Portal</Link>
              </div>
            </div>
          </div>
        </div>

        {error ? <div style={{ ...panelStyle, marginBottom: 16, borderColor: "#fecaca", color: "#991b1b" }}>{error}</div> : null}
        {loading ? <div style={{ ...panelStyle, marginBottom: 16 }}>Loading child transport information...</div> : null}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginBottom: 18 }}>
          {summaryCards.map(([label, value, hint]) => (
            <SummaryCard key={label} label={label} value={value} hint={hint} />
          ))}
        </div>

        {(overview.children || []).map((child) => (
          <div key={child.studentId} style={{ ...panelStyle, marginBottom: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
              <div>
                <div style={{ letterSpacing: "0.08em", textTransform: "uppercase", fontSize: 12, color: "#6b7280", marginBottom: 8 }}>Child Transport Record</div>
                <h2 style={{ margin: 0, color: "#163a70" }}>{child.studentName}</h2>
                <p style={{ margin: "6px 0 0", color: "#52607a" }}>{child.className}</p>
              </div>
              {child.assignment ? <span style={statusBadge(child.assignment.status)}>{child.assignment.status}</span> : <span style={statusBadge("inactive")}>No active transport</span>}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1.15fr 1fr", gap: 18, alignItems: "start" }}>
              <div>
                <SectionTitle title="Assignment Overview" text="Current route, stop, and driver information for this child." />
                {child.assignment ? (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginBottom: 18 }}>
                    <div style={cardStyle}><strong>Vehicle</strong><div style={{ marginTop: 8 }}>{child.assignment.vehicleName || "-"}</div></div>
                    <div style={cardStyle}><strong>Route</strong><div style={{ marginTop: 8 }}>{child.assignment.routeName || "-"}</div></div>
                    <div style={cardStyle}><strong>Stop</strong><div style={{ marginTop: 8 }}>{child.assignment.stopName || "-"}</div></div>
                    <div style={cardStyle}><strong>Pickup / Dropoff</strong><div style={{ marginTop: 8 }}>{child.assignment.pickupTime || "-"} / {child.assignment.dropoffTime || "-"}</div></div>
                    <div style={cardStyle}><strong>Driver</strong><div style={{ marginTop: 8 }}>{child.assignment.driverName || "-"}</div><div style={{ color: "#52607a", marginTop: 4 }}>{child.assignment.driverPhone || "No driver phone yet"}</div></div>
                    <div style={cardStyle}><strong>Direction</strong><div style={{ marginTop: 8 }}>{String(child.assignment.direction || "-").replace(/_/g, " ")}</div></div>
                  </div>
                ) : (
                  <div style={cardStyle}>
                    <p style={{ margin: 0, color: "#52607a" }}>No active transport assignment is configured for this child yet.</p>
                  </div>
                )}

                <SectionTitle title="Recent History" text="Latest pickup and dropoff records for this child." />
                {(child.recentHistory || []).length === 0 ? <div style={cardStyle}><p style={{ margin: 0, color: "#52607a" }}>No recent pickup or dropoff records yet.</p></div> : null}
                {(child.recentHistory || []).map((row) => (
                  <div key={row.id} style={{ ...cardStyle, marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                      <strong>{row.routeName || "Transport trip"}</strong>
                      <span>{formatDateTime(row.tripDate)}</span>
                    </div>
                    <div style={{ marginTop: 8, color: "#52607a" }}>{row.stopName || "Route stop"}</div>
                    <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                      <span style={statusBadge(row.pickupStatus)}>{row.pickupStatus}</span>
                      <span style={statusBadge(row.dropoffStatus)}>{row.dropoffStatus}</span>
                    </div>
                    {row.remark ? <div style={{ marginTop: 8, color: "#52607a" }}>{row.remark}</div> : null}
                  </div>
                ))}
              </div>

              <div>
                <SectionTitle title="Transport Alerts" text="Active notifications related to this child&apos;s route or trip status." />
                {(child.notifications || []).length === 0 ? <div style={cardStyle}><p style={{ margin: 0, color: "#52607a" }}>No current transport alerts for this child.</p></div> : null}
                {(child.notifications || []).map((row) => (
                  <div key={row.id} style={{ ...cardStyle, marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                      <span style={statusBadge(row.severity)}>{row.severity}</span>
                      <span>{formatDateTime(row.reportedAt)}</span>
                    </div>
                    <div style={{ marginTop: 8, fontWeight: 700, color: "#163a70" }}>{String(row.title || row.type || "Transport update").replace(/_/g, " ")}</div>
                    <div style={{ marginTop: 6, color: "#52607a" }}>{row.message}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

