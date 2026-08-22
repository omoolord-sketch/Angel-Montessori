# Angel Montessori Deployment Structure

## Purpose

This document explains the recommended production deployment structure for the Angel Montessori platform.

It covers:

- domain structure
- DNS setup
- runtime/frontend configuration
- backend environment values
- hosting flow
- final launch order

## Production Domains

```text
Public Website: https://angelmontessori.ng
Portal Web App: https://portal.angelmontessori.ng
Backend API: https://api.angelmontessori.ng
```

## Domain Responsibilities

### Main Domain

```text
angelmontessori.ng
|- Public website pages
|- Admissions pages
|- Applicant registration and login
|- Applicant dashboard
`- Public CBT exam login
```

### Portal Subdomain

```text
portal.angelmontessori.ng
|- Portal login
|- Student portal
|- Parent portal
|- Teacher portal
|- Admin and staff dashboards
`- Internal school systems
```

### API Subdomain

```text
api.angelmontessori.ng
|- /api/* backend endpoints
|- /media/* uploaded/public media
`- backend service responses
```

## DNS Records

If all three services are hosted on the same server at first:

| Type | Name | Value |
|---|---|---|
| `A` | `@` | `YOUR_SERVER_IP` |
| `CNAME` | `www` | `angelmontessori.ng` |
| `A` | `portal` | `YOUR_SERVER_IP` |
| `A` | `api` | `YOUR_SERVER_IP` |

## Frontend Runtime Configuration

The frontend now supports runtime URL configuration so future public/portal/API URL changes do not require a frontend rebuild.

After deployment, update:

- `public-web/build/runtime-config.js`
- `portal-web/build/runtime-config.js`

Recommended values:

```js
window.__AMS_RUNTIME_CONFIG__ = Object.assign(
  {
    PUBLIC_SITE_URL: "https://angelmontessori.ng",
    PORTAL_URL: "https://portal.angelmontessori.ng",
    API_BASE_URL: "https://api.angelmontessori.ng/api",
  },
  window.__AMS_RUNTIME_CONFIG__ || {}
);
```

Reference source:

- [frontend/public/runtime-config.js](C:\Users\omolo\AngelMontessori\angel-montessori-enterprise\frontend\public\runtime-config.js)

## Frontend Production Environment

The old frontend env example still exists as a fallback reference, but the preferred production approach is runtime config.

Reference example:

- [frontend/.env.production.example](C:\Users\omolo\AngelMontessori\angel-montessori-enterprise\frontend\.env.production.example)

Current example values:

```env
REACT_APP_PUBLIC_SITE_URL=https://angelmontessori.ng
REACT_APP_PORTAL_URL=https://portal.angelmontessori.ng
REACT_APP_API_BASE_URL=https://api.angelmontessori.ng/api
```

## Backend Production Environment

Set production backend values in:

- [backend/.env](C:\Users\omolo\AngelMontessori\angel-montessori-enterprise\backend\.env)

Recommended values:

```env
PORT=6060
SERVE_FRONTEND_BUILD=false
JWT_SECRET=replace-with-a-strong-production-secret
JSON_DB_PATH=/home/uXXXXXXX/ams-data/db.json
PUBLIC_BACKEND_URL=https://api.angelmontessori.ng
CORS_ALLOWED_ORIGINS=https://angelmontessori.ng,https://www.angelmontessori.ng,https://portal.angelmontessori.ng
ENABLED_PAYMENT_PROVIDERS=PAYSTACK
PAYMENT_PROVIDER=PAYSTACK
PAYSTACK_SECRET_KEY=replace-with-paystack-live-secret-key
DONATION_CALLBACK_URL=https://angelmontessori.ng/donate
PARENT_PAYMENT_CALLBACK_URL=https://portal.angelmontessori.ng/portal/parent
APPLICANT_PAYMENT_CALLBACK_URL=https://angelmontessori.ng/portal/applicant
PAYMENT_CALLBACK_URL=https://portal.angelmontessori.ng/portal
REMITA_RESPONSE_URL=https://portal.angelmontessori.ng/portal
```

For Paystack production, register this webhook URL in the Paystack dashboard:

```text
https://api.angelmontessori.ng/api/payments/webhook/paystack
```

The donation module also supports a dedicated webhook endpoint:

```text
https://api.angelmontessori.ng/api/donations/webhook
```

If you are using one Paystack account for both school fees and donations, you can keep the existing school-payments webhook URL because the backend now recognises donation references there as well.

Reference example:

- [backend/.env.production.example](C:\Users\omolo\AngelMontessori\angel-montessori-enterprise\backend\.env.production.example)

School-fees note:

- The Phase 1 school-fees module now uses the backend JSON store on the Hostinger Business deployment path, so it does not need a PostgreSQL `DATABASE_URL`.

JSON storage note:

- Do not keep the live JSON data file inside the uploaded app bundle if you want users, students, and settings to survive redeploys.
- Set `JSON_DB_PATH` to a persistent file outside the redeployed Node.js app directory, then keep using the same path on every deployment.
- Example target: `/home/uXXXXXXX/ams-data/db.json`
- The backend will now create the file automatically if the target folder exists or can be created.

Uploads note:

- Do not keep live uploaded files only inside the redeployed app bundle if you want CVs, certificates, homework files, and other attachments to survive redeploys.
- Set `UPLOADS_ROOT_PATH` to a persistent folder outside the Node.js app directory.
- Example target: `/home/uXXXXXXX/ams-data/uploads`
- The backend will serve `/media/*` from that persistent uploads folder when `UPLOADS_ROOT_PATH` is set.

## Hosting Model

Once the split is fully deployed, the platform should be hosted like this:

```text
angelmontessori.ng -> public-web build
portal.angelmontessori.ng -> portal-web build
api.angelmontessori.ng -> backend API service
```

## Reverse Proxy / Web Server

Recommended routing shape:

```text
Internet
-> angelmontessori.ng
-> portal.angelmontessori.ng
-> api.angelmontessori.ng
-> Nginx / reverse proxy
-> public-web static build
-> portal-web static build
-> backend Node service on port 6060
```

Recommended responsibility split:

- Nginx serves the public static build for `angelmontessori.ng`
- Nginx serves the portal static build for `portal.angelmontessori.ng`
- Nginx proxies `api.angelmontessori.ng` to the backend service

## SSL

SSL must be installed for:

- `angelmontessori.ng`
- `www.angelmontessori.ng`
- `portal.angelmontessori.ng`
- `api.angelmontessori.ng`

Recommended:

```text
Use Let's Encrypt / Certbot if deploying with Nginx
```

## Launch Order

### Before Hosting

1. Finish public and portal development
2. Run final desktop and mobile QA
3. Confirm forms, CBT, calendar, downloads, and logins
4. Confirm production build succeeds

### Hosting Stage

1. Choose host or VPS
2. Get server IP and access
3. Set DNS for main, portal, and API domains
4. Set backend production env
5. Build/deploy `public-web`
6. Build/deploy `portal-web`
7. Configure reverse proxy
8. Install SSL
9. Update both runtime-config files with final production URLs
10. Run final live checks

## Final Live Checks

1. `angelmontessori.ng` opens the public website
2. `portal.angelmontessori.ng/login` opens the portal login
3. `angelmontessori.ng/admissions/login` opens applicant login
4. `angelmontessori.ng/cbt/exam` works for entrance and interview candidates
5. `api.angelmontessori.ng/api/health` responds correctly
6. API requests work from both public and portal apps
7. media URLs load from the API host when required

## Key Principle

```text
Do not mix public users, internal portal users, and API hosting into one frontend deployment once the split is complete.
```

The domain split exists to keep:

- branding and admissions public
- operations and school data protected
- API responsibilities cleanly separated
