# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

LH-oj (`luoa-oj-frontend`) is a React 19 + TypeScript + MUI frontend for 郑州龙湖一中's competitive-programming online judge. It is **not** a backend/pipeline project — despite the repo directory name, there is no server code here. It is a client that talks entirely to an existing [Hydro](https://hydro.ac/) OJ backend over HTTP (GraphQL + scraped/PJAX HTML endpoints).

## Commands

- `npm run dev` — start Vite dev server on port 5173 (proxies `/api` and `/hydro-native/` to the Hydro backend, see below).
- `npm run build` — type-check (`tsc -b`) then production build via Vite.
- `npm run preview` — preview the production build locally.

There is no test suite or linter configured in this repo currently.

## Architecture: talking to Hydro

There is no application backend to develop against — all data comes from a remote Hydro instance. Two distinct access patterns are used side by side, both in `src/lib/`:

1. **GraphQL** (`src/lib/api.ts`) — used for typed reads (`currentUser`, `fetchProblem`, `fetchContest`, etc.) via `gql()`, which POSTs to `/api`. Also owns session-mutating actions: `login`, `logout`, `submitCode`/`submitFile`/`submitPretest`/`submitHack`.
2. **Scraping** (`src/lib/scrape.ts`) — Hydro doesn't expose GraphQL for most listing/detail pages, so these are fetched as PJAX requests (`?pjax=1` + `X-Requested-With`) which return either a JSON payload with embedded HTML `fragments` or structured data (`rdocs`/`pdict`/`udict`/etc.), or in a few cases full server-rendered HTML that gets parsed with `DOMParser` and queried with CSS selectors (fragile — depends on Hydro's exact markup/class names, e.g. `td.col--pid`, `tr[data-rid]`). When adding a new scraped page, prefer reading the JSON `payload` fields over HTML selectors when Hydro provides them.

Both flows go through `src/lib/endpoint.ts`, which resolves which base URL to use each session:

- `ensureEndpoint()` probes the **primary** endpoint (same-origin `/api`, meant to be proxied by Caddy/Vite in production/dev) and falls back to a **fallback** endpoint (`/hydro-native/...`, proxied directly to the Hydro IP) if the primary probe fails. Users can also force a mode via Settings, persisted to `localStorage`.
- `hydroNativeUrl()` builds paths under `/hydro-native` for anything that isn't the `/api` GraphQL endpoint (login/logout, submissions, scraped pages).
- A session-expiry event (`sessionExpiredEvent` in `src/lib/errors.ts`) is dispatched whenever a request detects it was silently redirected to `/login`; `AuthProvider` listens for this to clear the logged-in user everywhere.

When adding a new page that needs Hydro data, decide up front whether a GraphQL query already exists for it (extend `api.ts`) or whether it must be scraped (extend `scrape.ts` following the JSON-payload-first pattern above).

## Routing & layout

- `src/App.tsx` defines all routes. Every page is lazy-loaded. Routes are split between public (browsable without login: problems, records, contests, ranking, discussions, user profiles) and routes wrapped in `<Protected>` (submit, hack, management, status, messages, security, account settings, and the user's own `/settings`) which redirect to `/login` if unauthenticated.
- `src/components/AppLayout.tsx` provides the persistent shell (desktop drawer / collapsible rail, mobile bottom nav + AppBar) and reads/writes UI prefs (accent color, dark/light mode, sidebar-collapsed) directly to `localStorage`. The `/management` nav item only appears for `role === 'root'` users.
- `src/auth.tsx` (`AuthProvider`/`useAuth`) owns the current-user state, backed by a single deduplicated `currentUser()` call on mount (`currentUserOnce`) to avoid duplicate GraphQL requests under React StrictMode double-invocation.
- `src/prefs.tsx` (`StoredPreferencesProvider`/`usePreferences`) owns theme mode/accent and the endpoint mode preference, persisted as one JSON blob in `localStorage` (`luoa-oj.prefs`).

## Localization and formatting conventions

- All user-facing strings are Chinese; error messages thrown as `ApiError` (`src/lib/errors.ts`) are Chinese and shown directly to users — keep new error messages in the same style/language.
- `scrape.ts` centralizes Hydro's numeric/enum encodings that aren't otherwise documented: `recordStatuses` (judge status codes), `languageNames` (submission language ids), plus `formatTime`/`formatMemory`/`formatDate`/`formatDuration` helpers. Reuse these instead of re-deriving formatting logic in page components.

## Deployment

`Caddyfile.example` documents the intended production reverse-proxy shape: static `dist/` output served with SPA fallback, `/api*` and `/hydro-native/*` proxied to the Hydro backend. This mirrors the dev-server proxy config in `vite.config.ts` — if the Hydro backend address changes, update both.
