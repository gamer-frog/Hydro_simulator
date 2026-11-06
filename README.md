# PlayGround

<!-- omgithub:readme:start -->
## 🚀 Build, play, and remix with OMGithub

**Created using [OMGithub.com](https://go.ondev.store/).**

[![OMGithub](https://img.shields.io/badge/OMGithub-Open%20project-orange?style=for-the-badge)](https://go.ondev.store/gamer-frog/PlayGround)
[![GitHub](https://img.shields.io/badge/GitHub-Source-181717?logo=github&style=for-the-badge)](https://github.com/gamer-frog/PlayGround)

- 🎮 [Open the project](https://go.ondev.store/gamer-frog/PlayGround).
- ✨ [Remix this project](https://go.ondev.store/gamer-frog/PlayGround?remix=1).
- 💻 [Explore the source](https://github.com/gamer-frog/PlayGround).
- 🛠️ [Check build runs](https://github.com/gamer-frog/PlayGround/actions).
- 🐛 [Report an issue](https://github.com/gamer-frog/PlayGround/issues).
- 👤 [Explore the creator's projects](https://go.ondev.store/gamer-frog).
- 🌍 [Create with OMGithub](https://go.ondev.store/).
<!-- omgithub:readme:end -->

---

# Verde — estudio personal del cannabis medicinal

Aplicación web personal, local-first y en español, orientada al estudio del cannabis medicinal en Argentina. Su centro es un simulador de ciclo completo con escenarios ilustrativos, una biblioteca de estudio navegable, un catálogo con fuentes declaradas y herramientas de consulta y costeo. No es una red social, un marketplace ni una plataforma de seguimiento diario.

> **Marco de trabajo:** autocultivo registrado en Argentina, con un supuesto de 9 plantas autoflorecientes en 15 m² (3 × 5 m). Verde es una herramienta educativa: no vende cannabis, no habilita cultivos fuera del marco legal y no reemplaza asesoramiento profesional.

## Qué incluye

### Inicio
- Índice sencillo tipo libro con accesos a las áreas de estudio y trabajo de Verde.
- Búsqueda global con `⌘K` / `Ctrl+K` sobre sectores, cepas, cursos, recursos, roadmap y etiquetas.

### Cepas
- Catálogo de 16 perfiles demostrativos de autoflorecientes con THC/CBD, ciclo, efectos, terpenos, linaje y notas de referencia.
- Categorías Sativa · Índica · CBD medicinal · Híbrida; búsqueda y filtros locales.
- Cada perfil indica su procedencia en los datos incluidos. **No se consulta ni integra ninguna API externa**; las referencias a proveedores no implican permiso para reutilizar sus datos.
- Ficha lateral con acceso al oráculo local.

### Simulador
- Flujo: **configurar → SIMULAR → revisar el proceso completo**. No requiere avanzar día por día.
- Configuración de cepa, cantidad de plantas, duración, ambiente y estrategia.
- Timechart del ciclo con crecimiento, salud, humedad, nutrición y rendimiento relativo; las series se pueden activar y desactivar.
- Detalle de actividades del proceso, resultados de costo y rendimiento estimados, y selección entre **5 variaciones sintéticas reproducibles** para comparar el efecto de los supuestos.
- Las variaciones son estimaciones ilustrativas del modelo, **no predicciones, probabilidades ni intervalos de confianza**. No representan datos empíricos ni validación agronómica.
- El benchmark incluye estrategias comparables y exportación de replay a Markdown y JSON.

> Algunas vistas heredadas (por ejemplo, diario/proceso del cultivo actual) permanecen en la interfaz o el código; no son el foco ni una prioridad de desarrollo.

### Biblioteca
- Incluye **28 recursos de demostración** organizados en 6 diplomaturas; el dataset de muestra no contiene los documentos originales.
- Índice curso → módulo → recurso, con metadatos, etiquetas, estado y rutas de referencia; búsqueda, filtros, duplicados, anotaciones y rutas de lectura.
- Se pueden aportar PDFs desde el navegador. La extracción de texto a Markdown y el PDF original se guardan localmente en el navegador (PDF de hasta 40 MB); los controles permiten descargar los archivos guardados.
- El alta no escribe en las carpetas `pdf/` o `md/` del repositorio. Sus rutas son referencias, no archivos creados por la app.
- PDFs escaneados se detectan como probablemente sin texto extraíble. **OCR no está implementado.**
- Exportación del índice y de rutas de lectura a Markdown.

### Roadmap
- Roadmap editable dentro de la app con **14 frentes y 223 hitos** (63 hechos, 28 en curso, 66 próximos y 66 de visión), 4 horizontes, métricas de progreso, riesgos y no-prioridades. Versión **v4.4 · noviembre de 2026**.
- Incluye análisis de 20 productos, 18 oportunidades y 12 brechas como material de referencia; son notas de producto, no integraciones.
- Búsqueda, filtros y exportación completa a Markdown. El progreso de hitos se calcula desde los estados del roadmap.
- Las cuentas reflejan el contenido actual del archivo; los hitos son una lista editable, no compromisos ni una estimación de fechas.

### Oráculo
- Respuestas locales basadas en una base de conocimiento y en los recursos indexados.
- Citas con diplomatura, módulo, identificador y ruta.
- Sugerencias de consulta y panel de fuentes navegable.
- Aviso legal explícito en preguntas de normativa.

### Costos
- Escenario editable: plantas, rendimiento, precio de referencia, tarifa eléctrica, horas de luz, días y potencia LED.
- Cálculo de costo total, por planta y por gramo, valor de referencia y margen.
- Distribución del gasto y proyección de escala con advertencias de encuadre.
- Guardado del escenario en el navegador.

### Proceso
- Seis fases con objetivos, tareas, focos de atención y costo estimado.
- Checklist legal de Argentina y progreso de tareas.
- Enlaces al presupuesto y a la biblioteca.

## Cómo ejecutarlo

No requiere build ni dependencias:

```bash
python3 -m http.server 3002
```

Abrí `http://localhost:3002/`.

También puede servirse con cualquier servidor estático. La configuración de la app se guarda en `localStorage` con la clave `verde-app-v2`; los PDFs y sus Markdown extraídos se guardan aparte en IndexedDB (`verde-pdf-store-v1`).

## Estructura

```text
index.html      Shell, nueve vistas, índice de inicio, modales y navegación
styles.css      Sistema visual, shell, dashboard y componentes base
views.css       Inicio, cepas, diario y simulador
panels.css      Biblioteca, oráculo, costos, proceso, roadmap y responsive
verde-v3.css    Ajustes visuales de las vistas y componentes recientes
game.js         Estado, simulador, ingesta PDF local, IndexedDB, render y eventos
library.js      Recursos demo, fases, checks legales y base del oráculo
roadmap.js      Roadmap v4.4: 14 frentes, 223 hitos, métricas, riesgos y no-prioridades
strains.js      Catálogo demo de 16 perfiles autoflorecientes con categoría y fuente
sw.js           Caché de assets estáticos para la app web
manifest.webmanifest  Metadatos de instalación web
assets/         Fotografías locales de demostración
pdf/README.md   Convenciones previstas para documentos fuente
md/README.md    Convenciones previstas para Markdown derivado
```

## Datos, fuentes e imágenes

- El índice de biblioteca y las diplomaturas son un **dataset demo** pensado para mostrar procedencia, duplicados y citas. El repositorio no contiene PDFs originales ni Markdown de cursos; `pdf/` y `md/` documentan la estructura prevista. Los archivos que aporte el usuario se conservan localmente en IndexedDB, no se incorporan al repositorio.
- El alta de PDFs extrae texto en el navegador y genera Markdown descargable; el original y el texto extraído se guardan en IndexedDB. La búsqueda semántica no está implementada.
- El oráculo es una **heurística local**: no envía documentos a terceros y no es un modelo generativo. Sus respuestas citan recursos del índice.
- Las fotografías son imágenes de Unsplash incorporadas como material de demostración. No se copiaron assets, marcas ni interfaces de Leafly, Weedmaps, GrowDiaries u otras apps comerciales; el diseño se inspira en patrones de producto (explorador de cepas, diario, ficha de recurso) sin reproducir su identidad visual.
- Los perfiles de cepas son síntesis educativas de referencia. No reemplazan la ficha del banco de semillas.

## Marco legal y límites

Verde parte de un escenario de autocultivo registrado: hasta 9 plantas y 15 m² en el domicilio declarado, sin fines de lucro. Las condiciones concretas dependen de REPROCANN, la jurisdicción y la normativa vigente en 2026.

La app no constituye asesoramiento legal ni médico. No incluye venta, distribución ni recomendaciones terapéuticas individualizadas. Las proyecciones de valor de cosecha son ejercicios de costeo, no una autorización comercial.

## Supuestos de esta versión

- Temporada de 75 días y 9 autoflorecientes en 15 m².
- Indoor con LED de 240 W, 18 horas de luz y tarifa de $95/kWh.
- Rendimiento base de 55 g por planta y precio de referencia de $4.500/g.
- Datos persistidos solo en el navegador; no hay backend ni cuentas.
- El catálogo y la biblioteca son demostrativos y editables desde la interfaz.
