# Angel Montessori Backend Patch - CBT Recruitment Routes

Upload and extract this package inside the Node.js backend app root, not inside `public_html/portal`.

Files included:
- `routes/cbt.routes.js`
- `lib/cbtCredentialService.js`

Fixes included:
- Adds missing `/api/cbt/recruitment/*` endpoints used by the Recruitment Assessments dashboard.
- Restores recruitment-aware CBT exam, credential, publish, close, and candidate sync workflows.
- Allows HR officers, academic officers, super admins, and admins to access recruitment assessment review routes.
- Preserves essay/scenario answer text so manual review can display candidate responses.
- Adds demo recruitment seed support from the dashboard button.

After extracting:
1. Confirm the files land as `nodejs/routes/cbt.routes.js` and `nodejs/lib/cbtCredentialService.js`.
2. Restart the Node.js app from the Hostinger Node.js panel.
3. Open `/admin/cbt/recruitment` or `/portal/admin/cbt/recruitment` and click Refresh.
