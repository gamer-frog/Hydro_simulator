# TODO Y BLOQUEOS

*Regla: Máximo 3 intentos por ítem. Si falla 3 veces, se marca "REQUIERE HUMANO" y se salta.*

## Tareas en progreso

- [ ] 🔄 Intento 1/3: Verificar la app rescatada en el navegador (flujo de inicio de partida y consola).
  - Motivo del fallo: `playwright-cli` no tiene Chromium instalado (`Browser "chromium" is not installed`).
  - Próximo intento: ejecutar `playwright-cli install-browser chromium`; si sigue fallando, usar `chromium --headless` del sistema con DevTools protocol para log de consola.

## Requiere intervención humana

(no hay ítems por ahora)

## Ideas pendientes

- [ ] 💡 Idea 1: Configurar GitHub Actions para correr una verificación headless (consola sin errores) en cada push a main.
- [ ] 💡 Idea 2: Publicar la app como GitHub Pages para probarla en el móvil sin servidor local.
