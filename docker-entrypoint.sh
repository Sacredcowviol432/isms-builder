#!/bin/sh
# ISMS Builder – Docker Entrypoint
# Stellt sicher, dass alle benötigten Datenverzeichnisse vorhanden sind,
# bevor der Server gestartet wird (wichtig bei Bind-Mount auf leerem Host-Verzeichnis)
set -e

mkdir -p \
  /app/data/gdpr/files \
  /app/data/guidance/files \
  /app/data/template-files \
  /app/data/legal/files

exec node server/index.js
