# CEMETERY (Registro de Sesiones Muertas)

*Registro de branches que fueron rescatadas o descartadas.*

## Ramas rescatadas

- [x] 💾 Branch `origin/opencode-checkpoints/7` (sesión de la issue #7) — FUNCIONALIDADES INTEGRALES:
  - Rescatada el: 2026-11-09
  - Cambios implementados: desglose de costos operativos en `potentialFor()` (semillas, energía, agua, nutrientes, mano de obra al 50%) y tabla "Potencial teórico" con desglose plegable "Ver desglose"; nuevos estilos `.profit-breakdown*` en `css/style.css`; nota de supuestos ampliada. Reconstruido de forma compatible sobre los guards de main, sin merge directo.
  - Commit: (ver push en progreso)
  - Estado: ✅ Éxito (verificado en navegador: desglose renderiza, 0 TypeErrors)

- [x] 💾 Branch `checkpoints/23` de PLAYGROUND (remoto `opencode-checkpoints`):
  - Rescatada el: 2026-11-07
  - Cambios implementados: restauración completa de la app HydroHarvest (index.html, css/style.css, js/data.js, js/game.js, js/world.js, vendor/three.min.js) a la raíz de este repositorio, sin merge: copia de árbol verificada con `node --check`.
  - Commit: (pendiente de commit, ver HANDOFF.md)
  - Estado: ✅ Éxito

- [x] 💾 Branch `checkpoints/2` de PLAYGROUND:
  - Rescatada el: 2026-11-07
  - Cambios implementados: preservación en `archive/hydroharvest-v1/` (versión modular anterior con iconos, manifest y Three.js modular). No activa en el arranque.
  - Commit: (pendiente de commit, ver HANDOFF.md)
  - Estado: ✅ Éxito

## Ramas descartadas

- [x] 🗑️ Branch `checkpoints/22` de PLAYGROUND:
  - Descartada el: 2026-11-07
  - Motivo: checkpoint 23 la reemplaza (diff reciente y funcionalmente superior); su conversación quedó preservada en `docs/history/playground-checkpoint-22-conversation.json.gz`.
  - Tag graveyard: n/a (el historial preservado cumple ese rol)

- [x] 🔍 Branch `origin/opencode-checkpoints/8`:
  - Analizada el: 2026-11-09. 2 commits (`189e5df`, `2eadfb5`) no presentes en main, pero el árbol es **idéntico** a main salvo `.omgithub/checkpoint.json` y `.omgithub/conversation.json` (metadatos de la plataforma).
  - Conclusión: código ya rescatado en main vía `b60c491`. No hay tareas perdidas: su HANDOFF es el mismo de la fundación.
  - Estado: ⚠️ Se conserva temporalmente porque es el canal de checkpoints de la issue #8 (sesión activa); no se elimina a mitad de sesión para no romper el guardado de la plataforma. Candidata a limpieza al cierre.

- [x] 🔍 Branch `origin/opencode-deployments/8`:
  - Analizada el: 2026-11-09. Commits `d06cc34`, `5c479b1` ("Publish static build for issue #8"): solo workflow, `.omgithub/deployment.json` y chmod de scripts; árbol idéntico en código.
  - Conclusión: es el artefacto de deployment del sitio. No contiene cambios de código a rescatar.
  - Estado: ⚠️ Se conserva: eliminarla rompería el deployment publicado. No es una rama de sesión huérfana.

## Ramas analizadas sin necesidad de rescate (2026-11-09, Gauntlet Loop 2)

- [x] 🔍 Refs `origin/opencode-checkpoints/{1,3,5,6}` y `origin/opencode/42336827893`: versiones iguales o más viejas que main; checkpoints 5 y 6 son subconjuntos de los cambios del 7. Sin código nuevo a rescatar (el modular viejo ya vive en `archive/hydroharvest-v1/`).
- [x] 🔍 Refs `origin/rescued/playground/*`: espejo de los checkpoints de PLAYGROUND ya rescatados (checkpoint 23 es la versión activa; 2 archivado). Sin contenido nuevo.
- [ ] 🔍 `origin/opencode-resume/*` (3 refs): pendiente de análisis rápido en próxima iteración.

## Notas

- Cada rama rescatada debe verificarse en el navegador antes de pushear a main.
- Si una rama tiene cambios incompatibles, documentar en TODO.md.
- Los repositorios de origen (`gamer-frog/PlayGround` y sus checkpoints `1..23`) estaban `shallow` y los historiales de conversación completos quedaron comprimidos en `docs/history/`.
