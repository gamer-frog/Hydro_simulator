# PlayGround

<!-- omgithub:readme:start -->
## 🚀 Build, play, and remix with OMGithub

**Created using [OMGithub.com](https://go.ondev.store/).**

[![OMGithub](https://img.shields.io/badge/OMGithub-Open%20project-orange?style=for-the-badge)](https://go.ondev.store/gamer-frog/PlayGround)
[![GitHub](https://img.shields.io/badge/GitHub-Source-181717?logo=github&style=for-the-badge)](https://github.com/gamer-frog/PlayGround)

- 🎮 [Open the project](https://go.ondev.store/gamer-frog/PlayGround).
- ✨ [Remix this project](https://go.ondev.store/gamer-frog/PlayGround?remix=1).
- 💻 [Explore the source](https://github.com/gamer-frog/PlayGround).
- 🛠️ [Check build runs](https://github.com/gamer-frog/PlayGround/actions).
- 🐛 [Report an issue](https://github.com/gamer-frog/PlayGround/issues).
- 👤 [Explore the creator's projects](https://go.ondev.store/gamer-frog).
- 🌍 [Create with OMGithub](https://go.ondev.store/).
<!-- omgithub:readme:end -->

## Combate de prueba

Prototipo web de combate inspirado en Argentum Online. Renderiza el mapa y los personajes con el subconjunto de recursos disponible en `assets/ao/`; permite desplazarse por casilleros y luchar contra bots con ataques cuerpo a cuerpo y habilidades de clase. El balance y los valores de pociones son provisionales, no datos verificados de Argentum Online ni de Imperium AO.

### Controles

- **Flechas o WASD:** moverse por el mapa, un casillero por paso.
- **Clic sobre un rival / Tab:** seleccionar objetivo. El clic sobre un rival con una habilidad ofensiva seleccionada apunta y la lanza; elegirlo desde la lista solo cambia el objetivo.
- **Clic en un hechizo o teclas 1–5:** seleccionar o cancelar una habilidad. Para Sanar, Curación y Remo, seleccioná la habilidad y hacé clic sobre tu propio personaje; las habilidades ofensivas apuntan a un rival.
- **F o Enter / botón ATACAR:** ataque cuerpo a cuerpo al objetivo cuando esté adyacente; es una acción separada de seleccionar objetivo o habilidad.
- **Q / E:** consumir una poción roja de vida / azul de maná. Los contadores se actualizan al usarla; Nueva partida restaura tres de cada tipo.
- **Botón Combatientes:** abrir o cerrar la tabla de combatientes (inicia cerrada); **Esc** cierra el panel o la guía.
- **☰:** pausar o reanudar.
- En pantallas táctiles, usá el pad en pantalla para moverte y los botones para atacar, lanzar habilidades y usar pociones.

Para probarlo, serví esta carpeta desde un servidor HTTP local (por ejemplo, `python3 -m http.server`) y abrí la dirección local en el navegador. Los recursos se cargan como JSON e imágenes, así que no abras `index.html` directamente como archivo.
