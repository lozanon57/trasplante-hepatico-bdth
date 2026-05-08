# BDTH App — Base de Datos Trasplante Hepático
## Hospital Universitario Gregorio Marañón · Madrid

Aplicación móvil para captura, gestión y exportación de datos clínicos de trasplante hepático.

---

## Instalación rápida

### Requisitos
- Node.js 18+
- Expo Go instalado en iOS/Android
- PC en la misma red WiFi que los móviles (para el servidor local)

### 1. Móvil (iOS / Android)
```bash
cd bdth-app
npm install
npx expo start
# Escanear QR con Expo Go
```

### 2. Servidor local (PC del servicio)
```bash
cd bdth-app/server
npm install
npm start
# Anota la IP que aparece en la pantalla del PC
```

---

## Primer uso (obligatorio)

1. **Configuración → Mi nombre** — introduce tu nombre (cirujano activo)
2. **Configuración → API Key Anthropic** — pega tu API Key de [anthropic.com/api](https://www.anthropic.com/api)
3. **Configuración → PIN maestro** — configura un PIN de mínimo 4 dígitos (protege acceso a NHC)
4. **Configuración → IP servidor** — introduce la IP del PC que ejecuta `npm start` en `/server`

---

## Flujo de uso

### Nuevo caso
1. Dashboard → **+** (botón verde inferior)
2. Introduce el NHC del receptor → se genera código anónimo `BDT-XXXXXXXX`
3. Selecciona la sección a rellenar: **Donante / Implante / Postoperatorio**

### Captura OCR del formulario en papel
1. En cualquier formulario → pulsa **📷 Fotografiar** o **📄 PDF / Galería**
2. La IA (Claude Vision) lee tanto texto impreso como escritura a mano
3. Revisa los campos extraídos en verde/amarillo/gris
4. Corrige si es necesario → **Guardar**

### Flujo completo de un trasplante
```
Nuevo caso → Donante (pág. 1) → Implante (pág. 2) → Postoperatorio (pág. 3) → ✅ Caso completo
```

### Exportar base de datos
1. **Configuración → Exportar Excel y subir**
2. El archivo `.xlsx` se guarda en el móvil Y se sube al servidor local
3. En el PC: abrir `bdth-app/server/uploads/BDTH_YYYY-MM-DD.xlsx`

---

## Seguridad y privacidad

| Elemento | Implementación |
|---|---|
| NHC | Nunca se almacena en texto plano. Solo existe el SHA256 del NHC |
| Código anónimo | `BDT-XXXXXXXX` — generado con SHA256(NHC + salt único del dispositivo) |
| Salt del dispositivo | Generado aleatoriamente al instalar, guardado en SecureStore |
| PIN maestro | SHA256 del PIN en SecureStore. Máx. 3 intentos, bloqueo 1h |
| API Key | SecureStore (encriptado por el SO) |
| Excel exportado | Solo contiene códigos anónimos, nunca NHC |
| Offline | Funciona sin internet (solo el OCR necesita conexión) |
| CORS servidor | Solo acepta conexiones desde redes locales (192.168.x / 10.x) |

### ⚠️ Importante al reinstalar la app
Al reinstalar, el salt se pierde y los códigos anónimos anteriores no coincidirán con los nuevos.
Antes de reinstalar: **Configuración → exportar backup del salt** (protegido por PIN).

---

## Estructura del proyecto

```
bdth-app/
├── app/
│   ├── (tabs)/
│   │   ├── index.tsx              # Dashboard principal
│   │   ├── buscar.tsx             # Búsqueda por NHC o código
│   │   └── configuracion.tsx      # Ajustes, API Key, PIN, export
│   ├── paciente/[id]/
│   │   ├── donante.tsx            # Formulario pág. 1
│   │   ├── implante.tsx           # Formulario pág. 2
│   │   └── postoperatorio.tsx     # Formulario pág. 3
│   ├── nuevo.tsx                  # Crear nuevo caso
│   └── _layout.tsx
├── lib/
│   ├── db/
│   │   ├── schema.ts              # Esquema completo SQLite (Drizzle ORM)
│   │   └── queries.ts             # CRUD + helpers
│   ├── ocr/
│   │   └── claude-vision.ts       # Claude Vision API — OCR manuscrito + impreso
│   ├── anonymization/
│   │   └── crypto.ts              # Anonimización reversible + PIN maestro
│   ├── alerts/
│   │   └── checker.ts             # Alertas de campos vacíos + seguimiento + críticas
│   └── export/
│       ├── excel.ts               # Generador .xlsx con 6 hojas
│       └── server-sync.ts         # Upload al servidor local
├── components/
│   ├── FormField.tsx              # Input con label, hint, indicador
│   ├── RadioGroup.tsx             # Selector 0/1/2/3 estilo BDTH
│   ├── SerieTemporalTable.tsx     # Tabla BASAL/+1H…/FIN y 1DPO–7DPO
│   ├── AlertBadge.tsx             # Badge de alertas
│   ├── OCRButton.tsx              # Botones Cámara + Galería/PDF
│   └── PatientCard.tsx            # Tarjeta caso en dashboard
├── server/
│   ├── index.js                   # Servidor Express local
│   └── package.json
└── constants/
    └── variables.ts               # Colores, etiquetas, opciones de formulario
```

---

## Variables de la base de datos

### Tabla `pacientes`
- `codigo_anon` — código visible en la app (BDT-XXXXXXXX)
- `nhc_hash` — SHA256 del NHC para búsqueda por hash
- `grupo_abo`, `fecha_creacion`, `creado_por`

### Tabla `donante` (pág. 1)
- Datos biométricos, causa de muerte, factores de riesgo
- Analítica basal, tipo de donación, tiempos (TWIT/FWIT)
- Series temporales: sangre (BASAL/+1H/+1H30/+2H) × pH/Lact/ALT/AST/GGT/Bi/INR/BNP/Trop
- Bilis +2H, perfusión normotérmica (Organox)

### Tabla `receptor_implante` (pág. 2)
- Datos receptor, hepatopatía, MELD, analítica basal
- Técnica implante, tiempos de isquemia, flujos
- Serie intraoperatoria (BASAL→+8H→FIN): producción bilis, flujos, aspecto hígado
- Perfusión hipotérmica HOPE

### Tabla `postoperatorio` (pág. 3)
- Pico analítica 7 días, disfunción primaria (Olthoff)
- Serie DPO (1º–7º día): Bi/INR/ALT/AST/GGT/FA/Cr
- Complicaciones quirúrgicas, alta, morbilidad (Clavien-Dindo)
- Seguimiento: éxitus 7d/30d, pérdida injerto, retrasplante, RM 6m, colangiopatías

---

## Alertas automáticas

| Tipo | Condición | Color |
|---|---|---|
| Campo vacío | Campo crítico sin rellenar | 🟡 Amarillo |
| Seguimiento | 7d / 30d / 6m sin registrar | 🟡 Amarillo |
| Revisión | >90 días sin actualizar | 🟡 Amarillo |
| CRÍTICA | PNF sin retrasplante / Trombosis sin reintervención / Éxitus sin documentar | 🔴 Rojo |

Las notificaciones push se programan automáticamente a los 7, 30 y 180 días del trasplante.

---

## Excel exportado — 6 hojas

1. **Trasplantes** — resumen general (código, fecha, estado, alertas)
2. **Donantes** — todos los campos de la pág. 1 + series temporales
3. **Receptores_Implante** — pág. 2 completa + HOPE
4. **Postoperatorio** — pág. 3 completa
5. **Seguimiento** — éxitus, pérdidas, retrasplante, colangiopatías
6. **Alertas_Pendientes** — solo casos con alertas sin resolver

Características del Excel:
- Primera fila fija + filtros automáticos
- Fila roja si éxitus global = 1
- Fila amarilla si hay alertas pendientes
- Columna A siempre = código anónimo (nunca NHC)

---

*BDTH App v1.0 — Mayo 2026*
*Hospital Universitario Gregorio Marañón · Servicio de Cirugía de Trasplante Hepático*
