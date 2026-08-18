# Hormuud ProjectHub

Academic project management for Hormuud University. Students, teachers, and
administrators use one web app for registration, project work, review, grading,
messaging, and AI-assisted originality checks.

## Stack

- **Frontend:** React 18, Vite, TypeScript
- **Backend:** Node.js Express API with Socket.IO
- **Database:** MySQL 8 locally (PostgreSQL supported for hosted deploys)
- **Auth:** hashed passwords, JWT sessions, email OTP

This repository is the current production codebase. Firebase is not used yet.
If you later move hosting to Firebase, keep this API and database as the source
of truth until a planned backend migration is complete.

## Requirements

- Node.js 22–24
- MySQL 8 running on `localhost:3306`
- SMTP account for OTP email
- Groq API key (or another supported AI provider)

## Local setup

1. Copy `.env.example` to `.env` and fill in your own values. Never commit `.env`.
2. Install dependencies:
   - `npm ci`
   - `npm ci --prefix server`
3. Create the database schema: `npm run setup:db`
4. Start the full app: `npm start`

The app opens at [http://localhost:5180](http://localhost:5180). The API runs on
port `3004`. Keep both windows open while you work.

| Command | Purpose |
| --- | --- |
| `npm start` | Start API + UI and open the app |
| `npm run share:cloud` | Create a temporary public Cloudflare link |
| `npm run typecheck` | TypeScript check |
| `npm test` | Server tests |
| `npm run build` | Production frontend build |

Windows shortcuts in this folder: `START_HERE.bat` (local) and
`SHARE_ON_INTERNET.bat` (public link).

## Security before GitHub or any public host

Do **not** upload:

- `.env` or any file with API keys, database passwords, or SMTP passwords
- `node_modules/`
- `dist/`
- backups, zip files, screenshots, or student records

Use a unique `JWT_SECRET` of at least 32 characters. Production passwords must
not match local demo values from `npm run seed`. Report security issues privately
to the ProjectHub administrator.

## Project structure

- `src/` — React frontend
- `server/` — Express API, realtime server, and database adapters
- `public/` — PWA and static assets
- `desktop/` — optional Electron shell
- `scripts/` — start, share, health, and maintenance utilities
- `database/` — reference schema notes
