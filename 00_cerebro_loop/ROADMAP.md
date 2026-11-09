# ROADMAP DEL PROYECTO

*Marcar con `[x]` lo completado, `[~]` en progreso, `[ ]` pendiente.*

## 🚀 Funcionalidades Principales

- [x] Rescatar la app HydroHarvest desde PLAYGROUND (checkpoint 23) a la raíz del repositorio. Éxito: `index.html`, `css/`, `js/`, `vendor/` presentes y `node --check` verde.
- [ ] Verificación en navegador del flujo jugable completo: iniciar partida, abrir la ayuda, seleccionar una cama, plantar un cultivo (criterio: consola sin errores rojos ni TypeErrors).
- [ ] Captura de pantallas de estados clave de la app (inicio, partida en curso, modo plano, presupuesto) en `screenshots/`.
- [ ] Balance de simulación: revisar números de costos/rendimientos de los seis sistemas (NFT, DWC, ebb & flow, holandés, aeropónico, Kratky) contra valores de referencia razonables.

## 🛠️ Deuda Técnica y Mantenimiento (Tareas [C])

- [ ] No existe `dist/game.js`: el código fuente único es `js/game.js`. Si algún día se agrega un build, sincronizarlo en todos los commits.
- [ ] Revisar y agregar `?.` (optional chaining) en todos los accesos a `state`, `current` u objetos del guardado en `js/game.js`.
- [ ] Eliminar `console.log` / `console.debug` de producción en `js/`.
- [ ] Agregar guards defensivos en todos los accesos a propiedades anidadas del estado del juego.
- [ ] Validar el guardado/carga de partida en localStorage ante JSON corrupto (debe degradar sin TypeError).

## 🐛 Bugs Conocidos

- [ ] `playwright-cli` no puede arrancar en este entorno: falta instalar su Chromium (`playwright-cli install-browser chromium`). Alternativa usada: Chromium del sistema (`chromium --headless --screenshot`). No es un bug de la app.

## 📝 Notas

- Agregar nuevas features aquí según se vayan identificando.
- Priorizar por impacto en el usuario.
- La app es estática (sin npm): verificar siempre con servidor local + consola del navegador antes de pushear.
