#!/usr/bin/env bash
set -euo pipefail

# install-test-env.sh
# Creates a separate test environment copy of the current repo and installs dependencies.
# Intended to run on Arch Linux. Runs a minimal Node/Express app to host the UI for evaluation.

SRC_ROOT=$(cd "$(dirname -- "$0")/.." && pwd)
TEST_ROOT_BASE="$HOME/isms-test-build"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
TEST_ROOT="$TEST_ROOT_BASE-$TIMESTAMP"

echo "[ISMS Build] Test environment directory: $TEST_ROOT"

echo "[ISMS Build] Preparing test environment..."

# Create a fresh test directory
mkdir -p "$TEST_ROOT"

# Copy repository contents (excluding .git and node_modules) to test dir
echo "[ISMS Build] Copying repository to test directory: $TEST_ROOT"
rsync -a --exclude='.git' --exclude='node_modules' "$SRC_ROOT/" "$TEST_ROOT/"

# Create a minimal package.json in the test dir if not present
if [ ! -f "$TEST_ROOT/package.json" ]; then
cat > "$TEST_ROOT/package.json" <<'JSON'
{
  "name": "isms-build-test",
  "version": "0.1.0",
  "description": "Build-mode test environment for ISMS templates",
  "scripts": {
    "start": "node server/index.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    "dotenv": "^16.4.5"
  }
}
JSON
fi

# .env kopieren falls vorhanden, sonst Hinweis ausgeben
if [ -f "$SRC_ROOT/.env" ]; then
  cp "$SRC_ROOT/.env" "$TEST_ROOT/.env"
  echo "[ISMS Build] .env kopiert. Bitte JWT_SECRET in $TEST_ROOT/.env anpassen!"
else
  echo "[ISMS Build] WARNUNG: Keine .env gefunden. Bitte $TEST_ROOT/.env manuell anlegen (siehe .env.example)."
fi

echo "[ISMS Build] Installing Node.js dependencies in test environment..."
cd "$TEST_ROOT"
npm install > /tmp/isms-npm-install.log 2>&1 || {
  echo "[ISMS Build] npm install failed. See /tmp/isms-npm-install.log"; exit 1;
}

echo ""
echo "[ISMS Build] Setup complete."
echo ""
echo "  Starten:"
echo "    cd '$TEST_ROOT' && npm run start"
echo ""
echo "  URLs:"
echo "    Login:         http://localhost:3000/ui/login.html"
echo "    Hauptanwendung: http://localhost:3000/ui/index.html"
echo "    Admin Console: http://localhost:3000/ui/admin.html"
echo "    Dashboard:     http://localhost:3000/ui/index.html  (Abschnitt 'Dashboard')"
echo "    SoA Controls:  http://localhost:3000/ui/index.html  (Abschnitt 'SoA - Controls')"
echo "    SoA Export:    http://localhost:3000/soa/export"
echo "    SoA Frameworks: http://localhost:3000/soa/frameworks  (ISO27001, BSI, NIS2, EUCS, EUAI)"
echo "    API Health:    http://localhost:3000/"
echo ""
echo "  Standard-Zugangsdaten (Seed-Daten – bitte ändern!):"
echo "    admin@example.com / adminpass  (Rolle: admin,     2FA: deaktiviert)"
echo "    alice@it.example  / alicepass  (Rolle: dept_head, 2FA: deaktiviert)"
echo "    bob@hr.example    / bobpass    (Rolle: reader,    2FA: deaktiviert)"
echo ""
echo "  2FA einrichten: Nach dem Login unter Einstellungen → '2FA einrichten'"
echo "  QR-Code mit Google Authenticator / Authy scannen und Code bestätigen."
echo ""
echo "  WICHTIG: JWT_SECRET in $TEST_ROOT/.env vor Produktivbetrieb ändern!"
