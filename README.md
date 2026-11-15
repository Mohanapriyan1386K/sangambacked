# Sangam Management API

Node.js, Express 5 and MongoDB/Mongoose REST API for the Sangam Management System FRD (v1.0, 15 November 2026). This backend covers the API portion of the FRD; it does not create the separate Next.js public website or React admin UI.

## FRD scope implemented

- Admin login, JWT bearer sessions, account status checks, roles and action permissions.
- Members and batch member creation.
- Monthly dues, partial/full/advance manual payments, receipts, payment voiding and member payment calendar.
- Events, organizers, public publication state, event expenses and expense voiding.
- Dashboard metrics, month-wise collection reporting, export data, Sangam settings and audit history.
- Public endpoints expose published events and approved public organizer fields only.

## Structure

```text
src/
  app.js                 Express app, middleware and route mounting
  server.js              Environment loading, Mongo connection and startup
  config/                Database connection
  models/                Mongoose schemas and indexes
  routes/                Versioned API route definitions
  controllers/           HTTP request/response handling
  services/              Domain logic and database operations
  middleware/            Authentication, permissions, validation and errors
  utils/                 JWT, password hashing, dates, pagination and audit helpers
```

## Run locally

1. Use Node.js 20+ and MongoDB configured as a replica set (single-node replica sets work locally; payment posting and voiding use MongoDB transactions).
2. Copy `.env.example` to `.env`; set a unique `JWT_SECRET` and `INITIAL_ADMIN_PASSWORD`. Generate a secret with `node -p "require('node:crypto').randomBytes(48).toString('base64url')"` and save it in `Backend/.env`.
3. Run `npm install`, then `npm run dev`.
4. `GET /api/health` checks service and database connectivity. API routes are under `/api/v1`.

The server creates the first admin and system roles on startup when none exist. Change the bootstrap password before deployment. CORS allows the origins listed in `CORS_ORIGINS`. The authenticated `POST /api/v1/uploads` endpoint accepts one JPEG, PNG, or WebP image as multipart field `file`, plus `alt` and optional `context` (`events`, `organizers`, or `settings`); it validates the image bytes and streams the file to Cloudinary. Configure either `CLOUDINARY_URL` or all of `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET`. `UPLOAD_MAX_BYTES` sets the maximum file size, and `CLOUDINARY_FOLDER` sets the root folder. To record an advance, generate and select the intended future month’s due, then post payment to that due; the API never reallocates an overpayment. Payment approval workflow, opening balances and multi-Sangam tenancy need stakeholder decisions from the FRD and are not silently assumed. Organizer publication records an admin-confirmed consent flag and timestamp.

## API outline

| Area | Routes |
| --- | --- |
| Auth & users | `POST /auth/login`, `/auth/logout`, `/auth/me`, `/users`, `/users/:id/status` |
| Roles | `/roles` |
| Members | `/members`, `/members/batch`, `/members/:id`, `/members/:id/calendar` |
| Collections | `/members/dues/generate`, `/dues`, `/payments`, `/payments/:id/void`, `/reports/collections`, `/reports/collections/export` |
| Dashboard | `GET /dashboard?month=YYYY-MM` |
| Events | `/events`, `/events/:id`, `/events/:id/expenses`, `/organizers` |
| Settings & audit | `/settings`, `/audit-logs` |
| Public | `GET /public/events`, `/public/events/archive`, `/public/events/:slug`, `/public/settings` |

All private routes require a bearer token and an action-level permission such as `members:create`. Public routes return published, non-sensitive fields only. See controller/service validation and `src/models/Role.js` for the permission shape.
"# sangambacked" 
