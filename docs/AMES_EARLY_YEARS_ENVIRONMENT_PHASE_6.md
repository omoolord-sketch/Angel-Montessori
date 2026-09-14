# AMES Early Years Environment Phase 6

## Scope

Phase 6 adds the classroom environment and continuous provision management layer for AMES Early Years:

Approved curriculum -> weekly plan -> prepare environment -> continuous provision -> Practical Life -> outdoor learning -> resource use -> observe use -> adapt -> restore -> review.

It applies only to Crèche, Nursery, and Reception under `BRITISH_EYFS / AMES`.

This phase is additive. It does not alter the approved 117 AMES Volume III curriculum records, Phase 3 weekly plans, Phase 4 observations and journals, Phase 5 literacy data, Nigerian CA, finance, attendance, promotion, CBT, LMS, homework, or report cards.

## Core Principles

- The environment participates in learning.
- Beautiful enough to invite, simple enough to think.
- Purpose before price.
- Display learning, not decoration for its own sake.
- Can this child participate meaningfully in this environment?
- Prepare, invite, observe, support, adapt, restore.

## Storage

The JSON data store now includes these Phase 6 collections:

- `earlyYearsProvisionAreas`
- `earlyYearsWeeklyProvisionEnhancements`
- `earlyYearsPracticalLifeActivities`
- `earlyYearsPracticalLifeAssignments`
- `earlyYearsEnvironmentChecklists`
- `earlyYearsEnvironmentActions`
- `earlyYearsResources`
- `earlyYearsResourceRequests`
- `earlyYearsEnvironmentReviews`
- `earlyYearsDisplayReviews`
- `earlyYearsEnvironmentAuditLogs`

## Provision Areas

Provision areas store:

- class, session, and term
- area type
- name and purpose
- core resources
- accessibility and independence notes
- current enhancement, observed use, and review notes
- active state and display order

Supported area types include reading, communication/storytelling, writing/mark-making, mathematics, construction, small world, role play, creative arts, investigation, Practical Life, sensory/fine motor, outdoor, technology, quiet/regulation, and other.

The system does not require every classroom to have a permanent separate corner for every area.

## Weekly Enhancements

Weekly provision enhancements link operational classroom changes to:

- weekly plan
- class
- curriculum week
- provision area
- resources added
- adult role
- intended learning
- access adjustments
- outdoor or Practical Life connection
- optional Phase 4 observation/support reference

Weekly enhancements are separate records. They do not rewrite the approved curriculum or silently edit the Phase 3 weekly plan.

## Practical Life

Practical Life activities store:

- name, category, and purpose
- developmental stage
- materials
- presentation steps
- safety notes
- skills developed
- independence, fine motor, self-regulation, and responsibility focus
- curriculum connections
- age-phase recommendation

The standard categories are supported, but school-defined categories are allowed.

## Practical Life Progression

Phase 6 stores guidance metadata so teachers do not type it repeatedly:

Crèche:

- `DO_WITH_ME`
- `LET_ME_HELP`
- `LET_ME_TRY`

Nursery:

- `I_CAN_DO_MORE`
- `I_CAN_TAKE_RESPONSIBILITY`
- `I_AM_BECOMING_INDEPENDENT`

Reception:

- `I_CAN_MANAGE_MYSELF_AND_MY_LEARNING`
- `I_CAN_TAKE_RESPONSIBILITY_FOR_MY_LEARNING_ENVIRONMENT`
- `I_AM_READY_TO_TAKE_GREATER_RESPONSIBILITY`

Weekly Practical Life assignments link an activity to a weekly plan or class without turning it into a rigid timetable.

## Environment Checklist

Environment checklists cover:

- safety and safeguarding
- emotional climate
- organisation and accessibility
- independence
- communication and language
- books and literacy
- mathematics
- creativity
- investigation
- Practical Life
- outdoor provision
- physical development
- inclusion
- displays
- resource condition
- adult positioning
- restoration
- continuous provision
- enhanced provision

Checklist statuses are:

- `SECURE`
- `DEVELOPING`
- `ACTION_REQUIRED`
- `NOT_APPLICABLE`

These are operational review states, not punitive labels.

When a checklist has action required, an environment action record is created or updated.

## Safeguarding Boundary

The environment checklist may identify hazards, broken resources, blocked exits, unsafe furniture, or supervision concerns. It is not the safeguarding case reporting system.

If a safeguarding concern exists, staff must use the school's safeguarding procedure.

## Accessibility And SEND

Phase 6 stores general provision-access adjustments. It does not expose confidential SEND diagnoses in ordinary classroom printouts.

Environment records may include optional links to existing support or observation records, but they do not duplicate confidential child details.

## Resources

The resource inventory stores:

- name
- category
- provision area
- optional class
- quantity and usable quantity
- condition
- storage location
- consumable state
- minimum required
- purpose
- usage/access/safety notes

Supported conditions are:

- `GOOD`
- `FAIR`
- `NEEDS_REPAIR`
- `REPLACE`

This is not a procurement system and does not change finance.

## Resource Requests

Teachers can request resources with:

- resource
- reason
- quantity
- priority
- class
- provision area
- optional weekly plan link

Statuses are:

- `REQUESTED`
- `REVIEWED`
- `APPROVED`
- `DECLINED`
- `PROCURED`
- `CLOSED`

Academic leaders review requests. No payment or finance processing is added in Phase 6.

## Outdoor Provision

Outdoor provision is handled through provision areas and weekly enhancements. Outdoor enhancements support purpose, curriculum link, resources, adult role, access adjustment, and risk consideration.

Outdoor learning remains curriculum, not just playtime.

## Display Management

Display reviews are optional and store:

- class
- display title
- purpose
- curriculum connection
- child work included
- vocabulary support
- current state
- review date
- notes

The system follows the AMES principle: display learning, not decoration for its own sake.

## Cultural Representation

The checklist can record notes about authentic representation of Owo, Ondo State, Nigeria, Africa, wider world, families, occupations, abilities, modern life, and different communities.

It should avoid tokenistic or stereotypical representation.

## API Routes

Mounted under `/api/early-years`:

- `GET /environment/setup`
- `GET /environment/dashboard`
- `GET /environment/areas`
- `POST /environment/areas`
- `PUT /environment/areas/:id`
- `GET /environment/enhancements`
- `POST /environment/enhancements`
- `PUT /environment/enhancements/:id`
- `GET /practical-life`
- `POST /practical-life`
- `PUT /practical-life/:id`
- `GET /practical-life/assignments`
- `POST /practical-life/assignments`
- `GET /environment/checklists`
- `POST /environment/checklists`
- `PUT /environment/checklists/:id`
- `GET /environment/checklists/:id/print`
- `GET /environment/actions`
- `PUT /environment/actions/:id`
- `GET /environment/resources`
- `POST /environment/resources`
- `PUT /environment/resources/:id`
- `GET /environment/resource-requests`
- `POST /environment/resource-requests`
- `PUT /environment/resource-requests/:id`
- `GET /environment/resource-requests/:id/print`
- `GET /environment/reviews`
- `POST /environment/reviews`
- `GET /environment/displays`
- `POST /environment/displays`

## Frontend Routes

The role-aware dashboard is available at:

- `/dashboard/early-years-environment`
- `/admin/early-years/environment`
- `/portal/admin/early-years/environment`
- `/teacher/early-years/environment`
- `/teacher/early-years/classroom-environment`

## Permissions

Teachers can:

- view and manage their assigned Early Years class environment
- create provision areas and weekly enhancements
- create Practical Life activities and weekly assignments
- complete checklists
- record resource condition
- create resource requests
- review provision use

Academic leaders/admins can:

- view all Early Years classes
- manage shared Practical Life templates
- review checklists and resource requests
- view actions and dashboards across Early Years

Parents and students have no internal environment-management access.

Basic/JSS/SS classes are rejected from the Early Years environment engine.

## Print Views

Phase 6 includes print-friendly HTML for:

- environment checklist
- resource request

Checklist printouts include class, teacher, date, session, term, checklist domains, strengths, actions, responsible person, and review date.

Confidential child-level SEND details are excluded from ordinary printouts.

## Audit Logging

Audit records are created for:

- provision area changes
- weekly enhancement changes
- Practical Life activity and assignment changes
- checklist completion and updates
- action changes
- resource condition changes
- resource request changes
- environment reviews
- display reviews

Each audit stores user, role, class, timestamp, entity type, entity id, and before/after details where relevant.

## Tests

`backend/scripts/earlyYearsEnvironmentSmokeTest.js` verifies:

- Crèche, Nursery, and Reception provision access.
- Basic and unassigned teacher rejection.
- Parent and student rejection.
- Weekly enhancement creation and weekly-plan/curriculum link.
- Enhancement review and status update.
- Practical Life progression differences by age phase.
- Shared Practical Life template leadership control.
- Checklist completion and action creation.
- Leadership checklist review.
- No ranking language.
- Resource condition updates.
- Resource request creation and leadership review.
- No finance mutation from resource requests.
- Outdoor enhancement and review.
- Optional Phase 4 observation links to provision/enhancement/Practical Life.
- Phase 5 literacy data unchanged.
- Printable checklist and resource request.
- 117 curriculum weeks unchanged.

## Known Limitations

- Phase 6 does not implement procurement or payment processing.
- Phase 6 does not replace safeguarding reporting.
- Phase 6 does not build final Early Years report cards.
- Phase 6 does not start Phase 7.
- Attachments remain represented by text references; no new file storage layer is introduced.
