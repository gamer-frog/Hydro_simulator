/* Roadmap de Verde: el camino largo, escrito para no perderlo.
   Estados: done = en la app · now = en construcción · next = próximo · later = visión. */
window.ROADMAP = {
  version: 'v2.6 · noviembre 2026',
  northStar: 'Que cualquiera pueda entender un batch completo de cannabis —de semilla a frasco— simulándolo, cruzándolo con su biblioteca y viendo el porqué de cada evento.',
  statement: 'Verde no es un diario de cultivo. Es un laboratorio de comprensión: un timelapse interactivo del batch, un índice de sabiduría que conecta PDFs, y un banco de pruebas de estrategias comparables, igual que un benchmark de agentes.',
  horizons: [
    { id: 'h0', label: 'Ahora', window: 'Q4 2026', note: 'Consolidar el índice, la vista digerida y el batch benchmark.' },
    { id: 'h1', label: 'Próximo', window: 'Q1 2027', note: 'Pipeline real de PDFs: OCR, Markdown, metadata y búsqueda semántica.' },
    { id: 'h2', label: 'Después', window: 'Q2–Q3 2027', note: 'Grafo de conocimiento, oráculo con citas verificables y escenarios comparables.' },
    { id: 'h3', label: 'Visión', window: '2028+', note: 'Laboratorio personal y comunitario de cultivo, con datos y trazabilidad.' }
  ],
  metrics: [
    { label: 'Batch simulado de punta a punta', value: '75/75 días', target: '100%', pct: 100 },
    { label: 'Cursos con índice digerido', value: '6/6', target: '6 cursos', pct: 100 },
    { label: 'PDFs con Markdown ordenado', value: '12/28', target: '28/28', pct: 43 },
    { label: 'Metadata completa por PDF', value: '25/28', target: '28/28', pct: 89 },
    { label: 'Conceptos con vínculo cruzado', value: '31%', target: '90%', pct: 31 },
    { label: 'Preguntas del oráculo con cita', value: '100%', target: '100%', pct: 100 },
    { label: 'Estrategias comparables en benchmark', value: '3', target: '6+', pct: 50 },
    { label: 'Tiempo a primer insight útil', value: '≈2 min', target: '<60 s', pct: 55 }
  ],
  principles: [
    'Entender antes de optimizar: cada número debe poder explicarse con una causa y una fuente.',
    'Timelapse, no planilla: el batch se recorre como una película con eventos, no como una tarea diaria.',
    'Trazabilidad radical: todo PDF conserva origen, ruta, checksum y versión Markdown.',
    'Densidad con calma: más información por pantalla, sin sacrificar jerarquía ni lectura.',
    'Verde local-first: el conocimiento y las simulaciones viven en el navegador; sin cuentas obligatorias.',
    'Nada de promesas: la app educa, no vende, no prescribe y no habilita cultivos fuera del marco legal.',
    'Cada función debe sobrevivir al móvil, al teclado y al lector de pantalla.'
  ],
  nonGoals: [
    'Vender semillas, flores, insumos o servicios de cultivo.',
    'Recomendar dosis medicinales individuales o reemplazar a un profesional.',
    'Automatizar riego físico o prometer hardware que la app no controla.',
    'Convertirse en una red social de cultivadores con rankings públicos.',
    'Subir PDFs a terceros sin consentimiento explícito ni cifrado.',
    'Optimizar por rendimiento a costa del marco legal de autocultivo.'
  ],
  risks: [
    { title: 'Dataset demo vs. biblioteca real', level: 'Alto', note: 'La vista digerida no debe confundirse con una biblioteca procesada de verdad. Etiquetar siempre el estado real.' },
    { title: 'Exceso de densidad', level: 'Medio', note: 'Más columnas y datos pueden volver la app ilegible. Mantener una jerarquía tipográfica estricta y pruebas en 1280 px.' },
    { title: 'Oráculo con falsa confianza', level: 'Alto', note: 'Toda respuesta debe citar un fragmento y marcar cuándo no hay evidencia suficiente.' },
    { title: 'Marco legal cambiante', level: 'Medio', note: 'Normativa y REPROCANN pueden cambiar. Fechar el contenido y empujar a verificar la fuente oficial.' },
    { title: 'Simulación demasiado determinista', level: 'Medio', note: 'Agregar varianza, eventos raros y rangos de incertidumbre para no prometer resultados exactos.' },
    { title: 'Costo de procesar PDFs', level: 'Medio', note: 'OCR y embeddings pueden ser caros. Medir por página y ofrecer procesamiento por lotes.' }
  ],
  streams: [
    {
      id: 'batch', title: 'Simulador batch', icon: '✳', accent: 'lime',
      purpose: 'Convertir la temporada en un timelapse comparable de principio a fin.',
      items: [
        { t: 'Timelapse de 75 días con play/pausa y velocidad', status: 'done', horizon: 'h0', effort: 'M', note: 'Reproduce el batch completo y pausa en cada evento.', metric: '75 días en <20 s' },
        { t: 'Benchmark de 3 estrategias (equilibrada, mínima, intensiva)', status: 'done', horizon: 'h0', effort: 'M', note: 'Tabla comparativa con rendimiento, costo/g, salud y score.', metric: '3 runs comparables' },
        { t: 'Eventos de cultivo anotados sobre la línea de tiempo', status: 'done', horizon: 'h0', effort: 'S', note: 'Germinación, cambio de fase, alertas y ventana de corte.', metric: '12+ hitos' },
        { t: 'Score compuesto del batch (rendimiento, costo, salud, estabilidad)', status: 'now', horizon: 'h0', effort: 'M', note: 'Fórmula visible y explicada; nunca una caja negra.', metric: 'Score 0–100' },
        { t: 'Editor de supuestos del batch por escenario', status: 'now', horizon: 'h0', effort: 'M', note: 'Guardar y comparar escenarios con nombre.', metric: 'Hasta 6 escenarios' },
        { t: 'Seis estrategias: rápida, orgánica, low-cost, alta densidad, experimental, caos', status: 'next', horizon: 'h1', effort: 'L', note: 'Cada una con trade-offs explícitos y eventos propios.', metric: '6 estrategias' },
        { t: 'Varianza y bandas de incertidumbre en el resultado', status: 'next', horizon: 'h1', effort: 'M', note: 'Mostrar rango P10–P90 en vez de un único número.', metric: '3 percentiles' },
        { t: 'Replay exportable del batch en Markdown/JSON', status: 'next', horizon: 'h1', effort: 'S', note: 'Compartir la corrida completa con eventos y parámetros.', metric: '1 archivo' },
        { t: 'Comparador A/B de dos batches superpuestos', status: 'later', horizon: 'h2', effort: 'L', note: 'Dos curvas, dos costos, un veredicto.', metric: '2 batches' },
        { t: 'Modo docente: pausar y preguntar “¿qué harías ahora?”', status: 'later', horizon: 'h3', effort: 'L', note: 'Evaluar decisiones del usuario contra el resultado.', metric: '10 checkpoints' }
      ]
    },
    {
      id: 'library', title: 'Biblioteca digerida', icon: '▦', accent: 'green',
      purpose: 'Que cada PDF se vuelva un capítulo navegable, etiquetado y enlazado.',
      items: [
        { t: 'Índice de sabiduría con cursos, módulos y % cargado', status: 'done', horizon: 'h0', effort: 'M', note: 'Vista de libro con progreso por curso y por parte.', metric: '6 cursos' },
        { t: 'Tarjetas de curso con nombre, PDFs, páginas y extras', status: 'done', horizon: 'h0', effort: 'S', note: 'Cada curso declara qué % está cargado.', metric: '5 categorías' },
        { t: 'Metadata visible por PDF: ruta, md, hash, idioma, tags', status: 'done', horizon: 'h0', effort: 'S', note: 'Trazabilidad mínima en la ficha del recurso.', metric: '7 campos' },
        { t: 'Pipeline de digestión con % por etapa', status: 'done', horizon: 'h0', effort: 'S', note: 'Ingesta, OCR, metadata, Markdown, embeddings, grafo.', metric: '7 etapas' },
        { t: 'Parser real de PDF → Markdown estructurado', status: 'now', horizon: 'h1', effort: 'L', note: 'Encabezados, tablas, figuras, notas al pie y fórmulas.', metric: '28/28 PDFs' },
        { t: 'OCR de respaldo para PDFs escaneados', status: 'next', horizon: 'h1', effort: 'L', note: 'Con confianza por página y corrección manual.', metric: '>95% texto' },
        { t: 'Metadata automática: curso, módulo, año, idioma, conceptos', status: 'next', horizon: 'h1', effort: 'M', note: 'Sugerir y dejar confirmar; nunca sobrescribir el original.', metric: '10 campos' },
        { t: 'Buscador semántico por fragmento, no solo por título', status: 'next', horizon: 'h1', effort: 'L', note: 'Embeddings locales + resaltado del pasaje exacto.', metric: '<300 ms' },
        { t: 'Grafo de conceptos y lecturas cruzadas', status: 'later', horizon: 'h2', effort: 'L', note: 'Ver qué cursos hablan del mismo tema y dónde se contradicen.', metric: '500+ vínculos' },
        { t: 'Detección de contradicciones entre fuentes', status: 'later', horizon: 'h2', effort: 'L', note: 'Comparar afirmaciones con contexto y año.', metric: '20 pares' },
        { t: 'Anotaciones y resaltados por usuario', status: 'later', horizon: 'h2', effort: 'M', note: 'Notas locales vinculadas al fragmento y al curso.', metric: 'Ilimitadas' },
        { t: 'Versionado de PDFs y comparación de ediciones', status: 'later', horizon: 'h3', effort: 'L', note: 'Diff de contenido sin borrar la versión anterior.', metric: 'Historial completo' }
      ]
    },
    {
      id: 'oracle', title: 'Oráculo con evidencia', icon: '◈', accent: 'violet',
      purpose: 'Responder con el fragmento exacto, el acuerdo y la contradicción.',
      items: [
        { t: 'Respuestas locales con citas navegables', status: 'done', horizon: 'h0', effort: 'M', note: 'Cada respuesta enlaza curso, módulo y recurso.', metric: '100% citado' },
        { t: 'Panel de fuentes de la respuesta', status: 'done', horizon: 'h0', effort: 'S', note: 'Ver el recurso exacto y saltar a la biblioteca.', metric: '3–5 fuentes' },
        { t: 'Aviso legal explícito en normativa', status: 'done', horizon: 'h0', effort: 'S', note: 'No reemplaza asesoramiento profesional.', metric: 'Siempre' },
        { t: 'Modo “no sé”: reconocer vacíos de evidencia', status: 'now', horizon: 'h0', effort: 'S', note: 'Mejor admitir el hueco que inventar una cita.', metric: '0 alucinaciones' },
        { t: 'Respuestas con fragmento textual y contexto', status: 'next', horizon: 'h1', effort: 'L', note: 'Cita el párrafo exacto del Markdown, no solo el título.', metric: 'Pasaje + página' },
        { t: 'Comparador de fuentes: acuerdos y tensiones', status: 'next', horizon: 'h1', effort: 'M', note: 'Dos columnas con lo que dicen dos cursos.', metric: '2–4 fuentes' },
        { t: 'Preguntas sugeridas según el batch actual', status: 'next', horizon: 'h1', effort: 'S', note: '“Tu VPD está alto: ¿qué dice tu biblioteca?”', metric: 'Contextual' },
        { t: 'Modo estudio: generar repaso desde un módulo', status: 'later', horizon: 'h2', effort: 'M', note: 'Preguntas, respuestas y enlaces al texto.', metric: '10 preguntas' },
        { t: 'Modelo generativo opcional con proveedor elegido', status: 'later', horizon: 'h3', effort: 'L', note: 'Opt-in, con consentimiento y sin subir PDFs por defecto.', metric: 'Local-first' }
      ]
    },
    {
      id: 'data', title: 'Datos y trazabilidad', icon: '⌗', accent: 'stone',
      purpose: 'Que cada número y cada archivo tengan un origen verificable.',
      items: [
        { t: 'Persistencia local con versión de esquema', status: 'done', horizon: 'h0', effort: 'S', note: 'Estado en localStorage con clave versionada.', metric: 'v2' },
        { t: 'Checksum y ruta original por recurso', status: 'now', horizon: 'h0', effort: 'S', note: 'Mostrar hash corto y ubicación física.', metric: '28/28' },
        { t: 'Exportación de índice y diario a Markdown', status: 'done', horizon: 'h0', effort: 'S', note: 'Descarga local sin backend.', metric: '2 exports' },
        { t: 'Esquema JSON público del estado y del roadmap', status: 'next', horizon: 'h1', effort: 'M', note: 'Permitir importar/exportar toda la app.', metric: '1 schema' },
        { t: 'Import/export completo con validación', status: 'next', horizon: 'h1', effort: 'M', note: 'Restaurar un espacio personal en otro navegador.', metric: '0 pérdidas' },
        { t: 'Historial de versiones del estado', status: 'later', horizon: 'h2', effort: 'L', note: 'Volver a un batch o escenario anterior.', metric: '30 snapshots' },
        { t: 'Backend opcional cifrado para sincronizar', status: 'later', horizon: 'h3', effort: 'XL', note: 'E2E, sin cuentas obligatorias, exportable.', metric: 'Multi-dispositivo' }
      ]
    },
    {
      id: 'product', title: 'Producto y experiencia', icon: '◐', accent: 'lime',
      purpose: 'Densidad legible, atajos claros y una identidad que se recuerde.',
      items: [
        { t: 'Inicio como índice real de la aplicación', status: 'done', horizon: 'h0', effort: 'M', note: 'Cada sector muestra estado y lleva a su parte.', metric: '8 sectores' },
        { t: 'Página de Roadmap viva y detallada', status: 'done', horizon: 'h0', effort: 'M', note: 'Horizontes, métricas, riesgos y no-objetivos.', metric: '7 frentes' },
        { t: 'Layout compacto multipropósito', status: 'done', horizon: 'h0', effort: 'M', note: 'Más columnas, menos aire desperdiciado.', metric: '6 columnas' },
        { t: 'Sistema de glow verde y luces coherente', status: 'done', horizon: 'h0', effort: 'S', note: 'Glow como señal de foco, no decoración.', metric: 'Tokens' },
        { t: 'Búsqueda global (cepas, cursos, fuentes, roadmap)', status: 'now', horizon: 'h0', effort: 'M', note: 'Un solo campo con resultados agrupados.', metric: '⌘K' },
        { t: 'Onboarding de 60 segundos: “corré tu primer batch”', status: 'next', horizon: 'h1', effort: 'M', note: 'Tres pasos, sin registro.', metric: '<3 clics' },
        { t: 'Temas claro/oscuro con el verde como acento', status: 'next', horizon: 'h1', effort: 'M', note: 'Mantener contraste AA.', metric: '2 temas' },
        { t: 'Accesibilidad AA y navegación completa por teclado', status: 'next', horizon: 'h1', effort: 'M', note: 'Foco visible, roles y anuncios.', metric: 'WCAG AA' },
        { t: 'PWA instalable y offline', status: 'later', horizon: 'h2', effort: 'M', note: 'Batch y biblioteca disponibles sin red.', metric: 'Offline' },
        { t: 'Modo presentación para clases y demos', status: 'later', horizon: 'h3', effort: 'M', note: 'Timelapse a pantalla completa con narración.', metric: '1 pantalla' }
      ]
    },
    {
      id: 'mobile', title: 'Móvil y campo', icon: '▤', accent: 'green',
      purpose: 'Que la simulación y la biblioteca funcionen en la mano, dentro del cultivo.',
      items: [
        { t: 'Navegación móvil con hoja de herramientas', status: 'done', horizon: 'h0', effort: 'S', note: 'Acceso a todas las vistas desde el teléfono.', metric: '5+4' },
        { t: 'Layouts fluidos y tipografía escalable', status: 'done', horizon: 'h0', effort: 'S', note: 'Sin scroll horizontal y con safe areas.', metric: '320–1440 px' },
        { t: 'Batch en vertical con tarjetas apiladas', status: 'next', horizon: 'h1', effort: 'M', note: 'Comparador de estrategias en carrusel.', metric: '3 runs' },
        { t: 'Captura de fotos del cultivo con fecha y lote', status: 'next', horizon: 'h1', effort: 'M', note: 'Guardar localmente y vincular al batch.', metric: '9 plantas' },
        { t: 'Checklist rápida para el invernadero', status: 'later', horizon: 'h2', effort: 'S', note: 'Modo guiado de 2 minutos por planta.', metric: '5 acciones' },
        { t: 'Sincronización opcional entre dispositivos', status: 'later', horizon: 'h3', effort: 'L', note: 'Solo con backend cifrado y consentimiento.', metric: '2+ devices' }
      ]
    },
    {
      id: 'community', title: 'Comunidad y aprendizaje', icon: '❧', accent: 'stone',
      purpose: 'Compartir conocimiento y corridas sin convertirlo en una red social.',
      items: [
        { t: 'Compartir un batch como imagen/Markdown', status: 'now', horizon: 'h0', effort: 'S', note: 'Resultado + eventos + supuestos, sin datos personales.', metric: '1 link' },
        { t: 'Plantillas de estrategia aportadas por usuarios', status: 'next', horizon: 'h1', effort: 'M', note: 'Importables y auditables.', metric: '10 plantillas' },
        { t: 'Guías de estudio armadas desde la biblioteca', status: 'next', horizon: 'h1', effort: 'M', note: 'Ruta de lectura por objetivo.', metric: '6 rutas' },
        { t: 'Repositorio de fuentes verificadas y fechadas', status: 'later', horizon: 'h2', effort: 'L', note: 'Cada entrada con autor, año y enlace.', metric: '100 fuentes' },
        { t: 'Foros moderados por tema, sin rankings', status: 'later', horizon: 'h3', effort: 'XL', note: 'Solo si hay comunidad y moderación sostenible.', metric: 'Por decidir' }
      ]
    },
    {
      id: 'compliance', title: 'Marco legal y confianza', icon: '⚖', accent: 'amber',
      purpose: 'Educar con límites claros y sin promesas comerciales.',
      items: [
        { t: 'Aviso legal persistente y contexto 2026', status: 'done', horizon: 'h0', effort: 'S', note: 'Autocultivo registrado, 9 plantas, 15 m².', metric: 'Siempre' },
        { t: 'Checklist REPROCANN y trazabilidad', status: 'done', horizon: 'h0', effort: 'S', note: 'Registro, domicilio, autoconsumo y rótulos.', metric: '5 checks' },
        { t: 'Fecha de revisión por recurso legal', status: 'now', horizon: 'h0', effort: 'S', note: 'Mostrar cuándo se verificó por última vez.', metric: '100% legal' },
        { t: 'Centro de límites: qué hace y qué no hace Verde', status: 'next', horizon: 'h1', effort: 'S', note: 'Una página, sin letra chica.', metric: '1 página' },
        { t: 'Alertas cuando cambia la normativa citada', status: 'later', horizon: 'h2', effort: 'L', note: 'Sin dar asesoramiento: solo señalar revisión.', metric: 'Por fuente' },
        { t: 'Auditoría externa de claims y sesgos', status: 'later', horizon: 'h3', effort: 'M', note: 'Revisar lenguaje medicinal y promesas.', metric: '1 informe' }
      ]
    }
  ]
};
