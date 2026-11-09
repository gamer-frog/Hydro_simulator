# HANDOFF (Estado Actual)

## Última acción completada
LOOP CHECKPOINT 1 (2026-11-09):
- Fase de rescate ejecutada: `opencode-checkpoints/8` y `opencode-deployments/8` analizadas; sin código nuevo a rescatar (árboles idénticos a main). Ver `CEMETERY.md`.
- Verificación de base anti-TypeError OK con `playwright-cli` (Chromium instalado): título → build → HUD → click en cama → plantar lechuga → misión "Primer Brote" cobrada. 0 errores de consola.
- Tarea [C] guards defensivos: `cropById` con fallback, camas del save sanitizadas (id/x/z/water/ph/ec/growth/cropId/cropId), clima/reputación/day/dayTime/cash normalizados, `?.` en `BED_TYPES[b.type]?.spec?.growth`. Probado con saves corruptos en localStorage (beds inválidas, sin id, sin dayTime): degrada sin TypeError (antes: 3 TypeErrors en el test, hoy 0).

## Estado del build/navegador
🟢 Verde: app verificada en Chromium (playwright-cli, http://localhost:3002). Consola sin errores (solo warnings de rendimiento WebGL/SwiftShader, esperados). `node --check` verde para los tres módulos.

## Decisiones de diseño tomadas
- Se recuperó el checkpoint 23 de PLAYGROUND como versión activa de la app (es-AR, móvil/táctil, Three.js incluido en `vendor/`).
- La versión modular del checkpoint 2 se archivó en `archive/hydroharvest-v1/` para no mezclar versiones.
- No se usan paquetes npm: la app es estática y corre con `python3 -m http.server 3002` (puerto del protocolo).
- `cropById(id)` para ids desconocidos devuelve `CROPS[0]` como fallback (no TypeError); al cargar, un `cropId` inválido en el save se anula (`bed.cropId = null`).
- Las camas con `type` inválido se filtran al cargar; a las camas sin `id` se les genera uno (prefijo `b`), y x/z/rot/water/ph/ec/growth fuera de rango → valores por defecto.

## PRÓXIMO PASO INMEDIATO
🚀 Loop: siguiente tarea [C] del ROADMAP — pasada general de optional chaining / guards en accesos a estado dentro de `js/game.js` (cumplir el ítem pendiente marcado "[ ] Revisar y agregar `?.` ... pasada general por el resto"), verificando en navegador antes de pushear. Luego [B] balance de simulación.

## Contexto importante
- El usuario pidió explícitamente rescatar la app de PLAYGROUND antes de su eliminación y conservar recursos/historial. HECHO y pusheado (commit `b60c491`).
- Idioma de la app: español argentino (es-AR). Objetivo: simulador realista de hidroponía, no solo un juego.
- No existe un `dist/game.js`; el código fuente es `js/game.js` y no requiere build.
- Los historiales de conversación comprimidos están en `docs/history/` (checkpoints 1, 2, 3, 22, 23) — no volver a pedir clones de PLAYGROUND: ya está rescatado.
- Los screenshots de verificación van a `screenshots/` (carpeta .gitignoreada: no intentar commitearlos).
- `origin/opencode-checkpoints/8` y `origin/opencode-deployments/8` NO se eliminan: canal de checkpoints/deployment de la plataforma (ver CEMETERY.md).
