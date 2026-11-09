# CEMETERY (Registro de Sesiones Muertas)

*Registro de branches que fueron rescatadas o descartadas.*

## Ramas rescatadas

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

## Notas

- Cada rama rescatada debe verificarse en el navegador antes de pushear a main.
- Si una rama tiene cambios incompatibles, documentar en TODO.md.
- Los repositorios de origen (`gamer-frog/PlayGround` y sus checkpoints `1..23`) estaban `shallow` y los historiales de conversación completos quedaron comprimidos en `docs/history/`.
