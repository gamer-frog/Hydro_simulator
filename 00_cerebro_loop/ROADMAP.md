# ROADMAP DEL PROYECTO

*Marcar con `[x]` lo completado, `[~]` en progreso, `[ ]` pendiente.*

## 🚀 Funcionalidades Principales

- [ ] 📌 [P0] Arreglar cámara en PC: pan/rotación con click se buggea (Pedidos 2d). Éxito: arrastrar rota/panea sin saltos ni clicks fantasmas; click corto sigue seleccionando camas.
- [ ] 📌 [B] Invernaderos reales de diseño: agregar **4 × 6 m** y **8 × 28 m** (Pedido 2a), con planos, capacidad y costos.
- [ ] 📌 [B] NFT realista con caños largos: 6 m en el 4×6 (lechugas por caño), hasta 12 m en el 8×28 (Pedidos 2b/2c). Sitios por caño según espaciamiento realista de lechuga NFT (15–25 cm). Éxito: mostrar "N plantas por caño" y plantas totales del invernadero.
- [ ] 📌 [B] Modo plano tipo AutoCAD: vista cenital con grilla métrica, cotas de caños/pasillos, paredes y tanque; varias opciones de diseño comparables (Pedido 2c).
- [x] Rescatar la app HydroHarvest desde PLAYGROUND (checkpoint 23) a la raíz del repositorio. Éxito: `index.html`, `css/`, `js/`, `vendor/` presentes y `node --check` verde.
- [x] Verificación en navegador del flujo jugable completo: iniciar partida, abrir la ayuda, seleccionar una cama, plantar un cultivo (criterio: consola sin errores rojos ni TypeErrors). ✅ Hecho con `playwright-cli` (Chromium instalado): arranque, click en cama, plantado de lechuga, misión "Primer Brote" cobrada, asesor de calor, checklist semanal. 0 errores.
- [~] Captura de pantallas de estados clave de la app (inicio, partida en curso, modo plano, presupuesto) en `screenshots/`: hechas `partida-iniciada.png`, `plantado-lechuga.png`, `save-corrupto-recuperado.png` (carpeta ignorada por git, solo local).
- [x] Balance de simulación: revisar números de costos/rendimientos de los seis sistemas (NFT, DWC, ebb & flow, holandés, aeropónico, Kratky) contra valores de referencia razonables. ✅ Hecho: BOM=costo verificado en los 6, modelos semanal/anual consistentes, agua/labor plausible; decisiones de diseño documentadas en `docs/BALANCE_NOTES.md` (sin cambios de código).

## 🛠️ Deuda Técnica y Mantenimiento (Tareas [C])

- [ ] No existe `dist/game.js`: el código fuente único es `js/game.js`. Si algún día se agrega un build, sincronizarlo en todos los commits.
- [ ] Revisar y agregar `?.` (optional chaining) en todos los accesos a `state`, `current` u objetos del guardado en `js/game.js`. (Hecho sobre los puntos calientes: `cropById`, `BED_TYPES[b.type]?.spec?.growth`, clima, camas; queda una pasada general por el resto).
- [x] Eliminar `console.log` / `console.debug` de producción en `js/`. ✅ Verificado: 0 ocurrencias de console.* en todo el código.
- [x] Agregar guards defensivos en los accesos críticos: `cropById` con fallback seguro, camas del save sanitizadas (id/x/z/water/ph/ec/growth/cropId), clima y reputación normalizados. (Queda pasada general por accesos anidados de UI).
- [x] Validar el guardado/carga de partida en localStorage ante JSON corrupto (debe degradar sin TypeError). ✅ try/catch ya existía + sanitización de estado en `continueGame`; probado con saves corruptos (beds inválidas, sin id, sin day/dayTime, cropId desconocido): degrada sin TypeError.

## 🐛 Bugs Conocidos

- [x] ~~`playwright-cli` no puede arrancar en este entorno~~ RESUELTO (2026-11-09): `playwright-cli install-browser chromium` lo instaló y verificaciones funcionando. Marco de referencia: `playwright-cli open http://localhost:3002`.

## 📝 Notas

- Agregar nuevas features aquí según se vayan identificando.
- Priorizar por impacto en el usuario.
- La app es estática (sin npm): verificar siempre con servidor local + consola del navegador antes de pushear.
