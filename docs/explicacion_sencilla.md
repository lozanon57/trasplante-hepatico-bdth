# BDTH — Explicación para no técnicos
## ¿Qué es y cómo funciona la app de trasplante hepático?

---

## ¿Qué problema resuelve?

Cuando un hospital hace un trasplante de hígado, los médicos necesitan apuntar **muchísimos datos**: quién fue el donante, qué problemas tenía su hígado, quién recibió el órgano, cuánto tiempo estuvo el hígado sin sangre, si hubo complicaciones después... Todo eso se apuntaba en papel, en Excel, o en sistemas distintos que no hablaban entre sí.

**BDTH es una aplicación móvil** (para el móvil o tablet del médico) que centraliza toda esa información en un solo sitio, de forma ordenada, segura y siempre disponible, aunque no haya internet.

---

## ¿Cómo se usa? (el flujo básico)

### 1. Llega un donante
El cirujano abre la app y pulsa **"Nuevo caso"**. Escribe el número de historia clínica del donante y la app le asigna automáticamente un **código anónimo** (por ejemplo, `BDT-20260508-001`). El número real nunca se guarda en texto plano — se convierte en un código secreto que solo el médico puede descifrar con su PIN.

### 2. Rellena los datos del donante
Edad, peso, tipo de sangre, causa del fallecimiento, si tenía hipertensión o diabetes, resultados del análisis (sodio, transaminasas, creatinina), tipo de donación (DBD, DCD o HOPE), tiempo que el hígado estuvo en frío...

> **Truco de la cámara:** En lugar de teclear, el médico puede hacer una foto al informe del donante y la app lo lee automáticamente (OCR) y rellena los campos sola. Funciona con internet (usando inteligencia artificial) o sin internet (usando un programa en el ordenador del hospital).

### 3. Rellena los datos del receptor
Si el hígado se trasplanta, se añade el perfil del receptor: su enfermedad de base (cirrosis, CHC, fallo agudo...), su MELD (puntuación de gravedad), el tiempo total de isquemia, la técnica quirúrgica empleada...

> **Donante no válido:** Si el hígado no se trasplantó (rechazo del órgano), el caso se cierra como "donante no válido" y queda registrado igualmente para las estadísticas.

### 4. Postoperatorio
Días después, el médico completa el seguimiento: pico de transaminasas, si hubo disfunción del injerto (EAD), fallo primario (PNF), trombosis, complicaciones biliares, rechazo, días de ingreso, Clavien-Dindo...

### 5. Alertas automáticas
La app avisa en rojo si detecta algo preocupante, como sodio del donante muy alto, esteatosis severa, o incompatibilidad de grupo sanguíneo. El médico lo revisa y lo marca como resuelto.

---

## ¿Dónde se guardan los datos?

**En el propio teléfono / tablet.** No hay ningún servidor en la nube ni en internet. Los datos viven dentro del dispositivo del médico, cifrados. Esto tiene varias ventajas:

- **Funciona sin WiFi** — en quirófano, de guardia, en cualquier sitio
- **No sale ningún dato del hospital** — sin riesgo de brecha de datos externa
- **Cumple la LOPD / RGPD** — el NHC nunca viaja por internet

Cuando el médico quiere enviar los datos al sistema del hospital, exporta un **archivo Excel** y lo sube al servidor local del hospital por WiFi, sin pasar por internet.

---

## Las estadísticas

La pestaña de **Estadísticas** muestra, en tiempo real, lo que se va acumulando en la base de datos:

- Número total de trasplantes ese año
- Porcentaje de donantes DBD / DCD / HOPE
- MELD medio de los receptores
- Tiempo de isquemia fría medio
- Complicaciones más frecuentes (EAD, PNF, trombosis, biliar, rechazo)
- Mortalidad a 30 días
- Actividad mensual (gráfica de barras por mes)
- Distribución de Clavien-Dindo

Todo esto se genera al instante, sin exportar nada ni conectarse a nada.

---

## La seguridad y la anonimización

Este es uno de los puntos más importantes. La app trabaja siempre con **códigos anónimos**, no con nombres ni números de historia real. Así:

- En la lista de casos ves `BDT-20260508-001`, no el nombre del paciente
- En el Excel exportado solo aparece ese código
- Si alguien roba el teléfono, no puede leer nada sin el PIN maestro
- El PIN tiene protección contra intentos masivos (se bloquea 30 minutos tras 5 fallos)

Solo el médico que creó el caso (con su PIN) puede ver la correspondencia `código anónimo ↔ NHC real`.

---

## ¿Necesita internet?

| ¿Qué quieres hacer? | ¿Necesita internet? |
|---------------------|---------------------|
| Registrar un caso | NO |
| Ver estadísticas | NO |
| Buscar un paciente | NO |
| Exportar a Excel | NO |
| Usar OCR (leer foto) | Solo para el OCR con IA |
| Subir Excel al servidor del hospital | Solo la red WiFi local |

**Resumen: la app funciona perfectamente sin internet.** La inteligencia artificial (Claude Vision) es solo un extra opcional para leer fotos más rápido.

---

## El servidor local (para el hospital)

Si el hospital quiere tener una copia de los datos en su propio servidor (por ejemplo, para consolidar datos de varios cirujanos), hay un pequeño servidor incluido en la app que se ejecuta en un ordenador del hospital. El médico pulsa "Exportar y subir" en la app, y el Excel viaja directamente por la red WiFi interna del hospital al ordenador. Sin internet. Sin la nube.

---

## En resumen

> BDTH es como una **libreta médica digital, privada, siempre disponible y con estadísticas automáticas** para el programa de trasplante hepático del Gregorio Marañón. El médico apunta lo que pasa, la app organiza, avisa de problemas y genera los informes. Todo en el bolsillo del cirujano, sin depender de nadie.

---

---

## ¿Y las fotos y los PDFs? ¿También son seguros?

Sí. Esta es una pregunta importante y tiene una respuesta clara.

### El flujo de una foto (modo local recomendado)

Cuando el médico hace una foto al informe del donante, pasan estas cosas:

1. La foto va del móvil **al ordenador del hospital** por la red WiFi interna
2. Ese ordenador tiene un programa instalado (Tesseract) que lee el texto de la imagen
3. El ordenador devuelve los valores al móvil: sodio 142, transaminasas 55...
4. El móvil rellena el formulario con esos valores

En ningún momento la foto ha salido del hospital. Es exactamente igual que imprimir desde el móvil a una impresora de red.

### ¿Y si el médico sube un PDF?

Igual. El PDF va al ordenador del hospital por WiFi, un programa lo lee (PyMuPDF), extrae los valores y los devuelve al móvil. Cero bytes salen al exterior.

### ¿Existe algún modo que sí use internet?

Sí, existe una opción opcional (desactivada por defecto) que envía la imagen a la inteligencia artificial de Anthropic (Claude Vision) para un reconocimiento más preciso. Esta opción:
- Está **desactivada por defecto**
- Requiere activación explícita por el médico
- Muestra un aviso visible cuando está activa
- **No envía nunca el NHC ni el nombre del paciente** — solo la imagen del informe
- Cuesta aproximadamente 0,60 €/año para el volumen de trasplantes del Gregorio Marañón

La recomendación para el entorno clínico es mantenerla desactivada.

---

## Garantías para el equipo directivo y el DPD

| Garantía | Fundamento técnico |
|----------|-------------------|
| Ningún dato sale del hospital (modo local) | Sin llamadas de red a internet en el código de producción |
| El NHC nunca se almacena en texto plano | Hash SHA-256 + SALT único por dispositivo desde el primer momento |
| Solo el médico con su dispositivo y PIN puede ver los datos | Sin backend remoto, sin reset por correo, sin backdoor |
| Sin telemetría ni analytics | Verificable en código fuente — ningún SDK externo de tracking |
| Coste cero de infraestructura | Sin servidores cloud, sin licencias, sin contratos SaaS |
| Auditable en cualquier momento | Código fuente disponible para el Servicio de Informática o el DPD |

---

*Mayo 2026 — H. Gregorio Marañón · Unidad de Trasplante Hepático*
