# AMES Reception Literacy Phase 5

## Scope

Phase 5 adds a dedicated Reception literacy layer for phonics, early reading, early writing, decodable reading, home reading, keep-up support, and leadership review.

It is intentionally Reception-only. Creche and Nursery remain observation-led and play-responsive; they do not receive the formal Reception SSP tracker. Basic, JSS, and SS classes are outside this module.

Phase 5 is additive. It does not change the approved 117 AMES Volume III curriculum weeks, Phase 3 weekly planning records, Phase 4 observations, Nigerian CA, finance, attendance, promotion, CBT, LMS, homework, or existing report cards.

## Production SSP Boundary

The app does not invent a production systematic synthetic phonics sequence.

Production starts with:

- no active SSP programme
- no production GPC sequence
- zero invented placeholder GPCs

Academic leadership must create the adopted school programme, enter the sequence, configure any decodable book references, and activate the programme before teachers can record formal Reception phonics progress against it.

The smoke test uses records labelled `TEST ONLY`. These are verification records only and are not seeded into production.

## Storage

The JSON data store now includes these Phase 5 collections:

- `earlyYearsPhonicsProgrammes`
- `earlyYearsPhonicsTeachingUnits`
- `earlyYearsPhonicsProgress`
- `earlyYearsDecodableBooks`
- `earlyYearsDecodableReadingRecords`
- `earlyYearsReadingRecords`
- `earlyYearsWritingRecords`
- `earlyYearsLiteracySupportPlans`
- `earlyYearsLiteracySummaries`
- `earlyYearsHomeReadingRecords`
- `earlyYearsLiteracyParentUpdates`
- `earlyYearsLiteracyAuditLogs`

## SSP Programme Model

Reception phonics programmes are leadership-managed records with:

- programme name, provider, version, academic session, reference, and description
- status workflow: `DRAFT`, `ACTIVE`, `ARCHIVED`
- leadership activation metadata
- audit timestamps

Only academic leadership and admins can create, edit, activate, or archive programmes.

An active programme is protected. Teachers cannot edit it, weekly plans cannot alter it, and new sequence units cannot be added to an active programme. A future sequence change should be created as a new draft version and then activated by leadership.

## Teaching Sequence

Programme teaching units store:

- sequence order
- stage or phase label
- unit label
- grapheme-phoneme correspondence
- alternative spellings
- tricky/common exception words
- blending focus
- segmenting focus
- decodable reading focus
- writing focus
- review cycle
- teacher guidance

Sequence units are sorted by `sequenceOrder`. The system records only the sequence entered by authorised leadership.

## Phonics Progress

Reception phonics progress records capture:

- child, class, programme, teaching unit, session, and term
- assessment date
- GPC recognition
- blending
- segmenting
- application in decodable reading
- application in writing
- AMES descriptor: `EMERGING`, `DEVELOPING`, or `SECURE`
- teacher note and next action
- optional Phase 3 weekly plan link
- optional Phase 4 observation or learning journal link

Supported skill states are:

- `NOT_YET_TAUGHT`
- `TAUGHT`
- `REQUIRES_SUPPORT`
- `DEVELOPING`
- `SECURE`
- `REVIEW_REQUIRED`

`NOT_YET_TAUGHT` is a neutral instructional state. It is not treated as failure, weakness, ranking, or a punitive label.

## Reading Records

Reading records distinguish between:

- `DECODABLE`
- `SHARED_TEXT`
- `RICH_LITERATURE`
- `OTHER`

Decodable reading can reference a configured book or a manually entered text title. Rich literature and shared texts are recorded separately so the portal does not confuse broad language/comprehension experiences with decodable-code assessment.

Records can include accuracy, blending, fluency, comprehension, vocabulary, confidence, review action, parent visibility, and optional Learning Journal publication.

## Early Writing Records

Writing records capture Reception-appropriate evidence such as:

- oral composition
- segmenting
- grapheme selection
- letter formation
- sentence construction
- writing for purpose
- independence level
- teacher comment
- next priority

The model supports the AMES early writing cycle: say it, build it, write it, read it back.

## Keep-Up Support

Support plans store:

- child and class
- programme point
- identified need
- support focus
- start and review dates
- frequency
- strategy
- review outcome
- status: `PLANNED`, `ACTIVE`, `REVIEW`, or `COMPLETED`

Completed support remains visible for continuity and transition. The module does not use punitive labels such as weak, fail, or bottom group.

## Summaries And Transition

Reception literacy summaries support:

- `MID_TERM`
- `TERMLY`
- `CUSTOM`

Summaries combine phonics, reading, comprehension, writing, strengths, priorities, support, and next steps. They are narrative and developmental; no percentages, rankings, positions, or final Early Years report card judgements are generated in Phase 5.

The transition snapshot is prepared for later continuity work. It does not start Phase 6 and does not generate final report cards.

## Parent View

Parents can see only selected parent-visible literacy information for their own child:

- published reading records
- published literacy summaries
- parent updates
- home reading history

Parents can submit home reading records for their own child. They cannot configure programmes, view other children, or access internal teacher evidence.

Students are blocked from the Reception literacy tracker.

## Phase 3 Planning Integration

Reception weekly plans may reference the active SSP programme and record teacher implementation notes. Weekly plans cannot create, edit, or reorder the master SSP sequence.

The smoke test verifies that editing a weekly-plan phonics note does not mutate the programme sequence.

## Phase 4 Assessment Integration

Phase 5 can optionally link selected phonics, reading, or writing evidence to Phase 4 observations and Learning Journal entries.

This link is opt-in. Phase 5 does not automatically overwrite Phase 4 observation descriptors, learning journal visibility, or developmental summaries.

## API Routes

Mounted under `/api/early-years`:

- `GET /phonics/setup`
- `GET /phonics/programmes`
- `POST /phonics/programmes`
- `GET /phonics/programmes/:id`
- `PUT /phonics/programmes/:id`
- `POST /phonics/programmes/:id/activate`
- `GET /phonics/programmes/:id/sequence`
- `POST /phonics/programmes/:id/sequence`
- `GET /phonics/programmes/:id/books`
- `POST /phonics/programmes/:id/books`
- `GET /phonics/progress`
- `POST /phonics/progress`
- `PUT /phonics/progress/:id`
- `GET /reading`
- `POST /reading`
- `GET /writing`
- `POST /writing`
- `GET /literacy/students/:studentId`
- `GET /literacy/class/:classId`
- `GET /literacy/support`
- `POST /literacy/support`
- `PUT /literacy/support/:id`
- `GET /literacy/summaries`
- `POST /literacy/summaries`
- `GET /literacy/home-reading`
- `POST /literacy/home-reading`
- `GET /literacy/parent-updates`
- `POST /literacy/parent-updates`
- `GET /literacy/students/:studentId/transition`
- `GET /phonics/audit/no-invented-sequence`

## Frontend Routes

The role-aware dashboard is available at:

- `/dashboard/reception-literacy`
- `/admin/early-years/reception-literacy`
- `/portal/admin/early-years/reception-literacy`
- `/teacher/early-years/reception-literacy`
- `/teacher/early-years/phonics`
- `/parent/reception-literacy`
- `/portal/parent/reception-literacy`

## Permissions

- Academic leaders/admins can configure SSP programmes, sequences, decodable references, summaries, support review, and class review.
- Teachers can assess assigned Reception children only.
- Teachers cannot configure or mutate the master SSP sequence.
- Parents can view selected own-child information and add home reading only.
- Students are blocked.
- Creche, Nursery, Basic, JSS, and SS classes are rejected from the formal Reception SSP tracker.

## Tests

`backend/scripts/receptionLiteracySmokeTest.js` verifies:

- no invented production SSP sequence
- no active programme by default
- leadership-only programme configuration
- teacher activation blocked
- programme activation blocked before sequence exists
- active programme and active sequence protection
- future draft version support
- Reception-only teacher access
- Nursery, Creche, Basic, unassigned teacher, parent, and student boundaries
- phonics skill recording
- `NOT_YET_TAUGHT` neutral handling
- blending and segmenting evidence
- decodable reading separated from rich literature
- early writing evidence
- keep-up support lifecycle
- literacy summaries
- home reading and parent updates
- Phase 3 weekly plan reference without sequence mutation
- optional Phase 4 observation and Learning Journal link without descriptor overwrite
- transition snapshot readiness without final report card generation
- 117 approved curriculum weeks unchanged

## Known Limitations

- Phase 5 does not provide the school-selected SSP content. Leadership must configure the adopted programme.
- Phase 5 does not generate final Early Years report cards.
- Phase 5 does not implement Phase 6 transition automation.
- File attachments remain represented by secure evidence references; no new file storage layer is introduced.
