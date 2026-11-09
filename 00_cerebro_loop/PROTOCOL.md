# PROTOCOLO DE TRABAJO OBLIGATORIO (RALPH LOOP)

## REGLAS INQUEBRANTABLES

1. **NUNCA hagas `git merge` a ciegas de branches anteriores** (`opencode-checkpoints`, `opencode-resume`). Eso introduce errores de runtime como `TypeError: Cannot read properties of undefined`.

2. **SIEMPRE reconstruí los cambios leyendo el código** e implementándolo de forma compatible en tu branch actual. Si una branch anterior cambió un nombre de campo (ej: `type` → `characterType`), actualizá TODOS los usos.

3. **BUILD VERDE NO ES SUFICIENTE. SIEMPRE verificá en el navegador.**
   - Ejecutá: `playwright-cli open http://localhost:3002`
   - Abrí la consola del desarrollador
   - Si hay errores rojos → NO pushees

4. **Si ves en consola: `TypeError: Cannot read properties of undefined (reading 'type')`**, DETENETE. Es un error de estado.
   - Buscá en el código accesos a `.type` sin verificar
   - Cambialos por `?.type` o `if (!obj) return`
   - O revertí al último tag `save-NNN` que funcione: `git reset --hard save-XXX`

5. **PUSHEÁ A MAIN después de cada subtarea verificada en el navegador.**
   - `git add . && git commit -m "tipo(área): descripción"`
   - `git push origin HEAD:main` (Fast-forward)
   - Hito visible → `git tag save-NNN && git push origin save-NNN`

6. **IGNORÁ POR COMPLETO `gh` (GitHub CLI).** Usá solo comandos `git`. No te detengas por errores de autenticación de `gh`.

7. **CÓDIGO DEFENSIVO OBLIGATORIO:**
   - NUNCA accedas a `obj.prop` sin verificar
   - SIEMPRE usá: `obj?.prop ?? default` o `if (!obj) return null;`
   - Si cambiás un nombre de campo, actualizá TODOS los usos en el mismo commit

## VERIFICACIÓN ANTES DE CADA PUSH

Antes de hacer `git push origin HEAD:main`:
1. Ejecutá la app en el navegador
2. Abrí la consola del desarrollador
3. Confirmá que NO hay errores rojos ni TypeErrors
4. Solo entonces pusheá

## GESTIÓN DE RAMAS ANTERIORES

Si existen branches `opencode-checkpoints/*` o `opencode-resume/*`:
- **NO las mergees a ciegas**
- Revisá qué cambios tienen: `git diff main..origin/opencode-checkpoints/N`
- Leé el código y entendé qué hace
- Reconstruí los cambios de forma compatible en tu branch actual
- Verificá en el navegador
- Si funciona → pusheá a main
- Si NO funciona → documentalo en TODO.md y saltalo
- Una vez a salvo el código valioso, limpiá el remoto: `git push origin --delete <nombre-rama>`

## 📋 DICCIONARIO DE EMOJIS (COMUNICACIÓN OBLIGATORIA)

**USÁ ESTOS EMOJIS EXACTOS EN TODOS TUS REPORTES. NO INVENTES OTROS.**

### Estados de Tareas
- 🚀 **Iniciando tarea** → `🚀 [P0/A/B/C/D] Tarea X | Comenzando`
- ✅ **Tarea completada exitosamente** → `✅ Tarea X | Navegador limpio | Push a main completado`
- ⚠️ **Advertencia o problema menor** → `⚠️ Tarea X | Problema menor | Continuando`
- ❌ **Tarea falló** → `❌ Tarea X falló (3 intentos) | Movida a TODO.md | Continuando`
- 🔄 **Reintentando** → `🔄 Tarea X | Intento N/3 | [motivo del reintento]`

### Estados del Sistema
- 🟢 **Navegador/Build verde** → `🟢 Navegador limpio | Sin errores`
- 🔴 **Navegador/Build rojo** → `🔴 Navegador con errores | [detalle del error]`
- 🛑 **Detenido por emergencia** → `🛑 DETENIDO | [motivo] | Requiere intervención`

### Estados de Git
- 📤 **Push exitoso** → `📤 Push a main completado | Commit: [hash]`
- 🏷️ **Tag creado** → `🏷️ Tag save-NNN creado | Commit: [hash]`
- 🔀 **Merge/Reconstrucción** → `🔀 Reconstruyendo cambios de branch X | Estado: [progreso]`
- 🗑️ **Branch eliminada** → `🗑️ Branch X eliminada del remoto`

### Estados del Cerebro
- 🧠 **Cerebro actualizado** → `🧠 HANDOFF.md actualizado | Próximo paso: [descripción]`
- 📝 **Archivo creado/modificado** → `📝 [archivo] creado/modificado | Contenido: [resumen]`

### Estados de Nacimiento
- 🏗️ **Infraestructura creada** → `🏗️ [componente] creado | Estado: [OK/Error]`
- 🎯 **Fundación completada** → `🎯 FUNDACIÓN COMPLETADA | Cerebro listo | Main actualizado`

### Estados de Rescate
- 🔍 **Analizando branch** → `🔍 Analizando branch X | Cambios: [descripción]`
- 🛠️ **Reconstruyendo código** → `🛠️ Reconstruyendo cambios de X | Progreso: [N/M archivos]`
- 💾 **Código rescatado** → `💾 Código de branch X rescatado | Push a main: [OK/Error]`

### Estados de Error
- 🐛 **Bug detectado** → `🐛 Bug detectado: [descripción] | Archivo: [ruta]`
- 💥 **TypeError** → `💥 TypeError: [detalle] | Acción: [revertir/arreglar]`
- 🚨 **Error crítico** → `🚨 ERROR CRÍTICO: [descripción] | Deteniendo loop`

### Formato de Reporte Completo
🚀 [C] Revisar optional chaining | Comenzando
🔍 Analizando archivos: game.js, dist/game.js
🛠️ Agregando ?. en 15 accesos
🟢 Navegador limpio | Sin errores
📤 Push a main completado | Commit: abc1234
🧠 HANDOFF.md actualizado | Próximo paso: Siguiente tarea del roadmap
✅ [C] Revisar optional chaining | Completado | 15 fixes aplicados

**REGLA: Usá SIEMPRE el mismo emoji para el mismo estado. No mezcles emojis. No inventes nuevos.**
