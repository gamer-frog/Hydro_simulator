# HANDOFF (Estado Actual)

## Última acción completada
FUNDACIÓN: se creó la infraestructura del cerebro (`/00_cerebro_loop/`) y se actualizó `Agents.md` con la Regla Suprema. Todo commiteado y pusheado a main.

Antes de la fundación se completó el RESCATE: la app 3D HydroHarvest (hidroponía NFT) fue recuperada desde el repo PLAYGROUND checkpoint 23 a la raíz de este repositorio (`index.html`, `css/`, `js/`, `vendor/three.min.js`). La versión modular anterior quedó preservada en `archive/hydroharvest-v1/` y los historiales de conversaciones en `docs/history/`. Procedencia en `docs/RESCUE_PLAYGROUND.md`.

## Estado del build/navegador
🟢 Verde: los módulos pasan `node --check` (js/data.js, js/world.js, js/game.js). Captura con Chromium headless generada en `/tmp/opencode/hydro-title.png` (pendiente de inspección detallada). Nota: `playwright-cli` falla porque su Chromium no está instalado en el entorno actual (`install-browser chromium` lo resolvería); se usó Chromium del sistema como alternativa.

## Decisiones de diseño tomadas
- Se recuperó el checkpoint 23 de PLAYGROUND como versión activa de la app (es-AR, móvil/táctil, Three.js incluido en `vendor/`).
- La versión modular del checkpoint 2 se archivó en `archive/hydroharvest-v1/` para no mezclar versiones.
- No se usan paquetes npm: la app es estática y corre con `python3 -m http.server 8000`.

## PRÓXIMO PASO INMEDIATO
🚀 Verificar en el navegador el flujo jugable de la app rescatada (iniciar partida, interacción táctil/mouse, consola sin errores rojos), corregir lo que falte y confirmar el push del código rescatado (los archivos de la app aún están sin commit: `index.html`, `css/`, `js/`, `vendor/`, `archive/`, `docs/`).

## Contexto importante
- El usuario pidió explícitamente rescatar la app de PLAYGROUND antes de su eliminación y conservar recursos/historial.
- Idioma de la app: español argentino (es-AR). Objetivo: simulador realista de hidroponía, no solo un juego.
- No existe un `dist/game.js`; el código fuente es `js/game.js` y no requiere build.
- Los historiales de conversación comprimidos están en `docs/history/` (checkpoints 1, 2, 3, 22, 23) — no volver a pedir clones de PLAYGROUND: ya está rescatado.
