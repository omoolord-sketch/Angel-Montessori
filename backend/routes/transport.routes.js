const express = require("express");
const { randomUUID } = require("crypto");
const { auth, requireRole } = require("../middleware/auth");
const { readDB, writeDB } = require("../lib/jsonStore");

const router = express.Router();

const TRANSPORT_COLLECTIONS = [
  "transportVehicles",
  "transportDrivers",
  "transportRoutes",
  "transportStops",
  "studentTransportAssignments",
  "transportTripLogs",
  "transportTripStudentLogs",
  "transportIncidents",
  "transportFeeAssignments",
  "vehicleMaintenanceLogs",
  "transportAuditLogs",
  "transportNotifications",
];

function ensureTransportCollections(db) {
  for (const key of TRANSPORT_COLLECTIONS) {
    if (!Array.isArray(db[key])) db[key] = [];
  }
  return db;
}

function createId(prefix) {
  return `${prefix}-${randomUUID().slice(0, 8)}`;
}

function safeString(value) {
  return String(value || "").trim();
}

function safeNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function asDateKey(value = new Date().toISOString()) {
  return safeString(value).slice(0, 10);
}

function currentTimestamp() {
  return new Date().toISOString();
}

function uniqueBy(rows, getKey) {
  const seen = new Set();
  const out = [];

  for (const row of rows) {
    const key = getKey(row);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }

  return out;
}

function logAudit(db, userId, action, targetType, targetId, metadata = {}) {
  ensureTransportCollections(db);
  db.transportAuditLogs.push({
    id: createId("transport-audit"),
    userId: safeString(userId),
    action: safeString(action),
    targetType: safeString(targetType),
    targetId: safeString(targetId),
    metadata,
    createdAt: currentTimestamp(),
  });
}

function getActiveSession(db) {
  const sessions = Array.isArray(db.academicSessions) ? db.academicSessions : [];
  return sessions.find((row) => row.isActive) || sessions[0] || null;
}

function getActiveTerm(db, sessionId = "") {
  const terms = Array.isArray(db.terms) ? db.terms : [];
  return (
    terms.find((row) => row.isActive && (!sessionId || String(row.sessionId) === String(sessionId))) ||
    terms.find((row) => !sessionId || String(row.sessionId) === String(sessionId)) ||
    terms[0] ||
    null
  );
}

function getMaps(db) {
  const users = Array.isArray(db.users) ? db.users : [];
  const students = Array.isArray(db.students) ? db.students : [];
  const classes = Array.isArray(db.classes) ? db.classes : [];
  const invoices = Array.isArray(db.invoices) ? db.invoices : [];

  return {
    userById: new Map(users.map((row) => [String(row.id), row])),
    studentById: new Map(students.map((row) => [String(row.id), row])),
    classById: new Map(classes.map((row) => [String(row.id), row])),
    invoiceById: new Map(invoices.map((row) => [String(row.id), row])),
  };
}

function ensureBillingCollections(db) {
  if (!Array.isArray(db.invoices)) db.invoices = [];
  if (!Array.isArray(db.invoiceItems)) db.invoiceItems = [];
  if (!Array.isArray(db.payments)) db.payments = [];
  if (!Array.isArray(db.paymentLogs)) db.paymentLogs = [];
  if (!Array.isArray(db.feeTypes)) db.feeTypes = [];
  return db;
}

function ensureTransportFeeType(db) {
  ensureBillingCollections(db);
  let feeType = (db.feeTypes || []).find((row) => safeString(row.feeCode).toUpperCase() === "TRANSPORT");
  if (!feeType) {
    feeType = {
      id: createId("fee-type"),
      feeName: "Transport Fee",
      feeCode: "TRANSPORT",
      category: "transport",
      isRecurring: true,
      createdAt: currentTimestamp(),
      updatedAt: currentTimestamp(),
    };
    db.feeTypes.unshift(feeType);
  }
  return feeType;
}

function createFinanceDocumentNumber(list = [], prefix = "INV") {
  const stamp = new Date();
  const dateKey = `${stamp.getFullYear()}${String(stamp.getMonth() + 1).padStart(2, "0")}${String(stamp.getDate()).padStart(2, "0")}`;
  const count = (list || []).filter((row) => safeString(row.invoiceNumber || row.receiptNumber).startsWith(`${prefix}-${dateKey}`)).length + 1;
  return `${prefix}-${dateKey}-${String(count).padStart(4, "0")}`;
}

function recalcTransportInvoice(db, invoiceId) {
  ensureBillingCollections(db);
  const invoice = (db.invoices || []).find((row) => String(row.id) === String(invoiceId));
  if (!invoice) return null;

  const items = (db.invoiceItems || []).filter((row) => String(row.invoiceId) === String(invoiceId));
  const totalAmount = items.reduce((sum, row) => sum + safeNumber(row.amount, 0), 0);
  const paidViaPayments = (db.payments || [])
    .filter((row) => String(row.invoiceId) === String(invoiceId) && ["SUCCESS", "PAID", "COMPLETED"].includes(String(row.status || "").toUpperCase()))
    .reduce((sum, row) => sum + safeNumber(row.amount, 0), 0);
  const amountPaid = Math.max(safeNumber(invoice.amountPaid, 0), paidViaPayments);
  const balance = Math.max(totalAmount - amountPaid, 0);

  let status = balance <= 0 && totalAmount > 0 ? "PAID" : amountPaid > 0 ? "PARTIAL" : "UNPAID";
  const dueDate = safeString(invoice.dueDate);
  if (status === "UNPAID" && dueDate && dueDate < asDateKey()) status = "OVERDUE";

  Object.assign(invoice, {
    totalAmount: Number(totalAmount.toFixed(2)),
    amountPaid: Number(amountPaid.toFixed(2)),
    balance: Number(balance.toFixed(2)),
    status,
    updatedAt: currentTimestamp(),
  });

  return invoice;
}

function syncTransportFeeInvoice(db, feeAssignment, performedBy = "system") {
  ensureBillingCollections(db);
  const maps = getMaps(db);
  const student = maps.studentById.get(String(feeAssignment.studentId || ""));
  if (!student) return null;

  const feeType = ensureTransportFeeType(db);
  const now = currentTimestamp();
  let invoice = (db.invoices || []).find(
    (row) =>
      String(row.studentId) === String(feeAssignment.studentId) &&
      String(row.sessionId) === String(feeAssignment.sessionId) &&
      String(row.termId) === String(feeAssignment.termId) &&
      String(row.status || "").toUpperCase() !== "CANCELLED"
  );

  if (!invoice) {
    invoice = {
      id: createId("invoice"),
      invoiceNumber: createFinanceDocumentNumber(db.invoices || [], "INV"),
      studentId: String(feeAssignment.studentId),
      sessionId: String(feeAssignment.sessionId || ""),
      termId: String(feeAssignment.termId || ""),
      totalAmount: 0,
      amountPaid: 0,
      balance: 0,
      status: "UNPAID",
      dueDate: asDateKey(),
      createdBy: safeString(performedBy),
      createdAt: now,
      updatedAt: now,
    };
    db.invoices.unshift(invoice);
  }

  db.invoiceItems = (db.invoiceItems || []).filter(
    (row) => !(String(row.sourceType || "").toUpperCase() === "TRANSPORT_FEE" && String(row.sourceId || "") === String(feeAssignment.id))
  );

  db.invoiceItems.unshift({
    id: createId("invoice-item"),
    invoiceId: String(invoice.id),
    feeTypeId: String(feeType.id),
    description: `Transport Fee - ${safeString(feeAssignment.routeName || feeAssignment.routeId || "Route")}`,
    amount: Number(safeNumber(feeAssignment.amount, 0).toFixed(2)),
    sourceType: "TRANSPORT_FEE",
    sourceId: String(feeAssignment.id),
    createdAt: now,
    updatedAt: now,
  });

  db.paymentLogs.unshift({
    id: createId("payment-log"),
    invoiceId: String(invoice.id),
    paymentId: "",
    action: "transport_fee_linked",
    performedBy: safeString(performedBy),
    notes: `Linked transport fee for ${safeString(student.name)} to invoice ${safeString(invoice.invoiceNumber)}`,
    createdAt: now,
  });

  recalcTransportInvoice(db, invoice.id);
  return invoice;
}

function parentUsersForStudent(db, studentId) {
  return (Array.isArray(db.users) ? db.users : []).filter((row) => {
    if (String(row.role || "").toUpperCase() !== "PARENT") return false;
    if (String(row.studentId || "") === String(studentId)) return true;
    return Array.isArray(row.studentIds) && row.studentIds.map((id) => String(id)).includes(String(studentId));
  });
}

function createTransportNotification(db, payload = {}) {
  ensureTransportCollections(db);
  const studentId = safeString(payload.studentId);
  if (!studentId) return null;
  const parentUsers = parentUsersForStudent(db, studentId);
  if (parentUsers.length === 0) return null;

  const type = safeString(payload.notificationType || payload.type || "transport_update").toLowerCase();
  const tripLogId = safeString(payload.tripLogId);
  const incidentId = safeString(payload.incidentId);
  const message = safeString(payload.message);

  const duplicate = (db.transportNotifications || []).find((row) =>
    String(row.studentId) === studentId &&
    String(row.notificationType) === type &&
    String(row.tripLogId || "") === tripLogId &&
    String(row.incidentId || "") === incidentId &&
    String(row.message || "") === message &&
    String(row.status || "active") === "active"
  );
  if (duplicate) return duplicate;

  const row = {
    id: createId("transport-note"),
    studentId,
    parentUserIds: parentUsers.map((user) => String(user.id)),
    routeId: safeString(payload.routeId),
    tripLogId,
    incidentId,
    notificationType: type,
    title: safeString(payload.title || "Transport update"),
    message,
    severity: safeString(payload.severity || "medium").toLowerCase(),
    status: "active",
    createdAt: currentTimestamp(),
    updatedAt: currentTimestamp(),
  };

  db.transportNotifications.unshift(row);
  return row;
}

function getTransportNotificationsForStudent(db, studentId) {
  ensureTransportCollections(db);
  return (db.transportNotifications || [])
    .filter((row) => String(row.studentId) === String(studentId))
    .filter((row) => String(row.status || "active") !== "resolved")
    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
}

function resolveDriverForUser(db, user = {}) {
  const userId = safeString(user.id);
  if (!userId) return null;
  return getEnrichedDrivers(db).find((row) => String(row.userId || "") === userId) || null;
}

function driverVisibleTrips(db, user = {}) {
  const elevatedRoles = new Set(["ADMIN", "TRANSPORT_ADMIN"]);
  const role = String(user.role || "").toUpperCase();
  if (elevatedRoles.has(role)) return getEnrichedTripLogs(db);

  const driver = resolveDriverForUser(db, user);
  if (!driver) return [];
  return getEnrichedTripLogs(db).filter((row) => String(row.driverId || "") === String(driver.id));
}

function canUserManageTrip(db, user = {}, tripId) {
  return driverVisibleTrips(db, user).some((row) => String(row.id) === String(tripId));
}
function normalizeDriverRecord(driver, maps) {
  const linkedUser = maps.userById.get(String(driver.userId || ""));
  return {
    ...driver,
    id: String(driver.id || ""),
    userId: safeString(driver.userId),
    driverName: safeString(driver.driverName || linkedUser?.name),
    phone: safeString(driver.phone || linkedUser?.phone),
    status: safeString(driver.status || "active").toLowerCase(),
    licenseNumber: safeString(driver.licenseNumber),
    licenseExpiryDate: safeString(driver.licenseExpiryDate),
    address: safeString(driver.address),
    emergencyContactName: safeString(driver.emergencyContactName),
    emergencyContactPhone: safeString(driver.emergencyContactPhone),
    linkedUserName: safeString(linkedUser?.name),
    linkedUserRole: safeString(linkedUser?.role),
    createdAt: safeString(driver.createdAt),
    updatedAt: safeString(driver.updatedAt || driver.createdAt),
  };
}

function normalizeVehicleRecord(vehicle, driversById) {
  const driver = driversById.get(String(vehicle.assignedDriverId || ""));
  return {
    ...vehicle,
    id: String(vehicle.id || ""),
    vehicleName: safeString(vehicle.vehicleName),
    plateNumber: safeString(vehicle.plateNumber),
    capacity: Math.max(0, safeNumber(vehicle.capacity, 0)),
    model: safeString(vehicle.model),
    color: safeString(vehicle.color),
    manufacturer: safeString(vehicle.manufacturer),
    yearOfManufacture: safeString(vehicle.yearOfManufacture),
    insuranceExpiryDate: safeString(vehicle.insuranceExpiryDate),
    roadworthinessExpiryDate: safeString(vehicle.roadworthinessExpiryDate),
    assignedDriverId: safeString(vehicle.assignedDriverId),
    assignedDriverName: safeString(driver?.driverName),
    status: safeString(vehicle.status || "active").toLowerCase(),
    notes: safeString(vehicle.notes),
    createdAt: safeString(vehicle.createdAt),
    updatedAt: safeString(vehicle.updatedAt || vehicle.createdAt),
  };
}

function getEnrichedDrivers(db) {
  ensureTransportCollections(db);
  const maps = getMaps(db);
  return db.transportDrivers.map((row) => normalizeDriverRecord(row, maps));
}

function getEnrichedVehicles(db) {
  ensureTransportCollections(db);
  const driversById = new Map(getEnrichedDrivers(db).map((row) => [String(row.id), row]));
  return db.transportVehicles.map((row) => normalizeVehicleRecord(row, driversById));
}

function getEnrichedRoutes(db) {
  ensureTransportCollections(db);
  const vehiclesById = new Map(getEnrichedVehicles(db).map((row) => [String(row.id), row]));
  const driversById = new Map(getEnrichedDrivers(db).map((row) => [String(row.id), row]));
  const stops = Array.isArray(db.transportStops) ? db.transportStops : [];
  const assignments = Array.isArray(db.studentTransportAssignments) ? db.studentTransportAssignments : [];

  return db.transportRoutes.map((route) => {
    const vehicle = vehiclesById.get(String(route.vehicleId || ""));
    const driver = driversById.get(String(route.driverId || "")) || driversById.get(String(vehicle?.assignedDriverId || ""));
    const routeStops = stops.filter((item) => String(item.routeId) === String(route.id) && String(item.status || "active").toLowerCase() !== "inactive");
    const activeAssignments = assignments.filter(
      (item) => String(item.routeId) === String(route.id) && String(item.status || "active").toLowerCase() === "active"
    );
    const capacity = safeNumber(vehicle?.capacity, 0);
    const assignedCount = activeAssignments.length;
    const utilizationRate = capacity > 0 ? Number(((assignedCount / capacity) * 100).toFixed(1)) : 0;

    return {
      ...route,
      id: String(route.id || ""),
      routeName: safeString(route.routeName),
      vehicleId: safeString(route.vehicleId),
      vehicleName: safeString(vehicle?.vehicleName),
      driverId: safeString(route.driverId || vehicle?.assignedDriverId),
      driverName: safeString(driver?.driverName),
      direction: safeString(route.direction || "combined").toLowerCase(),
      estimatedStartTime: safeString(route.estimatedStartTime),
      estimatedEndTime: safeString(route.estimatedEndTime),
      status: safeString(route.status || "active").toLowerCase(),
      notes: safeString(route.notes),
      stopCount: routeStops.length,
      assignedCount,
      capacity,
      remainingCapacity: Math.max(capacity - assignedCount, 0),
      utilizationRate,
      isAtCapacity: capacity > 0 && assignedCount >= capacity,
      createdAt: safeString(route.createdAt),
      updatedAt: safeString(route.updatedAt || route.createdAt),
    };
  });
}

function getEnrichedStops(db, routeId = "") {
  ensureTransportCollections(db);
  return db.transportStops
    .filter((row) => !routeId || String(row.routeId) === String(routeId))
    .map((row) => ({
      ...row,
      id: String(row.id || ""),
      routeId: safeString(row.routeId),
      stopName: safeString(row.stopName),
      stopOrder: safeNumber(row.stopOrder, 0),
      landmark: safeString(row.landmark),
      pickupTime: safeString(row.pickupTime),
      dropoffTime: safeString(row.dropoffTime),
      latitude: safeString(row.latitude),
      longitude: safeString(row.longitude),
      status: safeString(row.status || "active").toLowerCase(),
      createdAt: safeString(row.createdAt),
      updatedAt: safeString(row.updatedAt || row.createdAt),
    }))
    .sort((a, b) => a.stopOrder - b.stopOrder || a.stopName.localeCompare(b.stopName));
}
function getEnrichedAssignments(db) {
  ensureTransportCollections(db);
  const maps = getMaps(db);
  const vehiclesById = new Map(getEnrichedVehicles(db).map((row) => [String(row.id), row]));
  const routesById = new Map(getEnrichedRoutes(db).map((row) => [String(row.id), row]));
  const stopsById = new Map(getEnrichedStops(db).map((row) => [String(row.id), row]));
  const sessionById = new Map((Array.isArray(db.academicSessions) ? db.academicSessions : []).map((row) => [String(row.id), row]));
  const termById = new Map((Array.isArray(db.terms) ? db.terms : []).map((row) => [String(row.id), row]));

  return db.studentTransportAssignments.map((row) => {
    const student = maps.studentById.get(String(row.studentId || ""));
    const route = routesById.get(String(row.routeId || ""));
    const stop = stopsById.get(String(row.stopId || ""));
    const vehicle = vehiclesById.get(String(row.vehicleId || route?.vehicleId || ""));
    const classRow = maps.classById.get(String(student?.classId || ""));
    const session = sessionById.get(String(row.sessionId || ""));
    const term = termById.get(String(row.termId || ""));

    return {
      ...row,
      id: String(row.id || ""),
      studentId: safeString(row.studentId),
      studentName: safeString(student?.name),
      classId: safeString(student?.classId),
      className: safeString(student?.className || classRow?.name),
      vehicleId: safeString(vehicle?.id || row.vehicleId),
      vehicleName: safeString(vehicle?.vehicleName),
      routeId: safeString(route?.id || row.routeId),
      routeName: safeString(route?.routeName),
      stopId: safeString(stop?.id || row.stopId),
      stopName: safeString(stop?.stopName),
      transportDirection: safeString(row.transportDirection || "both").toLowerCase(),
      status: safeString(row.status || "active").toLowerCase(),
      sessionId: safeString(row.sessionId),
      sessionName: safeString(session?.name || row.sessionName),
      termId: safeString(row.termId),
      termName: safeString(term?.name || row.termName),
      assignedAt: safeString(row.assignedAt),
      notes: safeString(row.notes),
      parentPhone: safeString(student?.parentPhone),
      studentPhone: safeString(student?.studentPhone),
      createdAt: safeString(row.createdAt || row.assignedAt),
      updatedAt: safeString(row.updatedAt || row.createdAt || row.assignedAt),
    };
  });
}

function getEnrichedTripLogs(db) {
  ensureTransportCollections(db);
  const routesById = new Map(getEnrichedRoutes(db).map((row) => [String(row.id), row]));
  const vehiclesById = new Map(getEnrichedVehicles(db).map((row) => [String(row.id), row]));
  const driversById = new Map(getEnrichedDrivers(db).map((row) => [String(row.id), row]));
  const tripStudentLogs = Array.isArray(db.transportTripStudentLogs) ? db.transportTripStudentLogs : [];

  return db.transportTripLogs
    .map((row) => {
      const route = routesById.get(String(row.routeId || ""));
      const vehicle = vehiclesById.get(String(row.vehicleId || route?.vehicleId || ""));
      const driver = driversById.get(String(row.driverId || route?.driverId || vehicle?.assignedDriverId || ""));
      const studentLogs = tripStudentLogs.filter((item) => String(item.tripLogId) === String(row.id));
      const missedCount = studentLogs.filter(
        (item) => ["missed", "absent", "not_boarded", "not_dropped"].includes(String(item.pickupStatus || item.dropoffStatus || "").toLowerCase())
      ).length;

      return {
        ...row,
        id: String(row.id || ""),
        routeId: safeString(route?.id || row.routeId),
        routeName: safeString(route?.routeName),
        vehicleId: safeString(vehicle?.id || row.vehicleId),
        vehicleName: safeString(vehicle?.vehicleName),
        driverId: safeString(driver?.id || row.driverId),
        driverName: safeString(driver?.driverName),
        tripDate: safeString(row.tripDate),
        tripType: safeString(row.tripType || "morning_pickup").toLowerCase(),
        scheduledStartTime: safeString(row.scheduledStartTime || route?.estimatedStartTime),
        actualStartTime: safeString(row.actualStartTime),
        completedAt: safeString(row.completedAt),
        status: safeString(row.status || "scheduled").toLowerCase(),
        delayMinutes: safeNumber(row.delayMinutes, 0),
        notes: safeString(row.notes),
        studentCount: studentLogs.length,
        missedCount,
        createdAt: safeString(row.createdAt),
        updatedAt: safeString(row.updatedAt || row.createdAt),
      };
    })
    .sort((a, b) => `${b.tripDate}-${b.actualStartTime || b.scheduledStartTime}`.localeCompare(`${a.tripDate}-${a.actualStartTime || a.scheduledStartTime}`));
}

function getTripDetail(db, tripId) {
  const trip = getEnrichedTripLogs(db).find((row) => String(row.id) === String(tripId));
  if (!trip) return null;

  const maps = getMaps(db);
  const stopsById = new Map(getEnrichedStops(db).map((row) => [String(row.id), row]));
  const rows = (Array.isArray(db.transportTripStudentLogs) ? db.transportTripStudentLogs : [])
    .filter((row) => String(row.tripLogId) === String(tripId))
    .map((row) => {
      const student = maps.studentById.get(String(row.studentId || ""));
      const stop = stopsById.get(String(row.stopId || ""));
      const classRow = maps.classById.get(String(student?.classId || ""));
      return {
        ...row,
        id: String(row.id || ""),
        studentId: safeString(row.studentId),
        studentName: safeString(student?.name),
        className: safeString(student?.className || classRow?.name),
        stopId: safeString(stop?.id || row.stopId),
        stopName: safeString(stop?.stopName),
        stopOrder: safeNumber(stop?.stopOrder, 0),
        pickupStatus: safeString(row.pickupStatus || "not_applicable").toLowerCase(),
        dropoffStatus: safeString(row.dropoffStatus || "not_applicable").toLowerCase(),
        markedAt: safeString(row.markedAt),
        remark: safeString(row.remark),
        updatedAt: safeString(row.updatedAt || row.createdAt || row.markedAt),
      };
    })
    .sort((a, b) => a.stopOrder - b.stopOrder || a.studentName.localeCompare(b.studentName));

  return { ...trip, studentLogs: rows };
}

function getEnrichedIncidents(db) {
  ensureTransportCollections(db);
  const routesById = new Map(getEnrichedRoutes(db).map((row) => [String(row.id), row]));
  const vehiclesById = new Map(getEnrichedVehicles(db).map((row) => [String(row.id), row]));
  const driversById = new Map(getEnrichedDrivers(db).map((row) => [String(row.id), row]));
  const tripsById = new Map(getEnrichedTripLogs(db).map((row) => [String(row.id), row]));

  return db.transportIncidents
    .map((row) => ({
      ...row,
      id: String(row.id || ""),
      vehicleId: safeString(row.vehicleId),
      vehicleName: safeString(vehiclesById.get(String(row.vehicleId || ""))?.vehicleName),
      routeId: safeString(row.routeId),
      routeName: safeString(routesById.get(String(row.routeId || ""))?.routeName),
      driverId: safeString(row.driverId),
      driverName: safeString(driversById.get(String(row.driverId || ""))?.driverName),
      tripLogId: safeString(row.tripLogId),
      tripLabel: safeString(tripsById.get(String(row.tripLogId || ""))?.tripType),
      incidentType: safeString(row.incidentType),
      description: safeString(row.description),
      reportedAt: safeString(row.reportedAt),
      reportedBy: safeString(row.reportedBy),
      severity: safeString(row.severity || "medium").toLowerCase(),
      status: safeString(row.status || "open").toLowerCase(),
      createdAt: safeString(row.createdAt || row.reportedAt),
      updatedAt: safeString(row.updatedAt || row.createdAt || row.reportedAt),
    }))
    .sort((a, b) => `${b.reportedAt}-${b.createdAt}`.localeCompare(`${a.reportedAt}-${a.createdAt}`));
}

function getEnrichedMaintenance(db) {
  ensureTransportCollections(db);
  const vehiclesById = new Map(getEnrichedVehicles(db).map((row) => [String(row.id), row]));

  return db.vehicleMaintenanceLogs
    .map((row) => ({
      ...row,
      id: String(row.id || ""),
      vehicleId: safeString(row.vehicleId),
      vehicleName: safeString(vehiclesById.get(String(row.vehicleId || ""))?.vehicleName),
      maintenanceType: safeString(row.maintenanceType),
      description: safeString(row.description),
      serviceDate: safeString(row.serviceDate),
      nextServiceDate: safeString(row.nextServiceDate),
      cost: safeNumber(row.cost, 0),
      vendorName: safeString(row.vendorName),
      status: safeString(row.status || "completed").toLowerCase(),
      createdAt: safeString(row.createdAt || row.serviceDate),
      updatedAt: safeString(row.updatedAt || row.createdAt || row.serviceDate),
    }))
    .sort((a, b) => `${b.nextServiceDate}-${b.serviceDate}`.localeCompare(`${a.nextServiceDate}-${a.serviceDate}`));
}
function getEnrichedTransportFees(db) {
  ensureTransportCollections(db);
  const maps = getMaps(db);
  const routesById = new Map(getEnrichedRoutes(db).map((row) => [String(row.id), row]));
  const sessionById = new Map((Array.isArray(db.academicSessions) ? db.academicSessions : []).map((row) => [String(row.id), row]));
  const termById = new Map((Array.isArray(db.terms) ? db.terms : []).map((row) => [String(row.id), row]));

  return db.transportFeeAssignments
    .map((row) => {
      const student = maps.studentById.get(String(row.studentId || ""));
      const route = routesById.get(String(row.routeId || ""));
      const invoice = maps.invoiceById.get(String(row.invoiceId || ""));
      const classRow = maps.classById.get(String(student?.classId || ""));
      const session = sessionById.get(String(row.sessionId || ""));
      const term = termById.get(String(row.termId || ""));
      return {
        ...row,
        id: String(row.id || ""),
        studentId: safeString(row.studentId),
        studentName: safeString(student?.name),
        className: safeString(student?.className || classRow?.name),
        routeId: safeString(row.routeId),
        routeName: safeString(route?.routeName),
        amount: safeNumber(row.amount, 0),
        sessionId: safeString(row.sessionId),
        sessionName: safeString(session?.name),
        termId: safeString(row.termId),
        termName: safeString(term?.name),
        billingStatus: safeString(row.billingStatus || "pending").toLowerCase(),
        invoiceId: safeString(row.invoiceId),
        invoiceStatus: safeString(invoice?.status),
        createdAt: safeString(row.createdAt),
        updatedAt: safeString(row.updatedAt || row.createdAt),
      };
    })
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

function getTripLogsMissedCount(db, tripIds = []) {
  const idSet = new Set((tripIds || []).map((id) => String(id)));
  const rows = Array.isArray(db.transportTripStudentLogs) ? db.transportTripStudentLogs : [];
  return rows.filter((row) => {
    if (!idSet.has(String(row.tripLogId || ""))) return false;
    const pickup = safeString(row.pickupStatus).toLowerCase();
    const dropoff = safeString(row.dropoffStatus).toLowerCase();
    return ["missed", "absent", "not_boarded", "not_dropped"].includes(pickup) || ["missed", "not_dropped"].includes(dropoff);
  }).length;
}

function buildTransportDashboard(db) {
  const vehicles = getEnrichedVehicles(db);
  const routes = getEnrichedRoutes(db);
  const assignments = getEnrichedAssignments(db);
  const trips = getEnrichedTripLogs(db);
  const incidents = getEnrichedIncidents(db);
  const maintenance = getEnrichedMaintenance(db);
  const today = asDateKey();

  const todayTrips = trips.filter((row) => row.tripDate === today);
  const todayIncidents = incidents.filter((row) => asDateKey(row.reportedAt || row.createdAt) === today);
  const inProgressTrips = todayTrips.filter((row) => row.status === "in_progress");
  const delayedTrips = todayTrips.filter((row) => row.status === "delayed");
  const missedPickups = getTripLogsMissedCount(db, todayTrips.map((row) => row.id));
  const dueMaintenance = maintenance.filter((row) => ["due", "overdue"].includes(row.status));

  return {
    summary: {
      activeVehicles: vehicles.filter((row) => row.status === "active").length,
      activeRoutes: routes.filter((row) => row.status === "active").length,
      studentsUsingTransport: assignments.filter((row) => row.status === "active").length,
      tripsInProgress: inProgressTrips.length,
      delayedTrips: delayedTrips.length,
      vehiclesInMaintenance: vehicles.filter((row) => row.status === "maintenance").length,
    },
    today: {
      morningTripsCompleted: todayTrips.filter((row) => row.tripType === "morning_pickup" && row.status === "completed").length,
      afternoonTripsPending: todayTrips.filter((row) => row.tripType === "afternoon_dropoff" && ["scheduled", "in_progress", "delayed"].includes(row.status)).length,
      missedPickups,
      reportedIncidents: todayIncidents.length,
    },
    routesAtCapacity: routes.filter((row) => row.isAtCapacity).slice(0, 6),
    delayedTripRows: delayedTrips.slice(0, 6),
    maintenanceAlerts: dueMaintenance.slice(0, 6),
  };
}

function buildTransportReports(db) {
  const routes = getEnrichedRoutes(db);
  const trips = getEnrichedTripLogs(db);
  const incidents = getEnrichedIncidents(db);
  const maintenance = getEnrichedMaintenance(db);
  const fees = getEnrichedTransportFees(db);

  return {
    routeCapacityUtilization: routes.map((row) => ({
      routeId: row.id,
      routeName: row.routeName,
      assignedCount: row.assignedCount,
      capacity: row.capacity,
      utilizationRate: row.utilizationRate,
      remainingCapacity: row.remainingCapacity,
    })),
    operationalSummary: {
      completedTrips: trips.filter((row) => row.status === "completed").length,
      delayedTrips: trips.filter((row) => row.status === "delayed").length,
      openIncidents: incidents.filter((row) => row.status === "open").length,
      vehiclesDueForService: maintenance.filter((row) => ["due", "overdue"].includes(row.status)).length,
    },
    financeSummary: {
      billedAmount: fees.reduce((sum, row) => sum + safeNumber(row.amount, 0), 0),
      paidAssignments: fees.filter((row) => row.billingStatus === "paid").length,
      unpaidAssignments: fees.filter((row) => ["pending", "invoiced", "partial"].includes(row.billingStatus)).length,
    },
  };
}

function buildParentTransportOverview(db, studentIds = []) {
  ensureTransportCollections(db);
  const maps = getMaps(db);
  const assignments = getEnrichedAssignments(db).filter(
    (row) => (studentIds || []).includes(String(row.studentId)) && row.status === "active"
  );
  const routesById = new Map(getEnrichedRoutes(db).map((row) => [String(row.id), row]));
  const vehiclesById = new Map(getEnrichedVehicles(db).map((row) => [String(row.id), row]));
  const driverById = new Map(getEnrichedDrivers(db).map((row) => [String(row.id), row]));
  const tripDetails = getEnrichedTripLogs(db);
  const tripById = new Map(tripDetails.map((row) => [String(row.id), row]));
  const stopsById = new Map(getEnrichedStops(db).map((row) => [String(row.id), row]));
  const incidents = getEnrichedIncidents(db);
  const recentTripLogs = Array.isArray(db.transportTripStudentLogs) ? db.transportTripStudentLogs : [];

  const children = uniqueBy(
    (studentIds || []).map((id) => maps.studentById.get(String(id))).filter(Boolean),
    (row) => String(row.id)
  ).map((student) => {
    const assignment = assignments.find((row) => String(row.studentId) === String(student.id)) || null;
    const route = assignment ? routesById.get(String(assignment.routeId || "")) : null;
    const vehicle = assignment ? vehiclesById.get(String(assignment.vehicleId || route?.vehicleId || "")) : null;
    const driver = assignment ? driverById.get(String(route?.driverId || vehicle?.assignedDriverId || "")) : null;
    const stop = assignment ? stopsById.get(String(assignment.stopId || "")) : null;

    const history = recentTripLogs
      .filter((row) => String(row.studentId) === String(student.id))
      .map((row) => {
        const trip = tripById.get(String(row.tripLogId || ""));
        const stopRow = stopsById.get(String(row.stopId || ""));
        return {
          id: String(row.id || ""),
          tripDate: safeString(trip?.tripDate),
          tripType: safeString(trip?.tripType),
          routeName: safeString(trip?.routeName),
          stopName: safeString(stopRow?.stopName),
          pickupStatus: safeString(row.pickupStatus || "not_applicable").toLowerCase(),
          dropoffStatus: safeString(row.dropoffStatus || "not_applicable").toLowerCase(),
          remark: safeString(row.remark),
        };
      })
      .sort((a, b) => `${b.tripDate}-${b.tripType}`.localeCompare(`${a.tripDate}-${a.tripType}`))
      .slice(0, 8);

    const notifications = getTransportNotificationsForStudent(db, student.id)
      .slice(0, 6)
      .map((row) => ({
        id: row.id,
        type: row.notificationType,
        severity: row.severity,
        message: row.message,
        reportedAt: row.createdAt,
        title: row.title,
      }));

    return {
      studentId: String(student.id),
      studentName: safeString(student.name),
      className: safeString(student.className),
      assignment: assignment
        ? {
            assignmentId: assignment.id,
            status: assignment.status,
            direction: assignment.transportDirection,
            routeName: assignment.routeName,
            vehicleName: safeString(vehicle?.vehicleName),
            driverName: safeString(driver?.driverName),
            driverPhone: safeString(driver?.phone),
            stopName: safeString(stop?.stopName),
            pickupTime: safeString(stop?.pickupTime),
            dropoffTime: safeString(stop?.dropoffTime),
            routeStatus: safeString(route?.status),
          }
        : null,
      recentHistory: history,
      notifications,
    };
  });

  return {
    summary: {
      childrenWithTransport: children.filter((row) => row.assignment).length,
      activeRoutes: uniqueBy(children.map((row) => row.assignment).filter(Boolean), (row) => String(row.routeName)).length,
      openAlerts: children.reduce((sum, row) => sum + row.notifications.length, 0),
    },
    children,
  };
}

function requireVehicle(db, vehicleId) {
  const vehicle = getEnrichedVehicles(db).find((row) => String(row.id) === String(vehicleId));
  if (!vehicle) {
    const error = new Error("Vehicle not found.");
    error.status = 404;
    throw error;
  }
  return vehicle;
}

function requireDriver(db, driverId) {
  const driver = getEnrichedDrivers(db).find((row) => String(row.id) === String(driverId));
  if (!driver) {
    const error = new Error("Driver not found.");
    error.status = 404;
    throw error;
  }
  return driver;
}

function requireRoute(db, routeId) {
  const route = getEnrichedRoutes(db).find((row) => String(row.id) === String(routeId));
  if (!route) {
    const error = new Error("Route not found.");
    error.status = 404;
    throw error;
  }
  return route;
}

function requireStop(db, stopId) {
  const stop = getEnrichedStops(db).find((row) => String(row.id) === String(stopId));
  if (!stop) {
    const error = new Error("Stop not found.");
    error.status = 404;
    throw error;
  }
  return stop;
}
function validateAssignmentCapacity(db, routeId, sessionId, termId, skipAssignmentId = "") {
  const route = requireRoute(db, routeId);
  const activeAssignments = getEnrichedAssignments(db).filter((row) => {
    if (skipAssignmentId && String(row.id) === String(skipAssignmentId)) return false;
    return (
      String(row.routeId) === String(routeId) &&
      row.status === "active" &&
      (!sessionId || String(row.sessionId) === String(sessionId)) &&
      (!termId || String(row.termId) === String(termId))
    );
  });

  if (route.capacity > 0 && activeAssignments.length >= route.capacity) {
    const error = new Error(`Route ${route.routeName} is already at capacity.`);
    error.status = 400;
    throw error;
  }
}

function ensureStudentTransportUniqueness(db, studentId, sessionId, termId, skipAssignmentId = "") {
  const duplicate = getEnrichedAssignments(db).find((row) => {
    if (skipAssignmentId && String(row.id) === String(skipAssignmentId)) return false;
    return (
      String(row.studentId) === String(studentId) &&
      row.status === "active" &&
      String(row.sessionId) === String(sessionId) &&
      String(row.termId) === String(termId)
    );
  });

  if (duplicate) {
    const error = new Error("This student already has an active transport assignment for the selected session and term.");
    error.status = 400;
    throw error;
  }
}

function validateTripStart(db, routeId, tripDate, tripType) {
  const route = requireRoute(db, routeId);
  const vehicle = requireVehicle(db, route.vehicleId);
  if (vehicle.status === "maintenance") {
    const error = new Error("A vehicle in maintenance cannot be used for an active trip.");
    error.status = 400;
    throw error;
  }

  const existingTrip = getEnrichedTripLogs(db).find(
    (row) => String(row.routeId) === String(routeId) && row.tripDate === tripDate && row.tripType === tripType
  );

  if (existingTrip) {
    const error = new Error("A trip log already exists for this route, date, and trip type.");
    error.status = 400;
    throw error;
  }

  return { route, vehicle };
}

function canUserManageRoute(db, user = {}, routeId) {
  const role = String(user.role || "").toUpperCase();
  if (["ADMIN", "TRANSPORT_ADMIN"].includes(role)) return true;

  const driver = resolveDriverForUser(db, user);
  if (!driver) return false;

  return getEnrichedRoutes(db).some(
    (row) => String(row.id) === String(routeId) && String(row.driverId || "") === String(driver.id)
  );
}

function updateTripStudentLogRecord(db, tripId, studentId, payload = {}, actorUser = {}) {
  const trip = getEnrichedTripLogs(db).find((row) => String(row.id) === String(tripId));
  if (!trip) {
    const error = new Error("Trip not found.");
    error.status = 404;
    throw error;
  }
  if (trip.status === "completed") {
    const error = new Error("Completed trip logs cannot be edited directly.");
    error.status = 400;
    throw error;
  }

  const index = db.transportTripStudentLogs.findIndex(
    (row) => String(row.tripLogId) === String(tripId) && String(row.studentId) === String(studentId)
  );
  if (index < 0) {
    const error = new Error("Trip student log not found.");
    error.status = 404;
    throw error;
  }

  db.transportTripStudentLogs[index] = {
    ...db.transportTripStudentLogs[index],
    pickupStatus:
      payload.pickupStatus === undefined ? db.transportTripStudentLogs[index].pickupStatus : safeString(payload.pickupStatus).toLowerCase(),
    dropoffStatus:
      payload.dropoffStatus === undefined ? db.transportTripStudentLogs[index].dropoffStatus : safeString(payload.dropoffStatus).toLowerCase(),
    remark: payload.remark === undefined ? db.transportTripStudentLogs[index].remark : safeString(payload.remark),
    markedAt: currentTimestamp(),
    updatedAt: currentTimestamp(),
  };

  const updatedRow = db.transportTripStudentLogs[index];
  if (
    ["missed", "absent", "not_boarded"].includes(String(updatedRow.pickupStatus || "").toLowerCase()) ||
    ["missed", "not_dropped"].includes(String(updatedRow.dropoffStatus || "").toLowerCase())
  ) {
    createTransportNotification(db, {
      studentId,
      routeId: trip.routeId,
      tripLogId: tripId,
      notificationType: "trip_exception",
      title: "Transport update",
      message:
        updatedRow.remark ||
        `Transport status changed for ${trip.routeName || "assigned route"}: pickup ${updatedRow.pickupStatus}, dropoff ${updatedRow.dropoffStatus}.`,
      severity: "medium",
    });
  }

  logAudit(db, actorUser.id, "updated_trip_student_log", "trip", tripId, { studentId });
  return getTripDetail(db, tripId);
}

function completeTripRecord(db, tripId, payload = {}, actorUser = {}) {
  const index = db.transportTripLogs.findIndex((row) => String(row.id) === String(tripId));
  if (index < 0) {
    const error = new Error("Trip not found.");
    error.status = 404;
    throw error;
  }

  const trip = db.transportTripLogs[index];
  db.transportTripLogs[index] = {
    ...trip,
    status: safeString(payload.status || "completed").toLowerCase(),
    completedAt: currentTimestamp(),
    notes: payload.notes === undefined ? trip.notes : safeString(payload.notes),
    delayMinutes: Math.max(0, safeNumber(payload.delayMinutes, trip.delayMinutes || 0)),
    updatedAt: currentTimestamp(),
  };

  logAudit(db, actorUser.id, "completed_trip", "trip", tripId, { status: db.transportTripLogs[index].status });
  return getTripDetail(db, tripId);
}

function resolveIncidentNotifications(db, incidentId) {
  ensureTransportCollections(db);
  const now = currentTimestamp();
  (db.transportNotifications || []).forEach((row) => {
    if (String(row.incidentId || "") !== String(incidentId)) return;
    row.status = "resolved";
    row.updatedAt = now;
  });
}

function createIncidentRecord(db, payload = {}, actorUser = {}) {
  const routeId = safeString(payload.routeId);
  const vehicleId = safeString(payload.vehicleId);
  if (routeId) requireRoute(db, routeId);
  if (vehicleId) requireVehicle(db, vehicleId);

  const tripLogId = safeString(payload.tripLogId);
  const tripDetail = tripLogId ? getTripDetail(db, tripLogId) : null;
  if (tripLogId && !tripDetail) {
    const error = new Error("Trip not found.");
    error.status = 404;
    throw error;
  }

  const now = currentTimestamp();
  const row = {
    id: createId("incident"),
    vehicleId: vehicleId || safeString(tripDetail?.vehicleId),
    routeId: routeId || safeString(tripDetail?.routeId),
    driverId: safeString(payload.driverId || tripDetail?.driverId),
    tripLogId,
    incidentType: safeString(payload.incidentType),
    description: safeString(payload.description),
    reportedAt: safeString(payload.reportedAt || now),
    reportedBy: safeString(actorUser.name || actorUser.username || actorUser.id),
    severity: safeString(payload.severity || "medium").toLowerCase(),
    status: safeString(payload.status || "open").toLowerCase(),
    createdAt: now,
    updatedAt: now,
  };

  db.transportIncidents.push(row);

  const impactedStudents = tripDetail
    ? uniqueBy((tripDetail.studentLogs || []).map((item) => String(item.studentId)).filter(Boolean), (value) => value)
    : uniqueBy(
        getEnrichedAssignments(db)
          .filter((item) => String(item.routeId) === String(row.routeId) && item.status === "active")
          .map((item) => String(item.studentId))
          .filter(Boolean),
        (value) => value
      );

  impactedStudents.forEach((studentId) => {
    createTransportNotification(db, {
      studentId,
      routeId: row.routeId,
      tripLogId: row.tripLogId,
      incidentId: row.id,
      notificationType: `incident_${safeString(row.incidentType || "update").toLowerCase()}`,
      title: "Transport incident",
      message: row.description || `${safeString(row.incidentType).replace(/_/g, " ")} reported for your child's transport route.`,
      severity: row.severity || "medium",
    });
  });

  logAudit(db, actorUser.id, "logged_incident", "incident", row.id, { incidentType: row.incidentType, routeId: row.routeId });
  return getEnrichedIncidents(db).find((item) => String(item.id) === String(row.id));
}

function buildDriverTransportOverview(db, user = {}) {
  const driver = resolveDriverForUser(db, user);
  if (!driver) return null;

  const trips = driverVisibleTrips(db, user);
  const today = asDateKey();
  const routeIds = uniqueBy(
    trips.map((row) => String(row.routeId)).filter(Boolean),
    (value) => value
  );
  const routeRows = getEnrichedRoutes(db).filter((row) => routeIds.includes(String(row.id)));
  const incidents = getEnrichedIncidents(db).filter(
    (row) => String(row.driverId || "") === String(driver.id) || routeIds.includes(String(row.routeId || ""))
  );

  return {
    driver,
    summary: {
      assignedRoutes: routeRows.length,
      tripsToday: trips.filter((row) => row.tripDate === today).length,
      activeTrips: trips.filter((row) => row.tripDate === today && ["scheduled", "in_progress", "delayed"].includes(row.status)).length,
      openIncidents: incidents.filter((row) => row.status === "open").length,
    },
    todayTrips: trips.filter((row) => row.tripDate === today).slice(0, 12),
    routes: routeRows.slice(0, 12),
    incidents: incidents.slice(0, 8),
  };
}

router.get("/setup", auth(), requireRole("ADMIN", "TRANSPORT_ADMIN"), (req, res) => {
  const db = ensureTransportCollections(readDB());
  const maps = getMaps(db);
  const activeSession = getActiveSession(db);
  const activeTerm = getActiveTerm(db, activeSession?.id);
  const users = Array.isArray(db.users) ? db.users : [];

  const transportUsers = users.filter((row) => !["STUDENT", "PARENT", "APPLICANT"].includes(String(row.role || "").toUpperCase()));
  const students = Array.from(maps.studentById.values())
    .map((row) => ({
      id: String(row.id),
      name: safeString(row.name),
      classId: safeString(row.classId),
      className: safeString(row.className || maps.classById.get(String(row.classId || ""))?.name),
      parentPhone: safeString(row.parentPhone),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  res.json({
    sessions: Array.isArray(db.academicSessions) ? db.academicSessions : [],
    terms: Array.isArray(db.terms) ? db.terms : [],
    classes: Array.isArray(db.classes) ? db.classes : [],
    students,
    invoices: Array.isArray(db.invoices) ? db.invoices : [],
    activeSessionId: safeString(activeSession?.id),
    activeTermId: safeString(activeTerm?.id),
    driverCandidates: transportUsers.map((row) => ({
      id: String(row.id),
      name: safeString(row.name),
      role: safeString(row.role),
      phone: safeString(row.phone),
    })),
  });
});

router.get("/dashboard", auth(), requireRole("ADMIN", "TRANSPORT_ADMIN"), (req, res) => {
  const db = ensureTransportCollections(readDB());
  res.json(buildTransportDashboard(db));
});

router.get("/vehicles", auth(), requireRole("ADMIN", "TRANSPORT_ADMIN"), (req, res) => {
  const db = ensureTransportCollections(readDB());
  res.json({ vehicles: getEnrichedVehicles(db) });
});

router.post("/vehicles", auth(), requireRole("ADMIN", "TRANSPORT_ADMIN"), (req, res, next) => {
  try {
    const db = ensureTransportCollections(readDB());
    const vehicleName = safeString(req.body.vehicleName);
    const plateNumber = safeString(req.body.plateNumber);
    const capacity = Math.max(0, safeNumber(req.body.capacity, 0));
    if (!vehicleName || !plateNumber || !capacity) {
      return res.status(400).json({ message: "Vehicle name, plate number, and capacity are required." });
    }

    const assignedDriverId = safeString(req.body.assignedDriverId);
    if (assignedDriverId) requireDriver(db, assignedDriverId);

    const now = currentTimestamp();
    const row = {
      id: createId("vehicle"),
      vehicleName,
      plateNumber,
      capacity,
      model: safeString(req.body.model),
      color: safeString(req.body.color),
      manufacturer: safeString(req.body.manufacturer),
      yearOfManufacture: safeString(req.body.yearOfManufacture),
      insuranceExpiryDate: safeString(req.body.insuranceExpiryDate),
      roadworthinessExpiryDate: safeString(req.body.roadworthinessExpiryDate),
      assignedDriverId,
      status: safeString(req.body.status || "active").toLowerCase(),
      notes: safeString(req.body.notes),
      createdAt: now,
      updatedAt: now,
    };

    db.transportVehicles.push(row);
    logAudit(db, req.user.id, "created_vehicle", "vehicle", row.id, { vehicleName, plateNumber });
    writeDB(db);
    res.status(201).json({ vehicle: getEnrichedVehicles(db).find((item) => String(item.id) === String(row.id)) });
  } catch (error) {
    next(error);
  }
});

router.patch("/vehicles/:id", auth(), requireRole("ADMIN", "TRANSPORT_ADMIN"), (req, res, next) => {
  try {
    const db = ensureTransportCollections(readDB());
    const index = db.transportVehicles.findIndex((row) => String(row.id) === String(req.params.id));
    if (index < 0) return res.status(404).json({ message: "Vehicle not found." });
    const assignedDriverId = safeString(req.body.assignedDriverId || db.transportVehicles[index].assignedDriverId);
    if (assignedDriverId) requireDriver(db, assignedDriverId);

    db.transportVehicles[index] = {
      ...db.transportVehicles[index],
      vehicleName: safeString(req.body.vehicleName || db.transportVehicles[index].vehicleName),
      plateNumber: safeString(req.body.plateNumber || db.transportVehicles[index].plateNumber),
      capacity: Math.max(0, safeNumber(req.body.capacity, db.transportVehicles[index].capacity)),
      model: req.body.model === undefined ? db.transportVehicles[index].model : safeString(req.body.model),
      color: req.body.color === undefined ? db.transportVehicles[index].color : safeString(req.body.color),
      manufacturer: req.body.manufacturer === undefined ? db.transportVehicles[index].manufacturer : safeString(req.body.manufacturer),
      yearOfManufacture: req.body.yearOfManufacture === undefined ? db.transportVehicles[index].yearOfManufacture : safeString(req.body.yearOfManufacture),
      insuranceExpiryDate:
        req.body.insuranceExpiryDate === undefined ? db.transportVehicles[index].insuranceExpiryDate : safeString(req.body.insuranceExpiryDate),
      roadworthinessExpiryDate:
        req.body.roadworthinessExpiryDate === undefined
          ? db.transportVehicles[index].roadworthinessExpiryDate
          : safeString(req.body.roadworthinessExpiryDate),
      assignedDriverId,
      status: safeString(req.body.status || db.transportVehicles[index].status).toLowerCase(),
      notes: req.body.notes === undefined ? db.transportVehicles[index].notes : safeString(req.body.notes),
      updatedAt: currentTimestamp(),
    };

    logAudit(db, req.user.id, "updated_vehicle", "vehicle", req.params.id, { status: db.transportVehicles[index].status });
    writeDB(db);
    res.json({ vehicle: getEnrichedVehicles(db).find((item) => String(item.id) === String(req.params.id)) });
  } catch (error) {
    next(error);
  }
});

router.get("/drivers", auth(), requireRole("ADMIN", "TRANSPORT_ADMIN"), (req, res) => {
  const db = ensureTransportCollections(readDB());
  res.json({ drivers: getEnrichedDrivers(db) });
});

router.post("/drivers", auth(), requireRole("ADMIN", "TRANSPORT_ADMIN"), (req, res) => {
  const db = ensureTransportCollections(readDB());
  const userId = safeString(req.body.userId);
  const driverName = safeString(req.body.driverName);
  if (!userId && !driverName) {
    return res.status(400).json({ message: "Select a linked user or provide a driver name." });
  }
  if (userId && !getMaps(db).userById.has(userId)) {
    return res.status(404).json({ message: "Linked user not found." });
  }

  const now = currentTimestamp();
  const row = {
    id: createId("driver"),
    userId,
    driverName,
    licenseNumber: safeString(req.body.licenseNumber),
    licenseExpiryDate: safeString(req.body.licenseExpiryDate),
    phone: safeString(req.body.phone),
    address: safeString(req.body.address),
    emergencyContactName: safeString(req.body.emergencyContactName),
    emergencyContactPhone: safeString(req.body.emergencyContactPhone),
    status: safeString(req.body.status || "active").toLowerCase(),
    createdAt: now,
    updatedAt: now,
  };

  db.transportDrivers.push(row);
  logAudit(db, req.user.id, "created_driver", "driver", row.id, { driverName: driverName || userId });
  writeDB(db);
  res.status(201).json({ driver: getEnrichedDrivers(db).find((item) => String(item.id) === String(row.id)) });
});

router.patch("/drivers/:id", auth(), requireRole("ADMIN", "TRANSPORT_ADMIN"), (req, res) => {
  const db = ensureTransportCollections(readDB());
  const index = db.transportDrivers.findIndex((row) => String(row.id) === String(req.params.id));
  if (index < 0) return res.status(404).json({ message: "Driver not found." });

  const userId = req.body.userId === undefined ? db.transportDrivers[index].userId : safeString(req.body.userId);
  if (userId && !getMaps(db).userById.has(userId)) {
    return res.status(404).json({ message: "Linked user not found." });
  }

  db.transportDrivers[index] = {
    ...db.transportDrivers[index],
    userId,
    driverName: req.body.driverName === undefined ? db.transportDrivers[index].driverName : safeString(req.body.driverName),
    licenseNumber: req.body.licenseNumber === undefined ? db.transportDrivers[index].licenseNumber : safeString(req.body.licenseNumber),
    licenseExpiryDate:
      req.body.licenseExpiryDate === undefined ? db.transportDrivers[index].licenseExpiryDate : safeString(req.body.licenseExpiryDate),
    phone: req.body.phone === undefined ? db.transportDrivers[index].phone : safeString(req.body.phone),
    address: req.body.address === undefined ? db.transportDrivers[index].address : safeString(req.body.address),
    emergencyContactName:
      req.body.emergencyContactName === undefined ? db.transportDrivers[index].emergencyContactName : safeString(req.body.emergencyContactName),
    emergencyContactPhone:
      req.body.emergencyContactPhone === undefined ? db.transportDrivers[index].emergencyContactPhone : safeString(req.body.emergencyContactPhone),
    status: safeString(req.body.status || db.transportDrivers[index].status).toLowerCase(),
    updatedAt: currentTimestamp(),
  };

  logAudit(db, req.user.id, "updated_driver", "driver", req.params.id, { status: db.transportDrivers[index].status });
  writeDB(db);
  res.json({ driver: getEnrichedDrivers(db).find((item) => String(item.id) === String(req.params.id)) });
});
router.get("/routes", auth(), requireRole("ADMIN", "TRANSPORT_ADMIN"), (req, res) => {
  const db = ensureTransportCollections(readDB());
  res.json({ routes: getEnrichedRoutes(db) });
});

router.get("/routes/:id", auth(), requireRole("ADMIN", "TRANSPORT_ADMIN"), (req, res, next) => {
  try {
    const db = ensureTransportCollections(readDB());
    const route = requireRoute(db, req.params.id);
    const stops = getEnrichedStops(db, req.params.id);
    const assignments = getEnrichedAssignments(db).filter((row) => String(row.routeId) === String(req.params.id));
    res.json({ route, stops, assignments });
  } catch (error) {
    next(error);
  }
});

router.post("/routes", auth(), requireRole("ADMIN", "TRANSPORT_ADMIN"), (req, res, next) => {
  try {
    const db = ensureTransportCollections(readDB());
    const routeName = safeString(req.body.routeName);
    const vehicleId = safeString(req.body.vehicleId);
    if (!routeName || !vehicleId) {
      return res.status(400).json({ message: "Route name and vehicle are required." });
    }

    const vehicle = requireVehicle(db, vehicleId);
    const driverId = safeString(req.body.driverId || vehicle.assignedDriverId);
    if (driverId) requireDriver(db, driverId);

    const now = currentTimestamp();
    const row = {
      id: createId("route"),
      routeName,
      vehicleId,
      driverId,
      direction: safeString(req.body.direction || "combined").toLowerCase(),
      estimatedStartTime: safeString(req.body.estimatedStartTime),
      estimatedEndTime: safeString(req.body.estimatedEndTime),
      status: safeString(req.body.status || "active").toLowerCase(),
      notes: safeString(req.body.notes),
      createdAt: now,
      updatedAt: now,
    };

    db.transportRoutes.push(row);
    logAudit(db, req.user.id, "created_route", "route", row.id, { routeName });
    writeDB(db);
    res.status(201).json({ route: getEnrichedRoutes(db).find((item) => String(item.id) === String(row.id)) });
  } catch (error) {
    next(error);
  }
});

router.patch("/routes/:id", auth(), requireRole("ADMIN", "TRANSPORT_ADMIN"), (req, res, next) => {
  try {
    const db = ensureTransportCollections(readDB());
    const index = db.transportRoutes.findIndex((row) => String(row.id) === String(req.params.id));
    if (index < 0) return res.status(404).json({ message: "Route not found." });

    const vehicleId = req.body.vehicleId === undefined ? db.transportRoutes[index].vehicleId : safeString(req.body.vehicleId);
    const driverId = req.body.driverId === undefined ? db.transportRoutes[index].driverId : safeString(req.body.driverId);
    if (vehicleId) requireVehicle(db, vehicleId);
    if (driverId) requireDriver(db, driverId);

    db.transportRoutes[index] = {
      ...db.transportRoutes[index],
      routeName: req.body.routeName === undefined ? db.transportRoutes[index].routeName : safeString(req.body.routeName),
      vehicleId,
      driverId,
      direction: safeString(req.body.direction || db.transportRoutes[index].direction).toLowerCase(),
      estimatedStartTime:
        req.body.estimatedStartTime === undefined ? db.transportRoutes[index].estimatedStartTime : safeString(req.body.estimatedStartTime),
      estimatedEndTime:
        req.body.estimatedEndTime === undefined ? db.transportRoutes[index].estimatedEndTime : safeString(req.body.estimatedEndTime),
      status: safeString(req.body.status || db.transportRoutes[index].status).toLowerCase(),
      notes: req.body.notes === undefined ? db.transportRoutes[index].notes : safeString(req.body.notes),
      updatedAt: currentTimestamp(),
    };

    logAudit(db, req.user.id, "updated_route", "route", req.params.id, { status: db.transportRoutes[index].status });
    writeDB(db);
    res.json({ route: getEnrichedRoutes(db).find((item) => String(item.id) === String(req.params.id)) });
  } catch (error) {
    next(error);
  }
});

router.post("/routes/:id/stops", auth(), requireRole("ADMIN", "TRANSPORT_ADMIN"), (req, res, next) => {
  try {
    const db = ensureTransportCollections(readDB());
    requireRoute(db, req.params.id);
    const stopName = safeString(req.body.stopName);
    if (!stopName) return res.status(400).json({ message: "Stop name is required." });

    const currentStops = getEnrichedStops(db, req.params.id);
    const requestedOrder = safeNumber(req.body.stopOrder, currentStops.length + 1);
    const now = currentTimestamp();
    const row = {
      id: createId("stop"),
      routeId: req.params.id,
      stopName,
      stopOrder: requestedOrder,
      landmark: safeString(req.body.landmark),
      pickupTime: safeString(req.body.pickupTime),
      dropoffTime: safeString(req.body.dropoffTime),
      latitude: safeString(req.body.latitude),
      longitude: safeString(req.body.longitude),
      status: safeString(req.body.status || "active").toLowerCase(),
      createdAt: now,
      updatedAt: now,
    };

    db.transportStops.push(row);
    db.transportStops = db.transportStops
      .sort((a, b) => {
        if (String(a.routeId) !== String(b.routeId)) return 0;
        return safeNumber(a.stopOrder, 0) - safeNumber(b.stopOrder, 0);
      })
      .map((item, index, array) => {
        if (String(item.routeId) !== String(req.params.id)) return item;
        const sameRouteBefore = array.filter((candidate, idx) => idx <= index && String(candidate.routeId) === String(req.params.id));
        return { ...item, stopOrder: sameRouteBefore.length, updatedAt: currentTimestamp() };
      });

    logAudit(db, req.user.id, "created_stop", "stop", row.id, { routeId: req.params.id, stopName });
    writeDB(db);
    res.status(201).json({ stops: getEnrichedStops(db, req.params.id) });
  } catch (error) {
    next(error);
  }
});

router.patch("/stops/:id", auth(), requireRole("ADMIN", "TRANSPORT_ADMIN"), (req, res, next) => {
  try {
    const db = ensureTransportCollections(readDB());
    const index = db.transportStops.findIndex((row) => String(row.id) === String(req.params.id));
    if (index < 0) return res.status(404).json({ message: "Stop not found." });

    db.transportStops[index] = {
      ...db.transportStops[index],
      stopName: req.body.stopName === undefined ? db.transportStops[index].stopName : safeString(req.body.stopName),
      stopOrder: req.body.stopOrder === undefined ? db.transportStops[index].stopOrder : Math.max(1, safeNumber(req.body.stopOrder, 1)),
      landmark: req.body.landmark === undefined ? db.transportStops[index].landmark : safeString(req.body.landmark),
      pickupTime: req.body.pickupTime === undefined ? db.transportStops[index].pickupTime : safeString(req.body.pickupTime),
      dropoffTime: req.body.dropoffTime === undefined ? db.transportStops[index].dropoffTime : safeString(req.body.dropoffTime),
      latitude: req.body.latitude === undefined ? db.transportStops[index].latitude : safeString(req.body.latitude),
      longitude: req.body.longitude === undefined ? db.transportStops[index].longitude : safeString(req.body.longitude),
      status: safeString(req.body.status || db.transportStops[index].status).toLowerCase(),
      updatedAt: currentTimestamp(),
    };

    logAudit(db, req.user.id, "updated_stop", "stop", req.params.id, { routeId: db.transportStops[index].routeId });
    writeDB(db);
    res.json({ stops: getEnrichedStops(db, db.transportStops[index].routeId) });
  } catch (error) {
    next(error);
  }
});

router.get("/assignments", auth(), requireRole("ADMIN", "TRANSPORT_ADMIN"), (req, res) => {
  const db = ensureTransportCollections(readDB());
  let rows = getEnrichedAssignments(db);
  if (req.query.routeId) rows = rows.filter((row) => String(row.routeId) === String(req.query.routeId));
  if (req.query.status) rows = rows.filter((row) => row.status === safeString(req.query.status).toLowerCase());
  res.json({ assignments: rows });
});

router.post("/assignments", auth(), requireRole("ADMIN", "TRANSPORT_ADMIN"), (req, res, next) => {
  try {
    const db = ensureTransportCollections(readDB());
    const maps = getMaps(db);
    const studentId = safeString(req.body.studentId);
    const routeId = safeString(req.body.routeId);
    const stopId = safeString(req.body.stopId);
    if (!studentId || !routeId || !stopId) {
      return res.status(400).json({ message: "Student, route, and stop are required." });
    }
    if (!maps.studentById.has(studentId)) {
      return res.status(404).json({ message: "Student not found." });
    }

    const route = requireRoute(db, routeId);
    const stop = requireStop(db, stopId);
    if (String(stop.routeId) !== String(routeId)) {
      return res.status(400).json({ message: "Selected stop does not belong to the chosen route." });
    }

    const sessionId = safeString(req.body.sessionId || getActiveSession(db)?.id);
    const termId = safeString(req.body.termId || getActiveTerm(db, sessionId)?.id);
    validateAssignmentCapacity(db, routeId, sessionId, termId);
    ensureStudentTransportUniqueness(db, studentId, sessionId, termId);

    const studentUser = (Array.isArray(db.users) ? db.users : []).find((row) => String(row.studentId || "") === String(studentId));
    const now = currentTimestamp();
    const row = {
      id: createId("assignment"),
      studentId,
      studentUserId: safeString(studentUser?.id),
      vehicleId: route.vehicleId,
      routeId,
      stopId,
      sessionId,
      termId,
      transportDirection: safeString(req.body.transportDirection || "both").toLowerCase(),
      assignedAt: now,
      status: safeString(req.body.status || "active").toLowerCase(),
      notes: safeString(req.body.notes),
      createdAt: now,
      updatedAt: now,
    };

    db.studentTransportAssignments.push(row);
    logAudit(db, req.user.id, "assigned_student", "assignment", row.id, { studentId, routeId, stopId });
    writeDB(db);
    res.status(201).json({ assignment: getEnrichedAssignments(db).find((item) => String(item.id) === String(row.id)) });
  } catch (error) {
    next(error);
  }
});

router.patch("/assignments/:id", auth(), requireRole("ADMIN", "TRANSPORT_ADMIN"), (req, res, next) => {
  try {
    const db = ensureTransportCollections(readDB());
    const index = db.studentTransportAssignments.findIndex((row) => String(row.id) === String(req.params.id));
    if (index < 0) return res.status(404).json({ message: "Assignment not found." });

    const current = db.studentTransportAssignments[index];
    const routeId = req.body.routeId === undefined ? current.routeId : safeString(req.body.routeId);
    const stopId = req.body.stopId === undefined ? current.stopId : safeString(req.body.stopId);
    const sessionId = req.body.sessionId === undefined ? current.sessionId : safeString(req.body.sessionId);
    const termId = req.body.termId === undefined ? current.termId : safeString(req.body.termId);

    const route = requireRoute(db, routeId);
    const stop = requireStop(db, stopId);
    if (String(stop.routeId) !== String(routeId)) {
      return res.status(400).json({ message: "Selected stop does not belong to the chosen route." });
    }

    if (String(req.body.status || current.status).toLowerCase() === "active") {
      validateAssignmentCapacity(db, routeId, sessionId, termId, req.params.id);
      ensureStudentTransportUniqueness(db, current.studentId, sessionId, termId, req.params.id);
    }

    db.studentTransportAssignments[index] = {
      ...current,
      routeId,
      stopId,
      vehicleId: route.vehicleId,
      sessionId,
      termId,
      transportDirection:
        req.body.transportDirection === undefined ? current.transportDirection : safeString(req.body.transportDirection).toLowerCase(),
      status: safeString(req.body.status || current.status).toLowerCase(),
      notes: req.body.notes === undefined ? current.notes : safeString(req.body.notes),
      updatedAt: currentTimestamp(),
    };

    logAudit(db, req.user.id, "changed_assignment", "assignment", req.params.id, { routeId, stopId, status: db.studentTransportAssignments[index].status });
    writeDB(db);
    res.json({ assignment: getEnrichedAssignments(db).find((item) => String(item.id) === String(req.params.id)) });
  } catch (error) {
    next(error);
  }
});
router.get("/trips", auth(), requireRole("ADMIN", "TRANSPORT_ADMIN"), (req, res) => {
  const db = ensureTransportCollections(readDB());
  let rows = getEnrichedTripLogs(db);
  if (req.query.tripDate) rows = rows.filter((row) => row.tripDate === safeString(req.query.tripDate));
  if (req.query.status) rows = rows.filter((row) => row.status === safeString(req.query.status).toLowerCase());
  res.json({ trips: rows });
});

router.get("/trips/:id", auth(), requireRole("ADMIN", "TRANSPORT_ADMIN"), (req, res) => {
  const db = ensureTransportCollections(readDB());
  const detail = getTripDetail(db, req.params.id);
  if (!detail) return res.status(404).json({ message: "Trip not found." });
  res.json({ trip: detail });
});

router.post("/trips/start", auth(), requireRole("ADMIN", "TRANSPORT_ADMIN"), (req, res, next) => {
  try {
    const db = ensureTransportCollections(readDB());
    const routeId = safeString(req.body.routeId);
    const tripDate = safeString(req.body.tripDate || asDateKey());
    const tripType = safeString(req.body.tripType || "morning_pickup").toLowerCase();
    if (!routeId) return res.status(400).json({ message: "Route is required." });

    const { route, vehicle } = validateTripStart(db, routeId, tripDate, tripType);
    const activeAssignments = getEnrichedAssignments(db).filter((row) => {
      if (String(row.routeId) !== String(routeId) || row.status !== "active") return false;
      if (tripType === "morning_pickup") return ["morning_only", "both"].includes(row.transportDirection);
      if (tripType === "afternoon_dropoff") return ["afternoon_only", "both"].includes(row.transportDirection);
      return true;
    });

    const now = currentTimestamp();
    const trip = {
      id: createId("trip"),
      vehicleId: vehicle.id,
      routeId: route.id,
      driverId: route.driverId || vehicle.assignedDriverId,
      tripDate,
      tripType,
      scheduledStartTime: safeString(req.body.scheduledStartTime || route.estimatedStartTime),
      actualStartTime: safeString(req.body.actualStartTime || now),
      completedAt: "",
      status: safeString(req.body.status || "in_progress").toLowerCase(),
      delayMinutes: Math.max(0, safeNumber(req.body.delayMinutes, 0)),
      notes: safeString(req.body.notes),
      createdBy: safeString(req.user.id),
      createdAt: now,
      updatedAt: now,
    };

    db.transportTripLogs.push(trip);
    const studentLogs = activeAssignments.map((assignment) => ({
      id: createId("trip-student"),
      tripLogId: trip.id,
      studentId: assignment.studentId,
      stopId: assignment.stopId,
      pickupStatus: tripType === "morning_pickup" ? "not_boarded" : "not_applicable",
      dropoffStatus: tripType === "afternoon_dropoff" ? "not_dropped" : "not_applicable",
      markedAt: now,
      remark: "",
      createdAt: now,
      updatedAt: now,
    }));
    db.transportTripStudentLogs.push(...studentLogs);
    logAudit(db, req.user.id, "started_trip", "trip", trip.id, { routeId, tripDate, tripType, studentCount: studentLogs.length });
    writeDB(db);
    res.status(201).json({ trip: getTripDetail(db, trip.id) });
  } catch (error) {
    next(error);
  }
});

router.patch("/trips/:id/students/:studentId", auth(), requireRole("ADMIN", "TRANSPORT_ADMIN"), (req, res, next) => {
  try {
    const db = ensureTransportCollections(readDB());
    const trip = updateTripStudentLogRecord(db, req.params.id, req.params.studentId, req.body || {}, req.user || {});
    writeDB(db);
    res.json({ trip });
  } catch (error) {
    next(error);
  }
});

router.post("/trips/:id/complete", auth(), requireRole("ADMIN", "TRANSPORT_ADMIN"), (req, res, next) => {
  try {
    const db = ensureTransportCollections(readDB());
    const trip = completeTripRecord(db, req.params.id, req.body || {}, req.user || {});
    writeDB(db);
    res.json({ trip });
  } catch (error) {
    next(error);
  }
});

router.get("/incidents", auth(), requireRole("ADMIN", "TRANSPORT_ADMIN"), (req, res) => {
  const db = ensureTransportCollections(readDB());
  res.json({ incidents: getEnrichedIncidents(db) });
});

router.post("/incidents", auth(), requireRole("ADMIN", "TRANSPORT_ADMIN"), (req, res, next) => {
  try {
    const db = ensureTransportCollections(readDB());
    const incident = createIncidentRecord(db, req.body || {}, req.user || {});
    writeDB(db);
    res.status(201).json({ incident });
  } catch (error) {
    next(error);
  }
});

router.patch("/incidents/:id", auth(), requireRole("ADMIN", "TRANSPORT_ADMIN"), (req, res) => {
  const db = ensureTransportCollections(readDB());
  const index = db.transportIncidents.findIndex((row) => String(row.id) === String(req.params.id));
  if (index < 0) return res.status(404).json({ message: "Incident not found." });

  db.transportIncidents[index] = {
    ...db.transportIncidents[index],
    severity: safeString(req.body.severity || db.transportIncidents[index].severity).toLowerCase(),
    status: safeString(req.body.status || db.transportIncidents[index].status).toLowerCase(),
    description: req.body.description === undefined ? db.transportIncidents[index].description : safeString(req.body.description),
    updatedAt: currentTimestamp(),
  };

  if (db.transportIncidents[index].status === "resolved") {
    resolveIncidentNotifications(db, req.params.id);
  }

  logAudit(db, req.user.id, "updated_incident", "incident", req.params.id, { status: db.transportIncidents[index].status });
  writeDB(db);
  res.json({ incident: getEnrichedIncidents(db).find((item) => String(item.id) === String(req.params.id)) });
});

router.get("/maintenance", auth(), requireRole("ADMIN", "TRANSPORT_ADMIN"), (req, res) => {
  const db = ensureTransportCollections(readDB());
  res.json({ maintenance: getEnrichedMaintenance(db) });
});

router.post("/maintenance", auth(), requireRole("ADMIN", "TRANSPORT_ADMIN"), (req, res, next) => {
  try {
    const db = ensureTransportCollections(readDB());
    const vehicleId = safeString(req.body.vehicleId);
    if (!vehicleId) return res.status(400).json({ message: "Vehicle is required." });
    requireVehicle(db, vehicleId);

    const now = currentTimestamp();
    const row = {
      id: createId("maintenance"),
      vehicleId,
      maintenanceType: safeString(req.body.maintenanceType),
      description: safeString(req.body.description),
      serviceDate: safeString(req.body.serviceDate || asDateKey()),
      nextServiceDate: safeString(req.body.nextServiceDate),
      cost: Math.max(0, safeNumber(req.body.cost, 0)),
      vendorName: safeString(req.body.vendorName),
      status: safeString(req.body.status || "completed").toLowerCase(),
      createdAt: now,
      updatedAt: now,
    };

    db.vehicleMaintenanceLogs.push(row);
    if (["due", "overdue"].includes(row.status)) {
      const vehicleIndex = db.transportVehicles.findIndex((item) => String(item.id) === String(vehicleId));
      if (vehicleIndex >= 0) {
        db.transportVehicles[vehicleIndex] = {
          ...db.transportVehicles[vehicleIndex],
          status: "maintenance",
          updatedAt: now,
        };
      }
    }

    logAudit(db, req.user.id, "logged_maintenance", "maintenance", row.id, { vehicleId, maintenanceType: row.maintenanceType });
    writeDB(db);
    res.status(201).json({ maintenance: getEnrichedMaintenance(db).find((item) => String(item.id) === String(row.id)) });
  } catch (error) {
    next(error);
  }
});

router.get("/fees", auth(), requireRole("ADMIN", "TRANSPORT_ADMIN"), (req, res) => {
  const db = ensureTransportCollections(readDB());
  res.json({ fees: getEnrichedTransportFees(db) });
});

router.post("/fees", auth(), requireRole("ADMIN", "TRANSPORT_ADMIN"), (req, res, next) => {
  try {
    const db = ensureTransportCollections(readDB());
    const studentId = safeString(req.body.studentId);
    const routeId = safeString(req.body.routeId);
    if (!studentId || !routeId) {
      return res.status(400).json({ message: "Student and route are required." });
    }
    if (!getMaps(db).studentById.has(studentId)) {
      return res.status(404).json({ message: "Student not found." });
    }
    const route = requireRoute(db, routeId);

    const now = currentTimestamp();
    const row = {
      id: createId("transport-fee"),
      studentId,
      routeId,
      amount: Math.max(0, safeNumber(req.body.amount, 0)),
      sessionId: safeString(req.body.sessionId || getActiveSession(db)?.id),
      termId: safeString(req.body.termId || getActiveTerm(db, req.body.sessionId || getActiveSession(db)?.id)?.id),
      billingStatus: safeString(req.body.billingStatus || "pending").toLowerCase(),
      invoiceId: safeString(req.body.invoiceId),
      routeName: route.routeName,
      createdAt: now,
      updatedAt: now,
    };

    const invoice = syncTransportFeeInvoice(db, row, req.user.id);
    row.invoiceId = safeString(invoice?.id);
    row.billingStatus = safeString(invoice?.status || row.billingStatus).toLowerCase();

    db.transportFeeAssignments.push(row);
    logAudit(db, req.user.id, "created_transport_fee", "transport_fee", row.id, { studentId, routeId, amount: row.amount, invoiceId: row.invoiceId });
    writeDB(db);
    res.status(201).json({ fee: getEnrichedTransportFees(db).find((item) => String(item.id) === String(row.id)) });
  } catch (error) {
    next(error);
  }
});

router.get("/driver/overview", auth(), requireRole("ADMIN", "TRANSPORT_ADMIN", "DRIVER"), (req, res) => {
  const db = ensureTransportCollections(readDB());
  const overview = buildDriverTransportOverview(db, req.user || {});
  if (!overview) return res.status(404).json({ message: "No transport driver profile is linked to this account." });
  res.json(overview);
});

router.get("/driver/trips", auth(), requireRole("ADMIN", "TRANSPORT_ADMIN", "DRIVER"), (req, res) => {
  const db = ensureTransportCollections(readDB());
  let rows = driverVisibleTrips(db, req.user || {});
  if (req.query.tripDate) rows = rows.filter((row) => row.tripDate === safeString(req.query.tripDate));
  if (req.query.status) rows = rows.filter((row) => row.status === safeString(req.query.status).toLowerCase());
  res.json({ trips: rows });
});

router.get("/driver/trips/:id", auth(), requireRole("ADMIN", "TRANSPORT_ADMIN", "DRIVER"), (req, res) => {
  const db = ensureTransportCollections(readDB());
  if (!canUserManageTrip(db, req.user || {}, req.params.id)) {
    return res.status(403).json({ message: "You can only view your assigned trips." });
  }
  const detail = getTripDetail(db, req.params.id);
  if (!detail) return res.status(404).json({ message: "Trip not found." });
  res.json({ trip: detail });
});

router.patch("/driver/trips/:id/students/:studentId", auth(), requireRole("ADMIN", "TRANSPORT_ADMIN", "DRIVER"), (req, res, next) => {
  try {
    const db = ensureTransportCollections(readDB());
    if (!canUserManageTrip(db, req.user || {}, req.params.id)) {
      return res.status(403).json({ message: "You can only update your assigned trips." });
    }
    const trip = updateTripStudentLogRecord(db, req.params.id, req.params.studentId, req.body || {}, req.user || {});
    writeDB(db);
    res.json({ trip });
  } catch (error) {
    next(error);
  }
});

router.post("/driver/trips/:id/complete", auth(), requireRole("ADMIN", "TRANSPORT_ADMIN", "DRIVER"), (req, res, next) => {
  try {
    const db = ensureTransportCollections(readDB());
    if (!canUserManageTrip(db, req.user || {}, req.params.id)) {
      return res.status(403).json({ message: "You can only complete your assigned trips." });
    }
    const trip = completeTripRecord(db, req.params.id, req.body || {}, req.user || {});
    writeDB(db);
    res.json({ trip });
  } catch (error) {
    next(error);
  }
});

router.post("/driver/incidents", auth(), requireRole("ADMIN", "TRANSPORT_ADMIN", "DRIVER"), (req, res, next) => {
  try {
    const db = ensureTransportCollections(readDB());
    const tripLogId = safeString(req.body.tripLogId);
    const routeId = safeString(req.body.routeId);
    if (tripLogId && !canUserManageTrip(db, req.user || {}, tripLogId)) {
      return res.status(403).json({ message: "You can only log incidents for your assigned trips." });
    }
    if (!tripLogId && routeId && !canUserManageRoute(db, req.user || {}, routeId)) {
      return res.status(403).json({ message: "You can only log incidents for your assigned routes." });
    }
    const incident = createIncidentRecord(db, req.body || {}, req.user || {});
    writeDB(db);
    res.status(201).json({ incident });
  } catch (error) {
    next(error);
  }
});
router.get("/reports", auth(), requireRole("ADMIN", "TRANSPORT_ADMIN"), (req, res) => {
  const db = ensureTransportCollections(readDB());
  res.json({ reports: buildTransportReports(db) });
});

router.get("/parent/overview", auth(), requireRole("PARENT"), (req, res) => {
  const db = ensureTransportCollections(readDB());
  const studentIds = uniqueBy(
    [req.user.studentId, ...(Array.isArray(req.user.studentIds) ? req.user.studentIds : [])]
      .map((id) => safeString(id))
      .filter(Boolean),
    (value) => String(value)
  );

  if (studentIds.length === 0) {
    return res.status(400).json({ message: "Parent account is not linked to any student profile." });
  }

  res.json(buildParentTransportOverview(db, studentIds));
});

module.exports = router;







