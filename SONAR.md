# SonarQube local analysis

Official references:

- https://docs.sonarsource.com/sonarqube-community-build/server-installation/server-host-requirements
- https://docs.sonarsource.com/sonarqube-community-build/server-installation/from-zip-file/overview
- https://docs.sonarsource.com/sonarqube-server/analyzing-source-code/scanners/npm/using

## Current environment

An existing full Java 21 runtime was found in Android Studio's JBR. SonarQube Community Build 26.11.0.134175 was selected from SonarSource's official update-center download metadata. Local tools are kept outside the submitted source under the task's work/sonar directory. Downloading or configuring the server is not evidence of a successful analysis.

Bind both the web and search services to 127.0.0.1 for a local-only review. Do not expose an administrative service to the network. Development embedded database is only for local evaluation, not production hosting.

## Run an analysis

1. Start the local SonarQube service and wait until its system status is UP.
2. Open http://127.0.0.1:9000. Complete first-login administration locally; keep the password private.
3. Create an analysis token with the minimum necessary project scope and a limited expiration. Store it only in the current shell's SONAR_TOKEN environment variable; do not put it in this repository, screenshots or chat.
4. Run `npm test` and `npm run test:mysql`.
5. Run `sonar-scanner -Dsonar.host.url=http://127.0.0.1:9000` from the project root. The scanner reads sonar-project.properties and LCOV reports.
6. Review the server's actual analysis task and quality-gate result. Successful scanner upload alone is not a passed gate. Fix actionable findings and repeat checks as needed.
7. Record version, date, project key, gate status and open issues in VERIFICATION.md. Do not claim all code is secure or error-free based on a scan.

The portal did not specify a numerical SonarQube gate. Confirm mentor expectations, especially test coverage and report evidence. Jest mocks the third-party editor, so coverage and browser acceptance are separate evidence.

## Recorded result

The actual November 9 analysis passed its evaluated quality gate. See reports/SONAR-RESULT.md and VERIFICATION.md. The command above assumes the standalone SonarScanner CLI is installed; the recorded run used official SonarScanner for NPM 5.0.2 installed outside this repository.
