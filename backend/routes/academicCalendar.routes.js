const express = require("express");
const { auth, requireRole } = require("../middleware/auth");
const { readDB, writeDB } = require("../lib/jsonStore");
const {
  SESSION_STATUSES,
  EVENT_TYPES,
  CALENDAR_READ_ROLES,
  CALENDAR_MANAGE_ROLES,
  CALENDAR_PUBLISH_ROLES,
  ensureAcademicCalendarCollections,
  buildAcademicCalendarDashboard,
  buildAcademicCalendarSetup,
  listAcademicCalendarSessions,
  listAcademicCalendarTerms,
  listAcademicCalendarEvents,
  buildAcademicCalendarSessionDetail,
  getPublishedAcademicCalendar,
  buildAcademicCalendarExportHtml,
  buildAcademicCalendarPdfBuffer,
  createAcademicCalendarId,
  createHttpError,
  safeString,
  safeLower,
  safeNumber,
  nowIso,
  normalizeList,
  ensureOption,
  validateDateOrder,
  logAcademicCalendarAudit,
} = require("../lib/academicCalendar");

const router = express.Router();

function getCalendarDb() {
  const db = readDB();
  const mutated = ensureAcademicCalendarCollections(db);
  if (mutated) writeDB(db);
  return db;
}

function handleRouteError(res, error) {
  return res.status(error?.status || 500).json({ message: error?.message || "Academic calendar request failed" });
}

function findSessionIndex(db, sessionId) {
  return (db.academicCalendarSessions || []).findIndex((row) => String(row.id) === String(sessionId));
}

function findTermIndex(db, termId) {
  return (db.academicCalendarTerms || []).findIndex((row) => String(row.id) === String(termId));
}

function findEventIndex(db, eventId) {
  return (db.academicCalendarEvents || []).findIndex((row) => String(row.id) === String(eventId));
}

function buildSessionPayload(db, body = {}, currentId = "") {
  const sessionName = safeString(body.sessionName);
  const title = safeString(body.title);
  const description = safeString(body.description);
  const status = ensureOption(body.status, SESSION_STATUSES, "draft");
  const additionalActivities = normalizeList(body.additionalActivities || body.additionalActivitiesText);
  const importantNotes = normalizeList(body.importantNotes || body.importantNotesText);

  if (!sessionName) throw createHttpError(400, "Session name is required");
  if (!title) throw createHttpError(400, "Session title is required");

  const duplicate = (db.academicCalendarSessions || []).find(
    (row) => safeLower(row.sessionName) === sessionName.toLowerCase() && String(row.id) !== String(currentId)
  );
  if (duplicate) {
    throw createHttpError(400, "Session name must be unique");
  }

  return {
    sessionName,
    title,
    description,
    status,
    additionalActivities,
    importantNotes,
  };
}

function buildTermPayload(db, body = {}, currentId = "") {
  const calendarSessionId = safeString(body.calendarSessionId);
  const termName = safeString(body.termName);
  const startDate = safeString(body.startDate);
  const endDate = safeString(body.endDate);
  const sortOrder = safeNumber(body.sortOrder, 0);

  if (!calendarSessionId) throw createHttpError(400, "Calendar session is required");
  if (!termName) throw createHttpError(400, "Term name is required");
  validateDateOrder(startDate, endDate, "Term");

  const session = (db.academicCalendarSessions || []).find((row) => String(row.id) === calendarSessionId);
  if (!session) throw createHttpError(404, "Academic calendar session not found");
  if (safeLower(session.status) === "archived") throw createHttpError(400, "Archived calendars cannot receive new terms");

  const duplicate = (db.academicCalendarTerms || []).find(
    (row) =>
      String(row.calendarSessionId) === calendarSessionId &&
      safeLower(row.termName) === termName.toLowerCase() &&
      String(row.id) !== String(currentId)
  );
  if (duplicate) {
    throw createHttpError(400, "This term already exists for the selected session");
  }

  return {
    calendarSessionId,
    termName,
    startDate,
    endDate,
    sortOrder: sortOrder || ((db.academicCalendarTerms || []).filter((row) => String(row.calendarSessionId) === calendarSessionId).length + 1),
  };
}

function buildEventPayload(db, body = {}) {
  const calendarTermId = safeString(body.calendarTermId);
  const eventTitle = safeString(body.eventTitle);
  const eventType = ensureOption(body.eventType, EVENT_TYPES, "general");
  const startDate = safeString(body.startDate);
  const endDate = safeString(body.endDate);
  const description = safeString(body.description);
  const isFeatured = Boolean(body.isFeatured);
  const sortOrder = safeNumber(body.sortOrder, 0);

  if (!calendarTermId) throw createHttpError(400, "Calendar term is required");
  if (!eventTitle) throw createHttpError(400, "Event title is required");
  validateDateOrder(startDate, endDate, "Event");

  const term = (db.academicCalendarTerms || []).find((row) => String(row.id) === calendarTermId);
  if (!term) throw createHttpError(404, "Academic calendar term not found");

  return {
    calendarTermId,
    eventTitle,
    eventType,
    startDate,
    endDate,
    description,
    isFeatured,
    sortOrder: sortOrder || ((db.academicCalendarEvents || []).filter((row) => String(row.calendarTermId) === calendarTermId).length + 1),
  };
}

function publishSessionInDb(db, sessionId, userId) {
  const index = findSessionIndex(db, sessionId);
  if (index === -1) throw createHttpError(404, "Academic calendar session not found");

  const timestamp = nowIso();
  db.academicCalendarSessions = (db.academicCalendarSessions || []).map((row, rowIndex) => {
    if (rowIndex === index) {
      return {
        ...row,
        status: "published",
        isPublished: true,
        publishedAt: timestamp,
        archivedAt: "",
        updatedAt: timestamp,
      };
    }

    return {
      ...row,
      isPublished: false,
      status: safeLower(row.status) === "archived" ? "archived" : "draft",
      updatedAt: timestamp,
    };
  });

  logAcademicCalendarAudit(db, userId, "published_calendar", "academic_calendar_session", sessionId, {
    sessionId,
  });

  return buildAcademicCalendarSessionDetail(db, sessionId);
}

function archiveSessionInDb(db, sessionId, userId) {
  const index = findSessionIndex(db, sessionId);
  if (index === -1) throw createHttpError(404, "Academic calendar session not found");

  const timestamp = nowIso();
  const current = db.academicCalendarSessions[index];
  db.academicCalendarSessions[index] = {
    ...current,
    status: "archived",
    isPublished: false,
    archivedAt: timestamp,
    updatedAt: timestamp,
  };

  logAcademicCalendarAudit(db, userId, "archived_calendar", "academic_calendar_session", sessionId, {
    sessionId,
  });

  return buildAcademicCalendarSessionDetail(db, sessionId);
}

function replaceSessionLabel(value, previousSessionName, nextSessionName) {
  const textValue = safeString(value);
  if (!textValue || !previousSessionName || !nextSessionName) return textValue;
  return textValue.split(previousSessionName).join(nextSessionName);
}

function duplicateSessionInDb(db, sourceSessionId, body = {}, userId = "") {
  const source = buildAcademicCalendarSessionDetail(db, sourceSessionId);
  if (!source) throw createHttpError(404, "Academic calendar session not found");

  const sessionName = safeString(body.sessionName);
  if (!sessionName) throw createHttpError(400, "New session name is required");

  const payload = buildSessionPayload(db, {
    sessionName,
    title: safeString(body.title) || `${sessionName} Academic Calendar`,
    description: Object.prototype.hasOwnProperty.call(body, "description")
      ? safeString(body.description)
      : replaceSessionLabel(source.description, source.sessionName, sessionName),
    status: "draft",
    additionalActivities: source.additionalActivities,
    importantNotes: source.importantNotes,
  });

  const timestamp = nowIso();
  const nextSessionId = createAcademicCalendarId("calendar-session");
  const createdBy = safeString(userId);

  db.academicCalendarSessions.unshift({
    id: nextSessionId,
    ...payload,
    status: "draft",
    isPublished: false,
    publishedAt: "",
    archivedAt: "",
    createdBy,
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  const termIdMap = new Map();
  source.terms.forEach((term) => {
    const nextTermId = createAcademicCalendarId("calendar-term");
    termIdMap.set(String(term.id), nextTermId);
    db.academicCalendarTerms.push({
      id: nextTermId,
      calendarSessionId: nextSessionId,
      termName: term.termName,
      startDate: term.startDate,
      endDate: term.endDate,
      sortOrder: term.sortOrder,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  });

  source.terms.forEach((term) => {
    (term.events || []).forEach((calendarEvent) => {
      db.academicCalendarEvents.push({
        id: createAcademicCalendarId("calendar-event"),
        calendarTermId: termIdMap.get(String(term.id)),
        eventTitle: calendarEvent.eventTitle,
        eventType: calendarEvent.eventType,
        startDate: calendarEvent.startDate,
        endDate: calendarEvent.endDate,
        description: replaceSessionLabel(calendarEvent.description, source.sessionName, sessionName),
        isFeatured: Boolean(calendarEvent.isFeatured),
        sortOrder: calendarEvent.sortOrder,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    });
  });

  logAcademicCalendarAudit(db, createdBy, "duplicated_session", "academic_calendar_session", nextSessionId, {
    sourceSessionId,
    sourceSessionName: source.sessionName,
    sessionName,
    termsCopied: source.terms.length,
    eventsCopied: source.terms.reduce((sum, term) => sum + ((term.events || []).length), 0),
  });

  return buildAcademicCalendarSessionDetail(db, nextSessionId);
}

router.get("/public/current", (req, res) => {
  const db = getCalendarDb();
  res.json({ calendar: getPublishedAcademicCalendar(db) });
});

router.get("/public/current/pdf", (req, res) => {
  try {
    const db = getCalendarDb();
    const calendar = getPublishedAcademicCalendar(db);
    const pdf = buildAcademicCalendarPdfBuffer(calendar);
    const sessionKey = safeString(calendar?.sessionName || "academic-calendar").replace(/[^0-9A-Za-z_-]+/g, "-");
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${sessionKey}-academic-calendar.pdf"`);
    return res.send(pdf);
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.get("/dashboard", auth(), requireRole(...CALENDAR_READ_ROLES), (req, res) => {
  const db = getCalendarDb();
  res.json(buildAcademicCalendarDashboard(db));
});

router.get("/setup", auth(), requireRole(...CALENDAR_READ_ROLES), (req, res) => {
  const db = getCalendarDb();
  res.json({ setup: buildAcademicCalendarSetup(db) });
});

router.get("/sessions", auth(), requireRole(...CALENDAR_READ_ROLES), (req, res) => {
  const db = getCalendarDb();
  res.json({ sessions: listAcademicCalendarSessions(db, { includeArchived: true }) });
});

router.get("/sessions/:id", auth(), requireRole(...CALENDAR_READ_ROLES), (req, res) => {
  const db = getCalendarDb();
  const session = buildAcademicCalendarSessionDetail(db, req.params.id);
  if (!session) return res.status(404).json({ message: "Academic calendar session not found" });
  return res.json({ session });
});

router.post("/sessions", auth(), requireRole(...CALENDAR_MANAGE_ROLES), (req, res) => {
  try {
    const db = getCalendarDb();
    const payload = buildSessionPayload(db, req.body || {});
    const timestamp = nowIso();
    const next = {
      id: createAcademicCalendarId("calendar-session"),
      ...payload,
      status: payload.status === "archived" ? "draft" : payload.status,
      isPublished: false,
      publishedAt: "",
      archivedAt: "",
      createdBy: safeString(req.user?.id || req.user?.username),
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    db.academicCalendarSessions.unshift(next);
    logAcademicCalendarAudit(db, req.user?.id || req.user?.username, "created_session", "academic_calendar_session", next.id, {
      sessionName: next.sessionName,
    });

    let detail = buildAcademicCalendarSessionDetail(db, next.id);
    if (payload.status === "published") {
      detail = publishSessionInDb(db, next.id, req.user?.id || req.user?.username);
    }

    writeDB(db);
    return res.status(201).json({ session: detail });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.patch("/sessions/:id", auth(), requireRole(...CALENDAR_MANAGE_ROLES), (req, res) => {
  try {
    const db = getCalendarDb();
    const index = findSessionIndex(db, req.params.id);
    if (index === -1) throw createHttpError(404, "Academic calendar session not found");

    const current = db.academicCalendarSessions[index];
    const payload = buildSessionPayload(db, req.body || {}, req.params.id);
    const timestamp = nowIso();

    db.academicCalendarSessions[index] = {
      ...current,
      ...payload,
      status: payload.status === "published" ? current.status : payload.status,
      updatedAt: timestamp,
    };

    logAcademicCalendarAudit(db, req.user?.id || req.user?.username, "updated_session", "academic_calendar_session", req.params.id, {
      sessionName: payload.sessionName,
    });

    let detail = buildAcademicCalendarSessionDetail(db, req.params.id);
    if (payload.status === "published") {
      detail = publishSessionInDb(db, req.params.id, req.user?.id || req.user?.username);
    } else if (payload.status === "archived") {
      detail = archiveSessionInDb(db, req.params.id, req.user?.id || req.user?.username);
    } else if (current.isPublished && payload.status === "draft") {
      db.academicCalendarSessions[index] = {
        ...db.academicCalendarSessions[index],
        status: "draft",
        isPublished: false,
        updatedAt: nowIso(),
      };
      detail = buildAcademicCalendarSessionDetail(db, req.params.id);
    }

    writeDB(db);
    return res.json({ session: detail });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.post("/sessions/:id/duplicate", auth(), requireRole(...CALENDAR_MANAGE_ROLES), (req, res) => {
  try {
    const db = getCalendarDb();
    const session = duplicateSessionInDb(db, req.params.id, req.body || {}, req.user?.id || req.user?.username);
    writeDB(db);
    return res.status(201).json({ session, message: "Academic calendar duplicated as a new draft session." });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.get("/terms", auth(), requireRole(...CALENDAR_READ_ROLES), (req, res) => {
  const db = getCalendarDb();
  res.json({ terms: listAcademicCalendarTerms(db, safeString(req.query.sessionId)) });
});

router.post("/terms", auth(), requireRole(...CALENDAR_MANAGE_ROLES), (req, res) => {
  try {
    const db = getCalendarDb();
    const payload = buildTermPayload(db, req.body || {});
    const timestamp = nowIso();
    const next = {
      id: createAcademicCalendarId("calendar-term"),
      ...payload,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    db.academicCalendarTerms.push(next);
    logAcademicCalendarAudit(db, req.user?.id || req.user?.username, "added_term", "academic_calendar_term", next.id, {
      sessionId: next.calendarSessionId,
      termName: next.termName,
    });
    writeDB(db);
    return res.status(201).json({ term: listAcademicCalendarTerms(db, next.calendarSessionId).find((row) => row.id === next.id) });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.patch("/terms/:id", auth(), requireRole(...CALENDAR_MANAGE_ROLES), (req, res) => {
  try {
    const db = getCalendarDb();
    const index = findTermIndex(db, req.params.id);
    if (index === -1) throw createHttpError(404, "Academic calendar term not found");
    const payload = buildTermPayload(db, req.body || {}, req.params.id);
    db.academicCalendarTerms[index] = {
      ...db.academicCalendarTerms[index],
      ...payload,
      updatedAt: nowIso(),
    };
    logAcademicCalendarAudit(db, req.user?.id || req.user?.username, "updated_term", "academic_calendar_term", req.params.id, {
      sessionId: payload.calendarSessionId,
      termName: payload.termName,
    });
    writeDB(db);
    return res.json({ term: listAcademicCalendarTerms(db, payload.calendarSessionId).find((row) => row.id === req.params.id) });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.delete("/terms/:id", auth(), requireRole(...CALENDAR_MANAGE_ROLES), (req, res) => {
  try {
    const db = getCalendarDb();
    const index = findTermIndex(db, req.params.id);
    if (index === -1) throw createHttpError(404, "Academic calendar term not found");
    const term = db.academicCalendarTerms[index];
    db.academicCalendarTerms.splice(index, 1);
    db.academicCalendarEvents = (db.academicCalendarEvents || []).filter((row) => String(row.calendarTermId) !== String(req.params.id));
    logAcademicCalendarAudit(db, req.user?.id || req.user?.username, "deleted_term", "academic_calendar_term", req.params.id, {
      sessionId: term.calendarSessionId,
      termName: term.termName,
    });
    writeDB(db);
    return res.json({ success: true });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.get("/events", auth(), requireRole(...CALENDAR_READ_ROLES), (req, res) => {
  const db = getCalendarDb();
  res.json({ events: listAcademicCalendarEvents(db, req.query || {}) });
});

router.post("/events", auth(), requireRole(...CALENDAR_MANAGE_ROLES), (req, res) => {
  try {
    const db = getCalendarDb();
    const payload = buildEventPayload(db, req.body || {});
    const timestamp = nowIso();
    const next = {
      id: createAcademicCalendarId("calendar-event"),
      ...payload,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    db.academicCalendarEvents.push(next);
    logAcademicCalendarAudit(db, req.user?.id || req.user?.username, "added_event", "academic_calendar_event", next.id, {
      termId: next.calendarTermId,
      eventTitle: next.eventTitle,
    });
    writeDB(db);
    return res.status(201).json({ event: listAcademicCalendarEvents(db, { termId: next.calendarTermId }).find((row) => row.id === next.id) });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.patch("/events/:id", auth(), requireRole(...CALENDAR_MANAGE_ROLES), (req, res) => {
  try {
    const db = getCalendarDb();
    const index = findEventIndex(db, req.params.id);
    if (index === -1) throw createHttpError(404, "Academic calendar event not found");
    const payload = buildEventPayload(db, req.body || {});
    db.academicCalendarEvents[index] = {
      ...db.academicCalendarEvents[index],
      ...payload,
      updatedAt: nowIso(),
    };
    logAcademicCalendarAudit(db, req.user?.id || req.user?.username, "updated_event", "academic_calendar_event", req.params.id, {
      termId: payload.calendarTermId,
      eventTitle: payload.eventTitle,
    });
    writeDB(db);
    return res.json({ event: listAcademicCalendarEvents(db, { termId: payload.calendarTermId }).find((row) => row.id === req.params.id) });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.delete("/events/:id", auth(), requireRole(...CALENDAR_MANAGE_ROLES), (req, res) => {
  try {
    const db = getCalendarDb();
    const index = findEventIndex(db, req.params.id);
    if (index === -1) throw createHttpError(404, "Academic calendar event not found");
    const event = db.academicCalendarEvents[index];
    db.academicCalendarEvents.splice(index, 1);
    logAcademicCalendarAudit(db, req.user?.id || req.user?.username, "deleted_event", "academic_calendar_event", req.params.id, {
      termId: event.calendarTermId,
      eventTitle: event.eventTitle,
    });
    writeDB(db);
    return res.json({ success: true });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.get("/preview/:sessionId", auth(), requireRole(...CALENDAR_READ_ROLES), (req, res) => {
  const db = getCalendarDb();
  const calendar = buildAcademicCalendarSessionDetail(db, req.params.sessionId);
  if (!calendar) return res.status(404).json({ message: "Academic calendar session not found" });
  return res.json({ calendar });
});

router.get("/export/:sessionId/pdf", auth(), requireRole(...CALENDAR_READ_ROLES), (req, res) => {
  try {
    const db = getCalendarDb();
    const calendar = buildAcademicCalendarSessionDetail(db, req.params.sessionId);
    const pdf = buildAcademicCalendarPdfBuffer(calendar);
    const sessionKey = safeString(calendar?.sessionName || "academic-calendar").replace(/[^0-9A-Za-z_-]+/g, "-");
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${sessionKey}-academic-calendar.pdf"`);
    return res.send(pdf);
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.get("/export/:sessionId", auth(), requireRole(...CALENDAR_READ_ROLES), (req, res) => {
  try {
    const db = getCalendarDb();
    const calendar = buildAcademicCalendarSessionDetail(db, req.params.sessionId);
    const html = buildAcademicCalendarExportHtml(calendar);
    const sessionKey = safeString(calendar?.sessionName || "academic-calendar").replace(/[^0-9A-Za-z_-]+/g, "-");
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${sessionKey}-academic-calendar.html"`);
    return res.send(html);
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.post("/publish/:sessionId", auth(), requireRole(...CALENDAR_PUBLISH_ROLES), (req, res) => {
  try {
    const db = getCalendarDb();
    const calendar = publishSessionInDb(db, req.params.sessionId, req.user?.id || req.user?.username);
    writeDB(db);
    return res.json({ message: "Academic calendar published.", calendar });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.post("/archive/:sessionId", auth(), requireRole(...CALENDAR_PUBLISH_ROLES), (req, res) => {
  try {
    const db = getCalendarDb();
    const calendar = archiveSessionInDb(db, req.params.sessionId, req.user?.id || req.user?.username);
    writeDB(db);
    return res.json({ message: "Academic calendar archived.", calendar });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

module.exports = router;
