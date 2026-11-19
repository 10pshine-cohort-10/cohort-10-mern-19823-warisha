# Actual SonarQube result

Analysis completed on November 9, 2026, using local SonarQube Community Build 26.11.0.134175 and official SonarScanner for NPM 5.0.2.

Project: `shine-notes` / Shine Notes App. Quality profiles: Sonar way core for JavaScript and CSS. Source scope: client/src and server/src; tests: client/test and server/test. Both LCOV reports were imported. Database credentials and .env files are outside the configured scan sources.

## Results after fixing first-scan findings

- Quality gate: **OK**.
- Open issues: **0**. The issue report retains three historical issues, all CLOSED / FIXED.
- Bugs: 0; vulnerabilities: 0; code smells: 0; security hotspots: 0, under the configured profiles.
- Overall coverage reported by SonarQube: **80.8%**.
- New-code coverage: **93.3%** against an 80% threshold.
- New violations: 0 against a zero threshold.
- New duplicated lines: 0.0% against a 3% threshold; overall duplication: 0.0%.

Fixed rules: two javascript:S9011 findings (explicit submit-button types) and one javascript:S9383 finding (explicitly ignored async load in an effect, with errors handled inside loadNotes).

JSON evidence: sonar-gate.json, sonar-issues.json and sonar-measures.json. A successful upload was followed by successful server-side task processing; the gate was queried afterward. The final Git revision is recorded in VERIFICATION.md.

## Limits

This is not a guarantee that the application is error-free or secure against every attack. Sonar's configured core rules, the test suite and the documented browser checks have limited scope. Dependency analysis was skipped by this local Sonar configuration; npm audit is separate. Five low-severity development dependency findings remained at the latest audit; production audit had zero findings. First-scan gate had no new-code conditions; the post-fix gate above evaluated actual new-code conditions.

Local dashboard (available while the server is running): http://127.0.0.1:9000/dashboard?id=shine-notes

Community Build explicitly warns that its security analysis does not cover critical injection vulnerabilities such as SQL injection/XSS. Zero scan findings must not be interpreted as comprehensive security assurance. Separate ownership, parameterized SQL and HTML-sanitization tests are included.

