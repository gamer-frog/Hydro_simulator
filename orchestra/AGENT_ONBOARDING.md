# Unirse al sistema como agente

Este es el camino estándar para cualquier agente que quiera trabajar en el workspace. No requiere un servidor: las identidades, los reclamos y los heartbeats son eventos versionados en Git. La app móvil es un visor de solo lectura.

## Antes de empezar

Necesitás:

- acceso de escritura a la rama compartida de coordinación (por ejemplo `main`);
- Python 3 y Git;
- una identidad única y estable; usá la que el equipo te asigne (si no hay una, acordá `agent-<nombre>` en minúsculas);
- una branch de trabajo propia por misión.

No uses un id genérico como `agent`, `bot` o `worker`. No compartas una identidad entre dos procesos.

## 1. Identidad

Acordá con el humano:

- `id` estable: `agent-luna`
- nombre visible: `Luna`
- rol: `planner`, `builder`, `researcher`, `reviewer`, `operator` o `qa`
- repo principal: por ejemplo `gamer-frog/PlayGround`

La ficha visual (avatar, skills y cuarto) se puede sumar en `orchestra/seed.json`. La fuente de verdad de la coordinación es la identidad y los eventos.

## 2. Identidades iniciales de OpenRouter

Estas dos identidades ya están declaradas como eventos `register` en el blackboard. Usá solo la que te asignaron; son identidades separadas, no aliases intercambiables:

| Agente | ID exacto | Nombre visible | Rol inicial |
| --- | --- | --- | --- |
| Gamer Frog | `gamer-frog-openrouter` | Gamer Frog (OpenRouter) | `agent` |
| Frog Estudio | `frog-estudio-openrouter` | Frog Estudio (OpenRouter) | `agent` |

No agregues el prefijo `agent-` ni cambies mayúsculas, guiones o nombre al usar esos IDs. Si trabajás con otro agente, primero acordá una identidad distinta con el humano. Registrar no autentica: cada proceso debe usar únicamente el ID que le fue asignado.

## 3. Registro de otros agentes

Para agentes nuevos que no estén en la lista anterior, publicá un evento de registro:

```sh
python3 orchestra/coord.py register agent-luna --name "Luna" --role planner
git add orchestra/events orchestra/state.json
git commit -m "agents: registra agent-luna"
git pull --rebase
git push
```

Registrar no autentica. El equipo debe proteger la rama y revisar los commits.

## 4. Sincronización obligatoria

Antes de leer trabajo o reclamar:

```sh
git pull --rebase
python3 orchestra/coord.py rebuild
cat orchestra/state.json
```

Si `protocol.warnings` no está vacío, detenete. La proyección no es segura.

## 5. Heartbeat cada 15 minutos

El cron del agente debe despertarlo cada 15 minutos. En cada despertar:

```sh
git pull --rebase
python3 orchestra/coord.py heartbeat agent-luna
# leer orchestra/state.json y los issues de GitHub
```

El heartbeat no reserva una misión, no renueva un reclamo y no demuestra que otro agente esté muerto. Es una señal de actividad.

Un ejemplo de crontab (ajustá rutas y usuario):

```cron
*/15 * * * * cd /srv/conductor && ./scripts/agent-tick.sh >> /var/log/conductor-agent.log 2>&1
```

El tick debe ser idempotente: si no hay trabajo, solo late y termina.

## 5. Reclamar una misión

Solo después de sincronizar:

```sh
python3 orchestra/coord.py claim agent-luna mission-onboarding
git add orchestra/events orchestra/state.json
git commit -m "claim: agent-luna toma mission-onboarding"
git pull --rebase
git push
```

Conservá el `claimId` que imprime el comando.

**La regla importante:** publicá el claim en la rama compartida **antes** de empezar. Si el push falla, no empieces: integrá los cambios remotos, reconstruí y revisá si hay conflicto.

Si `state.json` marca `conflict`, ningún agente debe avanzar. Los que ceden liberan su propio `claimId`; el resto espera una nueva sincronización.

## 6. Trabajar

- Hacé el trabajo en una branch propia: `agent/luna/mission-onboarding`.
- Commits pequeños y con evidencia de verificación.
- No edites `orchestra/events/` a mano.
- No modifiques `state.json` a mano: es una proyección generada.
- Si necesitás ayuda, comentá en el issue de GitHub. El issue es el canal humano; el repo es el estado.

## 7. Entregar y liberar

Al terminar:

```sh
# pushear la branch y abrir un PR
git push -u origin agent/luna/mission-onboarding

# liberar exactamente el claim que reclamaste
python3 orchestra/coord.py release agent-luna mission-onboarding CLAIM_ID
git add orchestra/events orchestra/state.json
git commit -m "release: agent-luna libera mission-onboarding"
git pull --rebase
git push
```

Liberar no significa que la misión esté terminada. El humano o el revisor cierran el issue después de verificar el resultado.

## Prompt de instalación para un agente nuevo

Copiá y pegá este bloque en el agente que va a unirse:

```text
Vas a unirte a Conductor, un workspace multiagente cuyo backend es este repositorio Git.

1. Leé orchestra/AGENT_ONBOARDING.md y ORCHESTRATION.md completos.
2. Tu identidad es agent-<TU_NOMBRE>. No uses otro id.
3. Sincronizá la rama compartida y ejecutá:
   python3 orchestra/coord.py rebuild
4. Revisá orchestra/state.json. Si protocol.warnings no está vacío, detenete.
5. Publicá un heartbeat con:
   python3 orchestra/coord.py heartbeat agent-<TU_NOMBRE>
6. Si hay una misión disponible y compatible con tu rol, reclamala:
   python3 orchestra/coord.py claim agent-<TU_NOMBRE> <mission-id>
   Hacé commit y push del evento ANTES de empezar.
7. Trabajá en una branch propia. No edites state.json ni events a mano.
8. Al terminar, pusheá el resultado, abrí un PR y liberá el claim exacto con release.
9. Si hay conflicto, no avances: liberá tu claim o esperá coordinación humana.
10. Reportá en GitHub issues. No escribas secretos en el repo.
```

## Tablero Trello (opcional)

Trello no participa del protocolo de exclusión. Es un espejo de lectura para humanos. Si el equipo lo usa:

- cada agente comenta en su carta con un prefijo `[agent-<id>]`;
- los movimientos de listas reflejan estados, no reclamos;
- la app lee el tablero con una API key y token guardados solo en el navegador;
- en producción, usá un proxy de solo lectura en lugar de exponer un token en el cliente.

La exclusión real sigue viviendo en el evento `claim` pusheado al repo.
