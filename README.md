# Whocan

Whocan is a small web app for publishing personal contact rules. A user creates a public page that explains who they are, who should contact them, and what kind of request is worth sending. Visitors can read those rules and submit a short contact request; the profile owner sees the latest requests from their dashboard.

The project is intentionally lightweight: a typed Express server, Redis for state, and plain browser modules for the UI. It keeps the operational footprint small while still separating validation, storage, HTTP routing, and frontend behavior.

## Features

- Public contact-rules pages at `/:username`.
- Owner dashboard backed by an HTTP-only session cookie.
- Redis-backed profiles, sessions, and recent contact requests.
- Server-side validation and sanitization for user-authored text.
- Latest 50 requests retained per profile.
- Static HTML/CSS with small ES modules, no frontend build step.

## Stack

- Node.js 20+
- TypeScript
- Express 5
- Redis
- Plain HTML, CSS, and browser `fetch`

## Project Structure

```text
src/
  app.ts       Express app, routes, middleware, and error handling
  config.ts    Environment parsing and runtime paths
  domain.ts    Validation, sanitization, and public data shapes
  server.ts    Redis connection, HTTP listener, graceful shutdown
  store.ts     Redis keys and persistence interface
public/
  html/        Static page shells
  js/          Browser modules for each page
  styles.css   Shared responsive UI styles
test/
  domain.test.ts
```

## Local Development

```bash
cp .env.example .env
npm install
redis-server
npm run dev
```

Open http://localhost:3000.

Useful commands:

```bash
npm run check   # Type-check without emitting files
npm test        # Run the Node test suite
npm run build   # Compile TypeScript to dist/
npm start       # Build and run the compiled server
```

## Environment Variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3000` | HTTP server port. |
| `REDIS_URL` | `redis://127.0.0.1:6379` | Redis connection URL. |
| `NODE_ENV` | `development` | Enables secure cookies when set to `production`. |
| `COOKIE_NAME` | `whocan_session` | Name of the owner session cookie. |

## API

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/healthz` | Health check. |
| `POST` | `/api/profiles` | Create a profile and owner session. |
| `POST` | `/api/trial` | Backward-compatible profile creation endpoint. |
| `GET` | `/api/me` | Read the current owner's profile. |
| `GET` | `/api/me/messages` | Read the current owner's recent requests. |
| `GET` | `/api/profiles/:username` | Read a public profile. |
| `POST` | `/api/profiles/:username/messages` | Submit a contact request. |

## Redis Data Model

| Key | Type | Purpose |
| --- | --- | --- |
| `profile:<username>` | Hash | Public profile fields. |
| `messages:<username>` | List | Recent contact requests for a profile. |
| `session:<uuid>` | String | Session ID to username mapping. |

## Notes

- Usernames are normalized to lowercase and limited to letters, numbers, hyphens, and underscores.
- Profile and message text is sanitized server-side before persistence.
- Owner sessions are stored in Redis with a one-year TTL.
- Generated files, local environment files, dependency folders, and npm cache artifacts are excluded from version control.
