# Folio — Shine Notes App

A React + Node.js + MySQL notes application built against the 10Pearls Shine MERN Notes App specification. The frontend is named Folio. This is an independent student project, not an official 10Pearls product.

## Features

- Register, sign in, restore sessions, and sign out.
- Private notes scoped to the signed-in user on every data-access operation.
- Create, read, edit, move to Trash and restore; rich-text editor with headings, emphasis, lists, and quotes.
- Responsive dashboard, recent notes, search, optional profile screen, delete confirmation, unsaved-change warning.
- Server-side HTML sanitization, bcrypt password hashing, random server sessions stored as hashes, HttpOnly cookies, mutation origin checks, authentication rate limiting, and security headers.
- Pino request/response and activity logging without logging note bodies or passwords; global exception middleware.
- Mocha/Chai + Supertest backend tests, Jest + React Testing Library frontend tests, SonarQube configuration.

## Requirements

Node.js 22.12+ (or a supported newer version), npm, MySQL 8+, and Git. MySQL service must be running. No production credentials or sample accounts are included.

## Database setup (one time)

Sign into MySQL Workbench as an administrator locally. Choose your own strong password; do not put it in source control.

```sql
CREATE DATABASE IF NOT EXISTS shine_notes CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'shine_notes'@'localhost' IDENTIFIED BY 'REPLACE_WITH_A_STRONG_LOCAL_PASSWORD';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, INDEX, REFERENCES ON shine_notes.* TO 'shine_notes'@'localhost';
```

Copy `server/.env.example` to `server/.env` and set DB_PASSWORD to the local password chosen above. Run `npm run db:setup` from the project root. The schema creates users, notes, sessions, and note_trash without dropping existing tables. If the database administrator creates the tables manually from `server/schema.sql`, the runtime user only needs SELECT, INSERT, UPDATE, and DELETE privileges. `server/.env` is gitignored.

## Install and run

```sh
npm ci
npm run db:setup
npm run dev
```

Open **http://127.0.0.1:5173** (use this hostname consistently). Vite proxies `/api` to the Node server at 127.0.0.1:3001, so the browser uses same-origin cookies. Create your own account. There is no password reset/email-verification flow in this assignment.

## Tests and build

```sh
npm test
npm run test:mysql
npm run build
```

API tests use an in-memory repository to isolate controller/service behavior; SQL boundary tests use a stub pool. The separate test:mysql script checks the actual local database; browser acceptance is recorded separately. Frontend tests isolate the third-party editor; the editor needs a browser smoke test. Coverage reports are generated in each workspace's `coverage/` folder. Build outputs go to `client/dist/`.

## SonarQube

Run tests first to create LCOV reports. Install/run SonarQube Community locally using the official instructions for your OS and install SonarScanner. From this directory, use:

```sh
sonar-scanner -Dsonar.host.url=http://localhost:9000
```

Supply a locally generated token via the SONAR_TOKEN environment variable; never commit it. The root properties file includes JavaScript analysis and both coverage reports. The actual local analysis on November 9, 2026 passed the configured gate after three fixes: zero open issues and 80.8% overall coverage. See [reports/SONAR-RESULT.md](reports/SONAR-RESULT.md) and its JSON evidence for the exact scope and limitations. The subsequent UI updates has passed tests/build but has not yet been re-scanned by SonarQube.

## Manual acceptance checklist

1. Register two different users; confirm validation and duplicate email handling.
2. User A creates a richly formatted note; refresh and confirm MySQL persistence.
3. Edit title/content, save and refresh; cancel an edit and check original content remains.
4. User B must not see or modify user A's notes, even by supplying A's note ID to an API request.
5. Search by title/body; check recent notes, empty states, and mobile widths.
6. Cancel a delete, then confirm a delete; refresh and verify removal.
7. Sign out; private APIs should return 401, including after a browser refresh.
8. Verify database-failure responses using isolated tests; do not stop a shared MySQL service merely to test this app.
9. Review Pino logs for requests, events and exceptions, without note content/passwords.
10. Run tests, build, and SonarQube; fix relevant issues before submission.

## Production notes

The included server binds to localhost for development. Deployment needs HTTPS, secure cookies (`NODE_ENV=production`), matching APP_ORIGIN, a reverse proxy serving `client/dist` and forwarding `/api`, protected MySQL credentials and backups. Do not expose the development server or database publicly. Configure proxy trust and rate limits for your actual infrastructure. Expired database sessions may be periodically removed with `DELETE FROM sessions WHERE expires_at < UTC_TIMESTAMP()` by the database operator.

## Submission

The portal requires a **public GitHub repository URL** and a detailed README. Remove all local `.env` files and secrets from any archive you share. Include source, package-lock.json, schema, test files, and this README. Use feature branches and review changes before merging. This branch is prepared for mentor review through GitHub. It has not been submitted to the Shine portal. Deadline observed in the portal: January 11, 2027, 10:59 PM; no timezone label was shown. Follow your mentor's current instructions and AI-use rules.

## Requirement notes

The portal lists React, Node.js, MySQL, Pino, Mocha/Chai, Jest, SonarQube and Git. Although its overview also mentions MongoDB, its detailed database section asks for MySQL or PostgreSQL; this implementation uses MySQL. Socket.IO is optional and not implemented. JSON export/import and private Trash/restore are implemented. Search/filter and profile are implemented as optional extras.

## Review documents

- [Requirement matrix](REQUIREMENTS.md)
- [Architecture and API](ARCHITECTURE.md)
- [Verification and limitations](VERIFICATION.md)
- [SonarQube result](reports/SONAR-RESULT.md)
- [Final submission review](FINAL-REVIEW.md)

## Backups and Trash

Deleting a note now moves it to private Trash instead of permanently deleting it. Use Trash → Restore to bring it back. There is no automatic purge or permanent-delete control. Existing databases need only the repeatable `npm run db:setup` command; the new table is created without modifying or dropping notes.

Export backup downloads active notes as a plaintext JSON file. Treat it as private; it excludes Trash and account/session information. Each backup supports 1–100 notes and up to 140 KB. Import backup accepts the Folio format (`folio-notes-v1`); it creates new copies owned by the current user and never overwrites existing notes. Reimporting creates duplicates. Invalid batches are rejected before insertion, imported HTML is sanitized, and database insertion is transactional.

Pinning, word count and dark mode have not been added. The current green/cream theme remains until the owner selects another theme.

## Development assistance

Developed with AI coding assistance (Codex), with automated and manual verification recorded in VERIFICATION.md. The owner should review and understand the implementation and follow the mentor’s current assistance/disclosure policy.
