# AMES Early Years Planning Phase 3

## Status

Phase 3 adds the teacher implementation layer above the approved AMES Volume III Early Years curriculum.

The approved curriculum remains the locked source of truth. Weekly plans, daily responsive records, reviews, and approval notes are additive records linked to approved curriculum weeks.

## Architecture

Approved curriculum:

- `curriculumFrameworks`
- `curriculumFrameworkVersions`
- `curriculumTerms`
- `curriculumWeeks`
- `curriculumItems`

Teacher planning layer:

- `curriculumTeacherPlans`
- `curriculumDailyTeachingRecords`
- `curriculumWeeklyPlanReviews`
- `curriculumPlanAmendments`
- `curriculumAuditLogs`

The implementation lives in:

- `backend/lib/earlyYearsPlanning.js`
- `backend/routes/earlyYearsPlanning.routes.js`
- `apps/portal-web/src/pages/EarlyYearsPlanningDashboard.jsx`

## Weekly Plan Model

Weekly plans store:

- teacher, class, academic session, term, curriculum week, framework, and curriculum version references
- a protected `curriculumSnapshot` for historical integrity
- editable teacher implementation fields such as weekly priorities, resources, grouping, provision, direct teaching, Practical Life, outdoor learning, SEND/access adjustments, parent connection, and assessment focus
- phase-specific guidance for Crèche, Nursery, or Reception
- status workflow metadata

The master curriculum fields are displayed read-only and are not copied into editable teacher fields.

## Workflow

The Phase 3 workflow is:

1. Teacher opens approved AMES Volume III curriculum.
2. Teacher clicks `Create Weekly Plan From Curriculum`.
3. The backend validates teacher role, class assignment, Early Years class scope, session, term, and curriculum week.
4. A single shared draft plan is created for the class/session/term/week.
5. Teacher edits implementation fields only.
6. Teacher may copy safe reusable structure from the previous week.
7. Teacher submits the plan.
8. Academic leader reviews, returns, or approves.
9. Teacher records concise daily responsive teaching notes.
10. Teacher completes the weekly review.
11. The plan can be printed to PDF using the browser print flow.

## Statuses

Supported plan statuses:

- `DRAFT`
- `SUBMITTED`
- `REVIEWED`
- `APPROVED`
- `RETURNED_FOR_REVISION`
- `ARCHIVED`

Teachers can edit only `DRAFT` and `RETURNED_FOR_REVISION` plans. Submitted or approved plans cannot be silently rewritten.

## Uniqueness

The default model is one shared plan per:

- academic session
- term
- class
- curriculum week

This prevents accidental duplicate weekly plans when a class has more than one adult.

## Daily Responsive Teaching

Daily records are linked to a weekly plan and contain:

- date
- planned teaching
- actual teaching
- children needing revisit
- children ready for extension
- unexpected learning
- significant observations
- resource/provision changes
- SEND/access adjustments
- parent communication note
- reflection
- next-day adjustment

They preserve the AMES responsive cycle: know, plan, teach, observe, interpret, respond, review.

## Weekly Review

Weekly reviews store:

- secure learning
- developing learning
- misconceptions
- support needs
- deeper challenge needs
- resources/provision that worked
- changes needed
- revisit plan for next week
- parent partnership notes
- SEND/access review
- professional reflection

## Class-Specific Behaviour

Crèche planning emphasizes relationships, care routines, communication, movement, sensory exploration, wellbeing, Practical Life beginnings, and responsive interaction.

Nursery planning emphasizes language, stories, phonological awareness, number sense, purposeful play, investigation, Practical Life, outdoor learning, and independence. It does not impose Reception SSP planning.

Reception planning adds structured support for phonics reference, reading, writing, mathematics, independence, and school readiness. If no SSP programme is configured, the UI shows that the adopted SSP programme is not yet configured.

## API Routes

Protected planning routes:

- `GET /api/early-years/plans/setup`
- `GET /api/early-years/plans`
- `POST /api/early-years/plans`
- `GET /api/early-years/plans/:id`
- `PUT /api/early-years/plans/:id`
- `POST /api/early-years/plans/:id/submit`
- `POST /api/early-years/plans/:id/copy-previous-structure`
- `POST /api/early-years/plans/:id/review`
- `POST /api/early-years/plans/:id/approve`
- `POST /api/early-years/plans/:id/return`
- `GET /api/early-years/plans/:id/daily`
- `POST /api/early-years/plans/:id/daily`
- `PUT /api/early-years/plans/:id/daily/:dailyId`
- `POST /api/early-years/plans/:id/weekly-review`
- `GET /api/early-years/plans/:id/print`

Backward-compatible creation route:

- `POST /api/early-years/curriculum/weeks/:weekId/plans`

That route now creates the real Phase 3 weekly implementation plan.

## Frontend Routes

Protected portal routes:

- `/dashboard/early-years-planning`
- `/admin/early-years/planning`
- `/portal/admin/early-years/planning`
- `/teacher/early-years/plans`
- `/admin/early-years/plans/:planId`
- `/portal/admin/early-years/plans/:planId`
- `/teacher/early-years/plans/:planId`

## Permissions

Teachers may:

- view assigned Early Years curriculum
- create plans for assigned Early Years classes
- edit own/shared draft plans for assigned classes
- submit plans
- add daily records
- save weekly reviews
- print plans
- copy previous week structure into editable drafts

Academic leaders/admins may:

- view Early Years plans
- review plans
- return plans for revision
- approve plans
- view audit trail

Parents and students have no access to internal teacher planning.

## Audit Logging

The planning module writes audit entries for:

- weekly plan creation
- weekly plan edits
- submission
- review
- approval
- return for revision
- daily record save/update
- weekly review save

Audit entries include actor, role, timestamp, entity, action, and relevant before/after details where useful.

## Print Implementation

The print route returns print-friendly HTML instead of introducing a new PDF dependency. Teachers and leaders can use browser print or save as PDF.

The print view includes:

- Angel Montessori School
- AMES weekly plan title
- session, term, class, week, teacher, curriculum version
- approved curriculum summary
- teacher implementation plan
- assessment/access notes
- daily responsive notes when present
- weekly review when present
- sign-off lines

## Safeguarding and Privacy

The UI reminds teachers that safeguarding concerns must use the school's safeguarding procedure, not ordinary planning notes.

The planning layer is designed for general access adjustments. Detailed child-specific SEND and safeguarding records remain outside Phase 3.

## Tests

Added:

- `backend/scripts/earlyYearsPlanningSmokeTest.js`

Verified by the Phase 3 smoke test:

- Crèche plan creation
- Nursery plan creation
- Reception plan creation
- duplicate prevention
- copy previous week structure without changing the new curriculum link
- Basic/JSS/SS exclusion
- unassigned teacher rejection
- class-specific planning guidance
- draft save
- submission lock
- return for revision
- approval
- daily responsive record creation
- weekly review save
- print HTML generation
- parent/student isolation
- audit trail
- 117 approved curriculum weeks remain unchanged

## Known Limitations

Autosave is not enabled yet. Teachers use explicit `Save Draft`.

Advanced coverage analytics are intentionally not part of Phase 3.

Child observation assessment, child learning journals, child-level phonics tracking, and Early Years report cards are intentionally excluded for later phases.
