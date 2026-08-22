# Hostinger GitHub Deployment

## What To Connect

Connect the new GitHub repository to Hostinger using this clean repository root.

## Node.js Backend

Use:

- Root directory: `backend`
- Start command: `npm start`
- Node.js app entry: `server.js`

After deployment, confirm Hostinger has the real production environment variables from `backend/.env.production.example`.

Important:

- Do not upload or commit a live `.env`.
- Do not upload or commit `backend/db.json`.
- If Hostinger redeploys from GitHub, it should install dependencies from `backend/package-lock.json`.

## Public Website

The current built public website is already prepared in:

```text
deploy/hostinger/public_html
```

For file-manager style deployment, upload the contents of that folder into `public_html`.

## Portal

The current built portal is already prepared in:

```text
deploy/hostinger/public_html/portal
```

For file-manager style deployment, upload the contents of that folder into `public_html/portal`.

## Rebuilding Later

When source changes are made:

```bash
npm --prefix apps/public-web install
npm --prefix apps/portal-web install
npm run build:web
```

Then copy:

- `apps/public-web/build/*` to `deploy/hostinger/public_html/`
- `apps/portal-web/build/*` to `deploy/hostinger/public_html/portal/`

Commit and push the updated source and deploy folders.
