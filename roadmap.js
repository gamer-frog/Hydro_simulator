/* Roadmap de Verde: el camino largo, escrito para no perderlo.
   Estados: done = en la app · now = en construcción · next = próximo · later = visión.
   El backlog es deliberadamente eterno: cada iteración agrega, poda y reordena. */
const H = (t, status, horizon, effort, note, metric) => ({ t, status, horizon, effort, note, metric });

window.ROADMAP = {
  version: 'v4.4 · noviembre 2026',
  northStar: 'Una app personal de estudio del cannabis medicinal en Argentina: entender un batch completo —de semilla a frasco— simulándolo, cruzándolo con tu biblioteca y viendo el porqué de cada evento.',
  statement: 'Verde no es un diario de cultivo. Es un laboratorio de comprensión: elegir cepa, configurar y SIMULAR todo el ciclo con timechart, un índice de sabiduría que conecta PDFs, y un banco de pruebas de estrategias comparables. El roadmap es la memoria del proyecto: lo que ya está, lo que falta, lo que aprendimos de otras apps y lo que decidimos no copiar.',
  horizons: [
    { id: 'h0', label: 'Ahora', window: 'Q4 2026', note: 'Consolidar el índice, la biblioteca digerida, el batch benchmark y el roadmap como sistema operativo del producto.' },
    { id: 'h1', label: 'Próximo', window: 'Q1–Q2 2027', note: 'Pipeline real de PDFs, búsqueda semántica, escenarios comparables, PWA y accesibilidad.' },
    { id: 'h2', label: 'Después', window: 'Q3–Q4 2027', note: 'Grafo de conocimiento, oráculo con pasajes, integraciones de sensores y analítica de cultivo.' },
    { id: 'h3', label: 'Visión', window: '2028–2030', note: 'Laboratorio personal y comunitario, datos verificables, hardware abierto y educación a escala.' }
  ],
  metrics: [
    { label: 'Batch simulado de punta a punta', value: '75/75 días', target: '100%', pct: 100 },
    { label: 'Cursos con índice digerido', value: '6/6', target: '6 cursos', pct: 100 },
    { label: 'PDFs con Markdown ordenado', value: '12/28', target: '28/28', pct: 43 },
    { label: 'Metadata completa por PDF', value: '25/28', target: '28/28', pct: 89 },
    { label: 'Conceptos con vínculo cruzado', value: '31%', target: '90%', pct: 31 },
    { label: 'Preguntas del oráculo con cita', value: '100%', target: '100%', pct: 100 },
    { label: 'Estrategias comparables en benchmark', value: '6', target: '6+', pct: 100 },
    { label: 'Hitos del roadmap completados', value: '48/206', target: '100%', pct: 23, dynamic: 'roadmap' },
    { label: 'Tiempo a primer insight útil', value: '≈2 min', target: '<60 s', pct: 55 },
    { label: 'Cobertura de tests del simulador', value: '0%', target: '80%', pct: 0 },
    { label: 'Accesibilidad AA', value: 'base', target: 'AA completo', pct: 35 },
    { label: 'Funciona sin conexión', value: 'no', target: 'PWA offline', pct: 0 }
  ],
  principles: [
    'Entender antes de optimizar: cada número debe poder explicarse con una causa y una fuente.',
    'Timelapse, no planilla: el batch se recorre como una película con eventos, no como una tarea diaria.',
    'Trazabilidad radical: todo PDF conserva origen, ruta, checksum y versión Markdown.',
    'Densidad con calma: más información por pantalla, sin sacrificar jerarquía ni lectura.',
    'Verde local-first: el conocimiento y las simulaciones viven en el navegador; sin cuentas obligatorias.',
    'Nada de promesas: la app educa, no vende, no prescribe y no habilita cultivos fuera del marco legal.',
    'Cada función debe sobrevivir al móvil, al teclado y al lector de pantalla.',
    'La incertidumbre se muestra: rangos, supuestos, semillas y versiones antes que una falsa precisión.',
    'El roadmap es un contrato vivo: se publica, se revisa y se exporta con cada release.',
    'Aprender de otras apps sin copiar su modelo de negocio, su estética ni sus sesgos.',
    'Toda integración debe poder desconectarse y exportar los datos sin fricción.',
    'Si una función no ayuda a entender el batch, la biblioteca o el costo real, no entra.',
    'Legibilidad ante todo: la letra chica se sube hasta que cualquiera la lee sin esfuerzo en móvil y desktop.',
    'La barra lateral se pliega y recuerda su estado: espacio solo cuando aporta orientación.',
    'El catálogo declara su fuente en cada ficha y en una panel público: sin data a ciegas.',
    'Verde es una app de estudio personal: sin login, sin marketplace, sin red social. Solo estudio, simulación y biblioteca.',
    'Orientación medicinal Argentina balanceada: CBD y cepas medicinales conviven con Sativa/Indica/Híbrida; sin prescribir dosis individuales.'
  ],
  nonGoals: [
    'Vender semillas, flores, insumos o servicios de cultivo.',
    'Recomendar dosis medicinales individuales o reemplazar a un profesional.',
    'Automatizar riego físico o prometer hardware que la app no controla.',
    'Convertirse en una red social de cultivadores con rankings públicos.',
    'Subir PDFs a terceros sin consentimiento explícito ni cifrado.',
    'Optimizar por rendimiento a costa del marco legal de autocultivo.',
    'Copiar el marketplace, los ads nativos o las reseñas pagas de las apps comerciales.',
    'Usar dark patterns, streaks ansiosos o notificaciones que empujen consumo.',
    'Prometer resultados exactos de cosecha o “recetas” universales.',
    'Depender de una nube propietaria para leer tus propios documentos.',
    'Gamificación de puntos, niveles o recompensas: como mucho, una animación de la simulación.',
    'Marketplace, tienda o afiliados: ni venta ni checkout de semillas, flores o insumos.',
    'Login, cuentas o perfiles de usuario: la app es personal y local-first.',
    'El Diario como módulo separado: no se desarrolla; su contexto vive en el batch y el proceso.',
    'Foros, rankings o comunidad pública: solo estudio personal hasta que se decida lo contrario.'
  ],
  risks: [
    { title: 'Dataset demo vs. biblioteca real', level: 'Alto', note: 'La vista digerida no debe confundirse con una biblioteca procesada de verdad. Etiquetar siempre el estado real.' },
    { title: 'Exceso de densidad', level: 'Medio', note: 'Más columnas y datos pueden volver la app ilegible. Mantener jerarquía tipográfica estricta y pruebas en 1280 px y 390 px.' },
    { title: 'Oráculo con falsa confianza', level: 'Alto', note: 'Toda respuesta debe citar un fragmento y marcar cuándo no hay evidencia suficiente.' },
    { title: 'Marco legal cambiante', level: 'Alto', note: 'Normativa y REPROCANN pueden cambiar. Fechar el contenido y empujar a verificar la fuente oficial.' },
    { title: 'Simulación demasiado determinista', level: 'Medio', note: 'Agregar varianza, eventos raros y rangos de incertidumbre para no prometer resultados exactos.' },
    { title: 'Costo de procesar PDFs', level: 'Medio', note: 'OCR y embeddings pueden ser caros. Medir por página y ofrecer procesamiento por lotes.' },
    { title: 'Roadmap que se vuelve decoración', level: 'Alto', note: 'Cada release debe mover al menos un hito, cerrar un riesgo o borrar una promesa que ya no aplica.' },
    { title: 'Complejidad de integraciones', level: 'Medio', note: 'Cada sensor y API suma mantenimiento. Priorizar CSV y estándares abiertos antes que integraciones cerradas.' },
    { title: 'Sesgo del catálogo de cepas', level: 'Medio', note: 'Los perfiles demo no representan todo el mercado. Declarar origen, año y límites de cada ficha.' },
    { title: 'Comunidad sin moderación', level: 'Alto', note: 'No abrir foros hasta tener reglas, moderación y mecanismos de reporte sostenibles.' },
    { title: 'Privacidad de datos de cultivo', level: 'Alto', note: 'Fotos, ubicaciones y registros pueden ser sensibles. Minimizar datos, cifrar y permitir borrado local.' },
    { title: 'Dependencia de un solo modelo de IA', level: 'Medio', note: 'Mantener el oráculo heurístico y permitir proveedores opcionales; nunca atar la app a una API.' }
  ],
  reverseEngineering: [
    {
      name: 'Leafly', category: 'Descubrimiento de cepas', region: 'Global', model: 'Catálogo editorial + marketplace de dispensarios',
      borrow: ['Fichas de cepa con efectos, terpenos y reseñas', 'Filtros por efecto, aroma y condición', 'Contenido educativo asociado a cada variedad'],
      avoid: 'No copiar el marketplace, los ads nativos ni las afirmaciones medicinales sin evidencia.',
      opportunities: ['Dossier de cepa con fuente y año', 'Comparador de terpenos con explicación', 'Enlaces de cada cepa a capítulos de la biblioteca'],
      signal: 'Demuestra que el descubrimiento funciona cuando el catálogo está bien narrado.'
    },
    {
      name: 'Weedmaps', category: 'Descubrimiento local', region: 'Norteamérica', model: 'Directorios, menús y pedidos',
      borrow: ['Navegación por mapa y disponibilidad', 'Filtros de conveniencia y cercanía', 'Perfiles de tienda con señales de confianza'],
      avoid: 'No convertir Verde en un directorio comercial ni promocionar puntos de venta.',
      opportunities: ['Capa de jurisdicción y marco legal por región', 'Mapa de fuentes educativas, no de comercios', 'Estado de disponibilidad solo como dato histórico'],
      signal: 'La geografía importa: el mismo producto cambia de reglas según el lugar.'
    },
    {
      name: 'GrowDiaries', category: 'Diarios de cultivo', region: 'Global', model: 'Comunidad de seguimientos semanales',
      borrow: ['Timeline visual por semana', 'Vinculación de cada cultivo a una cepa', 'Comparación de rutinas y nutrientes'],
      avoid: 'No copiar rankings públicos, validación por likes ni consejos sin fuente.',
      opportunities: ['Replay privado de batch con eventos', 'Benchmark reproducible en vez de diario público', 'Plantillas de rutina auditables'],
      signal: 'Muestra el valor de la narrativa visual, pero también el ruido de la opinión sin evidencia.'
    },
    {
      name: 'Seedfinder', category: 'Genética y linaje', region: 'Europa', model: 'Base de datos de breeders y variedades',
      borrow: ['Árboles de linaje', 'Tiempos de floración y altura', 'Metadatos de breeder y año'],
      avoid: 'No heredar datos sin fecha, duplicados ni variedades huérfanas.',
      opportunities: ['Score de procedencia por ficha', 'Dataset específico de autoflorecientes', 'Cruces entre genética y resultados simulados'],
      signal: 'La genética es el primer supuesto de todo batch; conviene tratarla como dato, no como marketing.'
    },
    {
      name: 'Jane / Dutchie / Eaze', category: 'E-commerce', region: 'Norteamérica', model: 'Checkout, pickup y delivery',
      borrow: ['Flujos de disponibilidad y retiro', 'Verificación de edad y cumplimiento', 'Estados de pedido claros'],
      avoid: 'No implementar venta, pagos ni logística de cannabis.',
      opportunities: ['Simulador de canasta de insumos sin checkout', 'Checklist legal antes de comprar', 'Comparador de costo por gramo propio'],
      signal: 'El comercio resuelve fricción, pero Verde debe resolver comprensión, no transacción.'
    },
    {
      name: 'Wikileaf / price indexes', category: 'Precios de referencia', region: 'Norteamérica', model: 'Comparación de precios por región',
      borrow: ['Rangos de precio por gramo', 'Contexto regional y temporal', 'Visualizaciones simples'],
      avoid: 'No promover consumo ni usar precios como promesa de ingresos.',
      opportunities: ['Costo real de un batch propio', 'Escenarios de precio solo como ejercicio educativo', 'Separar costo de producción de precio de mercado'],
      signal: 'Un precio sin contexto de costo y legalidad es marketing; un costo propio es aprendizaje.'
    },
    {
      name: 'High There / social cannábico', category: 'Comunidad', region: 'Global', model: 'Perfiles y matching social',
      borrow: ['Grupos por interés', 'Perfiles ligeros y contextuales', 'Descubrimiento de personas con experiencia'],
      avoid: 'No construir un grafo social ni rankings de cultivadores.',
      opportunities: ['Cohortes de estudio moderadas', 'Mentoría con fuentes verificadas', 'Grupos por objetivo de aprendizaje'],
      signal: 'La comunidad ayuda cuando tiene un propósito acotado; sin moderación se vuelve ruido.'
    },
    {
      name: 'PotGuide / GreenBook', category: 'Guías y directorios', region: 'Norteamérica', model: 'Contenido SEO + directorios locales',
      borrow: ['Glosarios claros', 'Guías por ciudad o jurisdicción', 'Onboarding para principiantes'],
      avoid: 'No llenar la app de páginas affiliate ni contenido duplicado.',
      opportunities: ['Guía legal por jurisdicción con fecha', 'Glosario enlazado al índice de sabiduría', 'Preguntas frecuentes con fuente'],
      signal: 'El contenido educativo bien fechado envejece mejor que el directorio comercial.'
    },
    {
      name: 'Sensi Seeds / RQS Academy', category: 'Educación de breeder', region: 'Europa', model: 'Blogs y guías de cultivo',
      borrow: ['Guías paso a paso', 'Notas específicas por variedad', 'Fotografía de referencia'],
      avoid: 'No aceptar el sesgo comercial de una sola casa de semillas.',
      opportunities: ['Biblioteca multi-fuente con contradicciones visibles', 'Comparación de recomendaciones entre cursos', 'Notas de cultivo ligadas a la fuente original'],
      signal: 'Los breeders enseñan mucho, pero siempre desde su catálogo; Verde debe cruzar fuentes.'
    },
    {
      name: 'ILGM / Grow Weed Easy', category: 'Troubleshooting', region: 'Global', model: 'Guías para principiantes y diagnóstico',
      borrow: ['Checklists de síntomas', 'Explicaciones visuales de deficiencias', 'Rutas de solución paso a paso'],
      avoid: 'No repetir mitos de foro sin fecha ni evidencia.',
      opportunities: ['Diagnóstico enlazado a pasajes de la biblioteca', 'Nivel de confianza por síntoma', 'Registro de qué funcionó en cada batch'],
      signal: 'El principiante necesita una decisión siguiente, no un artículo de 5.000 palabras.'
    },
    {
      name: 'A Pot for Pot / grow kits', category: 'Kits y hardware', region: 'Norteamérica', model: 'Producto físico + guía de inicio',
      borrow: ['Onboarding de primera cosecha', 'Lista de materiales cerrada', 'Acompañamiento por etapas'],
      avoid: 'No depender de un kit ni prometer resultados por comprarlo.',
      opportunities: ['Presupuesto de materiales editable', 'Lista de compras educativa sin venta', 'Primer batch simulado antes de comprar nada'],
      signal: 'El kit reduce la parálisis inicial; Verde puede dar esa claridad sin vender hardware.'
    },
    {
      name: 'AC Infinity / Vivosun', category: 'Control de ambiente', region: 'Global', model: 'Hardware + app de control',
      borrow: ['Dashboards de sensores', 'Recetas de automatización', 'Alertas y curvas históricas'],
      avoid: 'No generar lock-in ni exigir una marca para simular.',
      opportunities: ['Importación CSV y API neutral', 'Timeline de ambiente con eventos del batch', 'Alertas explicadas con fuentes'],
      signal: 'El hardware captura datos; el valor real está en interpretarlos junto al contexto del cultivo.'
    },
    {
      name: 'Pulse Grow / SensorPush', category: 'Sensores ambientales', region: 'Norteamérica', model: 'Sensores + analítica de VPD',
      borrow: ['Curvas de VPD y humedad', 'Alertas configurables', 'Historial exportable'],
      avoid: 'No esconder datos históricos detrás de una suscripción.',
      opportunities: ['VPD local-first sin nube', 'Comparación de setpoints por etapa', 'Importación manual y CSV como fallback'],
      signal: 'Un sensor sin interpretación es solo un número; la app debe enseñar a leerlo.'
    },
    {
      name: 'Priva / Argus', category: 'Clima comercial', region: 'Global', model: 'Control industrial de invernaderos',
      borrow: ['Jerarquía de alarmas', 'Setpoints por fase', 'Auditoría de cambios'],
      avoid: 'No trasladar la complejidad enterprise al autocultivo.',
      opportunities: ['Modo docente con alarmas simplificadas', 'Registro de decisiones y consecuencias', 'Plantillas de ambiente por etapa'],
      signal: 'La disciplina de datos del agro profesional puede enseñarse sin abrumar.'
    },
    {
      name: 'Asistentes IA de dispensarios', category: 'Búsqueda conversacional', region: 'Norteamérica', model: 'Chat para descubrir productos',
      borrow: ['Lenguaje natural para explorar', 'Recomendaciones contextuales', 'Preguntas de seguimiento'],
      avoid: 'No permitir respuestas sin fuente ni recomendaciones médicas.',
      opportunities: ['RAG con citas y “no sé”', 'Preguntas sugeridas según el batch', 'Evaluación de alucinaciones publicada'],
      signal: 'La conversación baja la barrera, pero sin evidencia aumenta la confianza falsa.'
    },
    {
      name: 'Reddit / Discord de cultivo', category: 'Comunidad y soporte', region: 'Global', model: 'Foros y chats no estructurados',
      borrow: ['Casos reales con fotos', 'Lenguaje cotidiano', 'Respuestas rápidas de pares'],
      avoid: 'No importar anonimato sin moderación, acoso ni consejos peligrosos.',
      opportunities: ['Respuesta comunitaria con chequeo de evidencia', 'Resúmenes de hilos con fuentes', 'Preguntas frecuentes curadas por expertos'],
      signal: 'La comunidad detecta problemas reales; la curaduría evita que el mito se vuelva norma.'
    },
    {
      name: 'YouTube de cultivo', category: 'Educación visual', region: 'Global', model: 'Videos largos y comunidades de creadores',
      borrow: ['Timelapse de etapas', 'Capítulos y demostraciones', 'Narración de decisiones'],
      avoid: 'No depender de personalidades ni de claims sin fuente.',
      opportunities: ['Timelapse anotado con citas', 'Lecciones cortas dentro del batch', 'Transcripciones buscables'],
      signal: 'El video enseña mejor el “cómo”, pero pierde el “por qué” y la trazabilidad.'
    },
    {
      name: 'Notion / Obsidian / Readwise', category: 'Knowledge management', region: 'Global', model: 'Notas, backlinks y repaso',
      borrow: ['Backlinks entre conceptos', 'Resaltados y notas', 'Repaso espaciado'],
      avoid: 'No imponer un lienzo vacío ni una estructura rígida.',
      opportunities: ['Índice de sabiduría con backlinks', 'Repaso desde un módulo', 'Exportación a Markdown compatible'],
      signal: 'El conocimiento se vuelve útil cuando se conecta, no cuando se acumula.'
    },
    {
      name: 'Duolingo / Strava', category: 'Hábitos y progreso', region: 'Global', model: 'Streaks, metas y logros',
      borrow: ['Progreso visible', 'Metas pequeñas', 'Celebración de hitos'],
      avoid: 'No usar ansiedad, culpa ni notificaciones manipulativas.',
      opportunities: ['Ruta de aprendizaje por objetivo', 'Hitos de comprensión, no de consumo', 'Modo pausa y descanso explícito'],
      signal: 'La constancia ayuda, pero en Verde el objetivo es entender, no acumular días.'
    },
    {
      name: 'LMSYS / SWE-bench', category: 'Benchmarks reproducibles', region: 'Global', model: 'Evaluaciones comparables y públicas',
      borrow: ['Semillas y condiciones reproducibles', 'Rankings con metodología visible', 'Rondas de evaluación'],
      avoid: 'No reducir un sistema complejo a un único número ganador.',
      opportunities: ['Benchmark de batch con bandas de incertidumbre', 'Historial de corridas y seeds', 'Evaluación pública de estrategias'],
      signal: 'Un benchmark honesto muestra condiciones, varianza y límites; no solo un podio.'
    }
  ],
  opportunityRadar: [
    { title: 'Escenarios con nombre y supuestos editables', stream: 'batch', impact: 'Alto', effort: 'M', horizon: 'h0', why: 'Permite comparar decisiones propias, no solo las seis estrategias base.', signal: 'Hasta 6 escenarios por espacio.' },
    { title: 'Bandas P10–P90 en cada corrida', stream: 'batch', impact: 'Alto', effort: 'M', horizon: 'h1', why: 'Comunica incertidumbre y evita leer un resultado como promesa.', signal: '3 percentiles por estrategia.' },
    { title: 'Pasajes citados, no solo títulos', stream: 'oracle', impact: 'Alto', effort: 'L', horizon: 'h1', why: 'La diferencia entre “lo dice el curso” y “lo dice este párrafo, página 34”.', signal: 'Pasaje + página + hash.' },
    { title: 'Buscador semántico local por fragmento', stream: 'library', impact: 'Alto', effort: 'L', horizon: 'h1', why: 'Encontrar la idea aunque no coincidan las palabras exactas.', signal: '<300 ms en 28 PDFs demo.' },
    { title: 'Grafo de conceptos con contradicciones', stream: 'library', impact: 'Alto', effort: 'L', horizon: 'h2', why: 'Dos cursos pueden decir cosas distintas; verlo es un insight de primer nivel.', signal: '500+ vínculos.' },
    { title: 'Importar sensores por CSV y API abierta', stream: 'integrations', impact: 'Alto', effort: 'M', horizon: 'h1', why: 'El batch simulado gana valor cuando se cruza con ambiente real.', signal: '3 formatos de importación.' },
    { title: 'PWA offline con biblioteca y batch', stream: 'mobile', impact: 'Alto', effort: 'M', horizon: 'h2', why: 'En el cultivo la conexión no siempre existe; la app debe seguir funcionando.', signal: '100% de lectura offline.' },
    { title: 'Evaluación pública de alucinaciones', stream: 'ai', impact: 'Alto', effort: 'M', horizon: 'h2', why: 'La confianza se gana mostrando cuándo el oráculo falla y cómo se corrigió.', signal: 'Dataset de 100 preguntas.' },
    { title: 'Modo docente con checkpoints', stream: 'batch', impact: 'Medio', effort: 'L', horizon: 'h3', why: 'Pausar en un evento y preguntar “¿qué harías ahora?” convierte la simulación en clase.', signal: '10 checkpoints.' },
    { title: 'Ruta de lectura por objetivo', stream: 'community', impact: 'Medio', effort: 'M', horizon: 'h1', why: 'Ordenar la biblioteca según lo que el usuario quiere lograr, no según el curso.', signal: '6 rutas.' },
    { title: 'Ficha de cepa con procedencia y año', stream: 'genetics', impact: 'Medio', effort: 'S', horizon: 'h0', why: 'El catálogo debe declarar de dónde sale cada dato y cuándo se revisó.', signal: '14 fichas fechadas.' },
    { title: 'Centro de límites y consentimiento', stream: 'compliance', impact: 'Alto', effort: 'S', horizon: 'h1', why: 'Una página clara sobre qué hace y qué no hace Verde reduce riesgos y confianza falsa.', signal: '1 página + age gate.' },
    { title: 'Exportar/importar todo el espacio personal', stream: 'data', impact: 'Alto', effort: 'M', horizon: 'h1', why: 'Los datos son del usuario; la app debe poder restaurarlos en otro navegador.', signal: '0 pérdidas.' },
    { title: 'Comparador A/B de batches superpuestos', stream: 'batch', impact: 'Medio', effort: 'L', horizon: 'h2', why: 'Dos curvas, dos costos y un veredicto explícito sobre qué cambió.', signal: '2 batches.' },
    { title: 'Diagnóstico visual con derivación a fuentes', stream: 'cultivation', impact: 'Medio', effort: 'L', horizon: 'h2', why: 'Una foto puede orientar, pero la respuesta debe citar el curso y marcar límites.', signal: '5 síntomas demo.' },
    { title: 'Publicar el roadmap como changelog', stream: 'product', impact: 'Medio', effort: 'S', horizon: 'h1', why: 'El usuario ve qué cambió y por qué; el proyecto gana memoria pública.', signal: '1 release por mes.' },
    { title: 'Plantillas de estrategia importables', stream: 'community', impact: 'Medio', effort: 'M', horizon: 'h2', why: 'Compartir una corrida sin compartir datos personales.', signal: '10 plantillas.' },
    { title: 'Modo presentación para clases', stream: 'design', impact: 'Bajo', effort: 'M', horizon: 'h3', why: 'El timelapse a pantalla completa con narración es una herramienta docente.', signal: '1 pantalla.' }
  ],
  gaps: [
    { area: 'Procesamiento real de PDFs', today: 'Metadatos y rutas demo', missing: 'Parser PDF → Markdown, OCR, tablas y figuras', bet: 'Pipeline local con pdf.js + OCR opcional', horizon: 'h1' },
    { area: 'Búsqueda', today: 'Filtros por texto y etiquetas', missing: 'Búsqueda semántica por pasaje y resaltado', bet: 'Embeddings locales + índice invertido', horizon: 'h1' },
    { area: 'Oráculo', today: 'Heurística local con citas de recurso', missing: 'Pasaje exacto, confianza y “no sé”', bet: 'RAG verificable con evaluación', horizon: 'h1' },
    { area: 'Simulador', today: '6 estrategias, score y replay', missing: 'Supuestos editables, varianza y A/B', bet: 'Motor de escenarios con seeds y percentiles', horizon: 'h1' },
    { area: 'Datos reales', today: 'Estado local y export Markdown/JSON', missing: 'Sensores, fotos y ambiente del cultivo', bet: 'Import CSV/API + timeline unificado', horizon: 'h2' },
    { area: 'Móvil', today: 'Layouts fluidos y hoja de herramientas', missing: 'Carrusel batch, cámara y PWA offline', bet: 'Experiencia de campo instalable', horizon: 'h1' },
    { area: 'Accesibilidad', today: 'Foco y roles básicos', missing: 'AA completo, reduced motion y lector de pantalla', bet: 'Auditoría y tests manuales por release', horizon: 'h1' },
    { area: 'Internacionalización', today: 'Español rioplatense', missing: 'Inglés, portugués y unidades', bet: 'i18n por archivos y fechas localizadas', horizon: 'h2' },
    { area: 'Comunidad', today: 'Exportación de corridas', missing: 'Cohortes, plantillas y moderación', bet: 'Abrir solo con reglas y moderación sostenible', horizon: 'h2' },
    { area: 'Legal', today: 'Aviso 2026 y checklist REPROCANN', missing: 'Selector de jurisdicción y changelog normativo', bet: 'Packs legales fechados y revisables', horizon: 'h1' },
    { area: 'Integraciones', today: 'Ninguna', missing: 'CSV, MQTT, Home Assistant y APIs de sensores', bet: 'Estándares abiertos antes que marcas', horizon: 'h2' },
    { area: 'Confianza', today: 'Transparencia de datos demo', missing: 'Auditoría externa, sesgos y precisión', bet: 'Informe público anual', horizon: 'h3' }
  ],
  devOrder: [
    { n: 1, title: 'Cerrar el índice de estudio', desc: 'Inicio simple en 7 capítulos, sin KPIs random, sin Diario, sin gamificación.' },
    { n: 2, title: 'Biblioteca en dos capas', desc: 'Ingesta (PDFs con tapa por curso/carpeta + Markdown) y Vista digerida como datos que emergen.' },
    { n: 3, title: 'Simulador de estudio', desc: 'Cepa + config + SIMULAR con timechart y notas Horrible–Excelente. Nada más.' },
    { n: 4, title: 'Catálogo medicinal balanceado', desc: 'Sativa / Indica / CBD / Híbrida con fuentes anotadas y fichas medicinales sin prescribir.' },
    { n: 5, title: 'Oráculo con cita exacta', desc: 'Respuesta + pasaje + página + hash. Si no hay evidencia: “no sé”.' },
    { n: 6, title: 'Costo real por gramo (AR 2026)', desc: 'Supuestos editables y cálculo transparente, sin promesa de venta.' },
    { n: 7, title: 'Proceso + marco REPROCANN', desc: '6 fases con checklist y normativa fechada; verificar fuente oficial.' },
    { n: 8, title: 'Datos locales y exports', desc: 'Todo en el navegador; Markdown/JSON exportables; cero login.' },
    { n: 9, title: 'Accesibilidad y letra legible', desc: 'AA, teclado completo y tipografía que se lee en móvil y desktop.' },
    { n: 10, title: 'PWA offline', desc: 'Estudiar sin conexión en el cultivo.' }
  ],
  notInterested: [
    { title: 'Diario completo', note: 'No se desarrolla como módulo separado. El contexto vive en el batch, el proceso y la biblioteca.' },
    { title: 'Gamificación', note: 'Sin puntos, niveles ni recompensas. Como mucho, la animación de la simulación.' },
    { title: 'Marketplace / tienda', note: 'Ni semillas, ni flores, ni insumos, ni afiliados. No hay checkout.' },
    { title: 'Login y cuentas', note: 'App personal y local-first. Nada de perfiles ni nube obligatoria.' },
    { title: 'Red social / comunidad pública', note: 'Sin foros, rankings ni matching. Solo estudio personal.' },
    { title: 'Dispensario / delivery', note: 'Fuera del marco de estudio. Sin directorios comerciales ni pedidos.' },
    { title: 'Dosis medicinales individuales', note: 'Se educa con fuentes; nunca se prescribe una dosis ni se reemplaza a un profesional.' },
    { title: 'Automatización física', note: 'No se controla hardware. Solo se simula y se estudia.' },
    { title: 'Monetización por ads', note: 'Sin publicidad ni datos de usuarios. El roadmap es el producto.' }
  ],
  streams: [
    {
      id: 'batch', title: 'Simulador batch', icon: '✳', accent: 'lime',
      purpose: 'Convertir la temporada en un timelapse comparable de principio a fin.',
      items: [
        H('Timelapse de 75 días con play/pausa y velocidad', 'done', 'h0', 'M', 'Reproduce el batch completo y pausa en cada evento.', '75 días en <20 s'),
        H('Benchmark de 6 estrategias comparables', 'done', 'h0', 'M', 'Equilibrada, rápida, orgánica, mínima, low-cost e intensiva con rendimiento, costo/g, salud y score.', '6 runs comparables'),
        H('Eventos de cultivo anotados sobre la línea de tiempo', 'done', 'h0', 'M', 'Germinación, cambio de fase, alertas y ventana de corte.', '12+ hitos'),
        H('Score compuesto del batch (rendimiento, costo, salud, estabilidad)', 'done', 'h0', 'M', 'Fórmula visible en el pie del benchmark; nunca una caja negra.', 'Score 0–100'),
        H('Replay exportable del batch en Markdown/JSON', 'done', 'h0', 'S', 'Descarga la corrida completa con ranking, eventos, semilla y supuestos.', '2 formatos'),
        H('Editor de supuestos del batch por escenario', 'now', 'h0', 'M', 'Plantas, potencia, horas de luz, días, sustrato y maceta; guardar con nombre.', 'Hasta 6 escenarios'),
        H('Bandas de incertidumbre P10–P90', 'now', 'h1', 'M', 'Correr varias semillas y mostrar rango, no un único número.', '3 percentiles'),
        H('Comparador A/B de dos batches superpuestos', 'next', 'h2', 'L', 'Dos curvas, dos costos y un veredicto sobre qué cambió.', '2 batches'),
        H('Eventos de interrupción: corte de luz, ola de calor, plaga', 'next', 'h1', 'M', 'Escenarios raros que enseñan a responder bajo presión.', '6 eventos'),
        H('Escenarios por genética y ciclo (60–90 días)', 'next', 'h2', 'M', 'Adaptar el calendario y los umbrales a la variedad elegida.', '14 cepas'),
        H('Modo docente: pausar y preguntar “¿qué harías ahora?”', 'later', 'h3', 'L', 'Evaluar decisiones del usuario contra el resultado y explicar el desvío.', '10 checkpoints'),
        H('Gemelo digital con datos reales del cultivo', 'later', 'h3', 'XL', 'Cruzar sensores y fotos con la simulación para calibrar supuestos.', '1 batch real'),
        H('Simulación de costos por país y moneda', 'later', 'h2', 'M', 'Tarifas, impuestos y precios locales sin prometer resultados.', '5 países'),
        H('API pública de escenarios y seeds', 'later', 'h3', 'L', 'Permitir reproducir y auditar corridas desde otros tools.', '1 schema'),
        H('Simulador sin avanzar un día: elegí cepa, configurá, SIMULAR', 'done', 'h0', 'M', 'El único flujo es cepa + plantas/días/luz/temperatura + estrategia y corrida completa.', '1 botón SIMULAR'),
        H('Timechart multi-serie con filtros y leyenda', 'done', 'h0', 'L', 'Estilo Chart Wizard: crecimiento, salud, humedad, nutrición y rendimiento; series activables y leyenda a la derecha.', '5 series'),
        H('Proceso completo con actividades previstas', 'done', 'h0', 'M', '12 hitos con día, fase, detalle y estado prevista/omitida según estrategia.', '12 hitos'),
        H('5 notas de resultado: Horrible a Excelente', 'done', 'h0', 'M', 'Score 0–100 mapeado a Horrible / Regular / Buena / Muy buena / Excelente con rendimiento y $/g.', '5 notas')
      ]
    },
    {
      id: 'library', title: 'Biblioteca digerida', icon: '▦', accent: 'green',
      purpose: 'Que cada PDF se vuelva un capítulo navegable, etiquetado y enlazado.',
      items: [
        H('Índice de sabiduría con cursos, módulos y % cargado', 'done', 'h0', 'M', 'Vista de libro con progreso por curso y por parte.', '6 cursos'),
        H('Tarjetas de curso con nombre, PDFs, páginas y extras', 'done', 'h0', 'S', 'Cada curso declara qué % está cargado.', '5 categorías'),
        H('Metadata visible por PDF: ruta, md, hash, idioma, tags', 'done', 'h0', 'S', 'Trazabilidad mínima en la ficha del recurso.', '7 campos'),
        H('Pipeline de digestión con % por etapa', 'done', 'h0', 'S', 'Ingesta, OCR, metadata, Markdown, embeddings, grafo.', '7 etapas'),
        H('Exportar el índice de sabiduría en Markdown', 'done', 'h0', 'S', 'Curso, módulo, estado, ruta Markdown, hash y vínculos en un solo archivo.', '1 archivo'),
        H('Tapas de PDF por curso/carpeta', 'done', 'h0', 'M', 'Ingesta visual: cada PDF con tapa, curso, módulo, carpeta física y ruta Markdown.', '28 tapas'),
        H('Vista digerida como datos que emergen', 'done', 'h0', 'M', 'Guía completa desde los Markdown: listos, cruces entre cursos y huecos de digestión.', '3 emergencias'),
        H('Parser real de PDF → Markdown estructurado', 'done', 'h0', 'L', 'pdf.js local: texto por página, encabezados, metadata, hash, descarga MD/PDF.', '28/28 PDFs'),
        H('OCR de respaldo para PDFs escaneados', 'now', 'h1', 'L', 'Detección de PDFs sin texto extraíble y guía de OCR.', '>95% texto'),
        H('Metadata automática: año, temas, encabezados', 'done', 'h0', 'M', 'Año, topics y headings extraídos del Markdown.', '10 campos'),
        H('Búsqueda semántica por fragmento', 'done', 'h0', 'M', 'Tokens, título y tags rankean resultados en la biblioteca.', '<300 ms'),
        H('Oráculo con fragmento y comparador', 'done', 'h0', 'M', 'Pasaje, hash, ruta y límites de la fuente.', 'Pasaje + página'),
        H('Presupuestos indoor/outdoor con Mercado Libre', 'done', 'h0', 'M', '8 productos por modo, precios editables, links e imágenes.', '16 items'),
        H('PWA offline instalable', 'done', 'h0', 'M', 'Service worker + manifest + cache de assets.', 'Offline'),
        H('Accesibilidad AA base', 'done', 'h0', 'M', 'Skip link, foco visible, reduced motion, roles.', 'WCAG AA base'),
        H('OCR de respaldo para PDFs escaneados', 'now', 'h1', 'L', 'Con confianza por página y corrección manual.', '>95% texto'),
        H('Metadata automática: curso, módulo, año, idioma, conceptos', 'next', 'h1', 'M', 'Sugerir y dejar confirmar; nunca sobrescribir el original.', '10 campos'),
        H('Buscador semántico por fragmento, no solo por título', 'next', 'h1', 'L', 'Embeddings locales + resaltado del pasaje exacto.', '<300 ms'),
        H('Anotaciones y resaltados por usuario', 'done', 'h0', 'M', 'Notas locales por recurso, vinculadas a ruta y fecha, exportables.', 'Ilimitadas'),
        H('Rutas de lectura por objetivo', 'done', 'h0', 'M', 'Genera una ruta desde un tag y la exporta en Markdown.', '6 rutas'),
        H('Comparador de fuentes en oráculo', 'done', 'h0', 'M', 'Pasaje, hash, ruta y límites de la fuente en cada respuesta.', '2–4 fuentes'),
        H('Rutas de lectura por objetivo', 'next', 'h1', 'M', 'Armar un recorrido según “aprender riego”, “cosechar” o “presupuestar”.', '6 rutas'),
        H('Grafo de conceptos y lecturas cruzadas', 'later', 'h2', 'L', 'Ver qué cursos hablan del mismo tema y dónde se contradicen.', '500+ vínculos'),
        H('Detección de contradicciones entre fuentes', 'later', 'h2', 'L', 'Comparar afirmaciones con contexto y año.', '20 pares'),
        H('Versionado de PDFs y comparación de ediciones', 'later', 'h3', 'L', 'Diff de contenido sin borrar la versión anterior.', 'Historial completo'),
        H('Resúmenes en audio y modo escucha', 'later', 'h2', 'M', 'Convertir módulos en audio con voz local y marcas de fuente.', '6 módulos'),
        H('Traducción de material a inglés y portugués', 'later', 'h3', 'L', 'Mantener el original y mostrar la versión traducida con fecha.', '3 idiomas'),
        H('Exportar/importar anotaciones a Obsidian y Notion', 'later', 'h2', 'M', 'Backlinks y Markdown compatible sin lock-in.', '2 destinos')
      ]
    },
    {
      id: 'oracle', title: 'Oráculo con evidencia', icon: '◈', accent: 'violet',
      purpose: 'Responder con el fragmento exacto, el acuerdo y la contradicción.',
      items: [
        H('Respuestas locales con citas navegables', 'done', 'h0', 'M', 'Cada respuesta enlaza curso, módulo y recurso.', '100% citado'),
        H('Panel de fuentes de la respuesta', 'done', 'h0', 'S', 'Ver el recurso exacto y saltar a la biblioteca.', '3–5 fuentes'),
        H('Aviso legal explícito en normativa', 'done', 'h0', 'S', 'No reemplaza asesoramiento profesional.', 'Siempre'),
        H('Modo “no sé”: reconocer vacíos de evidencia', 'now', 'h0', 'S', 'Mejor admitir el hueco que inventar una cita.', '0 alucinaciones'),
        H('Puntaje de confianza por respuesta', 'now', 'h1', 'M', 'Mostrar cuántas fuentes sostienen la respuesta y cuán recientes son.', '0–100'),
        H('Preguntas sugeridas según el batch actual', 'next', 'h1', 'S', '“Tu VPD está alto: ¿qué dice tu biblioteca?”', 'Contextual'),
        H('Respuestas con fragmento textual y contexto', 'done', 'h0', 'L', 'Cita el párrafo exacto del Markdown, no solo el título.', 'Pasaje + página'),
        H('Estructura de ingesta en repo: pdf/ + md/', 'done', 'h0', 'M', 'Carpetas 01–06 por curso/módulo; PDF original intacto, Markdown derivado con metadata y hash.', 'pdf/ + md/'),
        H('Comparador de fuentes: acuerdos y tensiones', 'next', 'h1', 'M', 'Dos columnas con lo que dicen dos cursos.', '2–4 fuentes'),
        H('Modo estudio: generar repaso desde un módulo', 'next', 'h2', 'M', 'Preguntas, respuestas y enlaces al texto.', '10 preguntas'),
        H('Historial y memoria de conversación', 'next', 'h2', 'M', 'Retomar una consulta sin perder las fuentes citadas.', '20 turnos'),
        H('Exportar respuesta con bibliografía a Markdown', 'next', 'h1', 'S', 'Un archivo con pregunta, respuesta, citas y fecha.', '1 archivo'),
        H('Entrada por voz y dictado', 'later', 'h2', 'M', 'Preguntar desde el invernadero sin escribir.', 'Español'),
        H('Modelo generativo opcional con proveedor elegido', 'later', 'h3', 'L', 'Opt-in, con consentimiento y sin subir PDFs por defecto.', 'Local-first'),
        H('Debate entre agentes con evidencia', 'later', 'h3', 'XL', 'Un agente propone, otro critica y el tercero busca fuentes.', '3 roles'),
        H('Evaluación pública de alucinaciones', 'later', 'h2', 'M', 'Dataset de preguntas y respuestas con errores conocidos.', '100 casos')
      ]
    },
    {
      id: 'data', title: 'Datos y trazabilidad', icon: '⌗', accent: 'stone',
      purpose: 'Que cada número y cada archivo tengan un origen verificable.',
      items: [
        H('Persistencia local con versión de esquema', 'done', 'h0', 'S', 'Estado en localStorage con clave versionada.', 'v2'),
        H('Checksum y ruta original por recurso', 'done', 'h0', 'S', 'Hash corto, ruta original y ruta Markdown visibles en la ficha.', '28/28'),
        H('Exportación de índice y diario a Markdown', 'done', 'h0', 'S', 'Descarga local sin backend.', '2 exports'),
        H('Exportación de replay de batch a Markdown/JSON', 'done', 'h0', 'S', 'Corrida completa con seed, eventos y supuestos.', '2 formatos'),
        H('Esquema JSON público del estado y del roadmap', 'now', 'h1', 'M', 'Permitir importar/exportar toda la app.', '1 schema'),
        H('Import/export completo con validación', 'now', 'h1', 'M', 'Restaurar un espacio personal en otro navegador.', '0 pérdidas'),
        H('Panel de privacidad y datos guardados', 'next', 'h1', 'S', 'Ver qué se guarda, dónde y cómo borrarlo.', '1 pantalla'),
        H('Historial de versiones del estado', 'next', 'h2', 'L', 'Volver a un batch o escenario anterior.', '30 snapshots'),
        H('Undo/redo de acciones del simulador', 'next', 'h2', 'M', 'Deshacer riego, avance o cambio de escenario.', '20 pasos'),
        H('Chequeos de integridad y migraciones', 'next', 'h1', 'M', 'Detectar datos corruptos y migrar sin perder campos.', '0 crashes'),
        H('Backend opcional cifrado para sincronizar', 'later', 'h3', 'XL', 'E2E, sin cuentas obligatorias, exportable.', 'Multi-dispositivo'),
        H('Backup automático a archivo local', 'later', 'h2', 'M', 'Una copia semanal descargable sin nube.', '1 archivo'),
        H('Auditoría de cambios por recurso y escenario', 'later', 'h3', 'L', 'Quién cambió qué y cuándo, incluso en local.', 'Historial completo'),
        H('API de lectura para integraciones', 'later', 'h3', 'L', 'Consultar estado y exportar sin acoplarse a la UI.', '1 API')
      ]
    },
    {
      id: 'product', title: 'Producto y experiencia', icon: '◐', accent: 'lime',
      purpose: 'Densidad legible, atajos claros y una identidad que se recuerde.',
      items: [
        H('Inicio como índice de libro simple', 'done', 'h0', 'M', '8 capítulos explicados en una línea cada uno; sin KPIs de plantas/salud/costo/oráculo. Solo franja mínima del batch para simular.', '8 capítulos'),
        H('Inicio como índice real de la aplicación', 'done', 'h0', 'M', 'Cada sector muestra estado y lleva a su parte.', '8 sectores'),
        H('Página de Roadmap viva y detallada', 'done', 'h0', 'M', 'Horizontes, métricas, riesgos, ingeniería inversa y backlog.', '14 frentes'),
        H('Layout compacto multipropósito', 'done', 'h0', 'M', 'Más columnas, menos aire desperdiciado.', '6 columnas'),
        H('Sistema de glow verde y luces coherente', 'done', 'h0', 'S', 'Glow como señal de foco, no decoración.', 'Tokens'),
        H('Barra lateral plegable con estado persistente', 'done', 'h0', 'S', 'Se pliega a iconos y recuerda el estado entre visitas.', '1 toggle'),
        H('Letra chica subida en toda la app', 'done', 'h0', 'M', 'Kickers, etiquetas laterales y microcopy en 9px+; body 15px.', '100% vistas'),
        H('Scrollbar ancha y focus glow global', 'done', 'h0', 'S', '16px desktop, hover con glow y bordes que se iluminan al pasar.', '1 sistema'),
        H('Búsqueda global (cepas, cursos, fuentes, roadmap)', 'done', 'h0', 'M', 'Command palette ⌘K con sectores, cepas, cursos, PDFs, roadmap y etiquetas; navegación con teclado.', '⌘K'),
        H('Onboarding de 60 segundos: “corré tu primer batch”', 'now', 'h1', 'M', 'Tres pasos, sin registro.', '<3 clics'),
        H('Estados vacíos y errores explicativos', 'now', 'h1', 'S', 'Cada vacío dice qué hacer y por qué.', '100% cubiertos'),
        H('Temas claro/oscuro con el verde como acento', 'next', 'h1', 'M', 'Mantener contraste AA.', '2 temas'),
        H('Accesibilidad AA y navegación completa por teclado', 'next', 'h1', 'M', 'Foco visible, roles y anuncios.', 'WCAG AA'),
        H('Preferencia de movimiento reducido', 'next', 'h1', 'S', 'Respetar reduced motion en glow, timelapse y transiciones.', '1 media query'),
        H('Internacionalización es/en/pt', 'next', 'h2', 'L', 'Textos, fechas, monedas y unidades.', '3 idiomas'),
        H('PWA instalable y offline', 'next', 'h2', 'M', 'Batch y biblioteca disponibles sin red.', 'Offline'),
        H('Modo presentación para clases y demos', 'later', 'h3', 'M', 'Timelapse a pantalla completa con narración.', '1 pantalla'),
        H('Sistema de widgets personalizables', 'later', 'h2', 'L', 'Elegir qué tarjetas ve cada usuario en el inicio.', '8 widgets'),
        H('Changelog público dentro del roadmap', 'later', 'h1', 'S', 'Ver qué cambió en cada release y qué hito movió.', '1 release/mes'),
        H('Plugin API para extensiones', 'later', 'h3', 'XL', 'Permitir integraciones sin tocar el core.', '1 SDK')
      ]
    },
    {
      id: 'mobile', title: 'Móvil y campo', icon: '▤', accent: 'green',
      purpose: 'Que la simulación y la biblioteca funcionen en la mano, dentro del cultivo.',
      items: [
        H('Navegación móvil con hoja de herramientas', 'done', 'h0', 'S', 'Acceso a todas las vistas desde el teléfono.', '5+4'),
        H('Layouts fluidos y tipografía escalable', 'done', 'h0', 'S', 'Sin scroll horizontal y con safe areas.', '320–1440 px'),
        H('Batch en vertical con tarjetas apiladas', 'done', 'h0', 'M', 'Seis estrategias comparables en una columna.', '6 runs'),
        H('Carrusel táctil de estrategias', 'now', 'h1', 'M', 'Deslizar una tarjeta a la vez sin perder el ranking.', '6 cards'),
        H('Captura de fotos del cultivo con fecha y lote', 'now', 'h1', 'M', 'Guardar localmente y vincular al batch.', '9 plantas'),
        H('Checklist rápida para el invernadero', 'next', 'h2', 'S', 'Modo guiado de 2 minutos por planta.', '5 acciones'),
        H('PWA offline con cache de biblioteca', 'next', 'h2', 'M', 'Leer y simular sin conexión.', '100% lectura'),
        H('Haptics y feedback táctil', 'next', 'h2', 'S', 'Confirmaciones suaves en acciones críticas.', '3 patrones'),
        H('Tablet layout de dos paneles', 'next', 'h2', 'M', 'Aprovechar 768–1100 px sin perder densidad.', '2 columnas'),
        H('Importar batch por QR', 'later', 'h2', 'S', 'Abrir un replay compartido sin teclear.', '1 escaneo'),
        H('Notas de voz con transcripción', 'later', 'h2', 'M', 'Registrar observaciones sin escribir.', 'Español'),
        H('Widget de clima y batch', 'later', 'h3', 'M', 'Ver el estado del batch desde la pantalla de inicio.', 'iOS/Android'),
        H('Conexión BLE con sensores', 'later', 'h3', 'XL', 'Leer humedad y temperatura sin nube.', '2 sensores'),
        H('Modo AR de inspección de planta', 'later', 'h3', 'XL', 'Superponer etapas y alertas sobre la planta.', '1 prototipo')
      ]
    },
    {
      id: 'community', title: 'Comunidad y aprendizaje', icon: '❧', accent: 'stone',
      purpose: 'Compartir conocimiento y corridas sin convertirlo en una red social.',
      items: [
        H('Compartir un batch como Markdown/JSON', 'done', 'h0', 'S', 'Resultado, ranking, eventos y supuestos, sin datos personales.', '2 formatos'),
        H('Plantillas de estrategia aportadas por usuarios', 'now', 'h1', 'M', 'Importables y auditables.', '10 plantillas'),
        H('Guías de estudio armadas desde la biblioteca', 'now', 'h1', 'M', 'Ruta de lectura por objetivo.', '6 rutas'),
        H('Cohortes de estudio moderadas', 'next', 'h2', 'L', 'Grupos pequeños con un objetivo y un facilitador.', '20 personas'),
        H('Preguntas frecuentes curadas con fuente', 'next', 'h1', 'M', 'Respuestas breves enlazadas al índice.', '50 preguntas'),
        H('Repositorio de fuentes verificadas y fechadas', 'next', 'h2', 'L', 'Cada entrada con autor, año y enlace.', '100 fuentes'),
        H('Mentoría con reputación basada en evidencia', 'later', 'h3', 'L', 'No por likes: por fuentes y resultados auditables.', '20 mentores'),
        H('Grow-along de un batch comunitario', 'later', 'h3', 'L', 'Todos simulan la misma semilla y comparan decisiones.', '1 cohorte'),
        H('Foros moderados por tema, sin rankings', 'later', 'h3', 'XL', 'Solo si hay comunidad y moderación sostenible.', 'Por decidir'),
        H('Traducción colaborativa de material', 'later', 'h3', 'M', 'Revisión por pares y control de versiones.', '3 idiomas'),
        H('Galería pública opt-in de batches', 'later', 'h2', 'M', 'Compartir solo lo que el usuario elige, sin datos personales.', '100 batches'),
        H('Programa de moderación y código de conducta', 'later', 'h2', 'M', 'Reglas claras antes de abrir cualquier espacio social.', '1 documento')
      ]
    },
    {
      id: 'compliance', title: 'Marco legal y confianza', icon: '⚖', accent: 'amber',
      purpose: 'Educar con límites claros y sin promesas comerciales.',
      items: [
        H('Aviso legal persistente y contexto 2026', 'done', 'h0', 'S', 'Autocultivo registrado, 9 plantas, 15 m².', 'Siempre'),
        H('Checklist REPROCANN y trazabilidad', 'done', 'h0', 'S', 'Registro, domicilio, autoconsumo y rótulos.', '5 checks'),
        H('Fecha de revisión por recurso legal', 'now', 'h0', 'S', 'Mostrar cuándo se verificó por última vez.', '100% legal'),
        H('Centro de límites: qué hace y qué no hace Verde', 'now', 'h1', 'S', 'Una página, sin letra chica.', '1 página'),
        H('Selector de jurisdicción y supuestos', 'next', 'h1', 'M', 'Argentina, y luego otros marcos con fecha y fuente.', '1 país + demo'),
        H('Changelog normativo con fuentes oficiales', 'next', 'h2', 'M', 'Qué cambió, cuándo y qué recursos se revisaron.', '1 entrada/mes'),
        H('Gate de edad y consentimiento informado', 'next', 'h1', 'S', 'Antes de contenido sensible o datos.', '1 flujo'),
        H('Advertencias de contenido medicinal', 'next', 'h1', 'S', 'No reemplaza profesional; evitar dosis individuales.', 'Siempre'),
        H('Política de datos y borrado local', 'next', 'h1', 'S', 'Minimización, exportación y borrado en un clic.', '1 política'),
        H('Alertas cuando cambia la normativa citada', 'later', 'h2', 'L', 'Sin dar asesoramiento: solo señalar revisión.', 'Por fuente'),
        H('Packs legales por jurisdicción', 'later', 'h3', 'L', 'Contenido fechado y revisable por expertos.', '5 regiones'),
        H('Auditoría externa de claims y sesgos', 'later', 'h3', 'M', 'Revisar lenguaje medicinal y promesas.', '1 informe'),
        H('Consejo asesor legal y ético', 'later', 'h3', 'M', 'Revisión periódica de límites y contenidos.', '3 expertos'),
        H('Informe anual de transparencia', 'later', 'h3', 'S', 'Qué se corrigió, qué se eliminó y por qué.', '1 informe')
      ]
    },
    {
      id: 'genetics', title: 'Genética y cepas', icon: '❧', accent: 'green',
      purpose: 'Convertir el catálogo en un mapa de decisiones, no en una vidriera.',
      items: [
        H('Catálogo de 14 autoflorecientes con ficha completa', 'done', 'h0', 'M', 'THC/CBD, ciclo, rendimiento, terpenos, linaje y notas.', '14 cepas'),
        H('Buscador por nombre, efecto, aroma y terpeno', 'done', 'h0', 'S', 'Filtros combinables sobre el catálogo demo.', '4 filtros'),
        H('Comparador side-by-side de dos cepas', 'now', 'h0', 'M', 'Ciclo, altura, rendimiento, dificultad y terpenos.', '2 cepas'),
        H('Árbol de linaje interactivo', 'next', 'h1', 'M', 'Ver padres, abuelos y origen geográfico.', '3 niveles'),
        H('Rueda de terpenos con explicación', 'next', 'h1', 'S', 'Qué implica cada terpeno y con qué se confunde.', '5 perfiles'),
        H('Score de procedencia y fecha de ficha', 'next', 'h1', 'S', 'Declarar fuente, año y nivel de confianza.', '14/14'),
        H('Base de ciclos reales por autofloreciente', 'next', 'h2', 'M', 'Rangos observados, no solo el dato del banco.', '14 curvas'),
        H('Registro de fenotipos y esquejes', 'next', 'h2', 'M', 'Guardar variaciones dentro de la misma variedad.', 'Ilimitados'),
        H('Inventario de semillas y germinación', 'next', 'h2', 'M', 'Lotes, edad, tasa de germinación y origen.', '1 vault'),
        H('Perfil de resistencia a plagas y estrés', 'later', 'h2', 'M', 'Cruzar genética con incidencias del batch.', '14 perfiles'),
        H('Rendimiento simulado por cepa', 'later', 'h2', 'M', 'Correr el batch con la curva de cada variedad.', '14 runs'),
        H('Planificador de cruces y estabilización', 'later', 'h3', 'L', 'Herramienta educativa, no promesa de breeding.', '1 planner'),
        H('Presets de batch por genética', 'later', 'h2', 'S', 'Ajustar agua, nutrición y días según la cepa.', '14 presets'),
        H('Archivo histórico de variedades', 'later', 'h3', 'M', 'Cepas desaparecidas, fuentes y descendencia.', '50 fichas'),
        H('Catálogo en 5 columnas con imágenes compactas', 'done', 'h0', 'M', 'Grilla densa 5 columnas desktop; tarjeta reducida sin perder lectura.', '5 columnas'),
        H('Categorías Sativa · Indica · CBD · Híbrida', 'done', 'h0', 'M', 'Orden y tabs por categoría con conteos; select y pills sincronizados.', '4 categorías'),
        H('Fuentes anotadas por ficha y panel público', 'done', 'h0', 'M', 'StrainAPI V1, Informer beta y Strainpedia demo documentadas; ninguna key guardada.', '3 fuentes + 1 ref')
      ]
    },
    {
      id: 'cultivation', title: 'Cultivo y operaciones', icon: '⌁', accent: 'lime',
      purpose: 'Del ambiente al curado: decisiones explicadas, no recetas ciegas.',
      items: [
        H('Ambiente, VPD y recursos en el simulador', 'done', 'h0', 'M', 'Temperatura, humedad, luz y reservas con impacto diario.', '1 invernadero'),
        H('Diario semanal con checklist y bitácora', 'done', 'h0', 'M', '11 semanas, eventos y proyección de cosecha.', '75 días'),
        H('Calculadora de VPD y setpoints por etapa', 'now', 'h1', 'M', 'Explicar el rango y qué hacer cuando se sale.', '6 etapas'),
        H('Planificador de riego y nutrición', 'now', 'h1', 'M', 'Frecuencia, volumen y mezcla según etapa y sustrato.', '1 calendario'),
        H('Calculadora de mezcla NPK y EC', 'next', 'h1', 'M', 'Convertir dosis y medir riesgo de bloqueo.', '3 fórmulas'),
        H('Checklist de manejo integrado de plagas', 'next', 'h1', 'M', 'Umbrales, monitoreo y control biológico.', '10 plagas'),
        H('Diagnóstico de síntomas con fuente', 'next', 'h2', 'L', 'Hoja, raíz y ambiente; respuesta enlazada a la biblioteca.', '20 síntomas'),
        H('Asesor de ventana de cosecha', 'next', 'h1', 'M', 'Tricomas, pistilos y días; sin prometer fecha exacta.', '3 señales'),
        H('Tracker de secado y curado', 'next', 'h2', 'M', 'Humedad, temperatura, días y riesgo de moho.', '1 batch'),
        H('Planificador de macetas y sustrato', 'next', 'h2', 'S', 'Volumen, drenaje y trasplantes.', '3 estilos'),
        H('Calculadora de DLI y horario de luz', 'next', 'h2', 'S', 'Energía, horas y distancia sin prometer rendimiento.', '1 cálculo'),
        H('Planificador de poda, LST y defoliación', 'next', 'h2', 'M', 'Qué hacer y cuándo, con contraindicaciones.', '1 planner'),
        H('Plantillas de batch por estilo de cultivo', 'next', 'h2', 'M', 'Low-cost, orgánico, intensivo y experimental.', '6 plantillas'),
        H('Registro de residuos y reciclaje de agua', 'later', 'h3', 'M', 'Costo ambiental y decisiones de descarte.', '1 tracker'),
        H('Flujo de pheno hunt', 'later', 'h3', 'L', 'Comparar plantas de la misma variedad con métricas.', '1 workflow'),
        H('Integración con controladores de clima', 'later', 'h3', 'L', 'Setpoints y alarmas sin lock-in de marca.', '3 marcas')
      ]
    },
    {
      id: 'ai', title: 'IA y agentes', icon: '◈', accent: 'violet',
      purpose: 'Automatizar comprensión, no decisiones: evidencia, evaluación y control.',
      items: [
        H('Heurística local sin modelo generativo', 'done', 'h0', 'M', 'Respuestas deterministas con citas del índice.', '0 APIs'),
        H('Embeddings locales para búsqueda semántica', 'now', 'h1', 'L', 'Indexar fragmentos sin enviar PDFs a terceros.', '<300 ms'),
        H('RAG verificable con pasajes y páginas', 'now', 'h1', 'L', 'Recuperar, citar y admitir vacíos.', '95% precisión'),
        H('Evaluación de alucinaciones y sesgos', 'now', 'h2', 'M', 'Dataset de preguntas, respuestas esperadas y errores.', '100 casos'),
        H('Agente crítico del batch', 'next', 'h2', 'M', 'Señala supuestos débiles y eventos que explican el resultado.', '1 informe'),
        H('Reporte semanal autogenerado', 'next', 'h2', 'S', 'Resumen de ambiente, decisiones y próximos pasos.', '1 página'),
        H('Detección de anomalías en sensores', 'next', 'h2', 'M', 'Cambios raros de VPD, consumo o salud.', '5 alertas'),
        H('Constructor de escenarios en lenguaje natural', 'next', 'h2', 'M', '“Simulá una ola de calor en floración”.', '10 escenarios'),
        H('Diagnóstico de imágenes con límites explícitos', 'later', 'h3', 'L', 'Orientar, no diagnosticar; citar fuentes y pedir confirmación.', '5 síntomas'),
        H('Asistente de voz local', 'later', 'h3', 'L', 'Preguntar y dictar sin conexión.', 'Español'),
        H('Enrutado de modelos y control de costo', 'later', 'h3', 'M', 'Elegir local/remoto según tarea y presupuesto.', '3 proveedores'),
        H('Panel de explicabilidad', 'later', 'h2', 'M', 'Ver qué fuentes y reglas produjeron una respuesta.', '1 panel'),
        H('Red-team de prompts y contenidos peligrosos', 'later', 'h2', 'M', 'Probar límites legales y médicos antes de publicar.', '50 ataques'),
        H('Proveedor generativo opcional opt-in', 'later', 'h3', 'L', 'Consentimiento explícito y sin subir documentos por defecto.', '1 proveedor')
      ]
    },
    {
      id: 'integrations', title: 'Integraciones y hardware', icon: '⌗', accent: 'stone',
      purpose: 'Importar la realidad del cultivo sin encerrar al usuario en una marca.',
      items: [
        H('Importación CSV de sensores', 'now', 'h1', 'M', 'Mapear columnas y validar rangos.', '3 formatos'),
        H('Exportación a Home Assistant', 'now', 'h2', 'M', 'Entidades, eventos y estado del batch.', '1 integración'),
        H('MQTT para telemetría local', 'next', 'h2', 'L', 'Publicar y suscribir sin nube.', '1 broker'),
        H('Compatibilidad AC Infinity / Vivosun', 'next', 'h2', 'L', 'Importar curvas y alarmas cuando la API lo permita.', '2 marcas'),
        H('SensorPush / Ecowitt por export', 'next', 'h2', 'M', 'CSV y API documentada como fallback.', '2 marcas'),
        H('Hygrometer Bluetooth', 'later', 'h3', 'L', 'Lectura directa desde el navegador.', '2 modelos'),
        H('Enchufe inteligente y consumo eléctrico', 'later', 'h3', 'M', 'Medir kWh reales y cruzarlos con el costo.', '2 marcas'),
        H('Calendario externo (ICS)', 'next', 'h1', 'S', 'Exportar hitos del batch a Google/Apple Calendar.', '1 archivo'),
        H('Exportación a Notion / Obsidian', 'next', 'h2', 'M', 'Markdown con backlinks y metadatos.', '2 destinos'),
        H('Backup a GitHub o carpeta local', 'later', 'h2', 'M', 'Versionar el estado sin backend propio.', '1 repo'),
        H('Webhooks y automatizaciones', 'later', 'h3', 'M', 'Disparar acciones en n8n/Zapier sin datos sensibles.', '5 eventos'),
        H('API pública de solo lectura', 'later', 'h3', 'L', 'Estado, recursos y roadmap exportables.', '1 API'),
        H('Importador de GrowDiaries / Excel', 'later', 'h2', 'M', 'Traer un historial existente con mapeo asistido.', '2 formatos'),
        H('Estándar abierto de batch', 'later', 'h3', 'L', 'JSON schema compartido para replays y escenarios.', '1 spec')
      ]
    },
    {
      id: 'business', title: 'Negocio y sostenibilidad', icon: '◫', accent: 'amber',
      purpose: 'Sostener el proyecto sin traicionar sus límites ni vender datos.',
      items: [
        H('Política de no ads y no affiliate', 'done', 'h0', 'S', 'Ninguna recomendación está patrocinada.', 'Público'),
        H('Página de costos y transparencia', 'now', 'h1', 'S', 'Qué cuesta operar y cómo se financia.', '1 página'),
        H('Licencia open source y guía de contribución', 'now', 'h1', 'S', 'Código y datos demo reutilizables con atribución.', '1 licencia'),
        H('Modelo de donaciones o apoyo', 'next', 'h1', 'S', 'Sin bloquear funciones esenciales.', '1 canal'),
        H('Política de afiliados cero', 'next', 'h1', 'S', 'Si algún día existe, se declara y se puede desactivar.', '1 regla'),
        H('Grant y fondos para educación abierta', 'next', 'h2', 'M', 'Aplicar a programas de open knowledge.', '2 grants'),
        H('Métricas de impacto educativo', 'next', 'h2', 'M', 'Comprensión, no tiempo de pantalla.', '5 métricas'),
        H('Guía de partnerships y límites', 'next', 'h2', 'S', 'Qué marcas pueden colaborar y qué no.', '1 documento'),
        H('Carta de propiedad de datos', 'next', 'h1', 'S', 'Los datos son del usuario; exportables y borrables.', '1 carta'),
        H('Informe de sostenibilidad', 'later', 'h3', 'M', 'Costo energético, dependencias y huella.', '1 informe'),
        H('Votación no vinculante del roadmap', 'later', 'h3', 'M', 'Priorizar sin convertir el producto en encuesta.', '1 mecanismo'),
        H('Modelo de suscripción opcional', 'later', 'h3', 'L', 'Solo si no bloquea lectura, exportación ni simulador base.', '1 plan')
      ]
    },
    {
      id: 'design', title: 'Diseño, contenido y accesibilidad', icon: '◐', accent: 'lime',
      purpose: 'Que la densidad se sienta calma y que el conocimiento se pueda leer en cualquier contexto.',
      items: [
        H('Sistema visual verde con glow coherente', 'done', 'h0', 'M', 'Tokens de color, sombra y foco.', '1 sistema'),
        H('Tipografía editorial y jerarquía compacta', 'done', 'h0', 'S', 'Fraunces + Manrope + JetBrains Mono.', '3 familias'),
        H('Diseño responsive 320–1440 px', 'done', 'h0', 'M', 'Sin overflow horizontal en 8 vistas.', '100% vistas'),
        H('Command palette y atajos de teclado', 'done', 'h0', 'M', 'Búsqueda global con foco visible.', '⌘K'),
        H('Auditoría de contraste y foco', 'now', 'h1', 'M', 'AA en texto, controles y estados.', 'WCAG AA'),
        H('Guía de microcopy y tono', 'now', 'h1', 'S', 'Claro, breve, sin promesas médicas.', '1 guía'),
        H('Biblioteca de iconos propia', 'next', 'h2', 'M', 'Iconos consistentes y accesibles.', '40 iconos'),
        H('Sistema de movimiento y reduced motion', 'next', 'h2', 'S', 'Timelapse, glow y transiciones respetuosas.', '1 spec'),
        H('Estados vacíos, error y carga', 'next', 'h1', 'M', 'Cada estado explica qué pasó y qué hacer.', '100%'),
        H('Tema claro con contraste AA', 'next', 'h2', 'M', 'Verde como acento, no como fondo.', '1 tema'),
        H('Ilustración editorial para conceptos', 'later', 'h2', 'M', 'Riego, VPD, terpenos y ciclo.', '20 piezas'),
        H('Plantillas de presentación y clase', 'later', 'h3', 'M', 'Exportar una vista a slides.', '3 plantillas'),
        H('Sistema de audio y feedback', 'later', 'h3', 'S', 'Sonidos sutiles, opcionales, sin ansiedad.', '1 pack'),
        H('Guía de diseño de datos', 'later', 'h2', 'M', 'Cómo mostrar incertidumbre y comparaciones.', '1 documento')
      ]
    }
  ]
};
