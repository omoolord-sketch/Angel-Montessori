# AMES Early Years Inclusion Phase 7

## Purpose

Phase 7 adds Early Years SEND support, inclusion records, and parent partnership workflows for Crèche, Nursery, and Reception without changing the approved AMES Volume III curriculum source.

The module follows the inclusion cycle:

`NOTICE -> UNDERSTAND -> ADAPT -> SUPPORT -> REVIEW -> REFER WHERE APPROPRIATE`

The parent partnership cycle is:

`INFORM -> LISTEN -> COLLABORATE -> SUPPORT -> REVIEW`

## Scope

- Early Years support profiles with strengths, interests, support level, concern areas, review dates, and parent-visible boundaries.
- Objective concern records linked to learning-journal observations where needed.
- Support plans tied to academic session, term, weekly plan, Reception literacy support, prepared environment adjustments, resources, parent contribution, review dates, and plan reviews.
- Shared support strategy library managed by academic leadership.
- Referral and consent records with parent awareness and consent status.
- Parent partnership profiles, meetings, comments, acknowledgements, and parent-facing summaries.
- Home language and communication preferences without treating multilingualism as SEND.
- Transition support for Crèche to Nursery, Nursery to Reception, and Reception to Basic 1.
- Print views for support plans, parent partnership meetings, and transition summaries.
- Inclusion audit logs for record creation and updates.

## Boundaries

- No automated SEND labels.
- No casual diagnosis or diagnosis probability.
- No Nigerian CA, grades, percentages, ranking, or broadsheet logic in Early Years support records.
- Safeguarding-only matters are rejected from this workflow and must use the school safeguarding procedure.
- Parent-visible records are sanitized before they reach parent dashboards.
- Student accounts are blocked from Early Years inclusion profiles.

## Role Access

- `ADMIN`, `SUPER_ADMIN`, and `ACADEMIC_OFFICER`: full authorised Early Years inclusion view and shared strategy management.
- `TEACHER`: assigned Early Years children only.
- `PARENT`: own child only, parent-visible records only, acknowledgement/comment access for shared meeting summaries.
- `STUDENT`: no access.

## Backend Files

- `backend/lib/earlyYearsInclusion.js`
- `backend/routes/earlyYearsInclusion.routes.js`
- `backend/scripts/earlyYearsInclusionSmokeTest.js`
- `backend/lib/jsonStore.js`
- `backend/app.js`

## Portal Files

- `apps/portal-web/src/pages/EarlyYearsInclusionDashboard.jsx`
- `apps/portal-web/src/pages/PortalSurface.css`
- `apps/portal-web/src/api/services.js`
- `apps/portal-web/src/App.js`

## Main API Surface

All routes are mounted under `/api/early-years`.

- `GET /inclusion/setup`
- `GET /inclusion/dashboard`
- `GET /inclusion/profiles`
- `POST /inclusion/profiles`
- `GET /inclusion/profiles/:id`
- `PUT /inclusion/profiles/:id`
- `GET /inclusion/students/:studentId`
- `PUT /inclusion/students/:studentId/parent-partnership`
- `POST /inclusion/concerns`
- `PUT /inclusion/concerns/:id`
- `POST /inclusion/support-plans`
- `PUT /inclusion/support-plans/:id`
- `POST /inclusion/support-plans/:id/review`
- `GET /inclusion/support-plans/:id/print`
- `GET /inclusion/strategies`
- `POST /inclusion/strategies`
- `POST /inclusion/referrals`
- `PUT /inclusion/referrals/:id`
- `POST /inclusion/consents`
- `GET /parent-partnership/meetings`
- `POST /parent-partnership/meetings`
- `PUT /parent-partnership/meetings/:id`
- `GET /parent-partnership/meetings/:id/print`
- `POST /inclusion/parent-summaries`
- `POST /inclusion/transitions`
- `PUT /inclusion/transitions/:id`
- `GET /inclusion/transitions/:id/print`
- `GET /inclusion/reviews-due`

## Regression Protection

The Phase 7 smoke test verifies:

- Curriculum week count remains 117.
- Curriculum mutations remain 0.
- Existing Phase 3 planning data is unchanged by Phase 7.
- Existing Phase 4 assessment data is unchanged by Phase 7.
- Existing Phase 5 literacy data and SSP sequence are unchanged by Phase 7.
- Existing Phase 6 prepared environment data is unchanged by Phase 7.
- Finance records are unchanged by Phase 7.
- Parent, teacher, leader, and student access boundaries behave correctly.
- Parent-visible records exclude restricted staff-only content.
- Casual diagnostic labels and safeguarding-only records are rejected.

## Test Command

```bash
node backend/scripts/earlyYearsInclusionSmokeTest.js
```
