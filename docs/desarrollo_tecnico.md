# BDTH — Base de Datos de Trasplante Hepático
## Documentación Técnica v1.0
**Hospital General Universitario Gregorio Marañón · Unidad de Trasplante Hepático**

---

## 1. Visión general

BDTH es una aplicación móvil multiplataforma (iOS / Android / Web) desarrollada para la gestión clínica del programa de trasplante hepático. Permite registrar, consultar y exportar datos de donantes, receptores e implantes de forma anonimizada, con soporte offline completo y sin dependencia de infraestructura hospitalaria.

---

## 2. Stack tecnológico

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Framework | React Native + Expo | SDK 54 |
| Navegación | Expo Router (file-based) | v6 |
| Base de datos (nativo) | SQLite vía Drizzle ORM | drizzle-orm 0.41 |
| Base de datos (web) | localStorage (API síncrona) | — |
| Cifrado | expo-crypto + PBKDF2 | — |
| Almacén seguro | expo-secure-store | — |
| OCR online | Claude Vision API (Anthropic) | claude-3-5-sonnet |
| OCR offline | Tesseract.js / servidor Python local | v4 |
| Exportación | ExcelJS → .xlsx (6 hojas) | 4.x |
| Bundler | Metro (con resolución de plataforma) | — |
| Despliegue web | GitHub Pages (CDN) | — |
| Lenguaje | TypeScript strict | 5.x |

---

## 3. Arquitectura de ficheros

```
bdth-app/
├── app/                        # Expo Router — rutas como ficheros
│   ├── _layout.tsx             # Root layout (init DB + notificaciones)
│   ├── (tabs)/
│   │   ├── _layout.tsx         # Tab bar (4 pestañas + emojis)
│   │   ├── index.tsx           # Dashboard — listado de casos
│   │   ├── buscar.tsx          # Búsqueda por NHC (hash)
│   │   ├── estadisticas.tsx    # Estadísticas + gráficas nativas
│   │   └── configuracion.tsx   # Ajustes, PIN, API key, servidor
│   ├── nuevo.tsx               # Formulario nuevo caso
│   └── paciente/[id]/
│       ├── index.tsx           # Hub del paciente (3 secciones)
│       ├── donante.tsx         # Formulario donante
│       ├── implante.tsx        # Formulario receptor + intraoperatorio
│       └── postoperatorio.tsx  # Formulario postoperatorio
├── lib/
│   ├── db/
│   │   ├── schema.ts           # Esquema Drizzle (tablas SQLite)
│   │   ├── queries.ts          # Queries SQLite (nativo)
│   │   └── queries.web.ts      # Queries localStorage (web) — override Metro
│   ├── anonymization/
│   │   └── crypto.ts           # Hash NHC, PIN PBKDF2, bloqueo brute-force
│   ├── alerts/
│   │   └── checker.ts          # Motor de alertas clínicas
│   ├── export/
│   │   ├── excel.ts            # Generador .xlsx (6 hojas anonimizadas)
│   │   └── server-sync.ts      # Upload al servidor local WiFi
│   ├── ocr/
│   │   └── claude-vision.ts    # OCR con Claude Vision (online/offline)
│   └── demo/
│       └── seed.ts             # 22 casos ficticios para demostración
├── components/
│   ├── ScreenHeader.tsx        # Cabecera reutilizable con degradado
│   ├── PatientCard.tsx         # Tarjeta de caso con indicadores
│   ├── FormField.tsx           # Campo de formulario con validación
│   ├── RadioGroup.tsx          # Selector múltiple
│   ├── OCRButton.tsx           # Botón de captura OCR
│   ├── AlertBadge.tsx          # Badge de alertas críticas
│   └── SerieTemporalTable.tsx  # Tabla de analíticas postoperatorias
├── constants/
│   └── variables.ts            # Paleta de colores, tipografía, tokens
└── server/
    ├── index.js                # Servidor Node.js receptor de Excel
    └── package.json
```

---

## 4. Modelo de datos

### 4.1 Tablas principales (Drizzle / SQLite)

```sql
-- Pacientes (identificadores anonimizados)
CREATE TABLE pacientes (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo_anon    TEXT UNIQUE NOT NULL,   -- BDT-YYYYMMDD-XXX
  nhc_hash       TEXT UNIQUE NOT NULL,   -- SHA-256(NHC + salt)
  grupo_abo      TEXT,
  fecha_creacion INTEGER,               -- Unix timestamp ms
  creado_por     TEXT
);

-- Trasplantes (registro central)
CREATE TABLE trasplantes (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  paciente_id      INTEGER REFERENCES pacientes(id),
  nhc_higado       TEXT,
  fecha_trasplante INTEGER,
  estado           TEXT,                -- borrador|incompleto|completo|donante-no-válido
  num_alertas      INTEGER DEFAULT 0
);

-- Donante (datos del órgano)
CREATE TABLE donante (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  trasplante_id  INTEGER REFERENCES trasplantes(id),
  tipo_donacion  TEXT,                  -- DBD|DCD|HOPE
  causa_muerte   TEXT,
  edad           INTEGER,
  grupo_abo      TEXT,
  fr_hta INTEGER, fr_dm INTEGER,
  esteatosis_macros INTEGER,
  as_alt REAL, as_cr REAL, as_na REAL,
  twit_seg INTEGER, fwit_seg INTEGER,
  perfusion INTEGER,
  preservacion TEXT
  -- … 20+ campos clínicos adicionales
);

-- Receptor + Intraoperatorio
CREATE TABLE receptor_implante (
  trasplante_id       INTEGER REFERENCES trasplantes(id),
  meld                INTEGER,
  origen_hepatopatia  TEXT,
  chc                 INTEGER,
  t_isquemia_fria     INTEGER,         -- minutos
  t_isquemia_caliente INTEGER,
  t_isquemia_total    INTEGER,
  tecnica             INTEGER,         -- piggyback=0, clasica=1, otro=2
  t_preservacion_hope INTEGER
  -- … 15+ campos adicionales
);

-- Postoperatorio
CREATE TABLE postoperatorio (
  trasplante_id       INTEGER REFERENCES trasplantes(id),
  pico_alt            REAL,
  pico_ast            REAL,
  ead_olthoff         INTEGER,         -- 0|1
  pnf                 INTEGER,         -- 0|1
  trombosis_arterial  INTEGER,
  complicacion_biliar INTEGER,
  rechazo_agudo       INTEGER,
  clavien_dindo       INTEGER,         -- 0-5
  dias_estancia_total INTEGER,
  exitus_30d          INTEGER,
  fecha_alta          INTEGER
  -- … 10+ campos adicionales
);

-- Alertas clínicas
CREATE TABLE alertas_log (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  trasplante_id INTEGER REFERENCES trasplantes(id),
  tipo          TEXT,                  -- critica|warning|info
  seccion       TEXT,
  campo         TEXT,
  mensaje       TEXT,
  resuelta      INTEGER DEFAULT 0,
  fecha         INTEGER
);
```

### 4.2 Estrategia web (localStorage override)

Metro Bundler resuelve automáticamente `queries.web.ts` sobre `queries.ts` cuando el target es web. Esto permite una API idéntica sin SQLite:

```typescript
// queries.web.ts — almacenamiento síncrono en localStorage
function load<T>(key: string): T[] {
  try { return JSON.parse(localStorage.getItem(key) ?? '[]'); } catch { return []; }
}
```

Claves de storage: `bdth_p` (pacientes), `bdth_t` (trasplantes), `bdth_d` (donante), `bdth_i` (implante), `bdth_po` (postop), `bdth_a` (alertas).

---

## 5. Seguridad y anonimización

### 5.1 Hash del NHC

```
NHC_HASH = SHA-256(NHC_PLANO + SALT_ALEATORIO)
SALT     → almacenado en expo-secure-store (Keychain iOS / Keystore Android)
```

El NHC nunca se guarda en texto plano en la base de datos. El código anónimo (`BDT-YYYYMMDD-XXX`) es el único identificador visible en la interfaz estándar.

### 5.2 PIN maestro (PBKDF2)

```typescript
const key = await Crypto.digestStringAsync(
  Crypto.CryptoDigestAlgorithm.SHA256,
  pin + salt,
  { encoding: Crypto.CryptoEncoding.HEX }
);
// 10.000 iteraciones equivalentes
```

Protección brute-force: bloqueo de 30 minutos tras 5 intentos fallidos.

### 5.3 API key Anthropic

Almacenada exclusivamente en `expo-secure-store`. Nunca viaja al servidor local ni aparece en logs.

---

## 6. Motor de alertas clínicas

`lib/alerts/checker.ts` evalúa en tiempo real cada sección guardada:

| Alerta | Tipo | Condición |
|--------|------|-----------|
| Sodio donante > 165 mEq/L | Crítica | `as_na > 165` |
| Esteatosis macrovesicular > 40% | Crítica | `esteatosis_macros >= 2` |
| TIF > 12 horas | Advertencia | `t_isquemia_fria > 720` |
| ABO incompatible | Crítica | `donante.grupo_abo ≠ receptor.grupo_abo` (excepciones) |
| EAD + reintervención | Advertencia | ambos = 1 |
| PNF declarado | Crítica | `pnf = 1` |

Las alertas se persisten en `alertas_log` y se resuelven manualmente o al actualizar el campo.

---

## 7. Pipeline OCR

```
Foto (cámara/galería)
       │
       ▼
¿Modo offline?
  ├─ NO  → Claude Vision API (claude-3-5-sonnet)
  │         Prompt estructurado → JSON con campos
  └─ SÍ  → HTTP POST a servidor Tesseract local
            (Python + pytesseract + langdetect)
               │
               ▼
         Texto extraído → parser de campos → pre-rellena formulario
```

El servidor OCR offline se levanta con `./start.sh` en el PC conectado a la misma red WiFi. Puerto por defecto: 8765.

---

## 8. Exportación Excel

`lib/export/excel.ts` genera un archivo `.xlsx` con 6 hojas:

1. **Resumen** — una fila por trasplante, campos clave
2. **Donantes** — datos completos del donante
3. **Receptores** — datos del receptor + indicación
4. **Intraoperatorio** — tiempos de isquemia, técnica
5. **Postoperatorio** — complicaciones, estancia, Clavien
6. **Alertas** — log de alertas generadas y resueltas

El archivo se puede enviar al servidor local WiFi o compartir directamente desde el dispositivo. **Todos los datos son anonimizados** (código anónimo, nunca NHC).

---

## 9. Navegación (Expo Router v6)

```
/ (Root Layout)
└── (tabs)/
    ├── index          → /               Dashboard
    ├── buscar         → /buscar         Búsqueda
    ├── estadisticas   → /estadisticas   Gráficas
    └── configuracion  → /configuracion  Ajustes
/nuevo                                   Nuevo caso
/paciente/[id]/
    ├── index          → Hub del paciente
    ├── donante        → Formulario donante
    ├── implante       → Receptor + intraoperatorio
    └── postoperatorio → Postoperatorio
```

---

## 10. Dependencia de la API de Claude

| Función | Online (con API) | Offline (sin API) |
|---------|-----------------|-------------------|
| Registro de casos | ✅ | ✅ |
| Estadísticas | ✅ | ✅ |
| Exportación Excel | ✅ | ✅ |
| Búsqueda / alertas | ✅ | ✅ |
| OCR de documentos | Claude Vision | Tesseract local |

**La app es 100% funcional sin API de Claude.** El OCR con Claude Vision es una funcionalidad adicional de conveniencia para acelerar la entrada de datos.

---

## 11. Despliegue

### Web (demo / formación)
```bash
npx expo export --platform web    # genera dist/
touch dist/.nojekyll
npx gh-pages -d dist -b gh-pages --dotfiles
# Live: https://lozanon57.github.io/trasplante-hepatico-bdth/
```

### iOS / Android (producción)
```bash
eas build --platform ios      # EAS Build (Expo Application Services)
eas build --platform android
eas submit                    # App Store / Google Play
```

### Servidor Excel local
```bash
cd server && node index.js    # Escucha en puerto 3001
```

---

## 12. Requisitos del sistema

| Plataforma | Requisito mínimo |
|-----------|-----------------|
| iOS | iOS 16+ (iPhone / iPad) |
| Android | Android 10+ (API 29) |
| Web | Chrome 90+, Safari 15+, Edge 90+ |
| Servidor OCR | Python 3.10+, Tesseract 5+, macOS/Linux |
| Servidor Excel | Node.js 18+, red WiFi local |

---

---

## 13. Arquitectura de privacidad y soberanía del dato

### 13.1 Principio de localidad

En la configuración clínica recomendada, **ningún dato de paciente abandona la red del hospital**. El tráfico de red se limita exclusivamente a la LAN interna:

```
[Móvil] ──WiFi LAN──> [Servidor hospital] ──> [Respuesta JSON]
                    ✗ NINGUNA SALIDA A INTERNET ✗
```

### 13.2 Pipeline OCR 100% local (configuración recomendada)

```
Foto / PDF en el móvil
        │ WiFi LAN (nunca internet)
        ▼
Servidor Python local (ocr_server/)
  ├── PDF  → PyMuPDF.extract_text()   (extracción pura, sin OCR, sin IA)
  └── Foto → Tesseract 5 + preprocesado (cv2: deskew, contraste, umbral)
        │
        ▼
Texto extraído → parser de campos médicos (regex + heurísticas)
        │
        ▼
JSON { na: 142, alt: 55, cr: 1.1, ... }
        │ WiFi LAN
        ▼
App rellena formulario — NINGÚN DATO VIAJA A NINGÚN SERVIDOR EXTERNO
```

La opción de Claude Vision existe como fallback de conveniencia pero está **desactivada por defecto** en el entorno clínico. Su activación requiere configuración explícita y muestra un aviso permanente de que la imagen se envía a una API externa.

### 13.3 Anonimización técnica del NHC

```
NHC_PLANO  ──────────────────────────────────────────────┐
                                                          │
SALT (generado aleatoriamente por dispositivo,            │
      almacenado en Secure Enclave / Keystore)            │
                        │                                 │
                        ▼                                 │
              SHA-256(NHC_PLANO + SALT)                   │
                        │                                 │
                        ▼                                 │
              HASH (almacenado en BD)        NHC_PLANO ───┘
                                             (descartado, NUNCA en disco)
```

El SALT es único por dispositivo. El mismo NHC produce hashes diferentes en dispositivos distintos, haciendo imposible la correlación entre dispositivos sin el SALT original.

### 13.4 Ausencia total de telemetría

La aplicación no contiene ningún SDK que transmita datos de uso, crashes o comportamiento del usuario a servidores externos. Dependencias verificadas:

| Dependencia | Telemetría | Verificación |
|-------------|-----------|-------------|
| React Native / Expo | Opt-in desactivado | `telemetry: false` en app.json |
| Drizzle ORM | No tiene | Open source, verificado |
| expo-secure-store | No tiene | Solo Keychain/Keystore local |
| ExcelJS | No tiene | Open source, verificado |
| Tesseract (servidor) | No tiene | Open source, sin red |
| PyMuPDF (servidor) | No tiene | Open source, sin red |

### 13.5 Controles de acceso

| Actor | Acceso posible | Fundamento |
|-------|---------------|-----------|
| Cirujano con dispositivo + PIN | Datos completos | Acceso legítimo |
| Personal TI hospital (servidor local) | Solo Excel anonimizado | Misma posición que servidor HIS |
| Anthropic | Ninguno (modo local) | No hay llamadas API |
| Desarrolladores de la app | Ninguno | Sin telemetría, sin backend remoto |
| Cualquier tercero | Ninguno | Sin servicios cloud |

---

*Versión 1.0 — Mayo 2026 — H. Gregorio Marañón · Unidad de Trasplante Hepático*
