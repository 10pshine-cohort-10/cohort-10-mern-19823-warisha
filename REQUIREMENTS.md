# Portal requirement matrix

Audit date: November 9, 2026. Basis: project specification and submission form inspected in the signed-in portal in this chat. Do not infer a new deadline from older Discord announcements.

| Requirement                   | Implementation                   | Verification / remaining work                                                                                        |
| ----------------------------- | -------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| React responsive dashboard    | Implemented                      | Mobile 390x844 and desktop 1440x900 visually checked; tablet not checked                                             |
| Node CRUD APIs                | Implemented                      | Mocha + real MySQL API checks passed                                                                                 |
| Signup/login/logout           | Implemented                      | Automated tests and real-browser signup, returning login and logout passed                                              |
| Private user-owned notes      | Implemented                      | Two-user MySQL API isolation passed                                                                                  |
| Rich text note editor         | Implemented                      | Bold and heading persisted in browser; every formatting combination was not exhaustively checked                                   |
| Save/cancel navigation        | Implemented                      | Browser save/delete-cancel and final keep-editing/discard recheck passed |
| MySQL schema                  | Implemented                      | Schema creation and persisted update verified                                                                        |
| Pino HTTP/activity/error logs | Implemented                      | SQL-error and request/response cookie redaction regression tests passed                                              |
| Global exception middleware   | Implemented                      | Safe error response, malformed JSON, oversized payload and unknown route checks passed                               |
| Mocha/Chai backend tests      | Implemented                      | 17 tests passed; repeatable real MySQL integration script passed separately                                          |
| Jest frontend tests           | Implemented                      | 15 tests passed; 81.70% line coverage; Tiptap mocked                                                                 |
| SonarQube JS config + LCOV    | Implemented and scanned                    | Previous source scan passed; fresh scan of new features pending; see reports/SONAR-RESULT.md                                                             |
| Git, branching/merging        | Local commit + acceptance branch | Local commits and merge recorded; nothing published                                                             |
| Profile screen                | Optional, implemented            | Real-browser profile passed                                                                                           |
| Search/recent filters         | Optional, implemented            | Jest search passed                                                                                                   |
| Export/import + Trash/restore | Optional extras, implemented | JSON download/import and restore checked in browser and real MySQL |
| Real-time updates | Optional, not implemented | Not a core blocker |
| Public repo + detailed README | README exists                    | Public repository creation and submission require user authorization                                                 |

## Clarifications for mentor

- Portal displays January 11, 2027 at 10:59 PM without a timezone. User says internship ends in December; confirm batch deadline.
- MySQL matches the explicit technology stack and detailed SQL requirement, although the overview also mentions MongoDB.
- No mandatory deployment URL, ZIP upload, or exact SonarQube quality gate was specified in the inspected form.
- Follow current mentor AI-use/disclosure requirements.
