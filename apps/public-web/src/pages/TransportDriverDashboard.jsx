import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import DomainAwareLink from "../components/DomainAwareLink";
import {
  completeDriverTransportTrip,
  createDriverTransportIncident,
  getDriverTransportTripDetail,
  getDriverTransportTrips,
  getTransportDriverOverview,
  updateDriverTransportTripStudentLog,
} from "../api/services";

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

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #cdd9eb",
  fontSize: 14,
  boxSizing: "border-box",
};

function formatDate(value) {
  const safe = String(value || "").trim();
  if (!safe) return "-";
  const date = new Date(safe);
  if (Number.isNaN(date.getTime())) return safe;
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

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
  if (["active", "completed", "picked", "dropped"].includes(key)) return badgeStyle("#dcfce7", "#166534");
  if (["maintenance", "delayed", "partial", "reviewed", "due", "in_progress"].includes(key)) return badgeStyle("#fef3c7", "#92400e");
  if (["open", "overdue", "cancelled", "suspended", "retired", "removed", "missed", "absent", "not_boarded", "not_dropped"].includes(key)) return badgeStyle("#fee2e2", "#991b1b");
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

export default function TransportDriverDashboard() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [overview, setOverview] = useState({ driver: null, summary: {}, todayTrips: [], routes: [], incidents: [] });
  const [trips, setTrips] = useState([]);
  const [selectedTripId, setSelectedTripId] = useState("");
  const [tripDetail, setTripDetail] = useState(null);
  const [tripDrafts, setTripDrafts] = useState({});
  const [incidentForm, setIncidentForm] = useState({ tripLogId: "", routeId: "", incidentType: "delay", severity: "medium", description: "" });

  const routeOptions = overview.routes || [];

  const loadPage = async () => {
    try {
      setLoading(true);
      setError("");
      const [overviewRes, tripsRes] = await Promise.all([
        getTransportDriverOverview(),
        getDriverTransportTrips(),
      ]);
      setOverview(overviewRes.data || { driver: null, summary: {}, todayTrips: [], routes: [], incidents: [] });
      setTrips(Array.isArray(tripsRes.data?.trips) ? tripsRes.data.trips : []);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Failed to load driver transport dashboard.");
    } finally {
      setLoading(false);
    }
  };

  const loadTripDetail = async (tripId) => {
    if (!tripId) {
      setTripDetail(null);
      return;
    }
    try {
      const res = await getDriverTransportTripDetail(tripId);
      const detail = res.data?.trip || null;
      setTripDetail(detail);
      const drafts = {};
      for (const row of detail?.studentLogs || []) {
        drafts[String(row.studentId)] = {
          pickupStatus: row.pickupStatus,
          dropoffStatus: row.dropoffStatus,
          remark: row.remark,
        };
      }
      setTripDrafts(drafts);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load trip detail.");
    }
  };

  useEffect(() => {
    loadPage();
  }, []);

  useEffect(() => {
    if (selectedTripId) loadTripDetail(selectedTripId);
  }, [selectedTripId]);

  const summaryCards = useMemo(() => [
    ["Assigned Routes", overview.summary?.assignedRoutes || 0, "Routes linked to your driver profile"],
    ["Trips Today", overview.summary?.tripsToday || 0, "All trips scheduled for today"],
    ["Active Trips", overview.summary?.activeTrips || 0, "Trips still in progress or pending"],
    ["Open Incidents", overview.summary?.openIncidents || 0, "Incidents still awaiting review"],
  ], [overview]);

  const runAction = async (key, action, successMessage) => {
    try {
      setSaving(key);
      setError("");
      setMessage("");
      await action();
      setMessage(successMessage);
      await loadPage();
      if (selectedTripId) await loadTripDetail(selectedTripId);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Action failed.");
    } finally {
      setSaving("");
    }
  };

  return (
    <div style={shellStyle}>
      <div style={{ maxWidth: 1320, margin: "0 auto" }}>
        <div style={{ ...panelStyle, marginBottom: 18, background: "linear-gradient(135deg, #163a70 0%, #244c88 70%, #c79a2b 180%)", color: "#fff" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <div>
              <div style={{ letterSpacing: "0.12em", textTransform: "uppercase", fontSize: 12, opacity: 0.85 }}>Angel Montessori School</div>
              <h1 style={{ margin: "10px 0 6px", fontSize: 34 }}>Driver Trip Console</h1>
              <p style={{ margin: 0, maxWidth: 760, color: "rgba(255,255,255,0.86)" }}>
                View your assigned routes, update pickup and dropoff logs, complete trips, and report transport incidents from one focused driver workspace.
              </p>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 14, opacity: 0.9 }}>Signed in driver</div>
              <div style={{ fontSize: 24, fontWeight: 800 }}>{overview.driver?.driverName || "-"}</div>
              <div style={{ opacity: 0.86 }}>{overview.driver?.phone || overview.driver?.linkedUserName || "Transport team"}</div>
            </div>
          </div>
          <div style={{ marginTop: 14 }}>
            <DomainAwareLink to="/portal" style={{ textDecoration: "none", background: "#fff", color: "#163a70", padding: "10px 14px", borderRadius: 12, fontWeight: 700 }}>Portal Home</DomainAwareLink>
          </div>
        </div>

        {error ? <div style={{ ...panelStyle, marginBottom: 16, borderColor: "#fecaca", color: "#991b1b" }}>{error}</div> : null}
        {message ? <div style={{ ...panelStyle, marginBottom: 16, borderColor: "#bbf7d0", color: "#166534" }}>{message}</div> : null}
        {loading ? <div style={{ ...panelStyle, marginBottom: 16 }}>Loading driver transport dashboard...</div> : null}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginBottom: 18 }}>
          {summaryCards.map(([label, value, hint]) => (
            <SummaryCard key={label} label={label} value={value} hint={hint} />
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1.4fr", gap: 18, alignItems: "start" }}>
          <div style={panelStyle}>
            <h3 style={{ marginTop: 0, color: "#163a70" }}>Today&apos;s Trips</h3>
            {(overview.todayTrips || []).length === 0 ? <p style={{ color: "#52607a" }}>No trips assigned for today yet.</p> : null}
            {(overview.todayTrips || []).map((trip) => (
              <button
                key={trip.id}
                onClick={() => setSelectedTripId(trip.id)}
                style={{
                  ...cardStyle,
                  width: "100%",
                  textAlign: "left",
                  cursor: "pointer",
                  marginBottom: 10,
                  borderColor: String(selectedTripId) === String(trip.id) ? "#c79a2b" : "#dbe5f1",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <strong>{trip.routeName}</strong>
                  <span style={statusBadge(trip.status)}>{trip.status}</span>
                </div>
                <div style={{ marginTop: 8, color: "#52607a" }}>{formatDate(trip.tripDate)} • {String(trip.tripType || "").replace(/_/g, " ")}</div>
                <div style={{ marginTop: 6, color: "#52607a" }}>{trip.studentCount || 0} students • {trip.vehicleName || "No vehicle"}</div>
              </button>
            ))}

            <h3 style={{ marginTop: 22, color: "#163a70" }}>Log Incident</h3>
            <div style={{ display: "grid", gap: 10 }}>
              <select style={inputStyle} value={incidentForm.tripLogId} onChange={(e) => setIncidentForm((prev) => ({ ...prev, tripLogId: e.target.value, routeId: prev.routeId || (trips.find((row) => String(row.id) === String(e.target.value))?.routeId || "") }))}>
                <option value="">Select trip (optional)</option>
                {trips.map((trip) => <option key={trip.id} value={trip.id}>{trip.routeName} • {formatDate(trip.tripDate)}</option>)}
              </select>
              <select style={inputStyle} value={incidentForm.routeId} onChange={(e) => setIncidentForm((prev) => ({ ...prev, routeId: e.target.value }))}>
                <option value="">Select route</option>
                {routeOptions.map((route) => <option key={route.id} value={route.id}>{route.routeName}</option>)}
              </select>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <select style={inputStyle} value={incidentForm.incidentType} onChange={(e) => setIncidentForm((prev) => ({ ...prev, incidentType: e.target.value }))}>
                  <option value="delay">Delay</option>
                  <option value="vehicle_fault">Vehicle Fault</option>
                  <option value="no_show">No Show</option>
                  <option value="route_change">Route Change</option>
                  <option value="student_issue">Student Issue</option>
                  <option value="accident">Accident</option>
                </select>
                <select style={inputStyle} value={incidentForm.severity} onChange={(e) => setIncidentForm((prev) => ({ ...prev, severity: e.target.value }))}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <textarea style={{ ...inputStyle, minHeight: 96 }} placeholder="Describe the incident" value={incidentForm.description} onChange={(e) => setIncidentForm((prev) => ({ ...prev, description: e.target.value }))} />
              <button onClick={() => runAction("driver-incident", () => createDriverTransportIncident(incidentForm), "Transport incident logged successfully.")} disabled={saving === "driver-incident"}>Save Incident</button>
            </div>
          </div>

          <div style={panelStyle}>
            <h3 style={{ marginTop: 0, color: "#163a70" }}>Trip Detail</h3>
            {!tripDetail ? <p style={{ color: "#52607a" }}>Select a trip to update student pickup and dropoff records.</p> : (
              <>
                <div style={{ ...cardStyle, marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <strong>{tripDetail.routeName}</strong>
                    <span style={statusBadge(tripDetail.status)}>{tripDetail.status}</span>
                  </div>
                  <div style={{ marginTop: 8, color: "#52607a" }}>{formatDate(tripDetail.tripDate)} • {String(tripDetail.tripType || "").replace(/_/g, " ")}</div>
                  <div style={{ marginTop: 6, color: "#52607a" }}>Started: {formatDateTime(tripDetail.actualStartTime || tripDetail.scheduledStartTime)}</div>
                </div>

                <div style={{ display: "grid", gap: 10 }}>
                  {(tripDetail.studentLogs || []).map((row) => {
                    const draft = tripDrafts[String(row.studentId)] || { pickupStatus: row.pickupStatus, dropoffStatus: row.dropoffStatus, remark: row.remark };
                    return (
                      <div key={row.id} style={cardStyle}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                          <strong>{row.studentName}</strong>
                          <span style={statusBadge(row.pickupStatus === "not_applicable" ? row.dropoffStatus : row.pickupStatus)}>{row.stopName}</span>
                        </div>
                        <div style={{ color: "#52607a", margin: "4px 0 10px" }}>{row.className}</div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                          <select style={inputStyle} value={draft.pickupStatus} onChange={(e) => setTripDrafts((prev) => ({ ...prev, [row.studentId]: { ...draft, pickupStatus: e.target.value } }))}>
                            {['picked', 'absent', 'missed', 'not_boarded', 'not_applicable'].map((item) => <option key={item} value={item}>{item}</option>)}
                          </select>
                          <select style={inputStyle} value={draft.dropoffStatus} onChange={(e) => setTripDrafts((prev) => ({ ...prev, [row.studentId]: { ...draft, dropoffStatus: e.target.value } }))}>
                            {['dropped', 'missed', 'not_dropped', 'not_applicable'].map((item) => <option key={item} value={item}>{item}</option>)}
                          </select>
                        </div>
                        <textarea style={{ ...inputStyle, minHeight: 72, marginBottom: 8 }} placeholder="Remark" value={draft.remark || ""} onChange={(e) => setTripDrafts((prev) => ({ ...prev, [row.studentId]: { ...draft, remark: e.target.value } }))} />
                        <button onClick={() => runAction(`trip-${row.id}`, () => updateDriverTransportTripStudentLog(tripDetail.id, row.studentId, draft), `Updated ${row.studentName}.`)} disabled={saving === `trip-${row.id}`}>Save Student Log</button>
                      </div>
                    );
                  })}
                </div>

                <div style={{ marginTop: 14 }}>
                  <button onClick={() => runAction("complete-driver-trip", () => completeDriverTransportTrip(tripDetail.id, {}), "Trip completed successfully.")} disabled={saving === "complete-driver-trip"}>Complete Trip</button>
                </div>
              </>
            )}

            <h3 style={{ marginTop: 24, color: "#163a70" }}>Recent Incidents</h3>
            {(overview.incidents || []).length === 0 ? <p style={{ color: "#52607a" }}>No incidents logged for your routes yet.</p> : null}
            {(overview.incidents || []).map((row) => (
              <div key={row.id} style={{ ...cardStyle, marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <strong>{row.routeName || "Route incident"}</strong>
                  <span style={statusBadge(row.status)}>{row.status}</span>
                </div>
                <div style={{ marginTop: 6, color: "#52607a" }}>{String(row.incidentType || "").replace(/_/g, " ")} • {formatDateTime(row.reportedAt)}</div>
                <div style={{ marginTop: 8 }}>{row.description || "No description provided."}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}


