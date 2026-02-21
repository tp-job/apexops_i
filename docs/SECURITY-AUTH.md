# Authentication & Authorization (Production-Ready)

This document summarizes the auth and security measures implemented for the ApexOps stack (React, TypeScript, Prisma, Express).

## Authentication

- **Registration**: Strong password (min 8 chars, uppercase, lowercase, number). Rate limited (default 5/15 min per IP).
- **Login**: Rate limited (default 10/15 min per IP) to reduce brute-force risk. Generic error message: "Invalid email or password".
- **Passwords**: Hashed with bcrypt (configurable rounds, default 12). Never stored or logged in plain text.
- **JWT**: Access token (short-lived, default 1h) and refresh token (longer, default 7d). Use separate secrets (`JWT_SECRET`, `JWT_REFRESH_SECRET`); in production use ≥32 character random values.
- **Refresh token rotation**: Each refresh issues a new refresh token and invalidates the previous one (single-use). Reduces impact of token leakage.

## Authorization

- **Middleware**: `authenticate` (JWT in `Authorization: Bearer <token>`), `authorize(...roles)` for RBAC.
- **Protected APIs**: `/api/tickets`, `/api/logs`, `/api/notes` require authentication. Auth routes use rate limiting.
- **Client**: `ProtectedRoute` redirects unauthenticated users to `/auth`. Optional `allowedRoles` for role-based route protection.

## Security Headers & CORS

- **Helmet**: Enabled (CSP/COEP relaxed for dev). CORS restricted to configured origin(s) with credentials support.
- **Env**: No default JWT secrets in production; `.env.example` documents required variables.

## Checklist for Production

1. Set `NODE_ENV=production`.
2. Set strong `JWT_SECRET` and `JWT_REFRESH_SECRET` (e.g. 32+ random chars).
3. Configure `CORS_ORIGIN` to your frontend origin(s).
4. Use HTTPS only; consider secure cookie options if moving tokens to cookies later.
5. Run `npm audit` and address vulnerabilities; keep dependencies updated.
