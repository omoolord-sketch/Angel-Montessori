import { useEffect, useMemo, useState } from "react";
import {
  completeTransportTrip,
  createTransportAssignment,
  createTransportDriver,
  createTransportFee,
  createTransportIncident,
  createTransportMaintenance,
  createTransportRoute,
  createTransportStop,
  createTransportVehicle,
  getTransportAssignments,
  getTransportDashboard,
  getTransportDrivers,
  getTransportFees,
  getTransportIncidents,
  getTransportMaintenance,
  getTransportReports,
  getTransportRouteDetail,
  getTransportRoutes,
  getTransportSetup,
  getTransportTripDetail,
  getTransportTrips,
  getTransportVehicles,
  startTransportTrip,
  updateTransportAssignment,
  updateTransportIncident,
  updateTransportTripStudentLog,
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

const tabList = [
  ["overview", "Overview"],
  ["vehicles", "Vehicles"],
  ["drivers", "Drivers"],
  ["routes", "Routes & Stops"],
  ["assignments", "Assignments"],
  ["trips", "Trips"],
  ["incidents", "Incidents"],
  ["maintenance", "Maintenance"],
  ["fees", "Transport Fees"],
  ["reports", "Reports"],
];

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
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

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
  if (["active", "completed", "paid", "resolved"].includes(key)) return badgeStyle("#dcfce7", "#166534");
  if (["maintenance", "delayed", "partial", "reviewed", "due"].includes(key)) return badgeStyle("#fef3c7", "#92400e");
  if (["open", "overdue", "cancelled", "suspended", "retired", "removed"].includes(key)) return badgeStyle("#fee2e2", "#991b1b");
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

export default function TransportDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [setup, setSetup] = useState({ sessions: [], terms: [], classes: [], students: [], driverCandidates: [], invoices: [] });
  const [dashboard, setDashboard] = useState({ summary: {}, today: {}, routesAtCapacity: [], delayedTripRows: [], maintenanceAlerts: [] });
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [trips, setTrips] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [fees, setFees] = useState([]);
  const [reports, setReports] = useState(null);
  const [routeDetail, setRouteDetail] = useState(null);
  const [tripDetail, setTripDetail] = useState(null);
  const [selectedRouteId, setSelectedRouteId] = useState("");
  const [selectedTripId, setSelectedTripId] = useState("");

  const [vehicleForm, setVehicleForm] = useState({ vehicleName: "", plateNumber: "", capacity: "", model: "", assignedDriverId: "", status: "active" });
  const [driverForm, setDriverForm] = useState({ userId: "", driverName: "", licenseNumber: "", phone: "", status: "active" });
  const [routeForm, setRouteForm] = useState({ routeName: "", vehicleId: "", driverId: "", direction: "combined", estimatedStartTime: "", estimatedEndTime: "", status: "active" });
  const [stopForm, setStopForm] = useState({ stopName: "", stopOrder: "", landmark: "", pickupTime: "", dropoffTime: "" });
  const [assignmentForm, setAssignmentForm] = useState({ studentId: "", routeId: "", stopId: "", sessionId: "", termId: "", transportDirection: "both", notes: "" });
  const [tripForm, setTripForm] = useState({ routeId: "", tripType: "morning_pickup", tripDate: new Date().toISOString().slice(0, 10), notes: "" });
  const [incidentForm, setIncidentForm] = useState({ routeId: "", vehicleId: "", tripLogId: "", incidentType: "delay", severity: "medium", description: "" });
  const [maintenanceForm, setMaintenanceForm] = useState({ vehicleId: "", maintenanceType: "routine_service", serviceDate: new Date().toISOString().slice(0, 10), nextServiceDate: "", cost: "", status: "completed" });
  const [feeForm, setFeeForm] = useState({ studentId: "", routeId: "", amount: "", sessionId: "", termId: "", billingStatus: "pending", invoiceId: "" });
  const [tripStudentDrafts, setTripStudentDrafts] = useState({});

  const stopOptions = useMemo(() => {
    if (!assignmentForm.routeId || !routeDetail || String(routeDetail.route?.id || "") !== String(assignmentForm.routeId)) return [];
    return Array.isArray(routeDetail.stops) ? routeDetail.stops : [];
  }, [assignmentForm.routeId, routeDetail]);

  const sessionOptions = setup.sessions || [];
  const termOptions = (setup.terms || []).filter((row) => !assignmentForm.sessionId || String(row.sessionId) === String(assignmentForm.sessionId));
  const feeTermOptions = (setup.terms || []).filter((row) => !feeForm.sessionId || String(row.sessionId) === String(feeForm.sessionId));

  const loadEverything = async () => {
    try {
      setLoading(true);
      setError("");
      const [setupRes, dashboardRes, vehiclesRes, driversRes, routesRes, assignmentsRes, tripsRes, incidentsRes, maintenanceRes, feesRes, reportsRes] =
        await Promise.all([
          getTransportSetup(),
          getTransportDashboard(),
          getTransportVehicles(),
          getTransportDrivers(),
          getTransportRoutes(),
          getTransportAssignments(),
          getTransportTrips(),
          getTransportIncidents(),
          getTransportMaintenance(),
          getTransportFees(),
          getTransportReports(),
        ]);

      setSetup(setupRes.data || {});
      setDashboard(dashboardRes.data || {});
      setVehicles(Array.isArray(vehiclesRes.data?.vehicles) ? vehiclesRes.data.vehicles : []);
      setDrivers(Array.isArray(driversRes.data?.drivers) ? driversRes.data.drivers : []);
      setRoutes(Array.isArray(routesRes.data?.routes) ? routesRes.data.routes : []);
      setAssignments(Array.isArray(assignmentsRes.data?.assignments) ? assignmentsRes.data.assignments : []);
      setTrips(Array.isArray(tripsRes.data?.trips) ? tripsRes.data.trips : []);
      setIncidents(Array.isArray(incidentsRes.data?.incidents) ? incidentsRes.data.incidents : []);
      setMaintenance(Array.isArray(maintenanceRes.data?.maintenance) ? maintenanceRes.data.maintenance : []);
      setFees(Array.isArray(feesRes.data?.fees) ? feesRes.data.fees : []);
      setReports(reportsRes.data?.reports || null);

      const activeSessionId = setupRes.data?.activeSessionId || "";
      const activeTermId = setupRes.data?.activeTermId || "";
      setAssignmentForm((prev) => ({ ...prev, sessionId: prev.sessionId || activeSessionId, termId: prev.termId || activeTermId }));
      setFeeForm((prev) => ({ ...prev, sessionId: prev.sessionId || activeSessionId, termId: prev.termId || activeTermId }));
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Failed to load transport dashboard.");
    } finally {
      setLoading(false);
    }
  };

  const loadRouteDetail = async (routeId) => {
    if (!routeId) {
      setRouteDetail(null);
      return;
    }
    try {
      const res = await getTransportRouteDetail(routeId);
      setRouteDetail(res.data || null);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load route detail.");
    }
  };

  const loadTripDetail = async (tripId) => {
    if (!tripId) {
      setTripDetail(null);
      return;
    }
    try {
      const res = await getTransportTripDetail(tripId);
      setTripDetail(res.data?.trip || null);
      setTripStudentDrafts(() => {
        const next = {};
        for (const row of res.data?.trip?.studentLogs || []) {
          next[String(row.studentId)] = {
            pickupStatus: row.pickupStatus,
            dropoffStatus: row.dropoffStatus,
            remark: row.remark,
          };
        }
        return next;
      });
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load trip detail.");
    }
  };

  useEffect(() => {
    loadEverything();
  }, []);

  useEffect(() => {
    if (selectedRouteId) loadRouteDetail(selectedRouteId);
  }, [selectedRouteId]);

  useEffect(() => {
    if (selectedTripId) loadTripDetail(selectedTripId);
  }, [selectedTripId]);

  const submitAction = async (key, action, successMessage) => {
    try {
      setSaving(key);
      setError("");
      setMessage("");
      await action();
      setMessage(successMessage);
      await loadEverything();
      if (selectedRouteId) await loadRouteDetail(selectedRouteId);
      if (selectedTripId) await loadTripDetail(selectedTripId);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Action failed.");
    } finally {
      setSaving("");
    }
  };
  const topStats = [
    ["Active Vehicles", dashboard.summary?.activeVehicles || 0, "Vehicles available for daily transport"],
    ["Active Routes", dashboard.summary?.activeRoutes || 0, "Configured routes with active service"],
    ["Students Using Transport", dashboard.summary?.studentsUsingTransport || 0, "Students currently assigned to transport"],
    ["Trips In Progress", dashboard.summary?.tripsInProgress || 0, "Trips still running today"],
    ["Delayed Trips", dashboard.summary?.delayedTrips || 0, "Trips currently marked delayed"],
    ["Vehicles In Maintenance", dashboard.summary?.vehiclesInMaintenance || 0, "Vehicles unavailable for dispatch"],
  ];

  const quickActions = [
    ["vehicles", "Add Vehicle", "Register a new bus or van"],
    ["routes", "Create Route", "Set up a route and stop plan"],
    ["assignments", "Assign Students", "Link students to active routes"],
    ["trips", "Start Trip", "Open today’s pickup or dropoff run"],
    ["incidents", "Log Incident", "Capture a transport issue fast"],
    ["fees", "Assign Fee", "Push transport billing into finance"],
  ];

  return (
    <div style={shellStyle}>
      <div style={{ maxWidth: 1400, margin: "0 auto" }}>
        <div style={{ ...panelStyle, marginBottom: 18, background: "linear-gradient(135deg, #163a70 0%, #244c88 70%, #c79a2b 180%)", color: "#fff" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <div>
              <div style={{ letterSpacing: "0.12em", textTransform: "uppercase", fontSize: 12, opacity: 0.85 }}>Angel Montessori School</div>
              <h1 style={{ margin: "10px 0 6px", fontSize: 34 }}>Transport Operations</h1>
              <p style={{ margin: 0, maxWidth: 760, color: "rgba(255,255,255,0.86)" }}>
                Manage vehicles, routes, stops, student assignments, daily trips, incidents, maintenance, and transport billing from one connected school transport desk.
              </p>
            </div>
            <div style={{ display: "grid", gap: 8, minWidth: 260 }}>
              <div style={{ background: "rgba(255,255,255,0.14)", borderRadius: 14, padding: 14 }}>
                <div style={{ fontSize: 12, opacity: 0.8 }}>Today’s Missed Pickups</div>
                <div style={{ fontSize: 28, fontWeight: 800 }}>{dashboard.today?.missedPickups || 0}</div>
              </div>
              <div style={{ background: "rgba(255,255,255,0.14)", borderRadius: 14, padding: 14 }}>
                <div style={{ fontSize: 12, opacity: 0.8 }}>Reported Incidents Today</div>
                <div style={{ fontSize: 28, fontWeight: 800 }}>{dashboard.today?.reportedIncidents || 0}</div>
              </div>
            </div>
          </div>
        </div>

        {error ? <div style={{ ...panelStyle, borderColor: "#f3b3b3", color: "#991b1b", marginBottom: 16 }}>{error}</div> : null}
        {message ? <div style={{ ...panelStyle, borderColor: "#b9e3c6", color: "#166534", marginBottom: 16 }}>{message}</div> : null}
        {loading ? <div style={{ ...panelStyle, marginBottom: 16 }}>Loading transport data...</div> : null}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 18 }}>
          {topStats.map(([label, value, hint]) => <SummaryCard key={label} label={label} value={value} hint={hint} />)}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 14, marginBottom: 18 }}>
          {quickActions.map(([key, label, hint]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              style={{
                ...cardStyle,
                textAlign: "left",
                cursor: "pointer",
                borderColor: activeTab === key ? "#c79a2b" : "#dbe5f1",
              }}
            >
              <div style={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", color: "#6b7280", marginBottom: 8 }}>Quick Action</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#163a70" }}>{label}</div>
              <div style={{ marginTop: 8, color: "#52607a", fontSize: 13 }}>{hint}</div>
            </button>
          ))}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 18 }}>
          {tabList.map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              style={{
                border: "1px solid #cdd9eb",
                background: activeTab === key ? "#163a70" : "#fff",
                color: activeTab === key ? "#fff" : "#16335a",
                borderRadius: 999,
                padding: "10px 16px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {activeTab === "overview" ? (
          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 18 }}>
            <div style={panelStyle}>
              <SectionTitle title="Quick Operations Snapshot" text="The most urgent operational issues are surfaced here first." />
              <div style={{ display: "grid", gap: 16 }}>
                <div style={cardStyle}>
                  <strong style={{ color: "#163a70" }}>Routes at Capacity</strong>
                  {(dashboard.routesAtCapacity || []).length === 0 ? <p style={{ marginBottom: 0 }}>No routes are currently at capacity.</p> : null}
                  {(dashboard.routesAtCapacity || []).map((row) => (
                    <div key={row.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #edf2f8" }}>
                      <span>{row.routeName}</span>
                      <span>{row.assignedCount}/{row.capacity}</span>
                    </div>
                  ))}
                </div>
                <div style={cardStyle}>
                  <strong style={{ color: "#163a70" }}>Delayed Trips</strong>
                  {(dashboard.delayedTripRows || []).length === 0 ? <p style={{ marginBottom: 0 }}>No delayed trips at the moment.</p> : null}
                  {(dashboard.delayedTripRows || []).map((row) => (
                    <div key={row.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #edf2f8" }}>
                      <span>{row.routeName}</span>
                      <span style={statusBadge(row.status)}>{row.status.replace(/_/g, " ")}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div style={panelStyle}>
              <SectionTitle title="Maintenance Alerts" text="Vehicles due or overdue for service are shown here." />
              {(dashboard.maintenanceAlerts || []).length === 0 ? <p>All maintenance schedules look healthy right now.</p> : null}
              {(dashboard.maintenanceAlerts || []).map((row) => (
                <div key={row.id} style={{ ...cardStyle, marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <strong>{row.vehicleName}</strong>
                    <span style={statusBadge(row.status)}>{row.status}</span>
                  </div>
                  <p style={{ margin: "8px 0 0", color: "#52607a" }}>{row.maintenanceType.replace(/_/g, " ")} due {formatDate(row.nextServiceDate)}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {activeTab === "vehicles" ? (
          <div style={panelStyle}>
            <SectionTitle title="Transport Vehicles" text="Register buses and vans with their capacity, plate details, and assigned driver." />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 12, marginBottom: 16 }}>
              <input style={inputStyle} placeholder="Vehicle name" value={vehicleForm.vehicleName} onChange={(e) => setVehicleForm((prev) => ({ ...prev, vehicleName: e.target.value }))} />
              <input style={inputStyle} placeholder="Plate number" value={vehicleForm.plateNumber} onChange={(e) => setVehicleForm((prev) => ({ ...prev, plateNumber: e.target.value }))} />
              <input style={inputStyle} placeholder="Capacity" value={vehicleForm.capacity} onChange={(e) => setVehicleForm((prev) => ({ ...prev, capacity: e.target.value }))} />
              <input style={inputStyle} placeholder="Model" value={vehicleForm.model} onChange={(e) => setVehicleForm((prev) => ({ ...prev, model: e.target.value }))} />
              <select style={inputStyle} value={vehicleForm.assignedDriverId} onChange={(e) => setVehicleForm((prev) => ({ ...prev, assignedDriverId: e.target.value }))}>
                <option value="">Assign driver</option>
                {drivers.map((row) => <option key={row.id} value={row.id}>{row.driverName}</option>)}
              </select>
            </div>
            <button onClick={() => submitAction("vehicle", () => createTransportVehicle(vehicleForm), "Vehicle created successfully.")} disabled={saving === "vehicle"}>Add Vehicle</button>
            <div style={{ overflowX: "auto", marginTop: 18 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}><thead><tr><th align="left">Vehicle</th><th align="left">Plate</th><th align="left">Capacity</th><th align="left">Driver</th><th align="left">Status</th></tr></thead><tbody>
                {vehicles.map((row) => <tr key={row.id}><td style={{ padding: "12px 0" }}>{row.vehicleName}</td><td>{row.plateNumber}</td><td>{row.capacity}</td><td>{row.assignedDriverName || "-"}</td><td><span style={statusBadge(row.status)}>{row.status}</span></td></tr>)}
              </tbody></table>
            </div>
          </div>
        ) : null}

        {activeTab === "drivers" ? (
          <div style={panelStyle}>
            <SectionTitle title="Transport Drivers" text="Create transport staff records and link them to school user accounts when needed." />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 12, marginBottom: 16 }}>
              <select style={inputStyle} value={driverForm.userId} onChange={(e) => setDriverForm((prev) => ({ ...prev, userId: e.target.value }))}>
                <option value="">Linked user</option>
                {(setup.driverCandidates || []).map((row) => <option key={row.id} value={row.id}>{row.name} ({row.role})</option>)}
              </select>
              <input style={inputStyle} placeholder="Driver name" value={driverForm.driverName} onChange={(e) => setDriverForm((prev) => ({ ...prev, driverName: e.target.value }))} />
              <input style={inputStyle} placeholder="License number" value={driverForm.licenseNumber} onChange={(e) => setDriverForm((prev) => ({ ...prev, licenseNumber: e.target.value }))} />
              <input style={inputStyle} placeholder="Phone" value={driverForm.phone} onChange={(e) => setDriverForm((prev) => ({ ...prev, phone: e.target.value }))} />
              <select style={inputStyle} value={driverForm.status} onChange={(e) => setDriverForm((prev) => ({ ...prev, status: e.target.value }))}><option value="active">Active</option><option value="inactive">Inactive</option><option value="suspended">Suspended</option></select>
            </div>
            <button onClick={() => submitAction("driver", () => createTransportDriver(driverForm), "Driver created successfully.")} disabled={saving === "driver"}>Add Driver</button>
            <div style={{ overflowX: "auto", marginTop: 18 }}><table style={{ width: "100%", borderCollapse: "collapse" }}><thead><tr><th align="left">Driver</th><th align="left">Phone</th><th align="left">License</th><th align="left">Linked User</th><th align="left">Status</th></tr></thead><tbody>
              {drivers.map((row) => <tr key={row.id}><td style={{ padding: "12px 0" }}>{row.driverName}</td><td>{row.phone || "-"}</td><td>{row.licenseNumber || "-"}</td><td>{row.linkedUserName || "-"}</td><td><span style={statusBadge(row.status)}>{row.status}</span></td></tr>)}
            </tbody></table></div>
          </div>
        ) : null}

        {activeTab === "routes" ? (
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 18 }}>
            <div style={panelStyle}>
              <SectionTitle title="Routes" text="Define the vehicle, direction, schedule, and operating status for each route." />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12, marginBottom: 16 }}>
                <input style={inputStyle} placeholder="Route name" value={routeForm.routeName} onChange={(e) => setRouteForm((prev) => ({ ...prev, routeName: e.target.value }))} />
                <select style={inputStyle} value={routeForm.vehicleId} onChange={(e) => setRouteForm((prev) => ({ ...prev, vehicleId: e.target.value }))}><option value="">Vehicle</option>{vehicles.map((row) => <option key={row.id} value={row.id}>{row.vehicleName}</option>)}</select>
                <select style={inputStyle} value={routeForm.driverId} onChange={(e) => setRouteForm((prev) => ({ ...prev, driverId: e.target.value }))}><option value="">Driver</option>{drivers.map((row) => <option key={row.id} value={row.id}>{row.driverName}</option>)}</select>
                <select style={inputStyle} value={routeForm.direction} onChange={(e) => setRouteForm((prev) => ({ ...prev, direction: e.target.value }))}><option value="combined">Combined</option><option value="morning_pickup">Morning Pickup</option><option value="afternoon_dropoff">Afternoon Dropoff</option></select>
                <input style={inputStyle} placeholder="Start time" value={routeForm.estimatedStartTime} onChange={(e) => setRouteForm((prev) => ({ ...prev, estimatedStartTime: e.target.value }))} />
                <input style={inputStyle} placeholder="End time" value={routeForm.estimatedEndTime} onChange={(e) => setRouteForm((prev) => ({ ...prev, estimatedEndTime: e.target.value }))} />
              </div>
              <button onClick={() => submitAction("route", () => createTransportRoute(routeForm), "Route created successfully.")} disabled={saving === "route"}>Create Route</button>
              <div style={{ overflowX: "auto", marginTop: 18 }}><table style={{ width: "100%", borderCollapse: "collapse" }}><thead><tr><th align="left">Route</th><th align="left">Vehicle</th><th align="left">Driver</th><th align="left">Stops</th><th align="left">Students</th><th align="left">Action</th></tr></thead><tbody>
                {routes.map((row) => <tr key={row.id}><td style={{ padding: "12px 0" }}>{row.routeName}</td><td>{row.vehicleName || "-"}</td><td>{row.driverName || "-"}</td><td>{row.stopCount}</td><td>{row.assignedCount}/{row.capacity || 0}</td><td><button onClick={() => setSelectedRouteId(row.id)}>Open</button></td></tr>)}
              </tbody></table></div>
            </div>
            <div style={panelStyle}>
              <SectionTitle title="Route Detail" text="Use this area to add stops and inspect route capacity." />
              {!routeDetail ? <p>Select a route to manage its stops and assignments.</p> : <>
                <div style={{ ...cardStyle, marginBottom: 14 }}>
                  <strong>{routeDetail.route?.routeName}</strong>
                  <p style={{ margin: "8px 0 0", color: "#52607a" }}>{routeDetail.route?.assignedCount}/{routeDetail.route?.capacity} students assigned</p>
                </div>
                <div style={{ display: "grid", gap: 10, marginBottom: 14 }}>
                  <input style={inputStyle} placeholder="Stop name" value={stopForm.stopName} onChange={(e) => setStopForm((prev) => ({ ...prev, stopName: e.target.value }))} />
                  <input style={inputStyle} placeholder="Landmark" value={stopForm.landmark} onChange={(e) => setStopForm((prev) => ({ ...prev, landmark: e.target.value }))} />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <input style={inputStyle} placeholder="Pickup time" value={stopForm.pickupTime} onChange={(e) => setStopForm((prev) => ({ ...prev, pickupTime: e.target.value }))} />
                    <input style={inputStyle} placeholder="Dropoff time" value={stopForm.dropoffTime} onChange={(e) => setStopForm((prev) => ({ ...prev, dropoffTime: e.target.value }))} />
                  </div>
                  <button onClick={() => submitAction("stop", () => createTransportStop(routeDetail.route.id, stopForm), "Route stop added successfully.")} disabled={saving === "stop"}>Add Stop</button>
                </div>
                {(routeDetail.stops || []).map((row) => <div key={row.id} style={{ ...cardStyle, marginBottom: 10 }}><strong>{row.stopOrder}. {row.stopName}</strong><div style={{ color: "#52607a", marginTop: 6 }}>{row.landmark || "No landmark yet"}</div></div>)}
              </>}
            </div>
          </div>
        ) : null}

        {activeTab === "assignments" ? (
          <div style={panelStyle}>
            <SectionTitle title="Student Transport Assignments" text="Assign each student to a route and stop while enforcing route capacity." />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12, marginBottom: 16 }}>
              <select style={inputStyle} value={assignmentForm.studentId} onChange={(e) => setAssignmentForm((prev) => ({ ...prev, studentId: e.target.value }))}><option value="">Student</option>{(setup.students || []).map((row) => <option key={row.id} value={row.id}>{row.name} ({row.className})</option>)}</select>
              <select style={inputStyle} value={assignmentForm.routeId} onChange={(e) => { setAssignmentForm((prev) => ({ ...prev, routeId: e.target.value, stopId: "" })); setSelectedRouteId(e.target.value); }}><option value="">Route</option>{routes.map((row) => <option key={row.id} value={row.id}>{row.routeName}</option>)}</select>
              <select style={inputStyle} value={assignmentForm.stopId} onChange={(e) => setAssignmentForm((prev) => ({ ...prev, stopId: e.target.value }))}><option value="">Stop</option>{stopOptions.map((row) => <option key={row.id} value={row.id}>{row.stopOrder}. {row.stopName}</option>)}</select>
              <select style={inputStyle} value={assignmentForm.sessionId} onChange={(e) => setAssignmentForm((prev) => ({ ...prev, sessionId: e.target.value }))}><option value="">Session</option>{sessionOptions.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select>
              <select style={inputStyle} value={assignmentForm.termId} onChange={(e) => setAssignmentForm((prev) => ({ ...prev, termId: e.target.value }))}><option value="">Term</option>{termOptions.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select>
              <select style={inputStyle} value={assignmentForm.transportDirection} onChange={(e) => setAssignmentForm((prev) => ({ ...prev, transportDirection: e.target.value }))}><option value="both">Both</option><option value="morning_only">Morning only</option><option value="afternoon_only">Afternoon only</option></select>
            </div>
            <button onClick={() => submitAction("assignment", () => createTransportAssignment(assignmentForm), "Student assignment saved successfully.")} disabled={saving === "assignment"}>Assign Student</button>
            <div style={{ overflowX: "auto", marginTop: 18 }}><table style={{ width: "100%", borderCollapse: "collapse" }}><thead><tr><th align="left">Student</th><th align="left">Class</th><th align="left">Route</th><th align="left">Stop</th><th align="left">Direction</th><th align="left">Status</th><th align="left">Action</th></tr></thead><tbody>
              {assignments.map((row) => <tr key={row.id}><td style={{ padding: "12px 0" }}>{row.studentName}</td><td>{row.className}</td><td>{row.routeName}</td><td>{row.stopName}</td><td>{row.transportDirection.replace(/_/g, " ")}</td><td><span style={statusBadge(row.status)}>{row.status}</span></td><td><button onClick={() => submitAction(`assignment-${row.id}`, () => updateTransportAssignment(row.id, { status: row.status === "active" ? "paused" : "active" }), "Assignment status updated.")}>{row.status === "active" ? "Pause" : "Reactivate"}</button></td></tr>)}
            </tbody></table></div>
          </div>
        ) : null}
        {activeTab === "trips" ? (
          <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 18 }}>
            <div style={panelStyle}>
              <SectionTitle title="Daily Trips" text="Start a route trip, then mark pickup and dropoff status for each assigned student." />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12, marginBottom: 16 }}>
                <select style={inputStyle} value={tripForm.routeId} onChange={(e) => setTripForm((prev) => ({ ...prev, routeId: e.target.value }))}><option value="">Route</option>{routes.map((row) => <option key={row.id} value={row.id}>{row.routeName}</option>)}</select>
                <select style={inputStyle} value={tripForm.tripType} onChange={(e) => setTripForm((prev) => ({ ...prev, tripType: e.target.value }))}><option value="morning_pickup">Morning pickup</option><option value="afternoon_dropoff">Afternoon dropoff</option></select>
                <input style={inputStyle} type="date" value={tripForm.tripDate} onChange={(e) => setTripForm((prev) => ({ ...prev, tripDate: e.target.value }))} />
                <input style={inputStyle} placeholder="Notes" value={tripForm.notes} onChange={(e) => setTripForm((prev) => ({ ...prev, notes: e.target.value }))} />
              </div>
              <button onClick={() => submitAction("trip", () => startTransportTrip(tripForm), "Trip started successfully.")} disabled={saving === "trip"}>Start Trip</button>
              <div style={{ overflowX: "auto", marginTop: 18 }}><table style={{ width: "100%", borderCollapse: "collapse" }}><thead><tr><th align="left">Date</th><th align="left">Route</th><th align="left">Type</th><th align="left">Status</th><th align="left">Students</th><th align="left">Action</th></tr></thead><tbody>
                {trips.map((row) => <tr key={row.id}><td style={{ padding: "12px 0" }}>{formatDate(row.tripDate)}</td><td>{row.routeName}</td><td>{row.tripType.replace(/_/g, " ")}</td><td><span style={statusBadge(row.status)}>{row.status}</span></td><td>{row.studentCount}</td><td><button onClick={() => setSelectedTripId(row.id)}>Open</button></td></tr>)}
              </tbody></table></div>
            </div>
            <div style={panelStyle}>
              <SectionTitle title="Trip Log" text="Select a trip to update student-level pickup and dropoff records." />
              {!tripDetail ? <p>Select a trip to manage its log.</p> : <>
                <div style={{ ...cardStyle, marginBottom: 14 }}>
                  <strong>{tripDetail.routeName}</strong>
                  <p style={{ margin: "8px 0 0", color: "#52607a" }}>{formatDate(tripDetail.tripDate)} • {tripDetail.tripType.replace(/_/g, " ")}</p>
                </div>
                <div style={{ display: "grid", gap: 10 }}>
                  {(tripDetail.studentLogs || []).map((row) => {
                    const draft = tripStudentDrafts[String(row.studentId)] || { pickupStatus: row.pickupStatus, dropoffStatus: row.dropoffStatus, remark: row.remark };
                    return (
                      <div key={row.id} style={cardStyle}>
                        <strong>{row.studentName}</strong>
                        <div style={{ color: "#52607a", margin: "4px 0 10px" }}>{row.stopName} • {row.className}</div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                          <select style={inputStyle} value={draft.pickupStatus} onChange={(e) => setTripStudentDrafts((prev) => ({ ...prev, [row.studentId]: { ...draft, pickupStatus: e.target.value } }))}><option value="picked">Picked</option><option value="absent">Absent</option><option value="missed">Missed</option><option value="not_boarded">Not boarded</option><option value="not_applicable">Not applicable</option></select>
                          <select style={inputStyle} value={draft.dropoffStatus} onChange={(e) => setTripStudentDrafts((prev) => ({ ...prev, [row.studentId]: { ...draft, dropoffStatus: e.target.value } }))}><option value="dropped">Dropped</option><option value="missed">Missed</option><option value="not_dropped">Not dropped</option><option value="not_applicable">Not applicable</option></select>
                        </div>
                        <input style={inputStyle} placeholder="Remark" value={draft.remark} onChange={(e) => setTripStudentDrafts((prev) => ({ ...prev, [row.studentId]: { ...draft, remark: e.target.value } }))} />
                        <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
                          <button onClick={() => submitAction(`trip-student-${row.id}`, () => updateTransportTripStudentLog(tripDetail.id, row.studentId, draft), `Updated ${row.studentName}.`)} disabled={saving === `trip-student-${row.id}`}>Save</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div style={{ marginTop: 14 }}><button onClick={() => submitAction("complete-trip", () => completeTransportTrip(tripDetail.id, {}), "Trip completed successfully.")} disabled={saving === "complete-trip"}>Complete Trip</button></div>
              </>}
            </div>
          </div>
        ) : null}

        {activeTab === "incidents" ? (
          <div style={panelStyle}>
            <SectionTitle title="Transport Incidents" text="Capture delays, vehicle faults, route changes, and other service issues with severity tracking." />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 12, marginBottom: 16 }}>
              <select style={inputStyle} value={incidentForm.routeId} onChange={(e) => setIncidentForm((prev) => ({ ...prev, routeId: e.target.value }))}><option value="">Route</option>{routes.map((row) => <option key={row.id} value={row.id}>{row.routeName}</option>)}</select>
              <select style={inputStyle} value={incidentForm.vehicleId} onChange={(e) => setIncidentForm((prev) => ({ ...prev, vehicleId: e.target.value }))}><option value="">Vehicle</option>{vehicles.map((row) => <option key={row.id} value={row.id}>{row.vehicleName}</option>)}</select>
              <select style={inputStyle} value={incidentForm.tripLogId} onChange={(e) => setIncidentForm((prev) => ({ ...prev, tripLogId: e.target.value }))}><option value="">Trip</option>{trips.map((row) => <option key={row.id} value={row.id}>{row.routeName} • {formatDate(row.tripDate)}</option>)}</select>
              <select style={inputStyle} value={incidentForm.incidentType} onChange={(e) => setIncidentForm((prev) => ({ ...prev, incidentType: e.target.value }))}><option value="delay">Delay</option><option value="vehicle_fault">Vehicle fault</option><option value="no_show">No show</option><option value="route_change">Route change</option><option value="student_issue">Student issue</option><option value="accident">Accident</option></select>
              <select style={inputStyle} value={incidentForm.severity} onChange={(e) => setIncidentForm((prev) => ({ ...prev, severity: e.target.value }))}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select>
            </div>
            <input style={{ ...inputStyle, marginBottom: 12 }} placeholder="Description" value={incidentForm.description} onChange={(e) => setIncidentForm((prev) => ({ ...prev, description: e.target.value }))} />
            <button onClick={() => submitAction("incident", () => createTransportIncident(incidentForm), "Incident logged successfully.")} disabled={saving === "incident"}>Log Incident</button>
            <div style={{ overflowX: "auto", marginTop: 18 }}><table style={{ width: "100%", borderCollapse: "collapse" }}><thead><tr><th align="left">Reported</th><th align="left">Route</th><th align="left">Type</th><th align="left">Severity</th><th align="left">Status</th><th align="left">Action</th></tr></thead><tbody>
              {incidents.map((row) => <tr key={row.id}><td style={{ padding: "12px 0" }}>{formatDateTime(row.reportedAt)}</td><td>{row.routeName || row.vehicleName || "-"}</td><td>{row.incidentType.replace(/_/g, " ")}</td><td><span style={statusBadge(row.severity)}>{row.severity}</span></td><td><span style={statusBadge(row.status)}>{row.status}</span></td><td><button onClick={() => submitAction(`incident-${row.id}`, () => updateTransportIncident(row.id, { status: row.status === "resolved" ? "reviewed" : "resolved" }), "Incident status updated.")}>{row.status === "resolved" ? "Mark Reviewed" : "Resolve"}</button></td></tr>)}
            </tbody></table></div>
          </div>
        ) : null}

        {activeTab === "maintenance" ? (
          <div style={panelStyle}>
            <SectionTitle title="Vehicle Maintenance" text="Track service dates, due dates, and maintenance costs for each transport vehicle." />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 12, marginBottom: 16 }}>
              <select style={inputStyle} value={maintenanceForm.vehicleId} onChange={(e) => setMaintenanceForm((prev) => ({ ...prev, vehicleId: e.target.value }))}><option value="">Vehicle</option>{vehicles.map((row) => <option key={row.id} value={row.id}>{row.vehicleName}</option>)}</select>
              <select style={inputStyle} value={maintenanceForm.maintenanceType} onChange={(e) => setMaintenanceForm((prev) => ({ ...prev, maintenanceType: e.target.value }))}><option value="routine_service">Routine service</option><option value="repair">Repair</option><option value="inspection">Inspection</option><option value="tyre_change">Tyre change</option><option value="oil_change">Oil change</option></select>
              <input style={inputStyle} type="date" value={maintenanceForm.serviceDate} onChange={(e) => setMaintenanceForm((prev) => ({ ...prev, serviceDate: e.target.value }))} />
              <input style={inputStyle} type="date" value={maintenanceForm.nextServiceDate} onChange={(e) => setMaintenanceForm((prev) => ({ ...prev, nextServiceDate: e.target.value }))} />
              <input style={inputStyle} placeholder="Cost" value={maintenanceForm.cost} onChange={(e) => setMaintenanceForm((prev) => ({ ...prev, cost: e.target.value }))} />
            </div>
            <button onClick={() => submitAction("maintenance", () => createTransportMaintenance(maintenanceForm), "Maintenance log created successfully.")} disabled={saving === "maintenance"}>Add Maintenance Log</button>
            <div style={{ overflowX: "auto", marginTop: 18 }}><table style={{ width: "100%", borderCollapse: "collapse" }}><thead><tr><th align="left">Vehicle</th><th align="left">Service Date</th><th align="left">Next Service</th><th align="left">Cost</th><th align="left">Status</th></tr></thead><tbody>
              {maintenance.map((row) => <tr key={row.id}><td style={{ padding: "12px 0" }}>{row.vehicleName}</td><td>{formatDate(row.serviceDate)}</td><td>{formatDate(row.nextServiceDate)}</td><td>{formatCurrency(row.cost)}</td><td><span style={statusBadge(row.status)}>{row.status}</span></td></tr>)}
            </tbody></table></div>
          </div>
        ) : null}

        {activeTab === "fees" ? (
          <div style={panelStyle}>
            <SectionTitle title="Transport Fee Assignments" text="Link transport usage to billable amounts so the finance team can follow up from the main invoicing system." />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12, marginBottom: 16 }}>
              <select style={inputStyle} value={feeForm.studentId} onChange={(e) => setFeeForm((prev) => ({ ...prev, studentId: e.target.value }))}><option value="">Student</option>{(setup.students || []).map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select>
              <select style={inputStyle} value={feeForm.routeId} onChange={(e) => setFeeForm((prev) => ({ ...prev, routeId: e.target.value }))}><option value="">Route</option>{routes.map((row) => <option key={row.id} value={row.id}>{row.routeName}</option>)}</select>
              <input style={inputStyle} placeholder="Amount" value={feeForm.amount} onChange={(e) => setFeeForm((prev) => ({ ...prev, amount: e.target.value }))} />
              <select style={inputStyle} value={feeForm.billingStatus} onChange={(e) => setFeeForm((prev) => ({ ...prev, billingStatus: e.target.value }))}><option value="pending">Pending</option><option value="invoiced">Invoiced</option><option value="paid">Paid</option><option value="partial">Partial</option><option value="exempted">Exempted</option></select>
              <select style={inputStyle} value={feeForm.sessionId} onChange={(e) => setFeeForm((prev) => ({ ...prev, sessionId: e.target.value }))}><option value="">Session</option>{sessionOptions.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select>
              <select style={inputStyle} value={feeForm.termId} onChange={(e) => setFeeForm((prev) => ({ ...prev, termId: e.target.value }))}><option value="">Term</option>{feeTermOptions.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select>
              <select style={inputStyle} value={feeForm.invoiceId} onChange={(e) => setFeeForm((prev) => ({ ...prev, invoiceId: e.target.value }))}><option value="">Invoice</option>{(setup.invoices || []).map((row) => <option key={row.id} value={row.id}>{row.invoiceNumber || row.label || row.id}</option>)}</select>
            </div>
            <button onClick={() => submitAction("fee", () => createTransportFee(feeForm), "Transport fee assignment created successfully.")} disabled={saving === "fee"}>Assign Transport Fee</button>
            <div style={{ overflowX: "auto", marginTop: 18 }}><table style={{ width: "100%", borderCollapse: "collapse" }}><thead><tr><th align="left">Student</th><th align="left">Route</th><th align="left">Amount</th><th align="left">Session</th><th align="left">Status</th></tr></thead><tbody>
              {fees.map((row) => <tr key={row.id}><td style={{ padding: "12px 0" }}>{row.studentName}</td><td>{row.routeName}</td><td>{formatCurrency(row.amount)}</td><td>{row.sessionName || row.sessionId || "-"}</td><td><span style={statusBadge(row.billingStatus)}>{row.billingStatus}</span></td></tr>)}
            </tbody></table></div>
          </div>
        ) : null}

        {activeTab === "reports" ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
            <div style={panelStyle}>
              <SectionTitle title="Route Capacity Utilization" text="A quick operational report for balancing route load before assigning more students." />
              {(reports?.routeCapacityUtilization || []).map((row) => <div key={row.routeId} style={{ ...cardStyle, marginBottom: 12 }}><strong>{row.routeName}</strong><div style={{ marginTop: 6, color: "#52607a" }}>{row.assignedCount}/{row.capacity} students • {row.utilizationRate}% utilization</div></div>)}
            </div>
            <div style={panelStyle}>
              <SectionTitle title="Operational & Finance Summary" text="These headline numbers help the transport admin and finance team track performance together." />
              <div style={{ display: "grid", gap: 12 }}>
                <div style={cardStyle}><strong>Completed Trips</strong><div style={{ fontSize: 28, fontWeight: 800, color: "#163a70", marginTop: 8 }}>{reports?.operationalSummary?.completedTrips || 0}</div></div>
                <div style={cardStyle}><strong>Open Incidents</strong><div style={{ fontSize: 28, fontWeight: 800, color: "#163a70", marginTop: 8 }}>{reports?.operationalSummary?.openIncidents || 0}</div></div>
                <div style={cardStyle}><strong>Billed Transport Fees</strong><div style={{ fontSize: 28, fontWeight: 800, color: "#163a70", marginTop: 8 }}>{formatCurrency(reports?.financeSummary?.billedAmount || 0)}</div></div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}



