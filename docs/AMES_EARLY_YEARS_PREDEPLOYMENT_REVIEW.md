# AMES Early Years Pre-Deployment Review

Review date: 2026-09-14
Workspace: `C:\Users\omolo\AngelMontessori\angel-montessori-github-ready`
Stage: Final pre-deployment review
Scope: Early Years portal production readiness and live data integrity validation

## Executive Summary

Final status: **PRODUCTION READY WITH NON-BLOCKING WARNINGS**

No P0 critical blockers or P1 high blockers were found in the local validation run. The approved AMES Early Years architecture remains intact, the AMES Volume III curriculum source set validates at 117 weeks, the Phase 1-9 smoke tests pass, protected backend routes load, auth/session guards reject invalid access, and the portal production build compiles successfully.

This review did not push to GitHub, deploy, package a release, or mutate production data.

The remaining warnings are operational checks that must be confirmed by the owner on Hostinger before the next deployment: live `.env` values, persistent `JSON_DB_PATH`, persistent `UPLOADS_ROOT_PATH`, backup/restore process, final browser/device QA, and production demo/account access for reviewers.

## Baseline Snapshot

| Item | Result |
| --- | --- |
| Git branch | `main` |
| Latest commit | `789f11f` |
| Node version | `v24.13.1` |
| npm version | `11.8.0` |
| Frontend package | `angel-montessori-portal-web@1.0.0` |
| Backend package | `angel-backend@1.0.0` |
| Environment mode used for validation | local/test |
| Timestamp captured during review | `2026-09-13 21:05:09 +01:00` |
| Storage mode found | JSON file store primary, optional Prisma/database support for some modules |

Worktree status: many Phase 1-9 implementation files are modified or untracked. This is expected for the current development batch, but it means the repository must be reviewed and committed before any GitHub push.

## Curriculum Integrity

Expected:

| Area | Expected | Actual |
| --- | ---: | ---: |
| Total curriculum weeks | 117 | 117 |
| Crèche | 39 | 39 |
| Nursery | 39 | 39 |
| Reception | 39 | 39 |

AMES Volume III dry-run result: `DRY_RUN_PASS`

The dry-run validated all nine seed files:

- `creche-term-1.json`, `creche-term-2.json`, `creche-term-3.json`
- `nursery-term-1.json`, `nursery-term-2.json`, `nursery-term-3.json`
- `reception-term-1.json`, `reception-term-2.json`, `reception-term-3.json`

Each file detected 13 weeks with no validation errors or warnings.

## Persistence And Database Findings

Production persistence is JSON-file based for the current portal modules, with optional Prisma/database support present for Prisma-backed features.

Supported configuration:

- `JSON_DB_PATH` or `AMS_JSON_DB_PATH` chooses the JSON data file.
- If no JSON path is configured, the backend falls back to `backend/db.json`.
- If the configured JSON path does not exist, the backend creates a default-shaped JSON file.
- `DATABASE_URL` is optional for the reviewed Early Years/finance JSON-backed flow, but Prisma-backed features are unavailable until it is configured.

Live data audit:

| Item | Result |
| --- | --- |
| LIVE_DATA_AUDIT | `NOT_EXECUTED` |
| Reason | No usable local/live JSON database exists in the workspace; `backend/scripts/earlyYearsSystemIntegrityAudit.js` reported `NO_DATABASE` for `backend/db.json`. |

This is not a test failure. It means the local workspace does not contain production data, and no fake database was created to force a pass.

## Environment Inventory

Required or production-relevant backend variables:

| Variable | Production classification | Status in source review |
| --- | --- | --- |
| `NODE_ENV` | Recommended | Operational value, not hard-coded |
| `PORT` | Required | Documented in `backend/.env.production.example` |
| `JWT_SECRET` | Blocking if missing | Required at app startup; example placeholder only |
| `JSON_DB_PATH` | Required for durable Hostinger data | Documented |
| `UPLOADS_ROOT_PATH` | Required for durable uploaded files | Added to example and backend support |
| `PUBLIC_BACKEND_URL` | Recommended for media/API links | Documented |
| `CORS_ALLOWED_ORIGINS` or `FRONTEND_URL` | Required for production browser access | Documented |
| `EMAIL_PROVIDER` | Optional unless email is required | Documented |
| `EMAIL_FROM` / `EMAIL_FROM_NAME` | Optional unless email is required | Documented |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` | Optional unless SMTP is enabled | Documented with placeholders |
| `ENQUIRY_NOTIFICATION_EMAIL`, `ENQUIRY_SEND_ACK` | Optional public/admission messaging | Documented |
| `ENABLED_PAYMENT_PROVIDERS`, `PAYMENT_PROVIDER` | Required if live payments are enabled | Documented |
| `PAYSTACK_SECRET_KEY` | Blocking for Paystack checkout/webhook | Documented; backend rejects placeholder/missing value |
| `PARENT_PAYMENT_CALLBACK_URL` | Required for parent payment flow | Documented |
| `APPLICANT_PAYMENT_CALLBACK_URL` | Required for applicant payment flow | Documented |
| `PAYMENT_CALLBACK_URL` | Required fallback callback | Documented |
| `DONATION_CALLBACK_URL` | Required for donation flow | Documented |
| `REMITA_*` | Optional unless Remita is enabled | Partially documented |
| `SMS_*`, `TERMII_*`, `TWILIO_*` | Optional unless SMS provider is enabled | Code-supported |
| `SCHOOL_*` | Optional branding/report metadata | Code-supported |
| `BOOTSTRAP_ADMIN_USERNAME`, `BOOTSTRAP_ADMIN_PASSWORD`, `BOOTSTRAP_ADMIN_ID`, `BOOTSTRAP_ADMIN_NAME` | Optional first-run admin bootstrap | Added; no default password shipped |
| `ADMIN_DASHBOARD_KEY` | Recommended if admin-key middleware is used | Code has fallback and should be explicitly configured |

Frontend variables/config:

- Portal runtime config: `apps/portal-web/public/runtime-config.js`
- Public site runtime config: `apps/public-web/public/runtime-config.js`
- Build-time fallbacks: `REACT_APP_API_BASE_URL`, `REACT_APP_PUBLIC_SITE_URL`, `REACT_APP_PORTAL_URL`

Current intended URLs in runtime config:

- Public site: `https://angelmontessori.ng`
- Portal: `https://portal.angelmontessori.ng`
- API: `https://api.angelmontessori.ng/api`

## Secret And Configuration Review

Result: **PASS WITH WARNINGS**

No real API secret, JWT secret, Paystack secret, SMTP password, or database password was found hard-coded in tracked application source during review.

Hardening performed during this review:

- Removed fixed first-run sample users from `defaultDB()`.
- Added optional environment-based bootstrap admin creation.
- Removed fixed default temporary passwords from account provisioning UI fields.
- Changed backend account provisioning fallbacks to generated temporary passwords.
- Changed admissions account fallback password generation to generated temporary passwords.
- Added `UPLOADS_ROOT_PATH` support so uploaded files can live outside the redeployed app directory.

Remaining warning:

- `backend/middleware/adminKey.js` still has a fallback value for `ADMIN_DASHBOARD_KEY`. If routes using that middleware are exposed in production, set a real value in the live environment.

## Authentication Validation

Result: **PASS**

Validated with fixture/test users:

| Case | Result |
| --- | --- |
| Valid admin login | PASS |
| Valid teacher login | PASS |
| Valid parent login | PASS |
| Valid student login | PASS |
| Missing token | 401 |
| Invalid token | 401 |
| Expired token | 401 |
| Token for deleted/missing user | 401 |
| Inactive user | 403 |
| Valid active user | 200 |

JWT observations:

- Login issues JWTs with `expiresIn: "10h"`.
- Protected requests verify token signature.
- Protected requests confirm the current user still exists in JSON storage.
- Inactive, suspended, archived, or missing users cannot continue with an old token.

## Authorization And Privacy Review

Result: **PASS**

The Phase 1 acceptance audit and Phase 9 QA smoke test confirm:

- Admin and academic-leader routes are role-protected.
- Teacher scope is filtered by assigned class/subject context where implemented.
- Parent views are filtered to linked child records.
- Students are blocked from restricted Early Years staff systems.
- Basic 1 transition access is read/handover oriented and scoped.
- Parent cross-child access result: `BLOCKED`.

Restricted-data observations:

- Inclusion records support visibility levels.
- Parent-facing records are sanitized.
- Restricted notes are excluded from ordinary parent/teaching printouts.
- QA summaries avoid child or teacher rankings.

## Early Years Safeguards

Result: **PASS**

Confirmed safeguards:

- No Early Years percentage grading introduced.
- No class ranking introduced.
- No child ranking introduced.
- No teacher ranking introduced.
- No CA1/CA2/CA3 or Nigerian broadsheet path for Crèche, Nursery, or Reception.
- Reception literacy tracker is Reception-only.
- Crèche, Nursery, Basic/JSS/SS are blocked from formal Reception SSP tracker paths.
- SSP production sequence remains unchanged.
- Invented SSP production GPC count is `0`.
- Teacher/professional judgement remains required for developmental summaries and report conclusions.

EYFS legal wording remains correct:

> The Early Learning Goals are statutory end-of-Reception expectations within England's EYFS system. Angel Montessori School operates in Nigeria and adopts them as an end-of-Reception reference framework within its British-system Early Years programme.

## Reporting And Print Review

Result: **PASS WITH MANUAL QA WARNING**

Automated/reporting smoke confirms:

- Draft, submit, return, approve, publish, archive, amend/versioning paths are implemented.
- Published reports are locked.
- Amendments create new versions.
- Parent report access is restricted to own child and published/current reports.
- Restricted inclusion details are not exposed in parent-facing report data.
- Print HTML exists for plans, journals, reports, support plans, meetings, environment checklists, resource requests, and transitions.

Manual warning:

- A browser/device visual print pass was not launched in this final run. Before deployment day, manually open key print pages and confirm school branding, page breaks, and no clipped text.

## Session, Term, Rollover, And Legacy Class Review

Result: **PASS WITH OPERATIONAL WARNING**

Confirmed:

- Academic scope handling exists.
- Active session/term changes do not rewrite historical records in acceptance audit.
- Early Years plans/reports store session and term identifiers.
- Finance settings store active session and active term.
- Finance fee rows and reports filter by session/term.
- Legacy classes remain identified as inactive/historical mappings and are not approved as active current classes.

Operational warning:

- Before production rollover, confirm the live `academicSessions`, `terms`, and `financeSettings` point to the correct current year/term. Do not correct a wrong live session by editing historical records directly; change active scope and migrate/correct only the affected records through admin workflows.

## Backend Route Health

Result: **PASS**

The backend app loaded successfully with a test `JWT_SECRET`.

Mounted route groups include:

- `/api/academic-systems`
- `/api/early-years/curriculum`
- `/api/early-years/plans`
- `/api/early-years` for assessment, literacy, environment, inclusion, reporting, QA
- `/api/continuous-assessment`
- `/api/grading`
- `/api/report-card`
- `/api/promotion`
- `/api/attendance`
- `/api/cbt`
- `/api/homework`
- `/api/library`
- `/api/lms`
- `/api/admissions`
- `/api/portal`
- `/api/payments`
- `/api/finance`
- `/api/transport`

## Frontend Build And Routes

Result: **PASS WITH WARNINGS**

Portal build:

- `npm --prefix apps/portal-web run build`
- Result: compiled successfully.

Public site build:

- `npm --prefix apps/public-web run build`
- Result: compiled successfully.

Warnings:

- Browserslist/caniuse-lite data is stale.
- CRA reports the portal bundle is larger than recommended.
- Node reports `fs.F_OK` deprecation from dependency tooling.

These are non-blocking build warnings, not production failures.

Frontend route review:

- Early Years Curriculum routes are registered.
- Teacher Planning routes are registered.
- Assessment routes are registered.
- Reception Literacy routes are registered.
- Environment routes are registered.
- Inclusion and Support routes are registered.
- Reporting, Reception EYFS reference, and Basic 1 transition routes are registered.
- Early Years QA and My Quality Tasks routes are registered.
- Role-protected route wrappers are present.

## Responsive And Accessibility Review

Result: **PASS WITH MANUAL QA WARNING**

Build and source review passed for all key pages. Responsive CSS exists through the shared portal surface and page modules. The final automated run did not launch browser screenshots at desktop/tablet/mobile widths.

Manual pre-release device checks still recommended:

- Admin Early Years QA
- Teacher planning
- Assessment/journals
- Reception literacy
- Environment
- Inclusion/support
- Reports/print previews
- Parent reports/support views

Accessibility basics from source review:

- Buttons and forms have visible text.
- Status labels are textual, not only color.
- Print pages use headings and readable sections.

This is not a formal WCAG certification.

## File Upload Security

Result: **PASS WITH WARNING**

Homework uploads use:

- `multer.memoryStorage()`
- 8 MB file size limit
- PDF/image MIME allowlist
- file extension allowlist
- sanitized stored filenames
- generated unique stored names
- authenticated upload route

Hardening added:

- Uploaded media can now be stored in a persistent production folder using `UPLOADS_ROOT_PATH` or `AMS_UPLOADS_ROOT_PATH`.
- `/media/*` now serves from that resolved uploads root.

Warning:

- Confirm Hostinger has created the persistent uploads folder and that redeploys do not overwrite uploaded media.

## CORS, Logging, And Error Handling

Result: **PASS WITH WARNINGS**

CORS:

- Production origins are configurable by `CORS_ALLOWED_ORIGINS` or `FRONTEND_URL`.
- Same-origin/non-browser requests are allowed.
- Localhost defaults remain present for development convenience.

Warning:

- For stricter production hardening, consider disabling localhost defaults when `NODE_ENV=production`.

Logging:

- Source review did not find intentional logging of passwords, JWTs, Paystack keys, SMTP passwords, or restricted inclusion records.
- Backend error handler logs unhandled errors server-side. Frontend receives a generic production response.

Error handling:

- Auth, role guards, invalid credentials, inactive accounts, missing users, invalid classes, invalid sessions, workflow transitions, and Paystack placeholder configuration return controlled errors in reviewed flows.

## Finance And Payment Boundary

Result: **PASS**

Relevant regression tests passed:

- Finance roster and bulk payment smoke test.
- School Fees all-class sync, receipt bridge, and cleanup routes smoke test.
- Academic acceptance audit finance/payment route checks.

No real payment transaction was processed during this review.

Paystack production requirement:

- Live `.env` must contain a real `PAYSTACK_SECRET_KEY`.
- The backend detects placeholder/missing Paystack secrets and blocks Paystack calls.

## Backup And Restore Readiness

Result: **WARNING**

Expected production data locations:

- JSON DB: path configured by `JSON_DB_PATH`, recommended outside app bundle, e.g. `/home/uXXXXXXX/ams-data/db.json`.
- Uploaded files: path configured by `UPLOADS_ROOT_PATH`, recommended outside app bundle, e.g. `/home/uXXXXXXX/ams-data/uploads`.

Backup method:

- Not proven in local review.
- Recommended: Hostinger provider backup plus manual download/export of JSON DB and uploads folder before each deployment.

Backup frequency:

- Unknown. Owner must confirm Hostinger backup schedule.

Restore method:

- Restore prior backend code/deploy package.
- Restore previous `db.json` to the configured `JSON_DB_PATH`.
- Restore uploads folder to `UPLOADS_ROOT_PATH`.
- Re-apply live `.env`.
- Restart/redeploy Node service and verify `/api/health`.

Last tested restore: **UNKNOWN**

Estimated recovery time: usually minutes if the previous deploy package, `.env`, JSON backup, and uploads backup are already available.

## Hostinger Readiness

Result: **PASS WITH WARNINGS**

Project-supported deployment model:

- Public website build output: `apps/public-web/build`
- Portal build output: `apps/portal-web/build`
- Backend start command: `npm start` inside `backend` or `node server.js`
- Backend port: `PORT` env variable, default `6060`
- Backend API base URL expected by frontend: `https://api.angelmontessori.ng/api`
- Static media route: `/media/*`
- Persistent JSON data: `JSON_DB_PATH`
- Persistent uploaded media: `UPLOADS_ROOT_PATH`

Warnings:

- Confirm Hostinger live Node app root is the backend app root, not `public_html/portal`.
- Confirm live environment variables are set in the Node app environment.
- Confirm persistent data/uploads folders are outside the uploaded app bundle.

## GitHub Readiness

Result: **SAFE TO PUSH AFTER OWNER REVIEW AND COMMIT**

No tracked real secrets were found in reviewed source. `.gitignore` excludes `.env`, local backend DB, build folders, and deployment archives.

Current repository state is not clean. There are many modified and untracked Phase 1-9 files. This is expected but must be reviewed, committed, and pushed only when the owner instructs it.

Do not commit:

- Live `.env`
- `backend/db.json`
- production JSON backups
- generated deployment zip files unless intentionally versioned
- private exported credentials

## Deployment Rollback Plan

Before deployment:

1. Record current Git commit/tag.
2. Download current deployed public frontend build if needed.
3. Download current deployed portal frontend build if needed.
4. Download current deployed backend code if not already tagged.
5. Back up live `.env` securely.
6. Back up live `db.json`.
7. Back up live uploads/media folder.
8. Confirm rollback owner and trigger criteria.

Rollback triggers:

- Login/auth failure for valid users.
- Parent privacy leak.
- Teacher over-scope access.
- Early Years reports/finance unavailable.
- API 500s on core dashboard routes.
- Payment initialization failure after environment confirmation.
- Broken public portal access.

Rollback steps:

1. Restore previous backend code.
2. Restore previous public/portal frontend build.
3. Restore previous `.env`.
4. Restore previous JSON DB only if data corruption occurred.
5. Restore uploads folder if media paths changed or files are missing.
6. Restart/redeploy Node app.
7. Verify `/api/health`, login, role dashboards, finance, and parent report access.

## Automated Test Results

| Test | Result |
| --- | --- |
| `node backend/scripts/academicSystemsSmokeTest.js` | PASS |
| `node backend/scripts/academicSystemsAcceptanceAudit.js` | PASS |
| `node backend/scripts/earlyYearsCurriculumSmokeTest.js` | PASS |
| `node backend/scripts/importAmesVolumeIII.js --dry-run --stage ALL` | PASS |
| `node backend/scripts/earlyYearsPlanningSmokeTest.js` | PASS |
| `node backend/scripts/earlyYearsAssessmentSmokeTest.js` | PASS |
| `node backend/scripts/receptionLiteracySmokeTest.js` | PASS |
| `node backend/scripts/earlyYearsEnvironmentSmokeTest.js` | PASS |
| `node backend/scripts/earlyYearsInclusionSmokeTest.js` | PASS |
| `node backend/scripts/earlyYearsReportingSmokeTest.js` | PASS |
| `node backend/scripts/earlyYearsQASmokeTest.js` | PASS |
| `node backend/scripts/earlyYearsSystemIntegrityAudit.js` | NOT_EXECUTED: `NO_DATABASE` |
| `node backend/scripts/studentRegistrySmokeTest.js` | PASS |
| `node backend/scripts/continuousAssessmentSmokeTest.js` | PASS |
| `node backend/scripts/financeBulkPaymentsSmokeTest.js` | PASS |
| `node backend/scripts/schoolFeesAdminSyncSmokeTest.js` | PASS |
| Backend app load with test `JWT_SECRET` | PASS |
| Auth invalid/expired/missing/inactive/valid token check | PASS |
| No fixed default password scan | PASS |
| Empty first-run JSON store check | PASS |
| Bootstrap admin env check | PASS |
| `npm --prefix apps/portal-web run build` | PASS |
| `npm --prefix apps/public-web run build` | PASS |
| `git diff --check` | PASS with CRLF warnings only |

## Whole-System Integrity Result

| Area | Result |
| --- | --- |
| Academic System Architecture | PASS |
| Curriculum | PASS |
| Curriculum Count | expected 117, actual 117 |
| Curriculum Mutations | expected 0, actual 0 |
| Planning | PASS |
| Assessment | PASS |
| Reception Literacy | PASS |
| Invented SSP Production Sequence | expected 0, actual 0 |
| Environment | PASS |
| Inclusion | PASS |
| Reporting | PASS |
| QA | PASS |
| Authentication | PASS |
| Authorization | PASS |
| Parent Privacy | PASS |
| Transition | PASS |
| Nigerian Academic Regression | PASS |
| Finance Regression | PASS |
| Production Build | PASS |
| Data Persistence | WARNING |
| Backup Readiness | WARNING |
| Deployment Configuration | WARNING |

## Issue Classification

P0 critical blockers: **0**

P1 high blockers: **0**

P2 should fix / confirm before deployment:

1. Confirm live `JWT_SECRET`, `JSON_DB_PATH`, `UPLOADS_ROOT_PATH`, `CORS_ALLOWED_ORIGINS`, and `PAYSTACK_SECRET_KEY` in Hostinger.
2. Confirm live JSON DB exists at the configured persistent path and is backed up.
3. Confirm uploaded files use persistent storage outside the redeployed app bundle.
4. Confirm backup frequency and perform at least one restore rehearsal or documented restore test.
5. Confirm Google Play reviewer/demo account access is active, restricted appropriately, and not a default password.
6. Confirm `ADMIN_DASHBOARD_KEY` if any admin-key route is exposed.
7. Run final manual browser/device print and responsive QA.

P3 housekeeping:

1. Update Browserslist/caniuse-lite data.
2. Consider code splitting to reduce portal bundle size.
3. Normalize CRLF/LF line endings if desired.
4. Consider disabling localhost CORS defaults automatically in production.
5. Consider persistent/distributed rate limiting if traffic increases.

## Go / No-Go Decision

**FINAL STATUS: PRODUCTION READY WITH NON-BLOCKING WARNINGS**

Reason: all critical and high-risk local validation checks pass, including curriculum integrity, role boundaries, parent privacy, Early Years safeguards, Nigerian-system regressions, finance regressions, backend load, and frontend production builds. The warnings are deployment-operation items that require owner confirmation on Hostinger/live data, not code blockers in the reviewed local system.
