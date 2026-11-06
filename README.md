# PlayGround

<!-- omgithub:readme:start -->
## 🚀 Build, play, and remix with OMGithub

**Remixed using [OMGithub.com](https://go.ondev.store/).**

[![OMGithub](https://img.shields.io/badge/OMGithub-Open%20project-orange?style=for-the-badge)](https://go.ondev.store/gamer-frog/PlayGround)
[![GitHub](https://img.shields.io/badge/GitHub-Source-181717?logo=github&style=for-the-badge)](https://github.com/gamer-frog/PlayGround)

- 🎮 [Open the project](https://go.ondev.store/gamer-frog/PlayGround).
- ✨ [Remix this project](https://go.ondev.store/gamer-frog/PlayGround?remix=1).
- 💻 [Explore the source](https://github.com/gamer-frog/PlayGround).
- 🛠️ [Check build runs](https://github.com/gamer-frog/PlayGround/actions).
- 🐛 [Report an issue](https://github.com/gamer-frog/PlayGround/issues).
- 👤 [Explore the creator's projects](https://go.ondev.store/gamer-frog).
- 🌍 [Create with OMGithub](https://go.ondev.store/).
- 🧬 [Explore the remix source](https://github.com/gamer-frog/PlayGround).
<!-- omgithub:readme:end -->

## Conductor — un visor móvil para agentes que viven en el repo

Conductor es una aplicación web **mobile-first y de solo lectura** para observar un
workspace multiagente cuyo backend es este repositorio. Los humanos piden trabajo
desde GitHub Issues; los agentes se registran, laten cada 15 minutos, reclaman una
misión con un evento Git y publican el resultado. La app no ejecuta agentes ni
cambia estados: muestra lo que ya pasó en el repo. El único write opcional es
crear un issue nuevo desde el formulario de pedido; nunca modifica uno existente.

### Qué se puede ver

- **Hoy**: resumen del último heartbeat, señales, issues, estado de la máquina y
  próximos vencimientos.
- **El estudio**: una oficina isométrica con un cuarto por repo. Los tokens se
  mueven al lugar de su última acción y se puede reproducir la ventana de los
  últimos 15 minutos, cambiar la velocidad y filtrar por repo.
- **Misiones**: issues agrupados por estado, filtros por repo, detalle de cada
  misión con su máquina de estados y enlaces directos a GitHub. Las misiones con
  `dependsOn` muestran su bloqueo y el protocolo rechaza el claim hasta que las
  dependencias estén completas.
- **Equipo**: la biblioteca de agentes estilo *Agent Agency*, con retrato, rol,
  skills, modelo, repo y última señal. Incluye el protocolo de incorporación.
- **Plan**: Gantt de la semana, trabajo de mediano y largo plazo y loops
  recurrentes.
- **Trello (opcional)**: un espejo de solo lectura del *machine state* con las
  cartas y las últimas acciones de los agentes.
- **Ops health**: frescura de heartbeats, claims activos, conflictos, warnings y
  última sincronización; la bandeja “necesita atención” prioriza bloqueos y señales
  que requieren revisión. El snapshot se refresca solo cada 60 segundos.
- **Buscador de comandos**: `⌘K` / `Ctrl K` para saltar a cualquier vista, repo,
  agente, misión o acción sin recorrer menús.
- **Deep links**: cada vista y ficha tiene URL propia, por ejemplo
  `#/missions/mission/mission-demo` o `#/agents/agent/luna`. Se puede compartir o
  abrir directamente.

### Cómo correrla

No hay build ni dependencias de frontend. Serví la carpeta con cualquier servidor
estático:

```sh
python3 -m http.server 3002
```

Abrí `http://localhost:3002`. También funciona en GitHub Pages o cualquier CDN
estático.

Para regenerar la proyección que lee la app:

```sh
python3 orchestra/coord.py rebuild
```

### Fuentes de datos

| Fuente | Uso | Requiere credenciales |
| --- | --- | --- |
| `orchestra/state.json` | Snapshot generado desde `seed.json` + eventos | No |
| GitHub Issues API | Issues reales del repo y creación opcional de pedidos | No para leer; token para crear |
| Trello API | Tablero de machine state y acciones recientes | Sí: key, token y board ID |

La app hace `fetch('orchestra/state.json')` al arrancar. Si el archivo no está
disponible usa el snapshot de respaldo embebido en `app-core.js`, así que la
interfaz sigue siendo navegable en modo demo.

#### GitHub

La sincronización usa la API pública de GitHub (`/repos/{owner}/{repo}/issues`).
Las credenciales y el repo se guardan en `localStorage` del navegador. El botón
**Pedir misión** abre el formulario de issue de GitHub; si hay un token con
permiso `issues:write`, crea el issue por API. En cualquier caso, el estado de la
misión se sigue cambiando en GitHub o mediante el protocolo de agentes, nunca
desde este visor.

#### Trello

Trello es un **espejo de lectura**, no participa del reclamo ni de la exclusión.
Para conectarlo, abrí **Conexiones** y completá API key, token y board ID. Los
valores quedan solo en este navegador. No publiques una deployment con el token
expuesto: en producción usá un proxy de solo lectura. Sin credenciales, el
tablero se arma con los datos de demo del snapshot.

### Replay y heartbeat

- La ventana de replay es de **15 minutos** (`REPLAY_DURATION = 900`).
- El cron de cada agente lo despierta cada 15 minutos; el heartbeat es una señal
  de actividad, no una reserva de trabajo.
- Al mover la línea de tiempo, la app reconstruye qué acción era la última de
  cada agente en ese instante. Cada agente queda “en loop” de esa acción hasta
  que el siguiente heartbeat produce una nueva.
- Los loops recurrentes (triage, deploy check, digest, review) se muestran en
  **Plan**. Sus corridas también deberían dejar evidencia en el repo.

### Atajos y rutas

- `⌘K` / `Ctrl K`: abre el buscador global.
- `↑` / `↓`: mueve la selección; `Enter` abre; `Esc` cierra.
- `#/home`, `#/world`, `#/missions`, `#/agents`, `#/plan`: vistas.
- `#/missions/mission/{id}` y `#/agents/agent/{id}`: fichas compartibles.
- `#/world/project/{id}`: abre el estudio filtrado a un repo.

### Estructura del proyecto

```text
index.html            Shell, vistas y diálogos
styles.css            Sistema visual responsive (móvil primero)
app-core.js           Iconos, estado normalizado, avatares, replay, rutas y helpers
app-home.js           Vista Hoy, ops health y frescura de heartbeats
app-world.js          Oficina isométrica y replay sincronizado
app-missions.js       Misiones, dependencias, GitHub y tablero Trello
app-agents.js         Biblioteca de agentes y ficha de detalle
app-plan.js           Gantt, plan corto/medio/largo y loops
app-command.js        Command palette y búsqueda global
app-actions.js        Eventos, formularios, conexiones, auto-refresh y boot
orchestra/            Protocolo, seed, proyección y pruebas
.github/ISSUE_TEMPLATE/  Plantilla de pedido de misión
ORCHESTRATION.md      Protocolo de coordinación y límites
orchestra/AGENT_ONBOARDING.md  Guía para un agente nuevo
```

### Pruebas

```sh
for f in app-*.js; do node --check "$f"; done
python3 -m unittest discover -s orchestra -p 'test_*.py' -v
```

Las pruebas de protocolo crean un directorio temporal, copian `seed.json` y
ejecutan la CLI de coordinación de punta a punta.

### Límites conocidos

- Es un visor: no hay autenticación, edición de issues ni ejecución de agentes.
- El snapshot puede estar desactualizado; el repo es la fuente de verdad.
- La API pública de GitHub tiene límites de tasa. Un token eleva el límite.
- Las credenciales de Trello en el cliente son aceptables para uso personal o
  interno, no para un sitio público.
- Los eventos de coordinación no impiden por sí solos dos reclamos simultáneos;
  la app muestra el conflicto, pero la resolución es humana.
- La actividad y los avatares son metadatos de presentación en `seed.json`; no
  reemplazan el historial de eventos.

Para el protocolo completo, los estados de reclamo y las reglas de reconciliación,
leé [ORCHESTRATION.md](ORCHESTRATION.md) y
[orchestra/AGENT_ONBOARDING.md](orchestra/AGENT_ONBOARDING.md).
