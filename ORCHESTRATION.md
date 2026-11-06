# Protocolo de coordinación por repositorio

Este directorio ofrece un registro de eventos cooperativo, basado en archivos Git, y una vista JSON para la aplicación. No es un servidor, un sistema de bloqueo distribuido ni una garantía de ejecución exclusiva. Requiere Python 3 (solo biblioteca estándar) y Git para compartir cambios.

## Archivos y esquema

- `orchestra/seed.json`: datos iniciales editables. Incluye `schemaVersion: 1`, un bloque `workspace` (nombre, repo, zona horaria y ventanas de replay/heartbeat) y las listas `projects`, `missions`, `agents`, `loops` y `activity`. Las misiones y loops referencian proyectos mediante `projectId`; los loops usan `missionIds`. Cada misión puede declarar `dependsOn: ["mission-id"]`; la CLI rechaza el claim mientras alguna dependencia no esté `done` o su issue no esté cerrado. Los estados de negocio son descriptivos y no cambian automáticamente al reclamar una misión. Los agentes de ejemplo ya están registrados como identidades iniciales. `activity` y `trello` son metadatos de presentación para el visor, no eventos de coordinación.
- `orchestra/events/<id>.json`: registro inmutable, un archivo por evento. `id` es un UUID hexadecimal de 32 caracteres e igual al nombre del archivo; campos comunes: `schemaVersion`, `id`, `type`, `timestamp` UTC y `agentId`. Tipos: `register` (`name`, `role`), `heartbeat`, `claim` (exactamente uno de `missionId` o `issueRef`) y `release` (el mismo identificador más `claimId` del reclamo exacto). `issueRef` usa la forma normalizada `owner/repo#número` y permite coordinar Issues reales que no están sembradas como misiones. Registrar no autentica una identidad.
- `orchestra/state.json`: proyección **generada** por `coord.py` a partir de seed y eventos presentes. La interfaz puede leerla directamente. Conserva las listas y los metadatos visuales del seed (`workspace`, `activity`, `trello`, `room`, `avatar`, `home`, etc.); añade `lastHeartbeat` a cada agente y `claims` (objetos con `claimId`, `agentId`, `timestamp`), `claimStatus`, `blockedBy` e `isBlocked` a cada misión. Valores de `claimStatus`: `available` (sin reclamos), `claimed` (uno), `conflict` (varios) y `unknown` (historial con advertencias). `blockedBy` lista dependencias todavía incompletas; `isBlocked` es el gate que usa la CLI antes de aceptar un claim. `protocol.warnings` contiene errores detectados; si no está vacío no debe considerarse disponible ninguna misión. Es una instantánea local, no una consulta en vivo.
- `orchestra/coord.py`: CLI que publica eventos completos en archivos únicos y reconstruye la proyección de forma determinista. `status` calcula sin escribir; el resto de comandos con éxito actualiza `state.json`. `--root` permite usar otro directorio de datos.
- `orchestra/test_coord.py`: pruebas aisladas en directorios temporales.

## Uso

```sh
python3 orchestra/coord.py status
python3 orchestra/coord.py register agent-alice --name 'Alice' --role builder
python3 orchestra/coord.py heartbeat agent-alice
python3 orchestra/coord.py claim agent-alice mission-onboarding
# Para Issues de GitHub no sembradas como misión: owner/repo#número.
python3 orchestra/coord.py claim-issue agent-alice gamer-frog/PlayGround#999
# El comando imprime JSON con el id del reclamo; consérvalo.
python3 orchestra/coord.py release agent-alice mission-onboarding ID_DEL_RECLAMO
python3 orchestra/coord.py release-issue agent-alice gamer-frog/playground#999 ID_DEL_RECLAMO
python3 orchestra/coord.py rebuild
python3 -m unittest discover -s orchestra -p 'test_*.py' -v
```

La CLI verifica la proyección local antes de un reclamo; lo rechaza si hay advertencias, reclamos activos o dependencias incompletas (`isBlocked`). Las misiones con `issue` y `projectId` también se agrupan como Issues `owner/repo#número`: una misión sembrada y un reclamo directo de esa misma Issue comparten exclusión. Las Issues reclamada directamente se exponen en `state.json` como `issueClaims`. Una liberación identifica exactamente el reclamo y el mismo `agentId`; solo ese reclamo deja de estar activo. El heartbeat registra la última señal observada según el reloj del emisor; **no** renueva una concesión ni libera reclamos. No hay caducidad automática: un proceso parado puede conservar su reclamo indefinidamente. La publicación del evento y la actualización de la proyección no son una sola transacción: si falla el comando, inspeccionad `events/` y ejecutad `rebuild` antes de reintentar para evitar crear eventos duplicados.

## Visor móvil y metadatos de presentación

La app es un visor estático: lee `orchestra/state.json` al arrancar y, si no está disponible, usa el snapshot de respaldo embebido en `app-core.js`. No escribe eventos, no modifica issues existentes y no ejecuta agentes. El único write posible es opcional: el formulario humano puede crear un issue nuevo si hay un token con `issues:write`. Para cambiar el estado hay que publicar eventos o trabajar en GitHub.

Campos pensados para la interfaz (todos opcionales salvo `projects`, `missions` y `agents`):

- `workspace`: `name`, `repo`, `timezone`, `replayMinutes` y `heartbeatMinutes`. Es información de contexto: el visor actual usa una ventana fija de 900 segundos (15 minutos) y el heartbeat real lo define el cron de cada agente.
- `projects[]`: además de `id`, `name` y `repo`, cada proyecto puede traer `color`, `progress`, `issuesOpen` y `room` = `{x, y, w, h}` en porcentajes del escenario isométrico. Cada cuarto debe mapear a un repo distinto y no superponerse con otro cuarto.
- `missions[]`: además de `id`, `projectId`, `title` y `status`, cada misión puede traer `dependsOn` (ids de otras misiones), `priority`, `labels`, `horizon`, `startDay`, `durationDays`, `assignee`, `issue` y `subtasks`/`totalSubtasks`. Las dependencias también se reflejan en `blockedBy` e `isBlocked` al proyectar.
- `agents[]`: `home` = `{x, y}` relativo al cuarto, `avatar` = `{bg, skin, hair, shirt, accessory}` y `bio`, `skills`, `model`, `heartbeatMinutes`, `lastAction`. `accessory` acepta `bob`, `curls`, `bun`, `cap`, `headset` o `glasses`; los avatares se generan como SVG en el cliente.
- `activity[]`: señales de presentación para el replay. Cada una tiene `id`, `agentId`, `projectId`, `type`, `text`, `agoSeconds` (0–900) y `spot` = `{x, y}` relativo al cuarto. Tipos reconocidos: `push`, `commit`, `comment`, `review`, `run`, `loop`, `test`, `heartbeat`, `idle`, `plan`, `search`, `note` y `approve`.
- `trello`: `boardName` y `columns` se usan solo como pistas del tablero de demo. El tablero real se lee de la API de Trello si el usuario configura credenciales.

`activity` **no** es el historial de coordinación. Es el guion visual del replay. Si querés que el visor refleje eventos reales, generá esas señales desde los eventos y los commits, o actualizá `activity` explícitamente. Mantené `agoSeconds` dentro de la ventana de 15 minutos; la app recorta valores fuera de rango.

El frontend no tiene build: `index.html` carga `styles.css` y los módulos `app-core.js`, `app-home.js`, `app-world.js`, `app-missions.js`, `app-agents.js`, `app-plan.js`, `app-command.js` y `app-actions.js` en ese orden. Las rutas usan hash (`#/missions`, `#/missions/mission/{id}`, `#/agents/agent/{id}`, `#/world/project/{id}`) y la command palette se abre con `⌘K` o `Ctrl K`. Al modificar CSS o JS, subí el query string de versión (`?v=N`) para evitar cachés viejas en el navegador.

## Compartir y reconciliar

1. Acordad un repositorio remoto y una única rama de coordinación protegida contra pushes forzados. Antes de actuar, sincronizad esa rama y reconstruid la vista. Un heartbeat o reclamo que solo existe localmente no es visible para otros.
2. Para reclamar, generad el evento, añadid el nuevo archivo de `events/` y la proyección a Git, haced commit y publicad en la rama compartida **antes de empezar**. Todos los participantes deben seguir esta disciplina. Verificad tras publicar que la rama compartida contiene vuestro reclamo y que la proyección sincronizada indica `claimed`, sin advertencias. La aceptación de un push normal a la rama compartida serializa las actualizaciones de esa referencia, pero Git por sí mismo no valida las reglas del protocolo.
3. Si el push falla por cambios remotos, no trabajéis todavía: integrad la rama remota, conservad todos los eventos, reconstruid `state.json` y examinad el resultado. Dos reclamos simultáneos de una misión se muestran como `conflict`, sin elegir ganador por reloj ni orden de archivos. Los agentes deben detenerse y acordar quién continúa; cada reclamante que ceda libera su propio `claimId`, publica esa liberación y todos vuelven a sincronizar. Si nadie debe continuar, todos liberan. Un solo reclamo restante no demuestra por sí solo que el otro proceso haya parado.
4. Al terminar o abandonar, liberad el reclamo, commit y push; sincronizad los demás. Comunicad los resultados del trabajo por separado: liberar no significa que la misión esté completada.

`state.json` es un archivo derivado compartido y es normal que entre en conflicto al hacer merge. Conservad `seed.json` y **todos** los eventos válidos de ambas ramas, resolved cualquier conflicto real en seed con acuerdo humano y ejecutad `python3 orchestra/coord.py rebuild`; añadid el resultado como resolución. No resolváis un conflicto de eventos descartando silenciosamente un reclamo. Los eventos no deben editarse ni borrarse durante la operación normal. Si hay historial inválido, registro de identidad duplicado o referencias desconocidas, `protocol.warnings` invalida la disponibilidad de todas las misiones; investigad y reparad con acuerdo y auditoría antes de seguir.

Si un agente desaparece, coordinad fuera del protocolo y verificad que realmente se ha detenido antes de acordar una liberación administrativa. La CLI permite escribirla usando su `agentId` y el `claimId`; dejad constancia humana de la autorización en el commit. Esto es posible precisamente porque las identidades no están autenticadas. No interpretéis un heartbeat antiguo como prueba de muerte: los relojes pueden estar desajustados, las máquinas desconectadas y los eventos sin publicar.

## Trello como espejo de solo lectura

Trello es opcional y **no participa** del protocolo de reclamo. El tablero sirve para que un humano vea en vivo qué dicen y hacen los agentes. La app pide `key`, `token` y `board ID` y los guarda solo en `localStorage`; con esos datos lee listas, cartas y acciones recientes. No mueve cartas ni comenta.

Buenas prácticas:

- usá un token con permisos de lectura y, si es posible, un tablero dedicado;
- no publiques una deployment con el token en el cliente: montá un proxy de solo lectura;
- si los agentes escriben en Trello, que comenten con un prefijo `[agent-<id>]` y que el movimiento de listas refleje el estado, no el reclamo;
- la exclusión real sigue viviendo en el evento `claim` pusheado al repo.

Sin credenciales, la app muestra un tablero de demo armado con `missions` y `activity`. Ese modo es útil para desarrollar la interfaz, pero no demuestra que Trello esté conectado.

## Límites importantes

- Dos clones pueden reclamar simultáneamente y ambos creer que tienen exclusividad hasta que se sincronicen; incluso los controles de la CLI tienen una ventana de carrera entre lectura y escritura. La reconciliación detecta conflictos visibles, no impide trabajo duplicado ni protege recursos externos. Para exclusión fuerte hace falta un servicio de bloqueo o transacciones externas con autenticación y, cuando corresponda, fencing tokens.
- Git no distribuye eventos automáticamente ni impide eventos falsificados o commits que violen la disciplina. Cualquier escritor puede hacerse pasar por otro agente. Usad permisos, revisión y firmas de commits según las necesidades del proyecto.
- Las marcas de tiempo provienen de cada máquina y solo sirven como información; se toma la mayor para el último heartbeat, no para resolver propiedad. El estado puede estar obsoleto o diferir entre ramas. La aplicación debe tratar `conflict`, `unknown` y advertencias como condiciones inseguras y no asumir exclusividad.
- `seed.json` y el historial deben ser consistentes y mantenerse juntos. Modificar o eliminar identidades o misiones referenciadas produce advertencias. El protocolo valida las dependencias declaradas en `dependsOn`, pero no impone permisos, transiciones de estado ni asignación automática de trabajo.
