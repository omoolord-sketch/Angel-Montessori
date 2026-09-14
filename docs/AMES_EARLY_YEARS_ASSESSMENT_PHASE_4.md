# AMES Early Years Assessment Phase 4

## Scope

Phase 4 adds the child-level Early Years assessment layer for Creche, Nursery, and Reception. It sits after the approved AMES Volume III curriculum and teacher weekly planning workflow:

Approved curriculum -> weekly plan -> teaching -> observation -> interpretation -> developmental descriptor -> next step -> review -> learning journal -> periodic summary.

This phase is additive. It does not change the approved 117 curriculum weeks, teacher weekly plans, Nigerian CA, finance, attendance, promotion, CBT, LMS, homework, or existing report cards.

## Storage

The JSON data store now includes these Phase 4 collections:

- `earlyYearsObservations`
- `earlyYearsLearningJournalEntries`
- `earlyYearsChildProfiles`
- `earlyYearsDevelopmentSummaries`
- `earlyYearsNextSteps`
- `earlyYearsParentContributions`
- `earlyYearsAssessmentAuditLogs`
- `earlyYearsEvidenceRecords`
- `eyfsObservations` legacy mirror

## Observation Model

`EarlyYearsObservation` records include child, teacher, class, session, term, optional curriculum links, observation type, date, context, EYFS area, factual observation, child words, interpretation, descriptor, next step, support, challenge, evidence metadata, visibility, status, review metadata, and audit timestamps.

The UI deliberately separates:

- What Happened?
- What Does This Suggest?
- What Should Happen Next?

This preserves the AMES principle: describe before you interpret.

## Observation Types

Supported observation types are:

- `EVERYDAY_OBSERVATION`
- `SIGNIFICANT_OBSERVATION`
- `FOCUSED_OBSERVATION`
- `LEARNING_CONVERSATION`
- `WORK_EVIDENCE`
- `FOCUSED_CHECK`

Teachers are not required to use all types equally and no quota is enforced.

## Developmental Descriptors

Supported descriptors are exactly:

- `EMERGING`: learning is beginning or usually requires significant support.
- `DEVELOPING`: learning is increasingly evident but may remain inconsistent or supported.
- `SECURE`: learning is demonstrated independently and appropriately across suitable contexts.

These are AMES internal curriculum-monitoring descriptors, not statutory English EYFS Profile judgement terms.

## EYFS Areas

The seven supported EYFS areas are:

- `COMMUNICATION_LANGUAGE`
- `PSED`
- `PHYSICAL_DEVELOPMENT`
- `LITERACY`
- `MATHEMATICS`
- `UNDERSTANDING_THE_WORLD`
- `EXPRESSIVE_ARTS_DESIGN`

Optional AMES dimension tags remain separate from the seven areas.

## Learning Journal

Learning journal entries can be created from observations or added directly as:

- `OBSERVATION`
- `WORK_SAMPLE`
- `LEARNING_CONVERSATION`
- `CHILD_VOICE`
- `PARENT_CONTRIBUTION`
- `DEVELOPMENT_SUMMARY`
- `TRANSITION_NOTE`

Entries support `INTERNAL` and `PARENT_VISIBLE` visibility. Parents only see published parent-visible entries for their own child.

## Child Profile

Each Early Years child can have a profile with preferred name, date of birth, start date, key person, home languages, interests, family information, medical or dietary notes, additional support, strengths at entry, parent priorities, and baseline area notes.

Profile editing is staff-only. Parent access is read-only through their own child context.

## Parent Contributions

Parents can submit purposeful home observations for their own child. Parent submissions remain `SUBMITTED` until staff review. Approved contributions are published into the learning journal as parent-visible entries.

## Development Summaries

Staff can create periodic summaries:

- `MID_TERM`
- `TERMLY`
- `CUSTOM`

Each summary stores professional judgement by EYFS area, plus overall learning behaviour, practical life/independence, character/responsibility, parent partnership priority, and teacher summary.

No percentages, class positions, average marks, or ranking are generated for Early Years.

## Next Steps

Observation next steps create or update a simple next-step record. Supported statuses are:

- `OPEN`
- `IN_PROGRESS`
- `ACHIEVED`
- `REVISED`
- `NO_LONGER_PRIORITY`

Next steps are teacher-controlled. The system does not automatically turn every observation into a rigid target.

## Moderation

Academic leaders and admins can review observations, confirm or adjust descriptors, and add moderation notes. Teachers cannot moderate their own observations through the leadership route.

## Safeguarding Boundary

Learning journals are not the safeguarding reporting system. If a safeguarding concern is indicated, the backend rejects the ordinary observation with:

`Use the school's safeguarding reporting procedure immediately. Do not rely on the Learning Journal as the safeguarding record.`

## Evidence Coverage Check

The coverage check identifies children with few or no records, no significant evidence, or no development summary. It is labelled as an evidence coverage check only. It does not rank children, label them as weak/failing, or enforce observation quotas.

## API Routes

Mounted under `/api/early-years`:

- `GET /assessment/setup`
- `GET /students`
- `GET /observations`
- `POST /observations`
- `GET /observations/:id`
- `PUT /observations/:id`
- `POST /observations/:id/complete`
- `POST /observations/:id/review`
- `POST /observations/:id/publish`
- `GET /students/:studentId/profile`
- `PUT /students/:studentId/profile`
- `GET /students/:studentId/journal`
- `POST /students/:studentId/journal`
- `GET /students/:studentId/journal/print`
- `GET /students/:studentId/development`
- `POST /students/:studentId/summaries`
- `PUT /summaries/:id`
- `GET /next-steps`
- `PUT /next-steps/:id`
- `GET /coverage`
- `GET /parent-contributions`
- `POST /parent-contributions`
- `POST /parent-contributions/:id/review`
- `GET /audit-log`

## Frontend Routes

The role-aware dashboard is available at:

- `/dashboard/early-years-assessment`
- `/admin/early-years/assessment`
- `/portal/admin/early-years/assessment`
- `/teacher/early-years/assessment`
- `/parent/early-years/journal`
- `/portal/parent/early-years/journal`

## Permissions

- Teachers can create and complete observations for assigned EYFS classes, manage journals, summaries, and next steps for assigned children.
- Academic leaders/admins can view authorised Early Years records, moderate observations, publish journal visibility, review coverage, and audit changes.
- Parents can view only approved parent-visible entries for their own child and submit contributions.
- Students are blocked from the Early Years assessment engine.
- Basic/JSS/SS classes are rejected by the Early Years routes.

## Print View

The learning journal print view includes school name, child, class, date, selected highlights, development summary, child voice, parent contribution where approved, and next priorities. It does not automatically print ordinary internal notes or confidential support notes.

## Tests

`backend/scripts/earlyYearsAssessmentSmokeTest.js` verifies:

- Creche, Nursery, and Reception observations.
- Basic class rejection.
- Unassigned teacher rejection.
- Factual observation and interpretation separation.
- Descriptor saving.
- Next-step creation and update.
- Curriculum and weekly-plan linking.
- Observation without dedicated phonics tracking.
- Internal journal hidden from parents.
- Parent-visible journal access only for correct parent.
- Child voice and work sample entries.
- Parent contribution workflow.
- Development summary and area overview.
- No ranking/percentage fields.
- Moderation permissions.
- Safeguarding boundary.
- Evidence coverage check without failure labels or quotas.
- Print privacy.
- 117 curriculum weeks unchanged.
- Weekly plans unchanged.

## Known Limitations

- File attachments are represented by secure evidence references only. Phase 4 does not introduce a new file storage system.
- Dedicated Reception phonics tracking is intentionally deferred to Phase 5.
- Final Early Years report cards are intentionally deferred to a later phase.
