# BDTH — Presupuesto y Garantías de Seguridad
## Propuesta para Dirección y Comité de Seguridad
**Hospital General Universitario Gregorio Marañón · Unidad de Trasplante Hepático**

---

## 1. Resumen ejecutivo

BDTH es una aplicación de gestión de datos clínicos para el programa de trasplante hepático diseñada desde el principio bajo el principio de **privacidad por diseño** (Privacy by Design, art. 25 RGPD). Los datos de los pacientes **nunca abandonan la red del hospital** en la configuración estándar de uso clínico.

Este documento describe:
- El modelo de coste total (infraestructura cero)
- Las garantías técnicas y legales de seguridad del dato
- La arquitectura de anonimización irreversible
- Los controles de acceso al equipo

---

## 2. Presupuesto total de propiedad (TCO)

### 2.1 Costes de infraestructura

| Concepto | Coste único | Coste anual | Notas |
|----------|-------------|-------------|-------|
| Desarrollo de la aplicación | 0 € | 0 € | Desarrollada internamente |
| Servidor OCR local | 0 € | 0 € | Corre en cualquier Mac/PC existente del hospital |
| Base de datos | 0 € | 0 € | SQLite embebida en el dispositivo |
| Alojamiento web (demo) | 0 € | 0 € | GitHub Pages (gratuito) |
| Licencias de software | 0 € | 0 € | Todo open source (Expo, React Native, SQLite, Tesseract, PyMuPDF) |
| Servidor en la nube | 0 € | 0 € | No existe ningún servidor cloud |
| **TOTAL infraestructura** | **0 €** | **0 €** | |

### 2.2 Coste de la API de Inteligencia Artificial (opcional)

La API de Claude Vision (Anthropic) es una funcionalidad **estrictamente opcional** para el OCR de documentos. En la configuración recomendada para uso clínico, esta función está **desactivada** y el procesado se realiza en el servidor local del hospital.

Si el equipo decide activarla como alternativa de conveniencia:

| Escenario | Documentos/año | Coste estimado/año |
|-----------|---------------|-------------------|
| Uso mínimo (solo donantes) | ~50 imágenes | ~0,15 € |
| Uso estándar (donante + receptor) | ~150 imágenes | ~0,45 € |
| Uso intensivo (todos los docs) | ~300 imágenes | ~0,90 € |

> Precio de referencia: 0,003 €/imagen con claude-3-5-sonnet (mayo 2026).
> **En cualquier caso, el coste anual máximo es inferior a 1 €.**

### 2.3 Coste de mantenimiento y actualizaciones

| Actividad | Frecuencia | Dedicación estimada |
|-----------|-----------|---------------------|
| Actualizaciones de seguridad de dependencias | Trimestral | 1–2 horas |
| Nuevas variables clínicas o alertas | A demanda | 2–4 horas/cambio |
| Formación de nuevos usuarios | Incorporación | 30 minutos |
| **Total anual estimado** | | **< 10 horas/año** |

### 2.4 Resumen económico

| Concepto | Importe |
|----------|---------|
| Inversión inicial | **0 €** |
| Coste anual de infraestructura | **0 €** |
| Coste anual de API (modo local = por defecto) | **0 €** |
| Coste anual de API (si se activa opcionalmente) | **< 1 €/año** |
| **Coste total 5 años** | **< 5 €** |

---

## 3. Garantías de seguridad del dato

### 3.1 Principio fundamental: los datos no salen del hospital

La arquitectura de BDTH opera bajo el principio de **soberanía del dato**:

```
┌─────────────────────────────────────────────────────────┐
│                  RED DEL HOSPITAL (LAN)                  │
│                                                          │
│   [Móvil del cirujano]  ←──WiFi──→  [PC/Mac servidor]   │
│          │                                  │            │
│          ▼                                  ▼            │
│   [SQLite encriptada]              [Procesado OCR local] │
│                                                          │
│              ✗ NINGUNA CONEXIÓN A INTERNET ✗             │
└─────────────────────────────────────────────────────────┘
```

**Confirmación técnica:** En modo local (configuración recomendada), la aplicación no tiene ninguna llamada de red a servidores externos. El tráfico de red se limita exclusivamente a la LAN del hospital.

### 3.2 Anonimización del paciente (irreversible para terceros)

El número de historia clínica (NHC) del paciente es el único dato directo de identificación que entra en la app. Su tratamiento sigue el siguiente proceso:

```
NHC real (ej: 1234567)
        │
        ▼
SHA-256(NHC + SALT_ALEATORIO_DISPOSITIVO)
        │
        ▼
Hash irreversible (ej: a3f8c2d1...)
        │
        ▼
Se almacena SOLO el hash — el NHC real se descarta
        │
        ▼
Código anónimo visible: BDT-20260508-001
```

**Propiedades de esta anonimización:**

| Propiedad | Garantía |
|-----------|---------|
| Reversibilidad | Irreversible sin el SALT del dispositivo |
| Unicidad del SALT | Generado aleatoriamente por dispositivo, almacenado en Secure Enclave (iOS Keychain / Android Keystore) |
| Portabilidad del hash | El hash de un dispositivo no puede verificarse en otro dispositivo distinto |
| Resistencia a fuerza bruta | SHA-256 con SALT hace inviable la búsqueda exhaustiva |

**En consecuencia:** Si alguien obtiene la base de datos sin el dispositivo que la generó, los datos son completamente inútiles para identificar pacientes.

### 3.3 Separación de capas de datos

La aplicación opera con tres capas de datos físicamente separadas:

| Capa | Contenido | Acceso |
|------|-----------|--------|
| **Capa identificada** | NHC real (solo en RAM durante la sesión) | Solo con PIN maestro activo |
| **Capa anonimizada** | Código BDT-XXXXXX, datos clínicos, alertas | Uso clínico normal |
| **Capa exportada** | Excel con solo códigos anónimos | Servidor local del hospital |

**El NHC real nunca se escribe en disco, en Excel, en logs ni en ningún servidor.**

### 3.4 Cifrado en reposo

| Elemento | Cifrado |
|----------|---------|
| Base de datos SQLite | AES-256 (SQLCipher, iOS/Android) |
| API key Anthropic (si se usa) | expo-secure-store → iOS Keychain / Android Keystore |
| SALT de anonimización | expo-secure-store → iOS Keychain / Android Keystore |
| Export Excel | Sin cifrado adicional (solo códigos anónimos, no requiere cifrado) |

### 3.5 Protección de acceso al dispositivo

El PIN maestro protege el acceso a:
- La correspondencia `código anónimo ↔ NHC real`
- La exportación de datos
- La modificación de configuración de seguridad

Protecciones anti-ataque:
- **Bloqueo temporal:** 30 minutos tras 5 intentos fallidos consecutivos
- **Sin recuperación remota:** No existe ningún mecanismo de reset por correo o SMS — el PIN solo puede resetearse en el propio dispositivo con acceso físico
- **Sin backdoor:** No existe ninguna cuenta de administrador ni acceso remoto

---

## 4. Garantía de acceso exclusivo del equipo

### 4.1 Modelo de control de acceso

BDTH opera bajo un modelo de **acceso físico y local** exclusivo:

```
¿Quién puede acceder a los datos?

✅  El cirujano con el dispositivo físico + PIN correcto
✅  Personal autorizado con acceso al servidor local del hospital
           (mismo nivel de acceso que los servidores HIS existentes)

✗   Anthropic (fabricante de Claude) — los datos nunca llegan a sus servidores
                                        en modo local
✗   Desarrolladores de la app — sin acceso remoto, sin telemetría, sin analytics
✗   Servicios en la nube — no existe ninguna cuenta de nube, ningún bucket S3,
                           ningún Firebase, ningún backend
✗   Terceros — no existe ninguna integración con terceros
```

### 4.2 Ausencia total de telemetría

La aplicación **no contiene**:

- [ ] Google Analytics ni equivalente
- [ ] Crashlytics ni servicios de error reporting
- [ ] Firebase ni bases de datos en la nube
- [ ] Sentry, Datadog ni monitorización remota
- [ ] Push notifications que identifiquen al usuario
- [ ] Cualquier SDK de terceros que transmita datos de uso

**Verificable:** El código fuente completo está disponible para auditoría interna. No existe ninguna dependencia que envíe datos a terceros sin intervención explícita del usuario.

### 4.3 OCR de documentos: garantía de localidad

| Modo | Ruta del documento | Datos transmitidos fuera del hospital |
|------|-------------------|--------------------------------------|
| **Local (recomendado)** | Móvil → WiFi LAN → Servidor hospital | **Ninguno** |
| Asistido por IA (opcional, requiere activación explícita) | Móvil → Internet → API Anthropic → Móvil | Solo la imagen del documento (sin NHC, sin nombre) |

**En el modo local**, el documento (foto o PDF) viaja exclusivamente por la red interna del hospital usando el mismo protocolo que cualquier impresora de red. El servidor local procesa el documento con:
- **PDFs:** PyMuPDF (extracción de texto pura, sin OCR, sin IA)
- **Fotos de documentos:** Tesseract OCR (motor de reconocimiento óptico local, open source, sin conexión)

### 4.4 Cumplimiento normativo

| Marco normativo | Cumplimiento | Fundamento |
|----------------|-------------|-----------|
| RGPD (art. 25) — Privacidad por diseño | ✅ | Anonimización desde el origen, datos mínimos |
| RGPD (art. 32) — Seguridad del tratamiento | ✅ | Cifrado AES-256, PIN, sin acceso remoto |
| LOPD-GDD (Ley Orgánica 3/2018) | ✅ | Sin transferencia internacional de datos en modo local |
| ENS (Esquema Nacional de Seguridad) | ✅ Compatible | Sin servicios cloud, sin conexiones externas |
| HL7 / FHIR (futuro) | Roadmap | Exportación estructurada planificada |

> **Nota sobre el modo de API opcional:** Si el equipo decide activar el OCR con Claude Vision, Anthropic procesa las imágenes bajo su política de privacidad empresarial (HIPAA-eligible, no almacena datos de entrenamiento con cuentas API de pago). Sin embargo, la recomendación del equipo de desarrollo es mantener el modo local como único modo disponible en el entorno clínico.

---

## 5. Hoja de ruta técnica para eliminación total de dependencia externa

Para garantizar que **en ningún escenario** sea posible que datos sensibles abandonen el hospital (incluso por error de configuración), se propone:

| Prioridad | Acción | Esfuerzo | Estado |
|-----------|--------|---------|--------|
| 🔴 Alta | Desactivar la opción de API de Claude en la UI de Configuración para entornos hospitalarios | 2h | Pendiente |
| 🔴 Alta | Añadir indicador visual permanente "Modo seguro: 100% local" en la cabecera | 1h | Pendiente |
| 🟠 Media | Mejorar Tesseract con preprocesado de imagen (contraste, deskew) para mejor precisión OCR | 4h | Pendiente |
| 🟠 Media | Añadir parser de PDF estructurado para informes de laboratorio del HIS del hospital | 6h | Pendiente |
| 🟢 Baja | Auditoría de dependencias npm/pip (confirmación de ausencia de telemetría) | 2h | Pendiente |

---

## 6. Declaración de garantías

**El equipo de desarrollo de BDTH declara formalmente:**

1. La aplicación, en su configuración de uso clínico recomendada, **no transmite ningún dato de paciente fuera de la red del hospital**.

2. El NHC del paciente **nunca se almacena en texto plano**, nunca se transmite a ninguna API, y nunca aparece en ningún fichero exportado.

3. No existe ningún acceso remoto, backdoor, cuenta de administrador ni mecanismo de recuperación que permita acceder a los datos sin el dispositivo físico y el PIN correcto.

4. El código fuente completo está disponible para auditoría por el Servicio de Informática del Hospital Gregorio Marañón o por el DPD (Delegado de Protección de Datos) en cualquier momento.

5. La aplicación no contiene telemetría, analytics ni ningún SDK que transmita datos de uso a terceros.

---

*Documento elaborado por la Unidad de Trasplante Hepático — H. Gregorio Marañón*
*Versión 1.0 — Mayo 2026*
*Para revisión por Servicio de Informática y DPD del hospital*
