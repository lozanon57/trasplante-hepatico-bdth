# BDTH OCR Server — Guía de instalación
## Para el Servicio de Informática · H. Gregorio Marañón

---

## ¿Qué es esto?

Un servidor que corre en **un Mac o PC del hospital** y permite que la app BDTH
lea fotos y PDFs de formularios de trasplante sin enviar ningún dato a internet.

El móvil del médico envía la foto por la red WiFi del hospital a este servidor.
El servidor extrae los campos clínicos y los devuelve al móvil.
**Ningún dato sale del hospital.**

---

## Requisitos

| Requisito | Mínimo | Recomendado |
|-----------|--------|-------------|
| Sistema operativo | macOS 12+ o Ubuntu 22+ | macOS 14+ |
| RAM | 4 GB | 8 GB |
| Espacio en disco | 2 GB (dependencias) | 5 GB |
| Red | WiFi o Ethernet en la misma red que los móviles | — |
| Conexión a internet | Solo para la instalación inicial | — |

> El Mac puede ser cualquier equipo del hospital que esté encendido durante las guardias.
> Un Mac mini es suficiente. No necesita pantalla si se accede por SSH.

---

## Instalación (una sola vez)

### macOS

```bash
# 1. Abrir Terminal

# 2. Instalar Homebrew si no está instalado
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 3. Instalar Tesseract (motor OCR) con idioma español
brew install tesseract tesseract-lang

# 4. Clonar o copiar la carpeta ocr_server/ en el Mac
#    (copiar desde USB, desde el repositorio GitHub, o por AirDrop)
#    Ejemplo si se clona el repo:
git clone https://github.com/lozanon57/trasplante-hepatico-bdth.git
cd trasplante-hepatico-bdth/ocr_server

# 5. Dar permisos al script
chmod +x start.sh stop.sh

# 6. Arrancar
./start.sh
```

### Ubuntu / Linux

```bash
# Instalar Tesseract con español
sudo apt-get update
sudo apt-get install -y tesseract-ocr tesseract-ocr-spa python3 python3-venv

# Clonar repo y arrancar
git clone https://github.com/lozanon57/trasplante-hepatico-bdth.git
cd trasplante-hepatico-bdth/ocr_server
chmod +x start.sh stop.sh
./start.sh
```

---

## Uso diario

### Arrancar el servidor

```bash
cd trasplante-hepatico-bdth/ocr_server
./start.sh
```

Al arrancar muestra la IP que hay que poner en la app:

```
╔══════════════════════════════════════════════════════╗
║  ✅  SERVIDOR OCR ACTIVO                             ║
╠══════════════════════════════════════════════════════╣
║                                                      ║
║  Pon esta dirección en la app:                       ║
║    👉  192.168.1.45:8765                             ║
║                                                      ║
║  (Configuración → IP:puerto del servidor OCR)        ║
╚══════════════════════════════════════════════════════╝
```

### Parar el servidor

```bash
./stop.sh
```

---

## Configurar la app (hacerlo una sola vez en cada móvil)

1. Abrir la app BDTH en el móvil
2. Ir a **Configuración → OCR offline (Tesseract)**
3. Activar **Modo offline**
4. Introducir la IP del servidor: `192.168.1.45:8765`
   (la IP que mostró el start.sh — puede cambiar si el Mac no tiene IP fija)
5. Pulsar **Ping** para verificar que conecta
6. Pulsar **Guardar configuración OCR**

> **Consejo:** Pide al Servicio de Informática que asigne una IP fija (estática)
> al Mac del servidor en el router del hospital. Así la IP nunca cambia y no
> hay que reconfigurar la app.

---

## Arranque automático al encender el Mac (opcional)

Para que el servidor arranque solo cuando se enciende el Mac, sin necesidad de
abrir Terminal:

```bash
# Crear el LaunchAgent (solo macOS)
cat > ~/Library/LaunchAgents/es.hgm.bdth-ocr.plist << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>es.hgm.bdth-ocr</string>
    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>$HOME/trasplante-hepatico-bdth/ocr_server/start.sh</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>$HOME/trasplante-hepatico-bdth/ocr_server/launchd.log</string>
    <key>StandardErrorPath</key>
    <string>$HOME/trasplante-hepatico-bdth/ocr_server/launchd.log</string>
</dict>
</plist>
EOF

# Activar
launchctl load ~/Library/LaunchAgents/es.hgm.bdth-ocr.plist
```

---

## Verificar que funciona

Desde cualquier dispositivo en la misma red:

```bash
curl http://192.168.1.45:8765/status
# Respuesta esperada: {"ok":true,"service":"BDTH Offline OCR","version":"1.0.0"}
```

O desde el navegador: `http://192.168.1.45:8765/status`

---

## Seguridad

- El servidor **solo acepta conexiones desde la red local** (192.168.x.x, 10.x.x.x)
- Conexiones desde internet son rechazadas automáticamente
- El detector de PII redacta nombres y NHCs del texto OCR antes de devolverlos
- No hay autenticación necesaria (la red del hospital ya actúa como barrera)
- No se guarda ningún dato en el servidor — cada petición es stateless

---

## Resolución de problemas

| Síntoma | Causa probable | Solución |
|---------|---------------|---------|
| `./start.sh` da error de Python | Python 3 no instalado | `brew install python3` |
| `Tesseract not found` | Tesseract no instalado | `brew install tesseract tesseract-lang` |
| La app dice "Servidor OCR no disponible" | IP incorrecta o Mac apagado | Verificar IP con `./start.sh`, comprobar que el Mac está encendido |
| OCR devuelve campos vacíos | Imagen de baja calidad | Mejorar iluminación, mantener el móvil estable al fotografiar |
| El servidor arranca pero la app no conecta | Firewall del Mac bloqueando | Sistema → Privacidad y Seguridad → Firewall → Permitir python3 |

---

*BDTH — Base de Datos de Trasplante Hepático · H. Gregorio Marañón · Mayo 2026*
