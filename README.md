# Angel Montessori School Platform

This repository contains the deployable Angel Montessori School platform:

- `backend/` - Hostinger Node.js backend API.
- `apps/public-web/` - public school website source.
- `apps/portal-web/` - school portal source.
- `deploy/hostinger/public_html/` - freshly built static files for the public website.
- `deploy/hostinger/public_html/portal/` - freshly built static files for the portal.

## Local Build

```bash
npm run build:public
npm run build:portal
```

## Backend

```bash
cd backend
npm install
npm start
```

Use `backend/.env.production.example` as the template for Hostinger environment variables. Do not commit live `.env` files or live database exports.

## Hostinger Deployment

See `docs/HOSTINGER_GITHUB_DEPLOYMENT.md`.
