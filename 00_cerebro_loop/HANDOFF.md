# HANDOFF (Estado Actual)

## Última acción completada
LOOP CHECKPOINT 2 (2026-11-09) — RESCATE de issue #7:
- Rescatada la feature "desglose de costos operativos" desde `origin/opencode-checkpoints/7` (sesión de la issue #7): `potentialFor()` con `costs` (semillas/energía/agua/nutrientes/labor al 50%), tabla del laboratorio con "Ver desglose" plegable, CSS `.profit-breakdown*` y nota de supuestos ampliada. Reconstrucción compatible sobre los guards de main (sin merge). Verificado en navegador (pestaña RENTABILIDAD del laboratorio 🧪): columnas y desglose renderizan, 0 TypeErrors.
- Analizadas refs nuevas: `opencode-checkpoints/{1,3,5,6}` (subconjuntos/iguales, nada que rescatar), `opencode/42336827893` (más viejo), `rescued/playground/*` (espejo ya rescatado). PENDIENTE: `opencode-resume/*` (3 refs).

## Estado del build/navegador
🟢 Verde: app verificada en Chromium (playwright-cli, http://localhost:3002). Consola sin errores nuevos (los 3 TypeErrors del log son de las pruebas ANTERIORES a los guards, timestamps viejos). `node --check` verde para los tres módulos.

## Decisiones de diseño tomadas
- Se recuperó el checkpoint 23 de PLAYGROUND como versión activa de la app (es-AR, móvil/táctil, Three.js incluido en `vendor/`).
- La versión modular del checkpoint 2 se archivó en `archive/hydroharvest-v1/` para no mezclar versiones.
- No se usan paquetes npm: la app es estática y corre con `python3 -m http.server 3002` (puerto del protocolo).
- `cropById(id)` para ids desconocidos devuelve `CROPS[0]` como fallback (no TypeError); al cargar, un `cropId` inválido en el save se anula (`bed.cropId = null`).
- Las camas con `type` inválido se filtran al cargar; a las camas sin `id` se les genera uno (prefijo `b`), y x/z/rot/water/ph/ec/growth fuera de rango → valores por defecto.

## PRÓXIMO PASO INMEDIATO
🚀 Loop: analizar las 3 refs `origin/opencode-resume/*` (rescate pendiente, ver CEMETERY.md); si no hay nada, siguiente tarea [B] del ROADMAP: balance de simulación de los seis sistemas.

## Contexto importante
- El usuario pidió explícitamente rescatar la app de PLAYGROUND antes de su eliminación y conservar recursos/historial. HECHO y pusheado (commit `b60c491`).
- Idioma de la app: español argentino (es-AR). Objetivo: simulador realista de hidroponía, no solo un juego.
- No existe un `dist/game.js`; el código fuente es `js/game.js` y no requiere build.
- Los historiales de conversación comprimidos están en `docs/history/` (checkpoints 1, 2, 3, 22, 23) — no volver a pedir clones de PLAYGROUND: ya está rescatado.
- Los screenshots de verificación van a `screenshots/` (carpeta .gitignoreada: no intentar commitearlos).
- `origin/opencode-checkpoints/8` y `origin/opencode-deployments/8` NO se eliminan: canal de checkpoints/deployment de la plataforma (ver CEMETERY.md).
