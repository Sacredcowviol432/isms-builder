# Contributing to ISMS Builder

ISMS Builder is an open-source Information Security Management System platform.
**Author & Maintainer:** Claude Hecker
**License:** GNU Affero General Public License v3.0

---

## Getting Started

```bash
git clone https://github.com/claudehecker/isms-builder.git
cd isms-builder
npm install
cp .env.example .env     # adjust JWT_SECRET
npm test                 # all tests must be green before you start
npm start
```

## Development Rules

- **All 176+ tests must pass** before opening a PR — run `npm test -- --runInBand`
- **No new feature without a test** — add a test file under `tests/` for every new module
- **One route file per module** — new modules go into `server/routes/yourmodule.js`
- **One store file per module** — data access goes into `server/db/yourmoduleStore.js`
- **No secrets in code** — use `.env` variables, never hard-code credentials
- **Soft-delete only** — never hard-delete records from stores without a permanent-delete admin action

## Project Structure

```
server/
  index.js          – Express setup + router mounts only (~180 lines)
  routes/           – One Express router per module
  db/               – One store per module (JSON persistence)
  auth.js           – JWT middleware
server/routes/      – auth, templates, soa, risks, goals, assets,
                      governance, bcm, calendar, guidance, gdpr,
                      reports, legal, training, admin, public, trash
ui/
  app.js            – Vanilla JS SPA (single file, section-based)
  style.css         – Atlassian Dark Theme
tests/              – Jest + Supertest, isolated DATA_DIR per suite
data/               – JSON files (gitignored except seeds)
docs/               – Architecture, API spec, data model
```

## Adding a New Module

1. `server/db/newmoduleStore.js` — CRUD + soft-delete + getSummary()
2. `server/routes/newmodule.js` — Express router, requireAuth + authorize()
3. Mount in `server/index.js`: `app.use(require('./routes/newmodule'))`
4. `tests/setup/testEnv.js` — add empty seed file for the new module
5. `tests/newmodule.test.js` — CRUD tests, 401/403 checks, soft-delete
6. `ui/app.js` — add to SECTION_META, MODULE_CONFIG, renderNewmodule()
7. `server/db/orgSettingsStore.js` — add `newmodule: true` to modules defaults
8. Run `npm test` — all tests green

## Submitting Changes

- Fork the repository and create a feature branch: `git checkout -b feature/my-feature`
- Keep commits small and focused
- Write a clear PR description explaining *why*, not just *what*
- Reference any related issues: `Closes #123`
- Do not force-push to shared branches

## Issue Reports

Use the GitHub Issue Templates:
- **Bug Report** — unexpected behaviour with steps to reproduce
- **Feature Request** — new module or enhancement with ISMS/ISO 27001 justification
- **Security Vulnerability** — use the Security template (not a public issue)

## Code Style

- Plain JavaScript (ES2020), no TypeScript, no build step
- 2-space indentation, single quotes, semicolons
- `escHtml()` for all user-supplied strings rendered into HTML
- `apiHeaders()` for all fetch calls in the frontend

## License

By contributing you agree that your contributions are licensed under the
GNU Affero General Public License v3.0.
Copyright remains with Claude Hecker and respective contributors.
