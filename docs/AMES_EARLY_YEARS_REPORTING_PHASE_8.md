# AMES Early Years Reporting Phase 8

## Purpose

Phase 8 adds the formal Early Years reporting layer for Angel Montessori School. It is additive to Phases 1-7 and does not rebuild or alter the approved AMES Volume III curriculum, weekly plans, observations, literacy records, environment records, support records, finance, attendance, or Nigerian report-card systems.

The implemented flow is:

`CURRICULUM -> TEACHING -> OBSERVATION -> DEVELOPMENTAL JUDGEMENT -> LITERACY EVIDENCE -> SUPPORT / ACCESS -> PARENT PARTNERSHIP -> TEACHER SUMMARY -> LEADERSHIP REVIEW -> REPORT -> PARENT VIEW -> HISTORICAL ARCHIVE`

For Reception end-of-year:

`RECEPTION EVIDENCE -> AMES END-OF-RECEPTION EYFS REFERENCE -> TRANSITION PROFILE -> BASIC 1 HANDOVER`

## Report Types

Supported report types:

- `CRECHE_TERMLY`
- `NURSERY_TERMLY`
- `RECEPTION_TERMLY`
- `RECEPTION_END_OF_YEAR`
- `REPORT_ARCHIVE_COPY`

Reception-specific structures:

- AMES End-of-Reception EYFS Reference
- Reception to Basic 1 Transition Profile
- Reception school-readiness profile
- Basic 1 handover acknowledgement

## Reporting Principle

Early Years reporting is descriptive, developmental, and evidence-informed. It does not introduce Nigerian CA scoring, exam scores, percentages, averages, CGPA, class position, class rank, or score totals into Crèche, Nursery, or Reception reports.

Descriptors are AMES internal descriptors only:

- `EMERGING`
- `DEVELOPING`
- `SECURE`

They are not presented as statutory English EYFS Profile judgement terms.

## Storage

New JSON-store collections:

- `earlyYearsReports`
- `earlyYearsReportAreas`
- `earlyYearsReportEvidenceLinks`
- `earlyYearsReportTemplates`
- `earlyYearsReportAuditLogs`
- `receptionEyfsReferences`
- `receptionSchoolReadinessProfiles`
- `receptionBasicOneTransitionProfiles`
- `earlyYearsReportHandoverAcknowledgements`

Published reports include:

- `reportVersion`
- `supersedesReportId`
- `supersededByReportId`
- `isCurrentVersion`
- `amendmentReason`

Published records are locked. Corrections create an amended report version such as `v1.1`. The old published version remains in the archive and remains parent-visible until the replacement version is published.

## Seven EYFS Areas

Every termly Early Years report supports all seven EYFS areas:

- Communication and Language
- Personal, Social and Emotional Development
- Physical Development
- Literacy
- Mathematics
- Understanding the World
- Expressive Arts and Design

Each area stores:

- AMES internal descriptor
- strengths/progress
- current development
- next priority
- teacher comment
- source evidence summary
- selected evidence IDs

## Practical Life, Character, And Learning Behaviour

Reports include dedicated parent-facing sections for:

- Practical Life
- independence
- responsibility
- self-management
- kindness
- respect
- perseverance
- service
- gratitude
- honesty
- care
- stewardship
- cooperation
- attention
- engagement
- curiosity
- persistence
- help-seeking
- collaboration
- reflection

Negative labels such as weak, lazy, dull, slow learner, problem child, poor reader, naughty, bottom, and failure are blocked.

## Evidence Integration

Phase 8 reads from earlier phases without mutating them:

- Phase 4 observations, development summaries, next steps, and learning-journal highlights
- Phase 5 Reception phonics, reading, writing, literacy summaries, and keep-up support
- Phase 7 parent-visible support strategies and transition support

The system shows evidence suggestions, but it does not automatically write or decide final teacher judgement.

## Workflow

Report workflow:

1. Teacher creates draft.
2. Teacher completes all seven areas and required summary fields.
3. Teacher submits.
4. Academic leadership reviews.
5. Leadership may return for revision.
6. Teacher revises and resubmits.
7. Leadership approves.
8. Leadership publishes to parent.
9. Published report is locked.
10. Corrections create an amended version with a reason.

Statuses:

- `DRAFT`
- `SUBMITTED`
- `RETURNED_FOR_REVISION`
- `REVIEWED`
- `APPROVED`
- `PUBLISHED`
- `ARCHIVED`

## Parent View

Parents can only view their own child's published Early Years reports. Parent responses exclude:

- internal teacher notes
- reviewer-only comments
- returned reasons
- restricted SEND records
- referral records
- safeguarding information
- professional documents
- other children's information

Historical Reception reports remain linked to the class and report framework at the time of publication. If a child later moves to Basic 1, the historical Reception report remains a Reception Early Years report.

## Print / PDF

Phase 8 provides print-friendly HTML for:

- Early Years reports
- Reception to Basic 1 transition profiles

The print views include:

- Angel Montessori School branding
- motto
- child details
- class
- academic session
- term
- teacher
- report version
- seven EYFS areas
- Practical Life / independence
- character / learning behaviour
- overall comment
- next priorities
- approval fields

They exclude restricted and internal-only notes.

## AMES End-of-Reception EYFS Reference

Legal wording displayed in the system:

"The Early Learning Goals are statutory end-of-Reception expectations within England's EYFS system. Angel Montessori School operates in Nigeria and adopts them as an end-of-Reception reference framework within its British-system Early Years programme."

ELG reference areas:

- Communication and Language
  - Listening, Attention and Understanding
  - Speaking
- PSED
  - Self-Regulation
  - Managing Self
  - Building Relationships
- Physical Development
  - Gross Motor Skills
  - Fine Motor Skills
- Literacy
  - Comprehension
  - Word Reading
  - Writing
- Mathematics
  - Number
  - Numerical Patterns
- Understanding the World
  - Past and Present
  - People, Culture and Communities
  - The Natural World
- Expressive Arts and Design
  - Creating with Materials
  - Being Imaginative and Expressive

AMES reference statuses:

- `MEETING_REFERENCE`
- `DEVELOPING_TOWARDS_REFERENCE`
- `NOT_YET_ASSESSED`

No automatic ELG reference judgement is made from evidence counts or algorithms.

## School Readiness

The Reception school-readiness profile stores descriptive domain summaries for:

- Communication
- Personal Development
- Social Development
- Emotional Development
- Physical Development
- Literacy
- Mathematics
- Independence
- Learning Behaviour
- Character

No overall numerical readiness score is stored.

Principle:

`READY DOES NOT MEAN FINISHED. READINESS IS CAPABILITY - NOT EXAMINATION PERFORMANCE.`

## Reception To Basic 1 Transition

Transition profile sections include:

- child
- Reception teacher
- receiving Basic 1 teacher
- academic session
- transition date
- communication and language
- PSED
- physical development
- phonics
- reading
- writing
- mathematics
- understanding the world
- expressive arts
- Practical Life / independence
- learning behaviour
- character / responsibility
- strengths
- interests
- successful strategies
- SEND / access adjustments
- current priorities
- parent information
- child voice
- receiving-teacher notes

Authorised Basic 1 teachers can view published incoming profiles and acknowledge handover. They cannot edit Reception historical evidence.

Principles:

`PREPARE THE CHILD FOR BASIC 1 - DO NOT TURN RECEPTION INTO BASIC 1.`

`TRANSITION MEANS CONTINUITY - NOT RESET.`

`KNOW WHERE THEY ARE - CONTINUE THE JOURNEY.`

## API Routes

Report routes:

- `GET /api/early-years/reports/setup`
- `GET /api/early-years/reports/dashboard`
- `GET /api/early-years/reports`
- `POST /api/early-years/reports`
- `GET /api/early-years/reports/student/:studentId/archive`
- `GET /api/early-years/reports/templates`
- `POST /api/early-years/reports/templates`
- `GET /api/early-years/reports/:id`
- `PUT /api/early-years/reports/:id`
- `POST /api/early-years/reports/:id/submit`
- `POST /api/early-years/reports/:id/return`
- `POST /api/early-years/reports/:id/approve`
- `POST /api/early-years/reports/:id/publish`
- `POST /api/early-years/reports/:id/amend`
- `POST /api/early-years/reports/:id/archive`
- `GET /api/early-years/reports/:id/print`

Reception routes:

- `GET /api/early-years/reception/eyfs-reference/:studentId`
- `POST /api/early-years/reception/eyfs-reference`
- `PUT /api/early-years/reception/eyfs-reference/:id`
- `POST /api/early-years/reception/eyfs-reference/:id/submit`
- `POST /api/early-years/reception/eyfs-reference/:id/return`
- `POST /api/early-years/reception/eyfs-reference/:id/approve`
- `POST /api/early-years/reception/eyfs-reference/:id/publish`
- `GET /api/early-years/reception/transition/:studentId`
- `POST /api/early-years/reception/transition`
- `PUT /api/early-years/reception/transition/:id`
- `POST /api/early-years/reception/transition/:id/submit`
- `POST /api/early-years/reception/transition/:id/return`
- `POST /api/early-years/reception/transition/:id/approve`
- `POST /api/early-years/reception/transition/:id/publish`
- `POST /api/early-years/reception/transition/:id/handover`
- `POST /api/early-years/reception/transition/:id/acknowledge`
- `GET /api/early-years/reception/transition/:id/print`
- `GET /api/early-years/reception/handover/incoming`

## Frontend

New page:

- `apps/portal-web/src/pages/EarlyYearsReportingDashboard.jsx`

Routes:

- `/dashboard/early-years-reports`
- `/admin/early-years/reports`
- `/portal/admin/early-years/reports`
- `/teacher/early-years/reports`
- `/teacher/early-years/reception-reference`
- `/teacher/early-years/basic-1-transition`
- `/teacher/incoming-transition`
- `/parent/early-years/reports`
- `/portal/parent/early-years/reports`

Portal home now links leadership, teachers, and parents to Early Years Reports.

## Permissions

Teacher:

- create and edit reports for assigned Early Years children
- submit reports
- view returned reviewer comments
- create Reception EYFS reference records
- create Reception to Basic 1 transition profiles

Academic leader/admin:

- review
- return
- approve
- publish
- manage comment-support templates
- view archive
- manage EYFS reference review
- manage transition handover

Basic 1 teacher:

- view authorised published incoming Reception transition profiles
- acknowledge Basic 1 handover
- cannot edit Reception historical evidence

Parent:

- view own child's published reports
- view published parent transition summary
- print/download published views where enabled

Student:

- no unrestricted Early Years report access

## Audit Logging

Audit events are recorded for:

- report creation
- report update
- report submission
- report return
- report approval
- report publication
- report amendment creation
- report archive
- report view
- comment template creation
- EYFS reference creation/update
- transition profile creation/update
- handover acknowledgement

## Tests

Primary smoke test:

`node backend/scripts/earlyYearsReportingSmokeTest.js`

The smoke test validates:

- Crèche, Nursery, and Reception report creation
- Basic 1 report creation rejection
- unassigned teacher rejection
- all seven EYFS areas
- descriptor storage with no automatic judgement
- Practical Life, character, learning behaviour, and next-priority sections
- Phase 4 evidence suggestions
- Phase 5 literacy suggestions
- Phase 7 parent-visible support suggestions
- professional-language blocks
- complete workflow from draft to published
- report return and revision
- published report locking
- amended version `v1.1`
- historical archive retention
- parent-safe view
- print-friendly report
- Reception EYFS reference workflow
- exact ELG legal wording
- no automatic ELG judgement
- school-readiness profile storage
- Reception to Basic 1 transition profile
- Basic 1 handover acknowledgement
- restricted data exclusion
- prior phase data hashes unchanged

Expected integrity output:

- Curriculum weeks before: `117`
- Curriculum weeks after: `117`
- Curriculum mutations: `0`
- SSP sequence unchanged: `true`
- Early Years percentage/ranking introduced: `NO`

## Known Limitations

- PDF generation is implemented as print-friendly HTML for reliability.
- Evidence appears as teacher-support suggestions only; final professional judgement remains manual.
- Comment-support templates are examples and guidance only, not automated report generation.
