#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────
# ISMS Builder – Sauberen Workspace einrichten
#
# Führt folgende Schritte aus:
#   1. Systemvoraussetzungen prüfen (Node.js, npm, openssl)
#   2. Verzeichnisstruktur anlegen (data/, ssl/, Uploads)
#   3. .env aus Vorlage erstellen und JWT_SECRET generieren
#   4. npm install (Dependencies)
#   5. Optional: SSL einrichten (self-signed oder Let's Encrypt)
#   6. Server starten
#
# Verwendung:
#   bash scripts/clone-clean-workspace.sh           # interaktiv
#   bash scripts/clone-clean-workspace.sh --yes     # alle Defaults bestätigen
# ─────────────────────────────────────────────────────────────────
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$PROJECT_DIR/.env"

# ── Farben ────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

info()    { echo -e "${CYAN}▶ $*${NC}"; }
ok()      { echo -e "${GREEN}✓ $*${NC}"; }
warn()    { echo -e "${YELLOW}⚠ $*${NC}"; }
err()     { echo -e "${RED}✗ Fehler: $*${NC}"; exit 1; }
step()    { echo -e "\n${BOLD}── $* ──────────────────────────────────────${NC}"; }

# Auto-yes Modus
YES=false
[ "${1:-}" = "--yes" ] && YES=true

confirm() {
  local question="$1" default="${2:-j}"
  $YES && { echo -e "${CYAN}▶ $question [auto: $default]${NC}"; [ "$default" = "j" ] && return 0 || return 1; }
  local prompt; [ "$default" = "j" ] && prompt="[J/n]" || prompt="[j/N]"
  read -rp "$(echo -e "${CYAN}▶ $question $prompt: ${NC}")" ans
  [ "${ans:-$default}" = "j" ] || [ "${ans:-$default}" = "J" ]
}

ask() {
  local question="$1" default="$2" varname="$3"
  $YES && { echo -e "${CYAN}▶ $question [auto: ${default:-leer}]${NC}"; printf -v "$varname" '%s' "$default"; return; }
  local dstr=""; [ -n "$default" ] && dstr=" [${default}]"
  read -rp "$(echo -e "${CYAN}▶ $question${dstr}: ${NC}")" val
  printf -v "$varname" '%s' "${val:-$default}"
}

# ─────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD} ISMS Builder – Workspace einrichten${NC}"
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo " Projekt: $PROJECT_DIR"
echo ""

# ══════════════════════════════════════════════════════════════════
step "1 · Systemvoraussetzungen prüfen"

# Node.js
if command -v node &>/dev/null; then
  NODE_VER=$(node --version)
  NODE_MAJOR=$(echo "$NODE_VER" | tr -d 'v' | cut -d. -f1)
  [ "$NODE_MAJOR" -lt 18 ] && err "Node.js $NODE_VER gefunden, mindestens v18 erforderlich."
  ok "Node.js $NODE_VER"
else
  err "Node.js nicht gefunden. Bitte installieren: https://nodejs.org"
fi

# npm
command -v npm &>/dev/null && ok "npm $(npm --version)" || err "npm nicht gefunden."

# openssl (optional)
command -v openssl &>/dev/null \
  && ok "openssl $(openssl version 2>/dev/null | cut -d' ' -f1-2)" \
  || warn "openssl nicht gefunden – SSL-Einrichtung nicht möglich"

# ══════════════════════════════════════════════════════════════════
step "2 · Verzeichnisstruktur anlegen"

DIRS=(
  "data"
  "data/gdpr"
  "data/gdpr/files"
  "data/guidance"
  "data/guidance/files"
  "data/template-files"
  "ssl"
  "logs"
)

for d in "${DIRS[@]}"; do
  if [ ! -d "$PROJECT_DIR/$d" ]; then
    mkdir -p "$PROJECT_DIR/$d"
    ok "Erstellt: $d/"
  else
    ok "Vorhanden: $d/"
  fi
done

# ══════════════════════════════════════════════════════════════════
step "3 · Umgebungskonfiguration (.env)"

SKIP_ENV=false
if [ -f "$ENV_FILE" ]; then
  warn ".env existiert bereits."
  confirm ".env überschreiben?" "n" || SKIP_ENV=true
fi

if [ "$SKIP_ENV" = "false" ]; then
  # JWT_SECRET generieren
  if command -v openssl &>/dev/null; then
    JWT_SECRET=$(openssl rand -hex 32)
  else
    JWT_SECRET=$(tr -dc 'a-zA-Z0-9' < /dev/urandom | head -c 64)
  fi

  ask "JWT Token-Laufzeit" "8h" JWT_EXPIRES
  ask "Server-Port" "3000" SRV_PORT
  ask "Storage-Backend (json / sqlite)" "json" STORAGE

  cat > "$ENV_FILE" << EOF
# ISMS Builder – Umgebungskonfiguration
# Generiert von clone-clean-workspace.sh am $(date '+%Y-%m-%d %H:%M:%S')

# JWT – Sicherheit
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=${JWT_EXPIRES}

# Server
PORT=${SRV_PORT}
DEV_HEADER_AUTH=false

# Storage-Backend: json | sqlite
STORAGE_BACKEND=${STORAGE}

# SSL/HTTPS (wird durch setup-ssl.sh oder letsencrypt.sh gesetzt)
# SSL_CERT_FILE=ssl/cert.pem
# SSL_KEY_FILE=ssl/key.pem
EOF
  ok ".env erstellt (JWT_SECRET automatisch generiert)"
else
  ok ".env beibehalten"
fi

# ══════════════════════════════════════════════════════════════════
step "4 · Dependencies installieren (npm install)"

cd "$PROJECT_DIR"

if [ -d "node_modules" ]; then
  if confirm "node_modules vorhanden – neu installieren?" "n"; then
    rm -rf node_modules
    npm install
    ok "Dependencies neu installiert"
  else
    ok "node_modules beibehalten"
  fi
else
  info "Installiere Dependencies…"
  npm install
  ok "Dependencies installiert"
fi

# ══════════════════════════════════════════════════════════════════
step "5 · SSL einrichten (optional)"

if confirm "SSL/HTTPS einrichten?" "n"; then
  echo ""
  echo "   1) Selbstsigniertes Zertifikat (Entwicklung / intern)"
  echo "   2) Let's Encrypt (Produktion)"
  echo "   3) Überspringen"
  echo ""
  read -rp "   Wahl [1-3]: " SSL_CHOICE
  case "$SSL_CHOICE" in
    1) bash "$SCRIPT_DIR/setup-ssl.sh" ;;
    2) bash "$SCRIPT_DIR/letsencrypt.sh" ;;
    *) info "SSL übersprungen" ;;
  esac
else
  info "SSL übersprungen – Server startet als HTTP"
fi

# ══════════════════════════════════════════════════════════════════
step "6 · Server starten"

if confirm "Server jetzt starten?" "j"; then
  bash "$PROJECT_DIR/start.sh"
else
  info "Server nicht gestartet. Manuell starten mit: bash start.sh"
fi

# ── Abschluss ─────────────────────────────────────────────────────
SRV_PORT_VAL=$(grep -E "^PORT=" "$ENV_FILE" 2>/dev/null | cut -d= -f2); SRV_PORT_VAL="${SRV_PORT_VAL:-3000}"
SSL_CERT=$(grep -E "^SSL_CERT_FILE=" "$ENV_FILE" 2>/dev/null | cut -d= -f2 || true)
PROTO="http"; [ -n "$SSL_CERT" ] && PROTO="https"

echo ""
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD} Workspace eingerichtet!${NC}"
echo ""
echo -e " URL      : ${GREEN}${PROTO}://localhost:${SRV_PORT_VAL}${NC}"
echo  " Projekt  : $PROJECT_DIR"
echo  " Log      : $PROJECT_DIR/.server.log"
echo ""
echo  " Weitere Scripts:"
echo  "   SSL einrichten  : bash scripts/setup-ssl.sh"
echo  "   Let's Encrypt   : bash scripts/letsencrypt.sh"
echo  "   Backup & Deploy : bash scripts/backup-and-deploy.sh"
echo  "   Start / Stop    : bash start.sh  /  bash stop.sh"
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
