const { randomUUID } = require("crypto");

const SESSION_STATUSES = ["draft", "published", "archived"];
const EVENT_TYPES = [
  "resumption",
  "orientation",
  "assessment",
  "holiday",
  "examination",
  "sports",
  "meeting",
  "graduation",
  "excursion",
  "cultural",
  "general",
];
const CALENDAR_READ_ROLES = ["ADMIN", "SUPER_ADMIN", "ACADEMIC_OFFICER", "TEACHER"];
const CALENDAR_MANAGE_ROLES = ["ADMIN", "SUPER_ADMIN", "ACADEMIC_OFFICER"];
const CALENDAR_PUBLISH_ROLES = ["ADMIN", "SUPER_ADMIN", "ACADEMIC_OFFICER"];
const CALENDAR_COLLECTIONS = [
  "academicCalendarSessions",
  "academicCalendarTerms",
  "academicCalendarEvents",
  "academicCalendarAuditLogs",
];

function safeString(value) {
  return String(value || "").trim();
}

function safeLower(value) {
  return safeString(value).toLowerCase();
}

function safeNumber(value, fallback = 0) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function nowIso() {
  return new Date().toISOString();
}

function createAcademicCalendarId(prefix) {
  return `${prefix}-${randomUUID().slice(0, 8)}`;
}

function createHttpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function asDate(value) {
  const safe = safeString(value);
  if (!safe) return null;
  const date = new Date(safe);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => safeString(item)).filter(Boolean);
  }

  return safeString(value)
    .split(/\r?\n|,/) 
    .map((item) => safeString(item))
    .filter(Boolean);
}

function ensureOption(value, allowed, fallback) {
  const normalized = safeLower(value);
  return allowed.includes(normalized) ? normalized : fallback;
}

function humanize(value) {
  return safeString(value)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function compareDates(left, right) {
  const leftTime = asDate(left)?.getTime() || 0;
  const rightTime = asDate(right)?.getTime() || 0;
  return leftTime - rightTime;
}

function sortTerms(rows = []) {
  return [...rows].sort((a, b) => {
    const orderDiff = safeNumber(a.sortOrder || a.sort_order, 0) - safeNumber(b.sortOrder || b.sort_order, 0);
    if (orderDiff !== 0) return orderDiff;
    return compareDates(a.startDate, b.startDate);
  });
}

function sortEvents(rows = []) {
  return [...rows].sort((a, b) => {
    const orderDiff = safeNumber(a.sortOrder || a.sort_order, 0) - safeNumber(b.sortOrder || b.sort_order, 0);
    if (orderDiff !== 0) return orderDiff;
    const startDiff = compareDates(a.startDate, b.startDate);
    if (startDiff !== 0) return startDiff;
    const endDiff = compareDates(a.endDate, b.endDate);
    if (endDiff !== 0) return endDiff;
    return safeString(a.eventTitle).localeCompare(safeString(b.eventTitle));
  });
}

function validateDateOrder(startDate, endDate, label) {
  const start = asDate(startDate);
  const end = asDate(endDate);
  if (!start || !end) {
    throw createHttpError(400, `${label} start date and end date are required`);
  }
  if (end.getTime() < start.getTime()) {
    throw createHttpError(400, `${label} end date cannot be before the start date`);
  }
}

function logAcademicCalendarAudit(db, userId, action, targetType, targetId, metadata = {}) {
  db.academicCalendarAuditLogs.unshift({
    id: createAcademicCalendarId("calendar-audit"),
    userId: safeString(userId),
    action: safeString(action),
    targetType: safeString(targetType),
    targetId: safeString(targetId),
    metadata,
    createdAt: nowIso(),
  });
}

function buildSeedCalendar() {
  const createdAt = nowIso();
  const sessionId = "academic-calendar-session-2025-2026";
  const firstTermId = "academic-calendar-term-2025-2026-1";
  const secondTermId = "academic-calendar-term-2025-2026-2";
  const thirdTermId = "academic-calendar-term-2025-2026-3";

  return {
    sessions: [
      {
        id: sessionId,
        sessionName: "2025/2026",
        title: "2025/2026 Academic Calendar",
        description:
          "A structured school calendar for the Angel Montessori School 2025/2026 academic session, covering terms, assessments, events, and holiday windows.",
        status: "published",
        isPublished: true,
        publishedAt: createdAt,
        archivedAt: "",
        createdBy: "system-seed",
        additionalActivities: [
          "Open Day / PTA Meetings - Once every term",
          "Cultural Day - Second Term",
          "Career Day - Third Term",
          "Excursions / Educational Trips - Scheduled per term",
          "CBT Assessments - Conducted during CA and exams",
        ],
        importantNotes: [
          "All dates are subject to minor adjustments if necessary.",
          "Parents will be notified in advance of any changes.",
          "Pupils are expected to resume promptly on all resumption dates.",
          "Continuous Assessment forms part of the final grading system.",
        ],
        createdAt,
        updatedAt: createdAt,
      },
    ],
    terms: [
      {
        id: firstTermId,
        calendarSessionId: sessionId,
        termName: "First Term",
        startDate: "2025-09-15",
        endDate: "2025-12-12",
        sortOrder: 1,
        createdAt,
        updatedAt: createdAt,
      },
      {
        id: secondTermId,
        calendarSessionId: sessionId,
        termName: "Second Term",
        startDate: "2026-01-12",
        endDate: "2026-04-10",
        sortOrder: 2,
        createdAt,
        updatedAt: createdAt,
      },
      {
        id: thirdTermId,
        calendarSessionId: sessionId,
        termName: "Third Term",
        startDate: "2026-05-04",
        endDate: "2026-07-17",
        sortOrder: 3,
        createdAt,
        updatedAt: createdAt,
      },
    ],
    events: [
      { id: "academic-calendar-event-1", calendarTermId: firstTermId, eventTitle: "Resumption", eventType: "resumption", startDate: "2025-09-15", endDate: "2025-09-15", description: "School resumes for the first term.", isFeatured: true, sortOrder: 1, createdAt, updatedAt: createdAt },
      { id: "academic-calendar-event-2", calendarTermId: firstTermId, eventTitle: "Orientation (New Pupils)", eventType: "orientation", startDate: "2025-09-16", endDate: "2025-09-17", description: "Orientation programme for new pupils and families.", isFeatured: true, sortOrder: 2, createdAt, updatedAt: createdAt },
      { id: "academic-calendar-event-3", calendarTermId: firstTermId, eventTitle: "Full Academic Activities Begin", eventType: "general", startDate: "2025-09-18", endDate: "2025-09-18", description: "Regular classroom activity begins fully across the school.", isFeatured: false, sortOrder: 3, createdAt, updatedAt: createdAt },
      { id: "academic-calendar-event-4", calendarTermId: firstTermId, eventTitle: "Continuous Assessment (CA 1)", eventType: "assessment", startDate: "2025-10-13", endDate: "2025-10-17", description: "First continuous assessment window for the term.", isFeatured: false, sortOrder: 4, createdAt, updatedAt: createdAt },
      { id: "academic-calendar-event-5", calendarTermId: firstTermId, eventTitle: "Mid-Term Break", eventType: "holiday", startDate: "2025-10-30", endDate: "2025-10-31", description: "Mid-term break for pupils and staff.", isFeatured: true, sortOrder: 5, createdAt, updatedAt: createdAt },
      { id: "academic-calendar-event-6", calendarTermId: firstTermId, eventTitle: "Continuous Assessment (CA 2)", eventType: "assessment", startDate: "2025-11-10", endDate: "2025-11-14", description: "Second continuous assessment window for the term.", isFeatured: false, sortOrder: 6, createdAt, updatedAt: createdAt },
      { id: "academic-calendar-event-7", calendarTermId: firstTermId, eventTitle: "Revision Week", eventType: "general", startDate: "2025-12-01", endDate: "2025-12-05", description: "Class revision week ahead of examinations.", isFeatured: false, sortOrder: 7, createdAt, updatedAt: createdAt },
      { id: "academic-calendar-event-8", calendarTermId: firstTermId, eventTitle: "Examinations", eventType: "examination", startDate: "2025-12-08", endDate: "2025-12-12", description: "End-of-term examination week.", isFeatured: true, sortOrder: 8, createdAt, updatedAt: createdAt },
      { id: "academic-calendar-event-9", calendarTermId: firstTermId, eventTitle: "End of Term / Closing", eventType: "general", startDate: "2025-12-12", endDate: "2025-12-12", description: "Formal close of the first term.", isFeatured: true, sortOrder: 9, createdAt, updatedAt: createdAt },
      { id: "academic-calendar-event-10", calendarTermId: firstTermId, eventTitle: "Holiday", eventType: "holiday", startDate: "2025-12-15", endDate: "2026-01-09", description: "First term holiday period.", isFeatured: false, sortOrder: 10, createdAt, updatedAt: createdAt },
      { id: "academic-calendar-event-11", calendarTermId: secondTermId, eventTitle: "Resumption", eventType: "resumption", startDate: "2026-01-12", endDate: "2026-01-12", description: "School resumes for the second term.", isFeatured: true, sortOrder: 1, createdAt, updatedAt: createdAt },
      { id: "academic-calendar-event-12", calendarTermId: secondTermId, eventTitle: "Full Academic Activities Begin", eventType: "general", startDate: "2026-01-13", endDate: "2026-01-13", description: "Regular classroom activity begins fully for the second term.", isFeatured: false, sortOrder: 2, createdAt, updatedAt: createdAt },
      { id: "academic-calendar-event-13", calendarTermId: secondTermId, eventTitle: "Continuous Assessment (CA 1)", eventType: "assessment", startDate: "2026-02-09", endDate: "2026-02-13", description: "First second-term continuous assessment window.", isFeatured: false, sortOrder: 3, createdAt, updatedAt: createdAt },
      { id: "academic-calendar-event-14", calendarTermId: secondTermId, eventTitle: "Mid-Term Break", eventType: "holiday", startDate: "2026-02-26", endDate: "2026-02-27", description: "Mid-term break for the second term.", isFeatured: true, sortOrder: 4, createdAt, updatedAt: createdAt },
      { id: "academic-calendar-event-15", calendarTermId: secondTermId, eventTitle: "Inter-House Sports", eventType: "sports", startDate: "2026-03-07", endDate: "2026-03-07", description: "Annual inter-house sports event.", isFeatured: true, sortOrder: 5, createdAt, updatedAt: createdAt },
      { id: "academic-calendar-event-16", calendarTermId: secondTermId, eventTitle: "Continuous Assessment (CA 2)", eventType: "assessment", startDate: "2026-03-09", endDate: "2026-03-13", description: "Second second-term continuous assessment window.", isFeatured: false, sortOrder: 6, createdAt, updatedAt: createdAt },
      { id: "academic-calendar-event-17", calendarTermId: secondTermId, eventTitle: "Revision Week", eventType: "general", startDate: "2026-03-30", endDate: "2026-04-03", description: "Revision week before second-term examinations.", isFeatured: false, sortOrder: 7, createdAt, updatedAt: createdAt },
      { id: "academic-calendar-event-18", calendarTermId: secondTermId, eventTitle: "Examinations", eventType: "examination", startDate: "2026-04-06", endDate: "2026-04-10", description: "End-of-term examinations for the second term.", isFeatured: true, sortOrder: 8, createdAt, updatedAt: createdAt },
      { id: "academic-calendar-event-19", calendarTermId: secondTermId, eventTitle: "End of Term / Closing", eventType: "general", startDate: "2026-04-10", endDate: "2026-04-10", description: "Formal close of the second term.", isFeatured: true, sortOrder: 9, createdAt, updatedAt: createdAt },
      { id: "academic-calendar-event-20", calendarTermId: secondTermId, eventTitle: "Holiday", eventType: "holiday", startDate: "2026-04-13", endDate: "2026-05-01", description: "Second term holiday period.", isFeatured: false, sortOrder: 10, createdAt, updatedAt: createdAt },
      { id: "academic-calendar-event-21", calendarTermId: thirdTermId, eventTitle: "Resumption", eventType: "resumption", startDate: "2026-05-04", endDate: "2026-05-04", description: "School resumes for the third term.", isFeatured: true, sortOrder: 1, createdAt, updatedAt: createdAt },
      { id: "academic-calendar-event-22", calendarTermId: thirdTermId, eventTitle: "Full Academic Activities Begin", eventType: "general", startDate: "2026-05-05", endDate: "2026-05-05", description: "Regular classroom activity begins fully for the third term.", isFeatured: false, sortOrder: 2, createdAt, updatedAt: createdAt },
      { id: "academic-calendar-event-23", calendarTermId: thirdTermId, eventTitle: "Continuous Assessment (CA 1)", eventType: "assessment", startDate: "2026-06-01", endDate: "2026-06-05", description: "First third-term continuous assessment window.", isFeatured: false, sortOrder: 3, createdAt, updatedAt: createdAt },
      { id: "academic-calendar-event-24", calendarTermId: thirdTermId, eventTitle: "Mid-Term Break", eventType: "holiday", startDate: "2026-06-18", endDate: "2026-06-19", description: "Mid-term break for the third term.", isFeatured: true, sortOrder: 4, createdAt, updatedAt: createdAt },
      { id: "academic-calendar-event-25", calendarTermId: thirdTermId, eventTitle: "Continuous Assessment (CA 2)", eventType: "assessment", startDate: "2026-06-22", endDate: "2026-06-26", description: "Second third-term continuous assessment window.", isFeatured: false, sortOrder: 5, createdAt, updatedAt: createdAt },
      { id: "academic-calendar-event-26", calendarTermId: thirdTermId, eventTitle: "Revision Week", eventType: "general", startDate: "2026-07-06", endDate: "2026-07-10", description: "Revision week before third-term examinations.", isFeatured: false, sortOrder: 6, createdAt, updatedAt: createdAt },
      { id: "academic-calendar-event-27", calendarTermId: thirdTermId, eventTitle: "Examinations", eventType: "examination", startDate: "2026-07-13", endDate: "2026-07-17", description: "End-of-session examinations.", isFeatured: true, sortOrder: 7, createdAt, updatedAt: createdAt },
      { id: "academic-calendar-event-28", calendarTermId: thirdTermId, eventTitle: "End of Session / Closing", eventType: "general", startDate: "2026-07-17", endDate: "2026-07-17", description: "Formal close of the academic session.", isFeatured: true, sortOrder: 8, createdAt, updatedAt: createdAt },
      { id: "academic-calendar-event-29", calendarTermId: thirdTermId, eventTitle: "Graduation / Prize Giving Day", eventType: "graduation", startDate: "2026-07-25", endDate: "2026-07-25", description: "Graduation and prize-giving ceremony.", isFeatured: true, sortOrder: 9, createdAt, updatedAt: createdAt },
    ],
  };
}

function ensureAcademicCalendarCollections(db) {
  let mutated = false;

  for (const key of CALENDAR_COLLECTIONS) {
    if (!Array.isArray(db[key])) {
      db[key] = [];
      mutated = true;
    }
  }

  if (db.academicCalendarSessions.length === 0) {
    const seed = buildSeedCalendar();
    db.academicCalendarSessions.push(...seed.sessions);
    db.academicCalendarTerms.push(...seed.terms);
    db.academicCalendarEvents.push(...seed.events);
    mutated = true;
  }

  return mutated;
}

function normalizeSessionRecord(row, detail = null) {
  const terms = Array.isArray(detail?.terms) ? detail.terms : [];
  const eventsCount = terms.reduce((sum, term) => sum + (Array.isArray(term.events) ? term.events.length : 0), 0);

  return {
    id: safeString(row.id),
    sessionName: safeString(row.sessionName),
    title: safeString(row.title || row.sessionName),
    description: safeString(row.description),
    status: ensureOption(row.status, SESSION_STATUSES, row.isPublished ? "published" : "draft"),
    isPublished: Boolean(row.isPublished),
    publishedAt: safeString(row.publishedAt),
    archivedAt: safeString(row.archivedAt),
    createdBy: safeString(row.createdBy),
    additionalActivities: normalizeList(row.additionalActivities),
    importantNotes: normalizeList(row.importantNotes),
    createdAt: safeString(row.createdAt),
    updatedAt: safeString(row.updatedAt),
    termsCount: terms.length,
    eventsCount,
  };
}

function normalizeTermRecord(row, events = [], sessionName = "") {
  return {
    id: safeString(row.id),
    calendarSessionId: safeString(row.calendarSessionId),
    sessionName: safeString(sessionName),
    termName: safeString(row.termName),
    startDate: safeString(row.startDate),
    endDate: safeString(row.endDate),
    sortOrder: safeNumber(row.sortOrder || row.sort_order, 0),
    createdAt: safeString(row.createdAt),
    updatedAt: safeString(row.updatedAt),
    eventsCount: events.length,
    events,
  };
}

function normalizeEventRecord(row, termName = "", sessionName = "") {
  return {
    id: safeString(row.id),
    calendarTermId: safeString(row.calendarTermId),
    termName: safeString(termName),
    sessionName: safeString(sessionName),
    eventTitle: safeString(row.eventTitle),
    eventType: ensureOption(row.eventType, EVENT_TYPES, "general"),
    eventTypeLabel: humanize(row.eventType || "general"),
    startDate: safeString(row.startDate),
    endDate: safeString(row.endDate),
    description: safeString(row.description),
    isFeatured: Boolean(row.isFeatured),
    sortOrder: safeNumber(row.sortOrder || row.sort_order, 0),
    createdAt: safeString(row.createdAt),
    updatedAt: safeString(row.updatedAt),
  };
}

function buildAcademicCalendarSessionDetail(db, sessionId) {
  const session = (db.academicCalendarSessions || []).find((row) => String(row.id) === String(sessionId));
  if (!session) return null;

  const termRows = sortTerms((db.academicCalendarTerms || []).filter((row) => String(row.calendarSessionId) === String(sessionId)));
  const terms = termRows.map((term) => {
    const eventRows = sortEvents((db.academicCalendarEvents || []).filter((row) => String(row.calendarTermId) === String(term.id)));
    const normalizedEvents = eventRows.map((event) => normalizeEventRecord(event, term.termName, session.sessionName));
    return normalizeTermRecord(term, normalizedEvents, session.sessionName);
  });

  const firstTerm = terms[0] || null;
  const lastTerm = terms[terms.length - 1] || null;

  return {
    ...normalizeSessionRecord(session, { terms }),
    terms,
    sessionStartDate: safeString(firstTerm?.startDate || ""),
    sessionEndDate: safeString(lastTerm?.endDate || ""),
  };
}

function listAcademicCalendarSessions(db, options = {}) {
  const includeArchived = options.includeArchived !== false;
  const rows = [...(db.academicCalendarSessions || [])]
    .filter((row) => includeArchived || safeLower(row.status) !== "archived")
    .sort((a, b) => compareDates(b.updatedAt || b.createdAt, a.updatedAt || a.createdAt));

  return rows.map((row) => buildAcademicCalendarSessionDetail(db, row.id)).filter(Boolean);
}

function listAcademicCalendarTerms(db, sessionId = "") {
  const sessionsById = new Map((db.academicCalendarSessions || []).map((row) => [String(row.id), row]));
  let rows = db.academicCalendarTerms || [];
  if (sessionId) {
    rows = rows.filter((row) => String(row.calendarSessionId) === String(sessionId));
  }
  return sortTerms(rows).map((term) => {
    const session = sessionsById.get(String(term.calendarSessionId));
    const events = sortEvents((db.academicCalendarEvents || []).filter((row) => String(row.calendarTermId) === String(term.id))).map((event) =>
      normalizeEventRecord(event, term.termName, session?.sessionName)
    );
    return normalizeTermRecord(term, events, session?.sessionName);
  });
}

function listAcademicCalendarEvents(db, filters = {}) {
  const termsById = new Map((db.academicCalendarTerms || []).map((row) => [String(row.id), row]));
  const sessionsById = new Map((db.academicCalendarSessions || []).map((row) => [String(row.id), row]));
  let rows = db.academicCalendarEvents || [];
  const sessionId = safeString(filters.sessionId);
  const termId = safeString(filters.termId);

  if (termId) {
    rows = rows.filter((row) => String(row.calendarTermId) === termId);
  } else if (sessionId) {
    const allowedTermIds = new Set(
      (db.academicCalendarTerms || [])
        .filter((row) => String(row.calendarSessionId) === sessionId)
        .map((row) => String(row.id))
    );
    rows = rows.filter((row) => allowedTermIds.has(String(row.calendarTermId)));
  }

  return sortEvents(rows).map((event) => {
    const term = termsById.get(String(event.calendarTermId));
    const session = term ? sessionsById.get(String(term.calendarSessionId)) : null;
    return normalizeEventRecord(event, term?.termName, session?.sessionName);
  });
}

function getPublishedAcademicCalendar(db) {
  const published = (db.academicCalendarSessions || []).find((row) => row.isPublished) || null;
  return published ? buildAcademicCalendarSessionDetail(db, published.id) : null;
}

function buildAcademicCalendarDashboard(db) {
  const published = getPublishedAcademicCalendar(db);
  const sessions = listAcademicCalendarSessions(db, { includeArchived: true });
  const now = Date.now();
  const publishedEvents = published
    ? published.terms.flatMap((term) => term.events.map((event) => ({ ...event, termName: term.termName })))
    : [];
  const upcomingEvents = publishedEvents.filter((event) => {
    const end = asDate(event.endDate) || asDate(event.startDate);
    return end ? end.getTime() >= now : false;
  });

  const archivedCalendars = sessions.filter((row) => row.status === "archived");
  const draftCalendars = sessions.filter((row) => row.status === "draft");

  return {
    summary: {
      activeCalendar: published?.sessionName || "-",
      publishedTerms: published?.termsCount || 0,
      upcomingEvents: upcomingEvents.length,
      draftCalendars: draftCalendars.length,
      archivedCalendars: archivedCalendars.length,
    },
    recentCalendars: sessions.slice(0, 6).map((row) => ({
      id: row.id,
      sessionName: row.sessionName,
      title: row.title,
      status: row.status,
      isPublished: row.isPublished,
      updatedAt: row.updatedAt,
      termsCount: row.termsCount,
      eventsCount: row.eventsCount,
    })),
    upcomingEvents: upcomingEvents.slice(0, 6),
    featuredEvents: publishedEvents.filter((event) => event.isFeatured).slice(0, 6),
  };
}

function buildAcademicCalendarSetup(db) {
  return {
    statuses: SESSION_STATUSES,
    eventTypes: EVENT_TYPES,
    readRoles: CALENDAR_READ_ROLES,
    manageRoles: CALENDAR_MANAGE_ROLES,
    publishRoles: CALENDAR_PUBLISH_ROLES,
    sessions: listAcademicCalendarSessions(db, { includeArchived: true }).map((session) => ({
      id: session.id,
      sessionName: session.sessionName,
      title: session.title,
      status: session.status,
      isPublished: session.isPublished,
    })),
    terms: listAcademicCalendarTerms(db),
  };
}

function buildPublicCalendarSummaryItems(db, limit = 6) {
  const published = getPublishedAcademicCalendar(db);
  if (!published) return [];

  const now = Date.now();
  const flattened = published.terms.flatMap((term) =>
    term.events.map((event) => ({
      id: event.id,
      title: event.eventTitle,
      subtitle: `${term.termName} - ${event.eventTypeLabel}`,
      startDate: event.startDate,
      endDate: event.endDate,
      isFeatured: event.isFeatured,
    }))
  );

  const upcoming = flattened.filter((row) => {
    const end = asDate(row.endDate) || asDate(row.startDate);
    return end ? end.getTime() >= now : false;
  });

  const source = upcoming.length ? upcoming : flattened;
  return source.slice(0, limit);
}

function buildCalendarAnnouncements(db, limit = 3) {
  const published = getPublishedAcademicCalendar(db);
  if (!published) return [];

  const rows = published.terms.flatMap((term) =>
    term.events
      .filter((event) => event.isFeatured)
      .map((event) => ({
        id: `calendar-${event.id}`,
        title: event.eventTitle,
        summary: `${term.termName} - ${event.description || event.eventTypeLabel}`,
        date: event.startDate,
        link: "/academic-calendar",
      }))
  );

  return rows.slice(0, limit);
}

function formatCalendarExportDate(value) {
  const date = asDate(value);
  if (!date) return safeString(value);
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatCalendarExportDateRange(startDate, endDate) {
  const start = safeString(startDate);
  const end = safeString(endDate);
  if (!start && !end) return "Date to be confirmed";
  if (!end || start === end) return formatCalendarExportDate(start);
  return `${formatCalendarExportDate(start)} - ${formatCalendarExportDate(end)}`;
}

function wrapPdfLine(text, maxLength = 88) {
  const content = safeString(text);
  if (!content) return [""];
  if (content.length <= maxLength) return [content];

  const words = content.split(/\s+/).filter(Boolean);
  const lines = [];
  let current = "";

  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxLength && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  });

  if (current) lines.push(current);
  return lines.length ? lines : [content];
}

function pdfEscape(text) {
  return String(text || "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/[\r\n]+/g, " ");
}

function pdfText(x, y, font, size, text, color = "0 0 0") {
  return `${color} rg\nBT /${font} ${size} Tf ${x} ${y} Td (${pdfEscape(text)}) Tj ET`;
}

function buildAcademicCalendarPdfLines(detail) {
  if (!detail) {
    throw createHttpError(404, "Academic calendar not found");
  }

  const lines = [
    "Angel Montessori School",
    "Building Lives, Inspiring Futures",
    "",
    detail.title,
    detail.description || "Academic calendar generated from the Angel Montessori academic calendar desk.",
    "",
  ];

  detail.terms.forEach((term) => {
    lines.push(term.termName);
    lines.push(`Term window: ${formatCalendarExportDateRange(term.startDate, term.endDate)}`);
    lines.push("");

    term.events.forEach((event) => {
      wrapPdfLine(`- ${event.eventTitle}: ${formatCalendarExportDateRange(event.startDate, event.endDate)}`).forEach((line) => {
        lines.push(line);
      });
      if (event.description) {
        wrapPdfLine(`  ${event.description}`, 84).forEach((line) => lines.push(line));
      }
    });

    lines.push("");
  });

  if (Array.isArray(detail.additionalActivities) && detail.additionalActivities.length) {
    lines.push("Additional School Activities");
    detail.additionalActivities.forEach((item) => {
      wrapPdfLine(`- ${item}`).forEach((line) => lines.push(line));
    });
    lines.push("");
  }

  if (Array.isArray(detail.importantNotes) && detail.importantNotes.length) {
    lines.push("Important Notes");
    detail.importantNotes.forEach((item) => {
      wrapPdfLine(`- ${item}`).forEach((line) => lines.push(line));
    });
    lines.push("");
  }

  lines.push("Angel Montessori School - Building Lives, Inspiring Futures.");
  return lines;
}

function buildAcademicCalendarPdfBuffer(detail) {
  const lines = buildAcademicCalendarPdfLines(detail);
  const pages = [];
  for (let index = 0; index < lines.length; index += 52) {
    pages.push(lines.slice(index, index + 52));
  }
  if (!pages.length) pages.push(["No academic calendar content available"]);

  const objects = {};
  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
  objects[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>";
  objects[5] = "<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>";

  let objectId = 6;
  const pageIds = [];

  pages.forEach((pageLines, pageIndex) => {
    const pageId = objectId;
    const contentId = objectId + 1;
    objectId += 2;
    pageIds.push(pageId);

    const operations = [];
    operations.push("0.11 0.31 0.56 rg\n36 792 523 28 re f");
    operations.push(
      pdfText(
        46,
        801,
        "F4",
        13,
        `ACADEMIC CALENDAR - ${safeString(detail.sessionName || detail.title)} (Page ${pageIndex + 1}/${pages.length})`,
        "1 1 1"
      )
    );

    let y = 776;
    pageLines.forEach((line, lineIndex) => {
      const font = lineIndex < 2 || (!pageIndex && lineIndex >= 3 && lineIndex <= 4) ? "F4" : "F5";
      const size = font === "F4" ? (lineIndex < 2 ? 11 : 9) : 8.2;
      operations.push(pdfText(40, y, font, size, line));
      y -= 12;
    });

    const stream = operations.join("\n");
    objects[contentId] = `<< /Length ${Buffer.byteLength(stream, "utf8")} >>\nstream\n${stream}\nendstream`;
    objects[pageId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F3 3 0 R /F4 4 0 R /F5 5 0 R >> >> /Contents ${contentId} 0 R >>`;
  });

  objects[2] = `<< /Type /Pages /Kids [${pageIds.map((value) => `${value} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;

  let pdf = "%PDF-1.4\n";
  const maxObjectId = objectId - 1;
  const offsets = new Array(maxObjectId + 1).fill(0);
  for (let index = 1; index <= maxObjectId; index += 1) {
    offsets[index] = Buffer.byteLength(pdf, "utf8");
    pdf += `${index} 0 obj\n${objects[index] || "<<>>"}\nendobj\n`;
  }

  const xrefStart = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${maxObjectId + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index <= maxObjectId; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${maxObjectId + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  return Buffer.from(pdf, "utf8");
}

function buildAcademicCalendarExportHtml(detail) {
  if (!detail) {
    throw createHttpError(404, "Academic calendar not found");
  }

  const renderTerm = (term) => `
    <section class="term-card">
      <div class="term-kicker">${term.termName}</div>
      <h2>${term.termName}</h2>
      <p class="term-range">${safeString(term.startDate)} to ${safeString(term.endDate)}</p>
      <ul>
        ${term.events
          .map(
            (event) => `<li><strong>${event.eventTitle}</strong> - ${safeString(event.startDate)}${safeString(event.endDate) && safeString(event.endDate) !== safeString(event.startDate) ? ` to ${safeString(event.endDate)}` : ""}</li>`
          )
          .join("")}
      </ul>
    </section>
  `;

  const renderList = (title, rows) =>
    Array.isArray(rows) && rows.length
      ? `
        <section class="notes-block">
          <h3>${title}</h3>
          <ul>${rows.map((item) => `<li>${item}</li>`).join("")}</ul>
        </section>
      `
      : "";

  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>${detail.title}</title>
        <style>
          body { font-family: Arial, Helvetica, sans-serif; margin: 0; background: #f5f7fb; color: #172231; }
          .sheet { max-width: 980px; margin: 32px auto; background: #ffffff; border: 1px solid #dce5f0; border-radius: 20px; padding: 32px; }
          .kicker { color: #c79a2b; font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase; font-weight: 700; }
          h1 { margin: 10px 0 8px; color: #163a70; }
          .lead { color: #516072; line-height: 1.7; }
          .term-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; margin-top: 24px; }
          .term-card, .notes-block { border: 1px solid #dce5f0; border-radius: 16px; padding: 18px; background: #fbfdff; }
          .term-kicker { color: #163a70; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 700; }
          .term-range { color: #607086; font-weight: 700; }
          ul { margin: 12px 0 0; padding-left: 20px; line-height: 1.7; }
          .footer { margin-top: 28px; padding-top: 16px; border-top: 1px solid #dce5f0; color: #516072; }
        </style>
      </head>
      <body>
        <div class="sheet">
          <div class="kicker">Angel Montessori School</div>
          <h1>${detail.title}</h1>
          <p class="lead">${detail.description || "Academic calendar preview generated from the Angel Montessori academic calendar desk."}</p>
          <div class="term-grid">${detail.terms.map(renderTerm).join("")}</div>
          ${renderList("Additional School Activities", detail.additionalActivities)}
          ${renderList("Important Notes", detail.importantNotes)}
          <div class="footer"><strong>Angel Montessori School - Building Lives, Inspiring Futures.</strong></div>
        </div>
      </body>
    </html>
  `;
}

module.exports = {
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
  buildPublicCalendarSummaryItems,
  buildCalendarAnnouncements,
  buildAcademicCalendarPdfBuffer,
  buildAcademicCalendarExportHtml,
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
};

