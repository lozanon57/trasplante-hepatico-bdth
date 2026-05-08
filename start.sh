#!/usr/bin/env bash
# BDTH App — Lanzador unificado
# Arranca el servidor Express (Excel export) y el servidor OCR Python (modo offline)
# Uso: ./start.sh [--no-ocr]   (--no-ocr omite el servidor Python)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NO_OCR="${1:-}"

# ── Colores ────────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${GREEN}[BDTH]${NC} $*"; }
warn() { echo -e "${YELLOW}[BDTH]${NC} $*"; }
err()  { echo -e "${RED}[BDTH]${NC} $*" >&2; }

# ── IP local ───────────────────────────────────────────────────────────────────
LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "127.0.0.1")

# ── Cleanup al salir ───────────────────────────────────────────────────────────
NODE_PID=""
OCR_PID=""

cleanup() {
  echo ""
  log "Deteniendo servidores..."
  [ -n "$NODE_PID" ] && kill "$NODE_PID" 2>/dev/null || true
  [ -n "$OCR_PID"  ] && kill "$OCR_PID"  2>/dev/null || true
  exit 0
}
trap cleanup INT TERM

# ── Servidor Express (Excel export) ───────────────────────────────────────────
EXPRESS_DIR="$SCRIPT_DIR/server"
if [ ! -d "$EXPRESS_DIR/node_modules" ]; then
  log "Instalando dependencias Node.js del servidor Express..."
  (cd "$EXPRESS_DIR" && npm install --silent)
fi

log "Iniciando servidor Express en puerto 3001..."
(cd "$EXPRESS_DIR" && node index.js) &
NODE_PID=$!

sleep 1
if kill -0 "$NODE_PID" 2>/dev/null; then
  log "✓ Servidor Excel activo  →  http://${LOCAL_IP}:3001/status"
else
  err "✗ El servidor Express no arrancó correctamente"
fi

# ── Servidor OCR Python (modo offline) ────────────────────────────────────────
if [ "$NO_OCR" != "--no-ocr" ]; then
  OCR_DIR="$SCRIPT_DIR/ocr_server"
  PYTHON_BIN=$(command -v python3 || command -v python || "")

  if [ -z "$PYTHON_BIN" ]; then
    warn "python3 no encontrado — servidor OCR offline no disponible"
  else
    # Check uvicorn
    if ! "$PYTHON_BIN" -c "import uvicorn" 2>/dev/null; then
      log "Instalando dependencias Python del servidor OCR..."
      "$PYTHON_BIN" -m pip install -r "$OCR_DIR/requirements.txt" --quiet
    fi

    log "Iniciando servidor OCR Python en puerto 8765..."
    (cd "$OCR_DIR" && "$PYTHON_BIN" -m uvicorn ocr_server:app \
      --host 0.0.0.0 --port 8765 --log-level warning) &
    OCR_PID=$!

    sleep 2
    if kill -0 "$OCR_PID" 2>/dev/null; then
      log "✓ Servidor OCR offline activo  →  http://${LOCAL_IP}:8765/status"
    else
      err "✗ El servidor OCR no arrancó — modo offline no disponible"
      OCR_PID=""
    fi
  fi
else
  warn "Servidor OCR omitido (--no-ocr)"
fi

# ── Resumen ────────────────────────────────────────────────────────────────────
echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}  BDTH App — Servidores locales${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  IP del PC:      ${YELLOW}${LOCAL_IP}${NC}"
echo -e "  Excel export:   http://${LOCAL_IP}:3001"
[ -n "$OCR_PID" ] && echo -e "  OCR offline:    http://${LOCAL_IP}:8765"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  Configura en la app:"
echo -e "    • IP servidor:    ${YELLOW}${LOCAL_IP}${NC}"
[ -n "$OCR_PID" ] && echo -e "    • IP OCR:         ${YELLOW}${LOCAL_IP}:8765${NC}"
echo ""
echo -e "  Pulsa ${RED}Ctrl+C${NC} para detener los servidores"
echo ""

wait
