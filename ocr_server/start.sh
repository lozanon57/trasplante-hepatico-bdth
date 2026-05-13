#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# BDTH OCR Server — Script de arranque
# Hospital Gregorio Marañón · Unidad de Trasplante Hepático
#
# USO:
#   chmod +x start.sh   (solo la primera vez)
#   ./start.sh
#
# El servidor arranca en el puerto 8765 y acepta conexiones de la red local.
# La IP de este Mac se mostrará al arrancar — ponla en la app (Configuración).
# ─────────────────────────────────────────────────────────────────────────────

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_DIR="$SCRIPT_DIR/.venv"
LOG_FILE="$SCRIPT_DIR/server.log"
PID_FILE="$SCRIPT_DIR/server.pid"
PORT=8765

# ── Colores ───────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     BDTH OCR Server · H. Gregorio Marañón           ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════╝${NC}"
echo ""

# ── Comprobar si ya está corriendo ────────────────────────────────────────────
if [ -f "$PID_FILE" ]; then
    OLD_PID=$(cat "$PID_FILE")
    if kill -0 "$OLD_PID" 2>/dev/null; then
        echo -e "${YELLOW}⚠️  El servidor ya está corriendo (PID $OLD_PID)${NC}"
        echo ""
        IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "desconocida")
        echo -e "${GREEN}✅  Servidor activo en: http://${IP}:${PORT}${NC}"
        echo -e "    Pon esta IP en la app (Configuración → IP:puerto del servidor OCR)"
        echo ""
        exit 0
    fi
fi

# ── Python ────────────────────────────────────────────────────────────────────
if ! command -v python3 &>/dev/null; then
    echo -e "${RED}❌  Python 3 no encontrado.${NC}"
    echo "    Instálalo desde: https://www.python.org/downloads/"
    exit 1
fi

PYTHON_VERSION=$(python3 -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')")
echo -e "  Python ${PYTHON_VERSION} detectado"

# ── Tesseract ─────────────────────────────────────────────────────────────────
if ! command -v tesseract &>/dev/null; then
    echo -e "${YELLOW}⚠️  Tesseract no encontrado. Instalando...${NC}"
    if command -v brew &>/dev/null; then
        brew install tesseract tesseract-lang
    else
        echo -e "${RED}❌  Homebrew no encontrado. Instala Tesseract manualmente:${NC}"
        echo "    brew install tesseract tesseract-lang"
        echo "    (instala Homebrew primero: https://brew.sh)"
        exit 1
    fi
fi
echo -e "  Tesseract $(tesseract --version 2>&1 | head -1 | awk '{print $2}') detectado"

# ── Entorno virtual ───────────────────────────────────────────────────────────
if [ ! -d "$VENV_DIR" ]; then
    echo ""
    echo -e "${YELLOW}📦  Primera instalación — creando entorno virtual...${NC}"
    python3 -m venv "$VENV_DIR"
    source "$VENV_DIR/bin/activate"
    echo "    Instalando dependencias (puede tardar 2-3 minutos la primera vez)..."
    pip install --upgrade pip -q
    pip install -r "$SCRIPT_DIR/requirements.txt" -q
    echo -e "${GREEN}  ✅  Dependencias instaladas${NC}"
else
    source "$VENV_DIR/bin/activate"
fi

# ── Obtener IP local ──────────────────────────────────────────────────────────
IP=$(ipconfig getifaddr en0 2>/dev/null || \
     ipconfig getifaddr en1 2>/dev/null || \
     ipconfig getifaddr en2 2>/dev/null || \
     python3 -c "import socket; s=socket.socket(); s.connect(('8.8.8.8',80)); print(s.getsockname()[0]); s.close()" 2>/dev/null || \
     echo "127.0.0.1")

# ── Arrancar servidor ─────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}🚀  Arrancando servidor OCR...${NC}"
echo ""

cd "$SCRIPT_DIR"
nohup python3 -m uvicorn ocr_server:app \
    --host 0.0.0.0 \
    --port "$PORT" \
    --log-level warning \
    > "$LOG_FILE" 2>&1 &

SERVER_PID=$!
echo $SERVER_PID > "$PID_FILE"

# Esperar hasta 10 segundos a que arranque
for i in {1..10}; do
    sleep 1
    if curl -s "http://localhost:${PORT}/status" >/dev/null 2>&1; then
        break
    fi
    if ! kill -0 "$SERVER_PID" 2>/dev/null; then
        echo -e "${RED}❌  El servidor falló al arrancar. Revisa el log:${NC}"
        echo "    cat $LOG_FILE"
        rm -f "$PID_FILE"
        exit 1
    fi
done

# Verificar que responde
if ! curl -s "http://localhost:${PORT}/status" >/dev/null 2>&1; then
    echo -e "${RED}❌  El servidor no responde tras 10 segundos.${NC}"
    echo "    Log: cat $LOG_FILE"
    rm -f "$PID_FILE"
    exit 1
fi

echo -e "${GREEN}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✅  SERVIDOR OCR ACTIVO                             ║${NC}"
echo -e "${GREEN}╠══════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║                                                      ║${NC}"
echo -e "${GREEN}║  Pon esta dirección en la app:                       ║${NC}"
printf "${GREEN}║  %-52s║${NC}\n" "  👉  ${IP}:${PORT}"
echo -e "${GREEN}║                                                      ║${NC}"
echo -e "${GREEN}║  (Configuración → IP:puerto del servidor OCR)        ║${NC}"
echo -e "${GREEN}║                                                      ║${NC}"
echo -e "${GREEN}║  Para parar: ./stop.sh  o  kill \$(cat server.pid)    ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════╝${NC}"
echo ""
echo "  Log: tail -f $LOG_FILE"
echo ""
