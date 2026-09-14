# AMES Early Years Quality Assurance - Phase 9

## Purpose

Phase 9 adds a leadership-quality layer across the AMES Early Years system. It supports the school cycle:

`REVIEW -> IDENTIFY -> SUPPORT -> FOLLOW_UP -> IMPROVE -> EMBED`

The module checks evidence, follow-up actions, moderation, environment reviews, reporting readiness, transition readiness, data quality, and system health. It is designed for school improvement and support. It does not create league tables, child rankings, teacher rankings, EYFS percentages, or competitive scoring.

## What It Covers

- Curriculum implementation and week-by-week coverage checks.
- Weekly planning QA, daily responsive teaching evidence, and weekly reviews.
- Observation and developmental-assessment readiness.
- Learning journal quality and parent-visible evidence checks.
- Reception literacy QA with adopted SSP safeguards.
- Prepared environment checks, environment actions, and leadership environment walks.
- Inclusion, SEND/support review, and parent-partnership checks.
- Early Years report and Reception-to-Basic-1 transition QA.
- Data quality alerts for orphan links, invalid class/student/teacher references, missing session/term, duplicate active support plans, published reports without approval, and invalid module use.
- System health and governance summary.

## Backend Files

- `backend/lib/earlyYearsQA.js`
- `backend/routes/earlyYearsQA.routes.js`
- `backend/scripts/earlyYearsQASmokeTest.js`
- `backend/scripts/earlyYearsSystemIntegrityAudit.js`

The route is mounted in `backend/app.js` at:

`/api/early-years/qa`

## Frontend Files

- `apps/portal-web/src/pages/EarlyYearsQADashboard.jsx`
- `apps/portal-web/src/api/services.js`
- `apps/portal-web/src/App.js`
- `apps/portal-web/src/pages/PortalHomePage.jsx`

Leadership access:

- `/dashboard/early-years-qa`
- `/admin/early-years/qa`
- `/portal/admin/early-years/qa`

Teacher access:

- `/teacher/early-years/qa`
- `/teacher/early-years/my-quality-tasks`

## API Routes

- `GET /api/early-years/qa/setup`
- `GET /api/early-years/qa/dashboard`
- `GET /api/early-years/qa/class/:classId`
- `GET /api/early-years/qa/teacher/me`
- `GET /api/early-years/qa/curriculum`
- `GET /api/early-years/qa/planning`
- `GET /api/early-years/qa/assessment`
- `GET /api/early-years/qa/journal`
- `GET /api/early-years/qa/literacy`
- `GET /api/early-years/qa/environment`
- `GET /api/early-years/qa/inclusion`
- `GET /api/early-years/qa/parent-partnership`
- `GET /api/early-years/qa/reporting`
- `GET /api/early-years/qa/transition`
- `GET /api/early-years/qa/data-quality`
- `GET /api/early-years/qa/system-health`
- `GET /api/early-years/qa/governance-summary`
- `GET /api/early-years/qa/actions`
- `POST /api/early-years/qa/actions`
- `PUT /api/early-years/qa/actions/:id`
- `GET /api/early-years/qa/moderation`
- `POST /api/early-years/qa/moderation`
- `PUT /api/early-years/qa/moderation/:id`
- `POST /api/early-years/qa/environment-walks`
- `PUT /api/early-years/qa/environment-walks/:id`
- `GET /api/early-years/qa/leadership-notes`
- `POST /api/early-years/qa/leadership-notes`
- `POST /api/early-years/qa/run-audit`

## Role Rules

Leadership roles can see whole-school QA, data quality, governance summary, moderation, leadership notes, and system audit:

- `ADMIN`
- `SUPER_ADMIN`
- `ACADEMIC_OFFICER`
- `HEAD_OF_SCHOOL`
- `PROPRIETOR`

Teachers can view their own class QA and assigned quality tasks. They can update QA actions assigned to them, but cannot create leadership moderation/audit records.

Parents and students do not access this module.

## Safeguards

The QA engine rejects action, moderation, environment walk, and leadership note text containing ranking/competition language. The dashboard intentionally reports:

- Counts
- Statuses
- Due follow-ups
- Open support actions
- System health
- Data integrity alerts

It does not produce child scores, teacher scores, class ordering, EYFS percentages, or league tables.

## Verification

Run:

```bash
node backend/scripts/earlyYearsQASmokeTest.js
node backend/scripts/earlyYearsSystemIntegrityAudit.js
```

The smoke test verifies:

- The approved curriculum still contains 117 weeks.
- QA reads the existing Phase 1-8 data without mutating protected module records.
- QA actions, moderation, environment walks, leadership notes, data quality alerts, and integrity audit work.
- The adopted SSP sequence is not rewritten or invented.
- Comparison and percentage-grading language is not introduced.

## Deployment Note

This phase only adds code and documentation. It does not push to GitHub, package Hostinger uploads, redeploy, or change production environment variables.
