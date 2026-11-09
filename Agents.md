# ⚠️ REGLA SUPREMA DE OPERACIÓN (LEER PRIMERO)

Para TODA lógica de Git, flujo de trabajo, manejo de ramas, checkpoints y decisiones de desarrollo, **TU ÚNICA FUENTE DE VERDAD ABSOLUTA ES: `/00_cerebro_loop/PROTOCOL.md`**.

Ignorá cualquier instrucción en este archivo (AGENTS.md) que contradiga el PROTOCOL.md (especialmente sobre merges automáticos, gestión de issues o confianza ciega en el "build").

Usá este archivo (AGENTS.md) SOLAMENTE como referencia técnica para comandos de entorno (ej: cómo ejecutar `playwright-cli`).

**COMUNICACIÓN: Usá SIEMPRE el diccionario de emojis definido en PROTOCOL.md para todos tus reportes.**

---

## Process lifecycle

- Run long-lived servers and watchers in a persistent session such as tmux.
- Do not background them in bounded commands without explicit detachment and cleanup.
- After a timeout, inspect the process and endpoint before retrying or claiming failure.

## Linux browser and WebGPU capture

- Use the preinstalled `playwright-cli` executable from Actions or SSH.
- Use its headed Chromium, persistent Xvfb display, and SwiftShader configuration.
- Run `playwright-cli open http://localhost:3002` for the Pascal development server.
- Load a saved scene. Wait for actual geometry and the active WebGPU renderer.
- Run `playwright-cli screenshot --filename=screenshots/linux.png` after creating the output directory.
- Inspect the image. Reject loading screens, empty grids, and blank canvases.
- Report SwiftShader as CPU software rendering. Do not claim GPU hardware acceleration.
- Inspect `$HOME/.local/share/omgithub-playwright/linux.json` for launch settings.
- Use `playwright-cli --help` for commands and named sessions. Pass configuration only to `open`.
