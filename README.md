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

Prototipo web de combate inspirado en Argentum Online: renderiza el mapa y personajes con el subconjunto de recursos extraído en `assets/ao/`, permite desplazarse por tiles y enfrentar bots con ataques cuerpo a cuerpo.

### Controles

- **Flechas o WASD:** moverse por el mapa.
- **Clic sobre un personaje o en la lista / Tab:** seleccionar objetivo.
- **Clic en un hechizo o teclas 1–3:** seleccionar/cancelar; luego clic sobre un rival en el campo para lanzarlo. Elegir un rival desde la lista solo lo selecciona.
- **F o Enter:** atacar al objetivo cuando esté en un tile adyacente.
- **Botón Combatientes:** mostrar/ocultar el marcador; **Esc** cierra el panel (o la guía si está abierta).
- **☰:** pausar o reanudar.
- En pantallas táctiles, usá el pad en pantalla para moverte y el botón **ATACAR** para golpear.

Para probarlo, serví esta carpeta desde un servidor HTTP local (por ejemplo, `python3 -m http.server`) y abrí la dirección local en el navegador. Los recursos se cargan como JSON e imágenes, así que no abras `index.html` directamente como archivo.
