# Verification status

Last checked November 9, 2026. Latest update: 17 backend + 15 frontend tests passed (32 total), production build passed, and real MySQL checks now include Trash/restore and transactional import. Frontend line coverage: 81.70%; backend: 84.34%. Older sections below preserve historical results. A new SonarQube scan of the changed source is pending.

## Passed

- Production Vite build (React frontend); editor/vendor bundles split.
- 14 Mocha/Chai API and SQL-boundary tests, including cookie/error-log redaction, UTF-8 password byte limits, invalid JSON and body-size limits.
- 13 Jest frontend/API tests, including offline/non-JSON responses, note save, discard/keep editing, delete focus/Escape, expiry cleanup, profile/logout and retries.
- HTTP 200 for the local Vite frontend and API health endpoint.
- Real browser: signup, dashboard, bold rich-text save/reload, heading save, persisted edit, delete cancellation/confirmation and logout. Mobile 390x844 login/dashboard/editor and desktop 1440x900 dashboard were visually checked.
- `npm audit --omit=dev`: zero vulnerabilities at the time of checking.

## Additional completed checks

- MySQL configuration was supplied locally by the user. Schema setup succeeded. Real MySQL-backed API checks passed for signup, rich-text storage, persistence, update, delete, logout and two-user isolation. Temporary test accounts and their data were cleaned up. No existing user's password was changed.
- Final real-browser recheck on November 9 passed: the in-app discard dialog focuses Keep editing, retains the draft when chosen, discards without creating a note, and returns to the dashboard. Returning-user login and profile also passed. Temporary acceptance account was removed after logout. Not every formatting combination or tablet width was checked.
- Actual SonarQube analysis completed after user first-login setup and approved project-only token generation. Three initial issues were fixed; repeat scan processed successfully with quality gate OK, zero open issues, 80.8% overall coverage, 93.3% new-code coverage and zero duplication. Profiles: Sonar way core (JS/CSS). Historical CLOSED/FIXED issues remain in the JSON evidence. See reports/SONAR-RESULT.md for scope and limitations.
- Dependency lock was regenerated to apply declared patched glob/minimatch overrides. All 27 tests and production build passed again with the refreshed dependency tree. Latest audit: zero production vulnerabilities; five low-severity development-tool findings remain. No blind force downgrade was used.
- Latest frontend line coverage: 82.14%; backend c8 line coverage: 84.83%. These are separate reports. Jest mocks Tiptap; real editor checks are recorded above.
- Local implementation commit exists; acceptance work uses chore/acceptance-verification. Tracked-file checks found no server/.env or match for the configured database password.
- No GitHub upload, deployment or Shine submission has been made.

## Remaining decisions and limits

Core requirements are implemented and the recorded checks passed. Publication and portal submission await user review. Confirm the batch deadline/timezone with the mentor. Five low-severity development dependency findings remain; tablet widths and every editor formatting combination were not exhaustively checked. Optional real-time updates and import/export are not included. This is not a guarantee of error-free behavior.

Final analyzed source revision: 413b28cf9e7a2659e0ea0b0c9211d6d2df61403c. Server-side analysis task f73470e7-4a2d-4889-8b6b-89882f1eaadd completed successfully. Dashboard independently showed Quality gate Passed and zero new issues. The temporary token relay was stopped and its in-memory token cleared. Subsequent documentation commits were followed by a readability, animation and save-feedback update. The recorded SonarQube result predates that CSS change; no new scan is claimed.

## Theme/readability recheck — November 9

Muted text and input/editor placeholders were darkened while preserving the green/cream palette. A browser spot check of visible dashboard/editor text found no contrast ratios below 4.5:1; this is not a full accessibility audit. No horizontal overflow appeared at the current browser size, and the inspected browser log contained no warnings/errors. Opening and cancelling an empty editor passed without creating data. All 27 tests, production build and isolated real-MySQL integration passed again. Existing user data was not changed. SonarQube has not been re-run after this UI change.

## Subtle animation and save feedback

Added 160–180ms hover/modal transitions with prefers-reduced-motion overrides, and a dismissible live-status Note saved message shown only after successful saves. Session expiry/logout clears the message. The existing save-flow Jest test now verifies the success message and dismissal. All 27 tests and production build passed. Browser confirmed the editor 180ms animation and clean cancel; inspected browser log had no warnings/errors. No user notes were created or edited for this UI check. Updated UI code has not been re-scanned by SonarQube.

## Backup/Trash acceptance

Real browser: saved a uniquely named temporary note, downloaded its JSON backup, moved it to Trash, restored it, and imported that backup as a second copy. The two exact temporary title/content records were then removed using scoped cleanup; existing user notes were not changed. Browser counts returned to zero, matching the pre-test workspace. API/MySQL checks include private Trash, foreign-user restore denial, no editing trashed notes, preserved content after restore and transactional import. Unit tests additionally cover invalid/oversized item counts, HTML sanitization and rollback/release on a later database failure. Frontend tests cover restore refresh and invalid JSON rejection.

A development hot-reload duplicate-createRoot warning was observed and fixed by moving app mounting to entry.jsx. After reload and a subsequent main-module refresh, no new warning was recorded; the browser's history retains the earlier warning. No fresh SonarQube scan is claimed. Five low development dependency findings remain as previously recorded.
