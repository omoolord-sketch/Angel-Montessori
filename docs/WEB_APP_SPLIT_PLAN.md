# Web App Split Plan

## Goal

Split the current combined frontend into two deployable web apps while keeping one shared backend API:

- `apps/public-web`
- `apps/portal-web`
- `backend`

This gives Angel Montessori School a cleaner production structure:

- `angelmontessori.ng` -> public website
- `portal.angelmontessori.ng` -> portal
- `api.angelmontessori.ng` -> backend API

## Current State

The existing combined app lives in:

- `frontend`

It currently contains:

- public marketing pages
- admissions pages
- careers pages
- public CBT access
- applicant web flow
- portal login
- student, parent, teacher, admin dashboards

## New App Ownership

### `apps/public-web`

Owns all public and public-facing role entry flows:

- `/`
- `/about`
- `/contact`
- `/admissions/*`
- `/careers/*`
- `/book-a-visit`
- `/admissions-enquiry`
- `/request-callback`
- public academics pages
- public student life pages
- public information pages
- `/cbt/exam`
- applicant dashboard routes:
  - `/portal/applicant`
  - `/applicant/*`

### `apps/portal-web`

Owns all internal portal flows:

- `/login`
- `/portal/*`
- `/dashboard/*`
- `/teacher/*`
- `/student/*`
- `/parent/*`
- `/admin/*`

## File Move Map

### Public-first pages

These belong in `apps/public-web/src/pages`:

- `HomePage.jsx`
- `AboutPage.jsx`
- `AdmissionsPage.jsx`
- `AdmissionsRequirementsPage.jsx`
- `AdmissionsFaqPage.jsx`
- `ApplicantSignupPage.jsx`
- `ContactPage.jsx`
- `CareersPage.jsx`
- `CareerVacanciesPage.jsx`
- `CareerVacancyDetailPage.jsx`
- `CareerApplicationPage.jsx`
- `AdmissionsEnquiryPage.jsx`
- `CallbackRequestPage.jsx`
- `BookVisitPage.jsx`
- `PublicContentPage.jsx`
- `HeadOfSchoolPage.jsx`
- `OurStoryPage.jsx`
- `VirtualClassroomPage.jsx`
- `CBTExamPage.jsx`
- `ApplicantAdmissionsDashboard.jsx`

### Portal-first pages

These belong in `apps/portal-web/src/pages`:

- `LoginPage.jsx`
- `PortalHomePage.jsx`
- `StudentPortalDashboard.jsx`
- `ParentPortalDashboard.jsx`
- `TeacherSubjectDashboard.jsx`
- `BroadsheetDashboard.jsx`
- `ReportCardDashboard.jsx`
- `AttendanceDashboard.jsx`
- `CBTDashboard.jsx`
- `GradingEngineDashboard.jsx`
- `HomeworkDashboard.jsx`
- `LibraryDashboard.jsx`
- `LMSDashboard.jsx`
- `PromotionDashboard.jsx`
- `SMSDashboard.jsx`
- `TeacherAnalyticsDashboard.jsx`
- `AdmissionsAdminDashboard.jsx`
- `UserManagementDashboard.jsx`
- `AccountProvisioningDashboard.jsx`
- `FinanceDashboard.jsx`
- `SiteRoleProfilesDashboard.jsx`
- `TransportDashboard.jsx`
- `ParentTransportDashboard.jsx`
- `TransportDriverDashboard.jsx`
- `EnquiriesDashboard.jsx`
- `CareersDashboard.jsx`
- `AcademicCalendarDashboard.jsx`
- `SchemeOfWorkDashboard.jsx`
- `LessonNotesDashboard.jsx`

### Shared candidates

These should later be extracted into a shared package or shared folder:

- `src/api/client.js`
- `src/api/services.js`
- `src/auth/AuthContext.jsx`
- `src/config/runtimeConfig.js`
- `src/utils/reportCard.js`
- `src/utils/schoolFeeTemplate.js`
- `src/utils/virtualClassTimetable.js`
- `src/content/publicSiteContent.js`
- `src/content/siteRoleProfiles.js`

### Transitional helpers

These were useful in the combined app, but can be reduced or removed after the split is fully stabilized:

- `src/components/DomainBoundary.jsx`
- `src/components/DomainAwareLink.jsx`
- `src/utils/domainLinks.js`

## What Has Been Started

The first split scaffold is now present:

- `apps/public-web`
- `apps/portal-web`

Both were created from the current `frontend` codebase so the project can be split without destroying the existing working app.

Each new app now has its own `src/App.js` route shell:

- `apps/public-web/src/App.js`
- `apps/portal-web/src/App.js`

## Transitional Strategy

For now:

- `frontend` remains the combined legacy reference app
- `apps/public-web` is the emerging public deployable app
- `apps/portal-web` is the emerging portal deployable app

This reduces migration risk while the new app boundaries are tested.

## Next Recommended Steps

1. Install dependencies separately inside `apps/public-web` and `apps/portal-web`
2. Verify both apps build independently
3. Remove unused public files from `portal-web`
4. Remove unused portal files from `public-web`
5. Extract shared API/auth/config utilities into a shared package or shared folder
6. Stop serving frontend builds from the backend directly
7. Serve:
   - `public-web/build` from Nginx for `angelmontessori.ng`
   - `portal-web/build` from Nginx for `portal.angelmontessori.ng`
8. Proxy:
   - `api.angelmontessori.ng` to the backend Node service
9. Keep backend focused on:
   - `/api/*`
   - `/media/*`

## Target Deployment Shape

```text
apps/public-web  -> angelmontessori.ng
apps/portal-web  -> portal.angelmontessori.ng
backend          -> api.angelmontessori.ng
mobile-app       -> mobile client
```

## Recommended Long-Term Upgrade

After the split stabilizes, move toward a package-based structure:

```text
apps/
  public-web/
  portal-web/
  mobile-app/
backend/
packages/
  design-system/
  web-shared/
  role-config/
  content-models/
docs/
```

This is the stronger enterprise direction once the public and portal apps are already deployable on their own.
