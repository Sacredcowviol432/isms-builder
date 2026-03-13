#!/usr/bin/env bash
# © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
# security-check.sh — Lokaler Sicherheits- und Patch-Status-Check
# Prüft: npm-Pakete, Node.js-Version, Ollama-Version
# Aufruf: bash scripts/security-check.sh

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

ISSUES=0

banner() { echo -e "\n${CYAN}${BOLD}═══ $1 ═══${RESET}"; }
ok()     { echo -e "  ${GREEN}✓${RESET}  $1"; }
warn()   { echo -e "  ${YELLOW}⚠${RESET}  $1"; ISSUES=$((ISSUES+1)); }
fail()   { echo -e "  ${RED}✗${RESET}  $1"; ISSUES=$((ISSUES+1)); }
info()   { echo -e "  ${CYAN}ℹ${RESET}  $1"; }

echo -e "${BOLD}ISMS Builder — Security & Patch Check${RESET}"
echo    "$(date '+%Y-%m-%d %H:%M:%S')"

# ── 1) Node.js-Version ────────────────────────────────────────────────────────
banner "Node.js"
NODE_VERSION=$(node --version 2>/dev/null | sed 's/v//')
NODE_MAJOR=$(echo "$NODE_VERSION" | cut -d. -f1)
info "Installiert: v${NODE_VERSION}"

# LTS-Versionen: 18 (Wartung bis Apr 2025), 20 (aktiv bis Apr 2026), 22 (aktiv bis Apr 2027)
if   [[ "$NODE_MAJOR" -ge 22 ]]; then ok "Node.js $NODE_MAJOR — aktuell (LTS Active)"
elif [[ "$NODE_MAJOR" -eq 20 ]]; then ok "Node.js $NODE_MAJOR — LTS Active (Update auf 22 empfohlen)"
elif [[ "$NODE_MAJOR" -eq 18 ]]; then warn "Node.js $NODE_MAJOR — LTS Maintenance (Ende Apr 2025 — bitte auf 20 oder 22 aktualisieren)"
else fail "Node.js $NODE_MAJOR — veraltet oder unbekannte Version (bitte auf 20 LTS oder 22 LTS aktualisieren)"
fi

# ── 2) npm-Audit ──────────────────────────────────────────────────────────────
banner "npm Security Audit"
AUDIT_OUT=$(npm audit --json 2>/dev/null || true)

CRITICAL=$(echo "$AUDIT_OUT" | node -e "const d=require('fs').readFileSync('/dev/stdin','utf8');try{const a=JSON.parse(d);console.log(a.metadata?.vulnerabilities?.critical||0)}catch{console.log(0)}" 2>/dev/null || echo 0)
HIGH=$(echo     "$AUDIT_OUT" | node -e "const d=require('fs').readFileSync('/dev/stdin','utf8');try{const a=JSON.parse(d);console.log(a.metadata?.vulnerabilities?.high||0)}catch{console.log(0)}" 2>/dev/null || echo 0)
MODERATE=$(echo "$AUDIT_OUT" | node -e "const d=require('fs').readFileSync('/dev/stdin','utf8');try{const a=JSON.parse(d);console.log(a.metadata?.vulnerabilities?.moderate||0)}catch{console.log(0)}" 2>/dev/null || echo 0)
LOW=$(echo      "$AUDIT_OUT" | node -e "const d=require('fs').readFileSync('/dev/stdin','utf8');try{const a=JSON.parse(d);console.log(a.metadata?.vulnerabilities?.low||0)}catch{console.log(0)}" 2>/dev/null || echo 0)

[[ "$CRITICAL" -gt 0 ]] && fail  "Critical: $CRITICAL"   || ok "Critical: 0"
[[ "$HIGH"     -gt 0 ]] && fail  "High:     $HIGH"        || ok "High:     0"
[[ "$MODERATE" -gt 0 ]] && warn  "Moderate: $MODERATE"    || ok "Moderate: 0"
[[ "$LOW"      -gt 0 ]] && info  "Low:      $LOW (informational)" || ok "Low:      0"

if [[ "$CRITICAL" -gt 0 || "$HIGH" -gt 0 ]]; then
  echo ""
  echo -e "  ${RED}${BOLD}→ Sofortmaßnahme erforderlich: npm audit fix${RESET}"
fi

# ── 3) Veraltete Pakete ───────────────────────────────────────────────────────
banner "Veraltete npm-Pakete"
OUTDATED=$(npm outdated --json 2>/dev/null || true)
OUTDATED_COUNT=$(echo "$OUTDATED" | node -e "const d=require('fs').readFileSync('/dev/stdin','utf8');try{console.log(Object.keys(JSON.parse(d)).length)}catch{console.log(0)}" 2>/dev/null || echo 0)

if [[ "$OUTDATED_COUNT" -eq 0 ]]; then
  ok "Alle Pakete aktuell"
else
  warn "$OUTDATED_COUNT Paket(e) veraltet"
  echo "$OUTDATED" | node -e "
    const d=require('fs').readFileSync('/dev/stdin','utf8')
    try {
      const pkgs = JSON.parse(d)
      Object.entries(pkgs).forEach(([name, v]) => {
        const isSecurity = name.includes('express') || name.includes('jwt') || name.includes('bcrypt') ||
                           name.includes('multer') || name.includes('dotenv') || name.includes('pdf')
        const marker = isSecurity ? ' ⚠ security-relevant' : ''
        console.log('     ' + name.padEnd(30) + v.current.padEnd(12) + '→  ' + v.latest + marker)
      })
    } catch {}
  " 2>/dev/null || true
  echo ""
  info "Update: npm update  |  Einzeln: npm install <paket>@latest"
fi

# ── 4) Gepinnte Abhängigkeiten ────────────────────────────────────────────────
banner "Gepinnte Abhängigkeiten (PINNED-DEPS.md)"
PDF_PARSE_INSTALLED=$(node -e "console.log(require('$ROOT/node_modules/pdf-parse/package.json').version)" 2>/dev/null || echo "nicht installiert")
if [[ "$PDF_PARSE_INSTALLED" == "1.1.1" ]]; then
  ok "pdf-parse $PDF_PARSE_INSTALLED (korrekt gepinnt)"
elif [[ "$PDF_PARSE_INSTALLED" == "nicht installiert" ]]; then
  warn "pdf-parse nicht installiert — npm ci ausführen"
else
  fail "pdf-parse $PDF_PARSE_INSTALLED — muss exakt 1.1.1 sein! Siehe PINNED-DEPS.md"
  echo -e "  ${RED}  Behebung: npm install pdf-parse@1.1.1 --save-exact${RESET}"
fi

# ── 5) Ollama ─────────────────────────────────────────────────────────────────
banner "Ollama (lokales KI-Backend)"
if command -v ollama &>/dev/null; then
  OLLAMA_VERSION=$(ollama --version 2>/dev/null | grep -oP '\d+\.\d+\.\d+' | head -1 || echo "unbekannt")
  info "Installiert: v${OLLAMA_VERSION}"

  # Ollama-Dienst erreichbar?
  OLLAMA_HOST="${OLLAMA_HOST:-localhost}"
  OLLAMA_PORT="${OLLAMA_PORT:-11434}"
  if curl -sf "http://${OLLAMA_HOST}:${OLLAMA_PORT}/api/version" --max-time 3 >/dev/null 2>&1; then
    ok "Ollama-Dienst erreichbar auf ${OLLAMA_HOST}:${OLLAMA_PORT}"
    RUNNING_VER=$(curl -sf "http://${OLLAMA_HOST}:${OLLAMA_PORT}/api/version" --max-time 3 2>/dev/null | node -e "const d=require('fs').readFileSync('/dev/stdin','utf8');try{console.log(JSON.parse(d).version)}catch{console.log('')}" 2>/dev/null || echo "")
    [[ -n "$RUNNING_VER" ]] && info "Laufende Version: ${RUNNING_VER}"
  else
    warn "Ollama-Dienst nicht erreichbar — Semantische Suche deaktiviert"
  fi

  echo ""
  info "Manuelles Update: curl -fsSL https://ollama.com/install.sh | sh"
  info "Modelle prüfen:   ollama list"
  info "Modell updaten:   ollama pull nomic-embed-text && ollama pull llama3.2:3b"
else
  info "Ollama nicht installiert — Semantische Suche und KI-Parser nicht verfügbar"
  info "Installation: curl -fsSL https://ollama.com/install.sh | sh"
fi

# ── 5) .env Sicherheit ────────────────────────────────────────────────────────
banner ".env Sicherheitsprüfung"
ENV_FILE="$ROOT/.env"
if [[ -f "$ENV_FILE" ]]; then
  # JWT_SECRET Länge
  JWT_SECRET=$(grep '^JWT_SECRET=' "$ENV_FILE" 2>/dev/null | cut -d= -f2- | tr -d '"' | tr -d "'")
  JWT_LEN=${#JWT_SECRET}
  if [[ "$JWT_LEN" -lt 32 ]]; then
    fail "JWT_SECRET zu kurz (${JWT_LEN} Zeichen, Minimum: 32)"
  elif [[ "$JWT_LEN" -lt 64 ]]; then
    warn "JWT_SECRET kurz (${JWT_LEN} Zeichen, empfohlen: 64+)"
  else
    ok "JWT_SECRET Länge: ${JWT_LEN} Zeichen"
  fi

  # DEV_HEADER_AUTH sollte in Produktion deaktiviert sein
  DEV_AUTH=$(grep '^DEV_HEADER_AUTH=' "$ENV_FILE" 2>/dev/null | cut -d= -f2- | tr -d '"' | tr -d "'" | tr -d ' ')
  if [[ "$DEV_AUTH" == "true" ]]; then
    fail "DEV_HEADER_AUTH=true — NIEMALS in Produktion aktivieren!"
  else
    ok "DEV_HEADER_AUTH deaktiviert"
  fi

  # SSL-Konfiguration
  SSL_CERT=$(grep '^SSL_CERT_FILE=' "$ENV_FILE" 2>/dev/null | cut -d= -f2- | tr -d '"' | tr -d "'")
  if [[ -n "$SSL_CERT" ]]; then
    if [[ -f "$SSL_CERT" ]]; then
      ok "SSL-Zertifikat vorhanden: $SSL_CERT"
      # Ablaufdatum prüfen
      EXPIRY=$(openssl x509 -enddate -noout -in "$SSL_CERT" 2>/dev/null | cut -d= -f2 || echo "")
      if [[ -n "$EXPIRY" ]]; then
        EXPIRY_TS=$(date -d "$EXPIRY" +%s 2>/dev/null || date -j -f "%b %d %T %Y %Z" "$EXPIRY" +%s 2>/dev/null || echo 0)
        NOW_TS=$(date +%s)
        DAYS_LEFT=$(( (EXPIRY_TS - NOW_TS) / 86400 ))
        if   [[ "$DAYS_LEFT" -lt 14 ]]; then fail "SSL-Zertifikat läuft in ${DAYS_LEFT} Tagen ab!"
        elif [[ "$DAYS_LEFT" -lt 30 ]]; then warn "SSL-Zertifikat läuft in ${DAYS_LEFT} Tagen ab"
        else ok "SSL-Zertifikat gültig noch ${DAYS_LEFT} Tage"
        fi
      fi
    else
      warn "SSL_CERT_FILE gesetzt aber Datei nicht gefunden: $SSL_CERT"
    fi
  else
    warn "Kein SSL/HTTPS konfiguriert — für Produktion SSL_CERT_FILE setzen"
  fi
else
  warn ".env nicht gefunden — bitte aus .env.example erstellen"
fi

# ── Zusammenfassung ───────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}════════════════════════════════════════${RESET}"
if [[ "$ISSUES" -eq 0 ]]; then
  echo -e "${GREEN}${BOLD}✓ Alles in Ordnung — keine Sicherheitsprobleme gefunden${RESET}"
elif [[ "$ISSUES" -eq 1 ]]; then
  echo -e "${YELLOW}${BOLD}⚠ 1 Problem gefunden — bitte prüfen${RESET}"
else
  echo -e "${RED}${BOLD}✗ ${ISSUES} Probleme gefunden — Handlungsbedarf!${RESET}"
fi
echo ""

exit $( [[ "$ISSUES" -eq 0 ]] && echo 0 || echo 1 )
