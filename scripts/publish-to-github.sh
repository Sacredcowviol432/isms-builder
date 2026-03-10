#!/usr/bin/env bash
# =============================================================================
# ISMS Builder — GitHub Publish Script
# Initialisiert Git, erstellt das GitHub-Repo und pusht alles hoch.
#
# Voraussetzungen:
#   - git installiert
#   - GitHub CLI (gh) installiert und eingeloggt: gh auth login
#
# Verwendung:
#   bash scripts/publish-to-github.sh
#   bash scripts/publish-to-github.sh --repo mein-repo-name --private
# =============================================================================

set -euo pipefail
cd "$(dirname "$0")/.."   # immer vom Projektroot ausführen

# ---------- Konfiguration ----------
REPO_NAME="isms-builder"
REPO_DESC="Self-hosted Information Security Management System — ISO 27001, NIS2, GDPR/DSGVO, BSI IT-Grundschutz"
VISIBILITY="public"
DEFAULT_BRANCH="main"

# ---------- Argumente ----------
while [[ $# -gt 0 ]]; do
  case "$1" in
    --repo)    REPO_NAME="$2"; shift 2 ;;
    --private) VISIBILITY="private"; shift ;;
    --public)  VISIBILITY="public"; shift ;;
    *) echo "Unbekannte Option: $1"; exit 1 ;;
  esac
done

# ---------- Farben ----------
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; BOLD='\033[1m'; NC='\033[0m'
ok()   { echo -e "${GREEN}✓${NC} $*"; }
warn() { echo -e "${YELLOW}⚠${NC} $*"; }
err()  { echo -e "${RED}✗ FEHLER:${NC} $*"; exit 1; }
info() { echo -e "${BLUE}→${NC} $*"; }

echo ""
echo -e "${BOLD}========================================${NC}"
echo -e "${BOLD}  ISMS Builder — GitHub Publish Script  ${NC}"
echo -e "${BOLD}========================================${NC}"
echo ""

# ---------- 1. Voraussetzungen ----------
info "Prüfe Voraussetzungen..."
command -v git >/dev/null 2>&1 || err "git ist nicht installiert."
command -v gh  >/dev/null 2>&1 || err "'gh' (GitHub CLI) fehlt. Installieren: sudo pacman -S github-cli && gh auth login"
gh auth status >/dev/null 2>&1  || err "Nicht bei GitHub eingeloggt. Bitte zuerst: gh auth login"

GH_USER=$(gh api user --jq .login 2>/dev/null) || err "GitHub-Nutzername konnte nicht ermittelt werden."
ok "GitHub-Nutzer: ${BOLD}${GH_USER}${NC}"

# ---------- 2. Git-User-Config sicherstellen ----------
GIT_NAME=$(git config user.name 2>/dev/null || true)
GIT_MAIL=$(git config user.email 2>/dev/null || true)
if [[ -z "$GIT_NAME" || -z "$GIT_MAIL" ]]; then
  GH_NAME=$(gh api user --jq .name 2>/dev/null || echo "$GH_USER")
  GH_MAIL=$(gh api user/emails --jq '.[0].email' 2>/dev/null || echo "${GH_USER}@users.noreply.github.com")
  git config user.name  "$GH_NAME"
  git config user.email "$GH_MAIL"
  ok "Git-User gesetzt: $GH_NAME <$GH_MAIL>"
else
  ok "Git-User: $GIT_NAME <$GIT_MAIL>"
fi

# ---------- 3. Sicherheitscheck: keine Private Keys ----------
info "Prüfe auf Private Keys in zu committenden Dateien..."
# Nur Dateien prüfen, die git tatsächlich tracken würde (respektiert .gitignore)
TRACKED_WITH_KEY=$(
  { git ls-files 2>/dev/null; git ls-files --others --exclude-standard 2>/dev/null; } \
  | grep -E '\.(pem|key|crt|p12|pfx)$' \
  | xargs grep -l "BEGIN.*PRIVATE KEY" 2>/dev/null || true
)
if [[ -n "${TRACKED_WITH_KEY}" ]]; then
  err "Private-Key-Dateien würden committed:\n${TRACKED_WITH_KEY}\nBitte .gitignore prüfen!"
fi
ok "Kein Private Key in zu committenden Dateien."

# ---------- 4. .env-Check ----------
git check-ignore -q .env 2>/dev/null \
  || err ".env wird NICHT von .gitignore erfasst — Abbruch zum Schutz deiner Secrets!"
ok ".env korrekt ignoriert."

# ---------- 5. Git initialisieren ----------
if [[ ! -d .git ]]; then
  info "Git-Repository initialisieren..."
  git init -b "${DEFAULT_BRANCH}"
  ok "Git initialisiert (Branch: ${DEFAULT_BRANCH})"
else
  ok "Git-Repository bereits vorhanden."
fi

# ---------- 6. Dateien stagen ----------
info "Dateien stagen..."

# Quellcode & Konfiguration
git add \
  README.md LICENSE CONTRIBUTING.md CLAUDE.md \
  package.json package-lock.json jest.config.js \
  .gitignore .gitattributes .dockerignore \
  .env.example .env.docker \
  Dockerfile docker-compose.yml docker-entrypoint.sh \
  server/ ui/ tests/ tools/ scripts/ docs/ .github/ \
  2>/dev/null || true

# Changelog (optional, kein Fehler wenn nicht vorhanden)
[[ -f CHANGELOG.md ]] && git add CHANGELOG.md 2>/dev/null || true

# Demo-Seed-Daten (explizit, keine sensitiven Laufzeit-Dateien)
for f in \
  data/templates.json data/soa.json data/risks.json data/goals.json \
  data/assets.json data/bcm.json data/governance.json \
  data/training.json data/suppliers.json data/guidance.json \
  data/entities.json data/crossmap.json data/org-settings.json \
  data/public-incidents.json data/custom-lists.json data/rbac_users.json
do
  [[ -f "$f" ]] && git add "$f" 2>/dev/null || true
done

# GDPR-Seed (nur JSON, keine hochgeladenen Dateien)
[[ -d data/gdpr ]] && git add data/gdpr/*.json 2>/dev/null || true

STAGED=$(git diff --cached --name-only | wc -l)
if [[ "$STAGED" -eq 0 ]]; then
  warn "Keine neuen Dateien zu committen (alles bereits committed oder leer)."
else
  info "${STAGED} Dateien gestaged."
fi

# ---------- 7. Commit ----------
if git log -1 >/dev/null 2>&1; then
  # Bereits Commits vorhanden
  if [[ "$STAGED" -gt 0 ]]; then
    info "Erstelle Folge-Commit..."
    git commit -m "$(cat <<'EOF'
chore: update for open-source release v1.29

CI/CD workflows, screenshots, community docs, improved README.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
    ok "Commit erstellt."
  else
    ok "Nichts zu committen — Repository ist aktuell."
  fi
else
  # Erster Commit
  if [[ "$STAGED" -eq 0 ]]; then
    err "Keine Dateien gestaged und noch keine Commits — nichts zu pushen."
  fi
  info "Erstelle initialen Commit..."
  git commit -m "$(cat <<'EOF'
feat: initial open-source release v1.29

Self-hosted ISMS platform for ISO 27001:2022, NIS2, GDPR/DSGVO,
BSI IT-Grundschutz and 6 further frameworks.

- 16 modules: policies, SoA (313 controls/8 frameworks), risks,
  GDPR, assets, BCM, suppliers, training, legal, incidents, ...
- JWT auth + TOTP 2FA + RBAC (4 levels)
- SQLite backend, Docker ready
- Local AI semantic search via Ollama
- 176 automated tests (Jest + Supertest)
- CI/CD via GitHub Actions

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
  ok "Initialer Commit erstellt."
fi

# ---------- 8. GitHub-Repo erstellen oder Remote setzen ----------
info "Prüfe GitHub-Repo '${GH_USER}/${REPO_NAME}'..."

REPO_EXISTS=false
gh repo view "${GH_USER}/${REPO_NAME}" >/dev/null 2>&1 && REPO_EXISTS=true || true

if [[ "$REPO_EXISTS" == "false" ]]; then
  # Repo noch nicht vorhanden → erstellen und direkt pushen
  info "Erstelle neues GitHub-Repo '${REPO_NAME}' (${VISIBILITY})..."
  gh repo create "${REPO_NAME}" \
    --description "${REPO_DESC}" \
    --"${VISIBILITY}" \
    --source=. \
    --remote=origin \
    --push
  ok "Repo erstellt und gepusht!"
else
  # Repo existiert → Remote setzen und pushen
  warn "Repo '${GH_USER}/${REPO_NAME}' existiert bereits auf GitHub."
  REMOTE_URL="https://github.com/${GH_USER}/${REPO_NAME}.git"

  if git remote get-url origin >/dev/null 2>&1; then
    info "Remote 'origin' bereits gesetzt: $(git remote get-url origin)"
  else
    info "Setze Remote 'origin' → ${REMOTE_URL}"
    git remote add origin "${REMOTE_URL}"
    ok "Remote gesetzt."
  fi

  info "Pushe Branch '${DEFAULT_BRANCH}' zu GitHub..."
  # --force-with-lease für initialen Push wenn Remote-Repo leer oder nur Auto-README
  if git push -u origin "${DEFAULT_BRANCH}" 2>/dev/null; then
    ok "Push erfolgreich."
  else
    warn "Normaler Push fehlgeschlagen (Remote hat abweichende Historie)."
    warn "Versuche Force-Push für initialen Upload..."
    read -rp "  Force-Push durchführen? (ja/nein): " CONFIRM
    if [[ "$CONFIRM" == "ja" ]]; then
      git push --force-with-lease -u origin "${DEFAULT_BRANCH}"
      ok "Force-Push erfolgreich."
    else
      err "Push abgebrochen. Manuell ausführen:\n  git push --force-with-lease -u origin ${DEFAULT_BRANCH}"
    fi
  fi
fi

# ---------- 9. Abschluss ----------
echo ""
echo -e "${GREEN}${BOLD}========================================${NC}"
echo -e "${GREEN}${BOLD}  Fertig!${NC}"
echo -e "  ${BOLD}https://github.com/${GH_USER}/${REPO_NAME}${NC}"
echo -e "${GREEN}${BOLD}========================================${NC}"
echo ""
echo "Empfohlene nächste Schritte:"
echo ""
echo "  # Topics setzen (bessere Auffindbarkeit auf GitHub):"
echo "  gh repo edit ${GH_USER}/${REPO_NAME} \\"
echo "    --add-topic isms,iso27001,compliance,security,self-hosted,gdpr,nis2"
echo ""
echo "  # Erstes Release-Tag setzen (löst release.yml CI aus):"
echo "  git tag v1.29.0 && git push origin v1.29.0"
echo ""
echo "  # Repo-Website auf GitHub anzeigen lassen:"
echo "  gh repo edit ${GH_USER}/${REPO_NAME} --homepage https://github.com/${GH_USER}/${REPO_NAME}"
echo ""
