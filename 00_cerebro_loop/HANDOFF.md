# HANDOFF (Estado Actual)

## Última acción completada
LOOP CHECKPOINT 3 (2026-11-09) — Balance de simulación:
- Revisados los seis sistemas y cultivos contra rangos de referencia: BOM=costo verificado (6/6), modelos semanal del asesor y anual de `potentialFor` consistentes entre sí, agua por planta/día y labor dentro de rangos realistas. Excesos conscientes (energía torre/ebb, densidades de visualización, ciclos comprimidos) documentados en `docs/BALANCE_NOTES.md`. Sin cambios de código.
- Rescates del día: issue #7 (desglose de costos) ya integrado; refs `opencode-resume/*` (15 refs) analizadas: todas sesiones viejas de PLAYGROUND (issues 3–15), anteriores al checkpoint 23 que ya vive en main → nada que rescatar. Detalle en `CEMETERY.md`.

## Estado del build/navegador
🟢 Verde: consola sin errores nuevos (los 3 TypeErrors del log son de pruebas anteriores a los guards). `node --check` verde.

## Decisiones de diseño tomadas
- Se recuperó el checkpoint 23 de PLAYGROUND como versión activa de la app (es-AR, móvil/táctil, Three.js incluido en `vendor/`).
- La versión modular del checkpoint 2 se archivó en `archive/hydroharvest-v1/` para no mezclar versiones.
- No se usan paquetes npm: la app es estática y corre con `python3 -m http.server 3002` (puerto del protocolo).
- `cropById(id)` para ids desconocidos devuelve `CROPS[0]` como fallback (no TypeError); al cargar, un `cropId` inválido en el save se anula (`bed.cropId = null`).
- Las camas con `type` inválido se filtran al cargar; a las camas sin `id` se les genera uno (prefijo `b`), y x/z/rot/water/ph/ec/growth fuera de rango → valores por defecto.

## PRÓXIMO PASO INMEDIATO
🚀 Loop: siguiente tarea [C] del ROADMAP — pasada general de optional chaining / guards en accesos a estado de `js/game.js` (ítem "[ ] Revisar y agregar `?.` ... pasada general por el resto"), verificando en navegador antes de pushear.

## Contexto importante
- El usuario pidió explícitamente rescatar la app de PLAYGROUND antes de su eliminación y conservar recursos/historial. HECHO y pusheado (commit `b60c491`).
- Idioma de la app: español argentino (es-AR). Objetivo: simulador realista de hidroponía, no solo un juego.
- No existe un `dist/game.js`; el código fuente es `js/game.js` y no requiere build.
- Los historiales de conversación comprimidos están en `docs/history/` (checkpoints 1, 2, 3, 22, 23) — no volver a pedir clones de PLAYGROUND: ya está rescatado.
- Los screenshots de verificación van a `screenshots/` (carpeta .gitignoreada: no intentar commitearlos).
- `origin/opencode-checkpoints/8` y `origin/opencode-deployments/8` NO se eliminan: canal de checkpoints/deployment de la plataforma (ver CEMETERY.md).
