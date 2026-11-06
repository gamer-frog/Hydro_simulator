# Conductor — análisis competitivo y lista de features para copiar

**Fecha de relevamiento:** 6 de noviembre de 2026  
**Método:** lectura de READMEs públicos, metadata de GitHub y documentación pública de producto.  
**Alcance:** 14 proyectos de orquestación de agentes, workflows, datos y observabilidad.

## Nota de clean-room

Este documento es un análisis de **comportamiento observable y patrones de producto**.
No se copió código, estructura interna, assets ni textos propietarios. Las ideas se
traducen a requisitos propios para Conductor, que sigue siendo un visor móvil de solo
lectura con GitHub como fuente de verdad.

La investigación se hizo sobre material público. Las estrellas son una señal de
atención de la comunidad, no una medida de adopción enterprise ni de calidad.

## Snapshot del relevamiento

| Proyecto | Stars | Licencia | Categoría principal |
| --- | ---: | --- | --- |
| n8n | 209.672 | NOASSERTION | Automatización visual + agentes |
| Dify | 160.521 | NOASSERTION | Plataforma LLM / agentes / workflows |
| OpenHands | 92.784 | MIT | Agente de software autónomo |
| MetaGPT | 71.190 | MIT | Multi-agente con SOPs |
| AutoGen | 61.725 | CC-BY-4.0 | Multi-agente conversacional |
| CrewAI | 60.560 | MIT | Crews y flows de agentes |
| Flowise | 55.556 | NOASSERTION | Canvas low-code para LLMs |
| Airflow | 47.385 | Apache-2.0 | Orquestación de DAGs |
| LangGraph | 44.549 | MIT | Grafos de agentes con estado |
| OpenAI Agents SDK | 30.526 | MIT | SDK de agentes, handoffs y tracing |
| Temporal | 24.221 | MIT | Durable execution |
| Prefect | 24.120 | Apache-2.0 | Orquestación Python-native |
| Dagster | 16.374 | Apache-2.0 | Orquestación de assets y datos |
| AgentOps | 5.950 | MIT | Observabilidad y replay de agentes |

## Los 12 patrones que se repiten

1. **Canvas o grafo visible.** n8n, Dify, Flowise, LangGraph, Airflow y Dagster
   muestran el flujo como una forma navegable. El usuario entiende el sistema antes
   de leer logs. Para Conductor: el estudio isométrico ya cumple ese rol, pero debe
   conservar la relación “cuarto = repo = unidad de trabajo”.
2. **Historial de ejecuciones.** Temporal, Prefect, Airflow, Dagster, n8n y AgentOps
   separan “ahora” de “qué pasó”. Para Conductor: replay de 15 minutos + deep links
   + última señal por agente. Falta una vista de corrida individual con intentos.
3. **Trazas y spans.** LangGraph/LangSmith, AgentOps y OpenAI Agents SDK muestran
   la jerarquía sesión → workflow → agente → operación. Para Conductor: el evento
   Git es el span de coordinación; la actividad visual es otra capa. No conviene
   mezclarlas.
4. **Observabilidad operativa.** Prefect, Dagster, Airflow y AgentOps priorizan
   frescura, duración, errores, warnings y costo. Para Conductor: panel de ops
   health con heartbeat, claims, conflictos y warnings.
5. **Human-in-the-loop.** LangGraph, n8n, Airflow, CrewAI y OpenAI Agents SDK
   ofrecen pausas, aprobaciones o revisiones. Para Conductor: la aprobación natural
   es un comentario o label en el issue; la app solo debe mostrar el estado.
6. **Reintentos, timeouts e idempotencia.** Temporal, Prefect, Airflow y Dagster
   convierten los fallos en estados visibles. Para Conductor: falta mostrar
   “intento N”, “último error” y “próximo reintento” por misión/loop.
7. **Schedules y triggers.** Todos los orquestadores tienen cron, eventos o
   sensores. Para Conductor: los loops ya existen; falta una señal clara de
   “corrió / falló / próximo”.
8. **Versionado y entornos.** Dify, n8n, Prefect, Airflow y Dagster permiten
   versionar flujos, prompts o deployments. Para Conductor: el repo ya versiona
   todo; falta exponer “qué snapshot estoy viendo” y comparar dos snapshots.
9. **Registro de agentes, tools y memoria.** CrewAI, AutoGen, OpenAI Agents SDK y
   MetaGPT modelan roles, handoffs, tools y memoria. Para Conductor: Agent Agency
   cubre identidad y skills; falta declarar tools/permisos y handoffs.
10. **Templates y marketplace.** n8n, Dify, Flowise y CrewAI reducen el tiempo
    hasta el primer flujo. Para Conductor: una galería de misiones/loops
    prearmados encaja mejor que un marketplace.
11. **Alertas y notificaciones.** Airflow, Prefect, Dagster y n8n permiten enviar
    fallos a Slack/email/webhook. Para Conductor: un issue es la alerta; la bandeja
    “necesita atención” resume conflictos, warnings, bloqueos y heartbeats vencidos.
12. **SDK, CLI y self-hosting.** Temporal, Prefect, Airflow, n8n y OpenHands
    ofrecen una vía programática además de la UI. Para Conductor: `coord.py` es la
    CLI; el siguiente paso es documentar un contrato estable para agentes.

## Matriz de capacidades

| Capacidad | Dónde se ve mejor | Qué copiar a Conductor | Estado |
| --- | --- | --- | --- |
| Canvas / grafo visual | n8n, Dify, Flowise, LangGraph | Estudio isométrico por repo; foco en relaciones, no en nodos | **Tiene** |
| Run history | Temporal, Prefect, Airflow, Dagster | Replay de 15 min por agente | **Parcial** |
| Trazas / spans | AgentOps, LangGraph, OpenAI SDK | Traza de misión: claim → branch → commit → review → release | **Gap** |
| Logs y errores | Todos | Última señal + warnings del protocolo | **Parcial** |
| Costo / tokens | AgentOps, Dify | Costo estimado por misión/agente | **Gap** |
| Human approval | LangGraph, n8n, Airflow | Aprobación por label/comentario de issue | **Parcial** |
| Retries / timeouts | Temporal, Prefect, Dagster | Estado de intento y próximo reintento | **Gap** |
| Schedules / triggers | Airflow, Prefect, n8n | Loops con última corrida y próximo run | **Parcial** |
| Versionado / entornos | Dify, n8n, Prefect, Airflow | Snapshot versionado + diff de estado | **Gap** |
| Agent registry | CrewAI, AutoGen, OpenAI SDK | Agent Agency con skills y tools | **Parcial** |
| Handoffs | OpenAI SDK, CrewAI, MetaGPT | Transferencia explícita entre agentes | **Gap** |
| Templates | n8n, Dify, Flowise, CrewAI | Galería de misiones y loops prearmados | **Gap** |
| Alertas | Airflow, Prefect, Dagster, n8n | Bandeja “necesita atención” | **Implementado** |
| RBAC / secrets | Airflow, Dify, n8n | Proxy de solo lectura para producción | **Gap** |
| SDK / CLI | Temporal, Prefect, n8n, OpenHands | `coord.py` + contrato de eventos | **Tiene** |
| Self-hosting | Flowise, n8n, Dify, OpenHands | Servidor estático + repo | **Tiene** |
| Command palette | n8n, Dify, Flowise (búsqueda global) | Búsqueda de vistas, repos, agentes y misiones | **Implementado** |
| Deep links | n8n, Dify, Prefect | URL por vista y ficha | **Implementado** |
| Dependencias / blocked | Airflow, Dagster, Temporal | `dependsOn` + gate de claim | **Implementado** |
| Ops health | Dagster, Prefect, AgentOps | Heartbeat, claims, warnings, last sync | **Implementado** |
| Auto-refresh | Prefect, Dagster, n8n | Polling visible cada 60 s + last sync | **Implementado** |

## Lectura por producto

### n8n

**Qué hace bien:** canvas de nodos, ejecuciones paso a paso, templates, credenciales
separadas del workflow, reintentos y una UX de automatización muy directa.
**Copiar:** la idea de “ejecución reciente” siempre a un clic; el catálogo de
templates; la separación entre dato, credencial y presentación.
**No copiar:** la densidad de nodos y configuración en móvil. Conductor debe
mostrar consecuencias, no construir workflows desde el teléfono.

### Dify

**Qué hace bien:** studio de prompts/agentes, workflows, observabilidad, costo de
tokens, RBAC, despliegue y una capa de producto muy completa sobre el motor.
**Copiar:** el panel de observabilidad; el concepto de “app publicada” con versión;
la separación entre autoría y operación.
**No copiar:** la superficie de administración. El humano de Conductor pide trabajo
en GitHub, no administra la plataforma desde el visor.

### Flowise

**Qué hace bien:** canvas low-code, componentes reutilizables, embed/share y
self-hosting simple. **Copiar:** la curva de entrada y la idea de componentes
reutilizables. **No copiar:** el canvas como única interfaz; en móvil pierde valor
frente a una lista o un mapa espacial.

### LangGraph

**Qué hace bien:** estado explícito, grafos, checkpoints, human-in-the-loop,
time travel y observabilidad con trazas. **Copiar:** el concepto de checkpoint y
la posibilidad de inspeccionar “por qué se tomó esta decisión”. **No copiar:** la
jerga de nodos/edges; Conductor debe hablar de misiones, agentes y evidencia.

### CrewAI

**Qué hace bien:** roles, crews, flows, triggers y un control plane con trazas y
métricas. **Copiar:** la ficha de rol (objetivo, backstory, tools) y el handoff
explícito. **No copiar:** la metáfora de “empresa” como única forma de organizar;
Conductor ya tiene repos y cuartos.

### AutoGen

**Qué hace bien:** patrones de conversación multi-agente, ejecución de código,
MCP y un Studio no-code. **Copiar:** la noción de patrón de colaboración y el
registro de herramientas. **No copiar:** conversaciones largas como unidad de
visualización; el usuario necesita resultado y evidencia, no el chat completo.

### OpenAI Agents SDK

**Qué hace bien:** handoffs, guardrails, sesiones, tracing y una API pequeña.
**Copiar:** guardrails visibles como estado de misión; handoffs como transferencia
explícita; tracing como traza de ejecución. **No copiar:** la dependencia de un
proveedor único en la UI.

### Temporal

**Qué hace bien:** ejecución durable, retries, timeouts, versionado y visibilidad
de workflows. **Copiar:** el vocabulario de intento, timeout y estado durable.
**No copiar:** la complejidad de workers y namespaces en la primera pantalla.

### Prefect

**Qué hace bien:** flows Python-native, scheduling, retries, UI de runs, alerts y
deployments. **Copiar:** la lista de runs con estado y duración; los alerts como
“necesita atención”. **No copiar:** el modelo de deployments si el repo ya es el
deployment.

### Airflow

**Qué hace bien:** DAGs, grid/history, SLA alerts, RBAC y providers. **Copiar:** la
vista de historial por intervalo y la noción de SLA. **No copiar:** la densidad de
operadores y configuración; en Conductor el “operador” es un agente.

### MetaGPT

**Qué hace bien:** SOPs, roles, artefactos y handoff entre etapas. **Copiar:** la
idea de que cada rol produce un artefacto verificable. **No copiar:** la simulación
de empresa completa; Conductor debe mantenerse cerca del repo real.

### OpenHands

**Qué hace bien:** runtime sandbox, sesiones, delegación multi-agente y una UI de
trabajo. **Copiar:** la sesión como unidad de evidencia y el sandbox como límite
de confianza. **No copiar:** la UI de edición de código; Conductor solo observa.

### AgentOps

**Qué hace bien:** session replay, spans, costo/tokens, integraciones y self-hosting.
**Copiar:** el replay como producto de primera clase y el desglose de costo.
**No copiar:** la instrumentación pesada; Conductor ya tiene eventos Git.

### Dagster

**Qué hace bien:** assets, lineage, particiones, run history, schedules y sensores.
**Copiar:** lineage entre misión/dependencia/artefacto; salud de frescura; historial
por partición (repo/semana). **No copiar:** la terminología de assets si confunde
al usuario final.

## Qué tiene Conductor hoy

- Un mapa espacial de cuatro repos con agentes que se mueven según su última señal.
- Replay de 15 minutos con scrubber, velocidad y loop de la última acción.
- Issues de GitHub en vivo, con fallback al snapshot del repo.
- Agent Agency con identidad, rol, skills, modelo, avatar y última señal.
- Mission board con máquina de estados, filtros por repo y hoja de detalle.
- Plan corto/medio/largo, Gantt y loops recurrentes.
- Trello como espejo de solo lectura del machine state.
- Protocolo de coordinación event-sourced con claims, conflictos y warnings.
- Onboarding estándar para agentes nuevos.

## Qué se implementó en esta iteración

Estas cinco features salieron del análisis y son compatibles con el modelo
read-only:

1. **Command palette (`⌘K` / `Ctrl K`).** Búsqueda global de vistas, repos,
   agentes, misiones y acciones. Copia el patrón de “todo está a un atajo” de n8n,
   Dify y Prefect, sin agregar administración.
2. **Deep links por hash.** `#/missions`, `#/missions/mission/{id}`,
   `#/agents/agent/{id}`, `#/world/project/{id}`. Permite compartir una ficha o
   volver con el botón atrás. Inspirado en la navegabilidad de n8n/Dify/Prefect.
3. **Dependencias y estado bloqueado.** `dependsOn` en el seed, `blockedBy` e
   `isBlocked` en la proyección, badge y sección de dependencias en la ficha, y
   rechazo del claim en `coord.py`. Inspirado en los gates de Airflow/Dagster.
4. **Ops health + auto-refresh.** Panel con fuente, frescura de heartbeats, claims,
   conflictos, warnings y última sincronización. El snapshot se refresca cada 60 s
   y muestra “hace X” en la app. Inspirado en Dagster/Prefect/AgentOps.
5. **Bandeja “necesita atención”.** Prioriza warnings de protocolo, claims en
   conflicto, heartbeats vencidos de agentes ocupados y misiones bloqueadas; cada
   elemento enlaza a su ficha cuando corresponde.

## Roadmap priorizado

### P1 — siguiente iteración

| Feature | Inspiración | Por qué | Esfuerzo |
| --- | --- | --- | --- |
| Traza de misión | AgentOps, LangGraph | Ver claim → branch → commit → review → release en una sola línea de tiempo | M |
| Intentos y reintentos | Temporal, Prefect | Mostrar intento actual, último error y próximo reintento | M |
| Costo/tokens por misión | AgentOps, Dify | Dar contexto de eficiencia sin abrir otra herramienta | M |
| Aprobación humana visible | LangGraph, n8n, Airflow | Mostrar “esperando aprobación” con link al issue/comentario | S |
| Historial de loops | Airflow, Prefect | Última corrida, duración, resultado y próximo run | S |

### P2 — mediano plazo

| Feature | Inspiración | Por qué | Esfuerzo |
| --- | --- | --- | --- |
| Galería de templates | n8n, Dify, Flowise | Pedir una misión recurrente en segundos | M |
| Handoffs entre agentes | OpenAI SDK, CrewAI, MetaGPT | Visualizar transferencia y responsabilidad | M |
| Tools y permisos por agente | CrewAI, OpenAI SDK | Hacer explícito qué puede tocar cada agente | M |
| Snapshot versionado / diff | Dify, n8n, Prefect | Comparar dos estados del studio | M |
| Alertas y webhooks | Airflow, Prefect, Dagster | Llevar fallos a Slack/email sin abrir la app | S |
| Proxy de lectura para producción | Dify, n8n, Airflow | Evitar credenciales en el navegador | M |
| Vista de lineage repo → misión → artefacto | Dagster | Explicar impacto de una dependencia | M |

### P3 — exploratorio

- Multi-workspace real con RBAC.
- Comparación de snapshots entre ramas.
- Exportar un run como reporte compartible.
- Integración con MCP para que un agente consulte el estado sin scrapear la UI.
- Métricas de calidad por agente (review pass rate, retrabajo, tiempo a merge).

## Qué no copiar

- **Canvas-first en móvil.** Un grafo editable no cabe ni se entiende bien en 390 px.
  El estudio isométrico es la metáfora correcta para este producto.
- **Administración de credenciales en el cliente.** Trello ya está en modo demo y
  documentado como riesgo; la solución de producción es un proxy de solo lectura.
- **Chat como historial principal.** El usuario quiere estado, evidencia y bloqueos,
  no transcripciones.
- **Complejidad de workers/namespaces/operadores.** Conductor debe ocultar la
  infraestructura y mostrar consecuencias.
- **Código o assets de otros proyectos.** Solo se copian patrones de interacción.

## Principios de UX para la próxima iteración

1. **Una cosa urgente por pantalla.** Si hay un conflicto o un heartbeat vencido,
   debe ganarle al resumen decorativo.
2. **Siempre mostrar la fuente.** `state.json`, GitHub live o demo; nunca fingir
   tiempo real.
3. **Deep link primero.** Cada ficha debe poder compartirse y sobrevivir un reload.
4. **Acciones reversibles.** El visor no edita; las acciones abren GitHub o copian
   un link.
5. **Vocabulario del repo.** Misión, issue, claim, release, heartbeat, bloqueo.
   Evitar “nodo”, “operator” o “namespace” salvo en documentación técnica.
6. **Mobile-first, desktop-cómodo.** El pulgar llega al bottom nav; el teclado llega
   a `⌘K`.

## Riesgos y sesgos del análisis

- Los READMEs son material de marketing: destacan lo nuevo y omiten límites.
- Las estrellas premian visibilidad, no necesariamente robustez operativa.
- Varias licencias aparecen como `NOASSERTION`; antes de reutilizar cualquier
  recurso hay que revisar el repositorio y sus términos.
- La comparación mezcla SDKs, plataformas y motores de datos. Se usaron solo
  patrones de producto, no equivalencias técnicas.
- La app no tiene datos reales de uso; las prioridades P1/P2 son hipótesis a validar
  con quien opera el workspace.

## Referencias

- Repositorios y READMEs públicos de los 14 proyectos listados.
- Documentación pública de producto de cada plataforma.
- Snapshot de metadata consultado el 6 de noviembre de 2026.
- Protocolo propio: `ORCHESTRATION.md` y `orchestra/AGENT_ONBOARDING.md`.
