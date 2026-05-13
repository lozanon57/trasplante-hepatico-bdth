#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$SCRIPT_DIR/server.pid"

if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if kill -0 "$PID" 2>/dev/null; then
        kill "$PID"
        rm -f "$PID_FILE"
        echo "✅  Servidor BDTH OCR detenido (PID $PID)"
    else
        echo "⚠️  El proceso $PID ya no existe"
        rm -f "$PID_FILE"
    fi
else
    echo "⚠️  No se encontró server.pid — el servidor puede no estar corriendo"
fi
