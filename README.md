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

# Verde — Cultivo con criterio

Aplicación web en español para acompañar un autocultivo de cannabis de principio a fin. Combina un simulador de temporada, un diario semanal, un catálogo de autoflorecientes, una biblioteca académica trazable, un oráculo local con fuentes y un presupuesto editable.

> **Marco de trabajo:** autocultivo registrado en Argentina, con un supuesto de 9 plantas autoflorecientes en 15 m² (3 × 5 m). Verde es una herramienta educativa: no vende cannabis, no habilita cultivos fuera del marco legal y no reemplaza asesoramiento profesional.

## Qué incluye

### Inicio
- Índice real de la aplicación: 8 sectores que muestran su estado y llevan a cada parte.
- Estado del batch, biblioteca por curso, extras, insights y accesos rápidos.
- Búsqueda global con `⌘K` / `Ctrl+K` sobre sectores, cepas, cursos, PDFs, roadmap y etiquetas.

### Cepas
- Catálogo de 14 autoflorecientes con THC/CBD, dificultad, ciclo, rendimiento, altura, efectos, terpenos, linaje y notas de cultivo.
- Búsqueda por nombre, efecto, aroma o terpeno; filtros por dificultad y efecto; orden por THC, ciclo, rendimiento o nombre.
- Ficha completa en hoja lateral, con consulta directa al oráculo.

### Diario
- Temporada de 75 días dividida en 11 semanas.
- Ambiente semanal con gráfico SVG de temperatura, humedad y VPD.
- Checklist por semana, eventos, registro visual y proyección/resultado de cosecha.
- Exportación del diario completo a Markdown.

### Simulador
- 9 plantas en una grilla de 3 × 3 dentro de un espacio de 3 × 5 m.
- Acciones diarias: regar, nutrir, inspeccionar, ventilar y cosechar.
- Clima, VPD, recursos, bitácora, objetivo de temporada y tienda de suministros.
- Simulación veloz de los 75 días con seis estrategias (equilibrada, rápida, orgánica, mínima, low-cost e intensiva).
- Batch benchmark: timelapse de 75 días con eventos, score compuesto y comparación de estrategias.
- Replay exportable en Markdown y JSON con ranking, eventos, semilla y supuestos.
- Resultado con rendimiento, costo, costo por gramo y aprendizajes.
- Archivo de temporadas: conserva hasta 12 cultivos cerrados con rendimiento y costo.

### Biblioteca
- Índice de 28 recursos demo organizados en 6 diplomaturas.
- Vista digerida por defecto: tarjetas de curso con nombre, PDFs, páginas, % cargado y extras.
- Índice de sabiduría curso → módulo → recurso, con estado, ruta Markdown, hash y enlaces.
- Cada recurso conserva diplomatura, módulo, año, páginas, estado de procesamiento y ruta física.
- Búsqueda, filtros, orden, detección de duplicados y comparación de versiones sin borrar el original.
- Alta de nuevos PDFs con metadatos de origen y detección de títulos repetidos.
- Exportación del índice plano y del índice de sabiduría a Markdown.

### Roadmap
- Página viva de desarrollo con **14 frentes**, **200 hitos**, 4 horizontes, métricas dinámicas, principios, no objetivos y riesgos.
- **Ingeniería inversa de 20 apps de cannabis** (catálogos, diarios, marketplaces, sensores, knowledge tools y benchmarks): qué tomar, qué no copiar y qué oportunidad queda libre.
- **Radar de 18 oportunidades** priorizadas por impacto, esfuerzo y horizonte.
- **Matriz de 12 brechas** con estado actual, ausencia concreta y apuesta de implementación.
- Búsqueda sobre los 200 hitos, filtros por frente, horizonte y pendientes; exportación completa a Markdown.
- Los hitos completados actualizan el progreso y las métricas del roadmap en vivo.

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

También puede servirse con cualquier servidor estático. El estado se guarda en `localStorage` con la clave `verde-app-v2`.

## Estructura

```text
index.html      Estructura de las 8 vistas, modales, command palette y navegación
styles.css      Sistema visual, shell, dashboard y componentes base
views.css       Cepas, diario y simulador
panels.css      Biblioteca, oráculo, costos, proceso y responsive
verde-v3.css    Overlay compacto: índice, biblioteca digerida, batch, roadmap y ⌘K
game.js         Estado, simulador, filtros, render, búsqueda global y eventos
roadmap.js      Roadmap v3.0: 14 frentes, 200 hitos, 20 apps, 18 apuestas y 12 brechas
library.js      Biblioteca demo, fases, checks legales y base del oráculo
strains.js      Catálogo demo de 14 autoflorecientes
assets/         Fotografías locales optimizadas
```

## Datos, fuentes e imágenes

- La biblioteca y las diplomaturas son un **dataset demo** pensado para mostrar provenance, duplicados y citas. No contiene los PDFs originales.
- El alta de PDFs guarda metadatos y nombre de archivo en esta versión. La conversión real a Markdown y la búsqueda semántica quedan como siguiente etapa.
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
