# AMES Production Deployment Checklist

Use this on deployment day. Do not deploy until the owner approves.

## 1. Code

- [ ] Confirm owner has approved this deployment.
- [ ] Confirm no new unreviewed feature work is mixed into the release.
- [ ] Confirm `git status` contains only intended files.
- [ ] Confirm no live `.env`, `backend/db.json`, backups, generated credential files, or deployment zips are staged.
- [ ] Commit only after owner approval.

## 2. Environment

- [ ] Set `NODE_ENV=production`.
- [ ] Set `PORT` to the Hostinger Node app port.
- [ ] Set a strong `JWT_SECRET`.
- [ ] Set `JSON_DB_PATH` to persistent storage outside the app bundle.
- [ ] Set `UPLOADS_ROOT_PATH` to persistent storage outside the app bundle.
- [ ] Set `PUBLIC_BACKEND_URL=https://api.angelmontessori.ng`.
- [ ] Set `CORS_ALLOWED_ORIGINS=https://angelmontessori.ng,https://www.angelmontessori.ng,https://portal.angelmontessori.ng`.
- [ ] Set `BOOTSTRAP_ADMIN_USERNAME` and `BOOTSTRAP_ADMIN_PASSWORD` only for first-run bootstrap, then remove/rotate after admin exists.
- [ ] Set `ADMIN_DASHBOARD_KEY` if admin-key routes are exposed.

## 3. Payments

- [ ] Set `ENABLED_PAYMENT_PROVIDERS=PAYSTACK`.
- [ ] Set `PAYMENT_PROVIDER=PAYSTACK`.
- [ ] Set real live `PAYSTACK_SECRET_KEY`.
- [ ] Set `PARENT_PAYMENT_CALLBACK_URL=https://portal.angelmontessori.ng/portal/parent`.
- [ ] Set `APPLICANT_PAYMENT_CALLBACK_URL=https://angelmontessori.ng/portal/applicant`.
- [ ] Set `PAYMENT_CALLBACK_URL=https://portal.angelmontessori.ng/portal`.
- [ ] Confirm Paystack webhook points to `https://api.angelmontessori.ng/api/payments/webhook/paystack`.
- [ ] Do not process a real payment during smoke testing unless authorised.

## 4. Email And Messaging

- [ ] Set `EMAIL_PROVIDER`.
- [ ] Set `EMAIL_FROM`.
- [ ] Set `EMAIL_FROM_NAME`.
- [ ] Set SMTP provider values if SMTP is enabled.
- [ ] Confirm `SMTP_PASS` is real and not a placeholder.
- [ ] Confirm SMS provider settings only if SMS is enabled.

## 5. Persistent Data

- [ ] Confirm `JSON_DB_PATH` points to the current live data file.
- [ ] Confirm the file is writable by the Node app.
- [ ] Confirm `UPLOADS_ROOT_PATH` exists.
- [ ] Confirm the uploads folder is writable by the Node app.
- [ ] Confirm data folders are outside any redeployed source folder.

## 6. Backup

- [ ] Download a backup of live `db.json`.
- [ ] Download a backup of live uploads/media folder.
- [ ] Securely copy the current live `.env`.
- [ ] Record the current deployed backend version.
- [ ] Record the current public and portal frontend versions.
- [ ] Confirm Hostinger provider backup schedule.

## 7. Build Checks

- [ ] Run `node backend/scripts/academicSystemsSmokeTest.js`.
- [ ] Run `node backend/scripts/academicSystemsAcceptanceAudit.js`.
- [ ] Run `node backend/scripts/importAmesVolumeIII.js --dry-run --stage ALL`.
- [ ] Run all Early Years Phase 2-9 smoke tests.
- [ ] Run `node backend/scripts/studentRegistrySmokeTest.js`.
- [ ] Run `node backend/scripts/continuousAssessmentSmokeTest.js`.
- [ ] Run `node backend/scripts/financeBulkPaymentsSmokeTest.js`.
- [ ] Run `node backend/scripts/schoolFeesAdminSyncSmokeTest.js`.
- [ ] Run backend app-load check with `JWT_SECRET`.
- [ ] Run `npm --prefix apps/portal-web run build`.
- [ ] Run `npm --prefix apps/public-web run build`.
- [ ] Run `git diff --check`.

## 8. Deployment

- [ ] Deploy backend to the Node app root.
- [ ] Deploy public website build to the public site root.
- [ ] Deploy portal build to the portal site root.
- [ ] Redeploy/restart the Hostinger Node app.
- [ ] Confirm `/api/health` responds.
- [ ] Confirm portal runtime config points to `https://api.angelmontessori.ng/api`.
- [ ] Confirm public runtime config points to the intended public/portal/API URLs.

## 9. Smoke Test After Deployment

- [ ] Login as admin.
- [ ] Login as teacher.
- [ ] Login as parent.
- [ ] Login as student.
- [ ] Confirm invalid credentials are rejected.
- [ ] Confirm inactive/demo-disabled users cannot log in.
- [ ] Confirm Google Play reviewer/demo account works only as intended.
- [ ] Open Early Years curriculum.
- [ ] Open teacher weekly planning.
- [ ] Open assessment/journal.
- [ ] Open Reception literacy.
- [ ] Open environment management.
- [ ] Open inclusion/support.
- [ ] Open Early Years reports.
- [ ] Open Early Years QA.
- [ ] Confirm parent can only see linked child records.
- [ ] Confirm teacher cannot view unassigned children/classes.
- [ ] Confirm Crèche/Nursery/Reception are blocked from Nigerian CA/broadsheet.
- [ ] Confirm finance dashboard loads.
- [ ] Confirm parent payment checkout initializes with Paystack.
- [ ] Confirm receipts/payment verification respond without server unavailable errors.

## 10. Print And Responsive QA

- [ ] Check desktop layout.
- [ ] Check tablet layout.
- [ ] Check mobile layout.
- [ ] Print/save a Crèche report preview.
- [ ] Print/save a Nursery report preview.
- [ ] Print/save a Reception report preview.
- [ ] Print/save a Reception transition profile.
- [ ] Print/save a support plan.
- [ ] Confirm no restricted notes appear in parent-facing printouts.

## 11. Rollback Readiness

- [ ] Confirm previous code/build package is available.
- [ ] Confirm previous `.env` is available.
- [ ] Confirm previous JSON DB backup is available.
- [ ] Confirm previous uploads backup is available.
- [ ] Confirm rollback owner is available.
- [ ] Confirm rollback trigger criteria are understood.

## 12. Final Approval

- [ ] Owner confirms there are no P0/P1 blockers.
- [ ] Owner accepts non-blocking warnings.
- [ ] Owner authorises push/deployment/package creation.
