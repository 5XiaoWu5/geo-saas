# GeoPilot AI Auth Setup

## Overview

GeoPilot AI uses a database-session authentication architecture for Next.js 15 App Router.

Included:

- Better Auth server configuration
- Prisma-backed users, sessions, accounts, verification records and password resets
- Argon2 password hashing
- HttpOnly database session cookie
- Email verification code flow
- Password reset email flow
- Cloudflare Turnstile on login, register and forgot password
- Resend transactional email templates
- Route protection middleware
- Rate limiting for login, register, forgot password and verification resend
- SMS provider interface reserved for future Twilio, Vonage, Aliyun or Tencent Cloud integrations

## Install

```bash
npm install
```

## Environment Variables

Create `.env` from `.env.example`:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/geopilot_ai?schema=public"
BETTER_AUTH_SECRET="replace-with-a-strong-random-secret"
BETTER_AUTH_URL="https://geopilotapp.com"
RESEND_API_KEY="re_xxxxxxxxxxxxxxxxxxxxxxxxx"
NEXT_PUBLIC_TURNSTILE_SITE_KEY="0x4AAAAAAxxxxxxxxxxxxxxx"
TURNSTILE_SECRET_KEY="0x4AAAAAAxxxxxxxxxxxxxxxxxxxxxxxx"
```

For production, set `BETTER_AUTH_URL` to the deployed domain, for example:

```bash
BETTER_AUTH_URL="https://geopilotapp.com"
```

## Prisma Migrate

Generate the Prisma client:

```bash
npx prisma generate
```

Create and apply a migration:

```bash
npx prisma migrate dev --name add_auth_system
```

For production deployments:

```bash
npx prisma migrate deploy
```

## Resend Configuration

1. Create a Resend account.
2. Verify your sending domain.
3. Create an API key.
4. Set `RESEND_API_KEY` in local and production environments.
5. Update the sender domain in `src/features/auth/server/email.ts` when the production domain is ready.

If `RESEND_API_KEY` is missing in development, verification and reset messages are logged to the server console.

## Cloudflare Turnstile Configuration

1. Create a Turnstile widget in Cloudflare.
2. Add local and production domains.
3. Set `NEXT_PUBLIC_TURNSTILE_SITE_KEY` to the public site key.
4. Set `TURNSTILE_SECRET_KEY` to the private secret key.

If `TURNSTILE_SECRET_KEY` is missing outside production, local development is allowed.

## Run Locally

```bash
npm run dev
```

Open:

- `/register`
- `/login`
- `/forgot-password`
- `/verify-email`
- `/profile/security`

## Build

```bash
npm run build
```

## Deployment Notes

This auth system requires server-side API routes and Prisma database access. Deploy it to a platform that supports Next.js server runtime and PostgreSQL connectivity.

For Cloudflare Pages, do not deploy as a static export when auth is enabled. Use a Next.js server-capable adapter/runtime before production auth deployment, or deploy to a Node-compatible platform.

Required production settings:

- `DATABASE_URL`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `RESEND_API_KEY`
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
- `TURNSTILE_SECRET_KEY`

## Security Model

- Passwords are hashed with Argon2id.
- Sessions are persisted in PostgreSQL.
- No JWT authentication is used.
- Session cookie is HttpOnly, Secure in production and SameSite=Lax.
- Session duration is 30 days.
- Login, register, forgot password and verification resend are rate limited.
- SMS sending is not publicly exposed and must pass Turnstile, rate limit, user existence checks and phone validation before provider dispatch.
