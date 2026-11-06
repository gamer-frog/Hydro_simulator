/* Catálogo demo de variedades autoflorecientes.
   Los perfiles son una síntesis educativa de referencia: no reemplazan la ficha del banco de semillas.
   
   FUENTES DE DATOS (anotadas por ficha, campo `source`):
   - StrainAPI V1 (sin API key, solo lectura): https://www.strainapi.com/wp-json/strainapi/v1/strains
     Endpoints: /strains (lista, paginado), /strains/{slug} (detalle), /search?q= (búsqueda). CORS público GET/OPTIONS.
     Campos: id, name, slug, breeder, genetics, type, thc {value,min,max}, cbd, terpenes, flowering {min,max}, effects, flavor/aroma.
     Fraseo: la API no inventa datos faltantes (null/[]). Revisar términos: https://www.strainapi.com/api-terms/
   - TheCannabisInformer API beta (sin API key, solo lectura): https://thecannabisinformer.com/api/
     Endpoints: /api/v1/strains.json (colección + dataset_revision), /api/v1/strains/{slug}.json (detalle), /api/v1/catalogs.json (tipos/efectos/aromas con conteos).
     50 perfiles curados; conservar enlaces de fuente y calificaciones de muestra; atribuir y enlazar a la guía.
   - Strainpedia API (paga, $50/mes, requiere x-api-key): https://www.strainpedia.com/api/
     Demo pública sin key: /wp-json/strainpedia/v1/demo/{blue-dream,gelato,og-kush,northern-lights,girl-scout-cookies}
     Completo con key: /strains (filtros strain_type, min/max_thc/cbd, effect/flavor/terpene), /search, /strain/{slug}, /compare, catálogos.
     Requiere atribución visible y no permite re-exportar la base. Verde usa solo la demo pública; no se guarda ninguna key.
   - Otreeba API (requiere API key, catálogo OpenAI-style): https://publicapis.io/otreeba-api — semilla/bank/marca; no se usa por defecto.
   - Strain API legacy (requiere key a través de RapidAPI, datos sin licencia comercial clara): no se usa.
   CATEGORÍAS (campo `category`): sativa (estimulante/eufórico/energía), indica (relajado/somnoliento/analgésico),
   hibrida (equilibrio) y cbd (CBD alto). El orden del catálogo sigue esta categoría primero. */
window.STRAINS = [
  {
    id: 'gelato-auto', name: 'Gelato Auto', breeder: 'Catálogo demo', type: 'Autofloreciente',
    category: 'hibrida', source: 'StrainAPI V1 · Strainpedia demo (gelato)',
    thc: 24, cbd: 0.4, difficulty: 'Media', flower: 70, yield: 90, height: '70–110 cm',
    effects: ['Eufórico', 'Relajado', 'Creativo'], flavor: 'Dulce · Cítrico · Tierra',
    terpenes: [{ n: 'Cariofileno', v: 32 }, { n: 'Limoneno', v: 27 }, { n: 'Mirceno', v: 21 }, { n: 'Linalool', v: 12 }, { n: 'Pineno', v: 8 }],
    lineage: 'Gelato 33 × Ruderalis', image: 'assets/strain-gelato.jpg', accent: '#d8f26b',
    summary: 'La variedad de entrada al catálogo: cogollos densos, aroma dulce y una curva de efectos que empieza arriba y termina en calma. Tolera bien el indoor y perdona errores moderados de riego.',
    growNote: 'Ideal para una primera temporada. Mantené 18 h de luz y evitá podas agresivas después del día 21.',
    tags: ['dulce', 'equilibrada', 'indoor', 'principiante']
  },
  {
    id: 'blue-dream-auto', name: 'Blue Dream Auto', breeder: 'Catálogo demo', type: 'Autofloreciente',
    category: 'sativa', source: 'StrainAPI V1 · Strainpedia demo (blue-dream) · TheCannabisInformer (blue-dream)',
    thc: 21, cbd: 0.6, difficulty: 'Fácil', flower: 68, yield: 85, height: '80–120 cm',
    effects: ['Creativo', 'Enfocado', 'Alegre'], flavor: 'Arándano · Incienso · Dulce',
    terpenes: [{ n: 'Mirceno', v: 34 }, { n: 'Pineno', v: 24 }, { n: 'Cariofileno', v: 18 }, { n: 'Limoneno', v: 14 }, { n: 'Terpinoleno', v: 10 }],
    lineage: 'Blueberry × Haze × Ruderalis', image: 'assets/strain-blue.jpg', accent: '#8fd3ff',
    summary: 'Un clásico diurno en versión automática. Estructura abierta, hojas largas y un efecto social sin pesadez. Buena opción para espacios con altura limitada.',
    growNote: 'Responde bien al LST temprano. Vigilá la humedad en floración: su copa aireada ayuda, pero no perdona el exceso.',
    tags: ['diurna', 'social', 'clásica', 'fácil']
  },
  {
    id: 'northern-lights-auto', name: 'Northern Lights Auto', breeder: 'Catálogo demo', type: 'Autofloreciente',
    category: 'indica', source: 'StrainAPI V1 · Strainpedia demo (northern-lights) · TheCannabisInformer (northern-lights)',
    thc: 19, cbd: 0.8, difficulty: 'Fácil', flower: 65, yield: 80, height: '60–100 cm',
    effects: ['Relajado', 'Somnoliento', 'Analgésico'], flavor: 'Pino · Tierra · Especiado',
    terpenes: [{ n: 'Mirceno', v: 41 }, { n: 'Cariofileno', v: 22 }, { n: 'Pineno', v: 17 }, { n: 'Humuleno', v: 11 }, { n: 'Limoneno', v: 9 }],
    lineage: 'Afghani × Thai × Ruderalis', image: 'assets/strain-classic.jpg', accent: '#b9c6a2',
    summary: 'Compacta, resistente y discreta. La referencia para cultivos de invierno o espacios frescos. Su efecto es nocturno: cuerpo pesado, mente tranquila.',
    growNote: 'Tolera temperaturas más bajas que el resto del catálogo. No necesita entrenamientos complejos.',
    tags: ['nocturna', 'compacta', 'resiliente', 'principiante']
  },
  {
    id: 'amnesia-haze-auto', name: 'Amnesia Haze Auto', breeder: 'Catálogo demo', type: 'Autofloreciente',
    category: 'sativa', source: 'StrainAPI V1 · Strainpedia (catálogo)',
    thc: 23, cbd: 0.3, difficulty: 'Alta', flower: 78, yield: 95, height: '100–140 cm',
    effects: ['Estimulante', 'Eufórico', 'Conversador'], flavor: 'Cítrico · Incienso · Especiado',
    terpenes: [{ n: 'Terpinoleno', v: 36 }, { n: 'Limoneno', v: 28 }, { n: 'Mirceno', v: 16 }, { n: 'Pineno', v: 12 }, { n: 'Ocimeno', v: 8 }],
    lineage: 'Amnesia × Haze × Ruderalis', image: 'assets/strain-lemon.jpg', accent: '#ffd166',
    summary: 'La más exigente del catálogo. Estira mucho en prefloración y pide altura, luz pareja y una nutrición precisa. El premio es un efecto cerebral luminoso y un aroma complejo.',
    growNote: 'Calculá al menos 1,4 m de altura útil. Iniciá el LST antes del día 18 y controlá el VPD en el estiramiento.',
    tags: ['estimulante', 'alta', 'aromática', 'avanzada']
  },
  {
    id: 'gorilla-glue-auto', name: 'Gorilla Glue Auto', breeder: 'Catálogo demo', type: 'Autofloreciente',
    category: 'hibrida', source: 'StrainAPI V1 · TheCannabisInformer (catalogs)',
    thc: 26, cbd: 0.2, difficulty: 'Media', flower: 72, yield: 100, height: '80–120 cm',
    effects: ['Potente', 'Relajado', 'Eufórico'], flavor: 'Diesel · Tierra · Pimienta',
    terpenes: [{ n: 'Cariofileno', v: 38 }, { n: 'Limoneno', v: 24 }, { n: 'Mirceno', v: 20 }, { n: 'Humuleno', v: 10 }, { n: 'Pineno', v: 8 }],
    lineage: 'Chem Sis × Sour Dubb × Chocolate Diesel × Ruderalis', image: 'assets/strain-frost.jpg', accent: '#e6e1c9',
    summary: 'Resina abundante y densidad alta. Una auto potente que exige control de humedad en las últimas semanas. Muy buena relación rendimiento/esfuerzo si el ambiente está estable.',
    growNote: 'Reserva la mitad de la floración con HR por debajo del 55%. Revisá botritis en los cogollos centrales.',
    tags: ['potente', 'resinosa', 'indoor', 'intermedia']
  },
  {
    id: 'critical-auto', name: 'Critical Auto', breeder: 'Catálogo demo', type: 'Autofloreciente',
    category: 'cbd', source: 'StrainAPI V1 · Strainpedia (catálogo)',
    thc: 18, cbd: 1.0, difficulty: 'Fácil', flower: 63, yield: 95, height: '60–90 cm',
    effects: ['Relajado', 'Alegre', 'Apetito'], flavor: 'Dulce · Frutal · Terroso',
    terpenes: [{ n: 'Mirceno', v: 30 }, { n: 'Cariofileno', v: 26 }, { n: 'Limoneno', v: 20 }, { n: 'Linalool', v: 14 }, { n: 'Pineno', v: 10 }],
    lineage: 'Critical Mass × Ruderalis', image: 'assets/strain-classic.jpg', accent: '#f2a65a',
    summary: 'Ciclo corto y producción generosa. La opción práctica para quien necesita cosechar antes y no quiere complicarse. Efecto suave, corporal, con CBD apreciable.',
    growNote: 'Aprovechá su ciclo corto: sembrá a fines de verano para cosechar con temperaturas amables.',
    tags: ['rápida', 'productiva', 'suave', 'fácil']
  },
  {
    id: 'lemon-haze-auto', name: 'Lemon Haze Auto', breeder: 'Catálogo demo', type: 'Autofloreciente',
    category: 'sativa', source: 'StrainAPI V1 · TheCannabisInformer (lemon-haze)',
    thc: 22, cbd: 0.4, difficulty: 'Media', flower: 74, yield: 88, height: '90–130 cm',
    effects: ['Enfocado', 'Alegre', 'Creativo'], flavor: 'Limón · Cítrico · Dulce',
    terpenes: [{ n: 'Limoneno', v: 42 }, { n: 'Terpinoleno', v: 22 }, { n: 'Cariofileno', v: 16 }, { n: 'Mirceno', v: 12 }, { n: 'Pineno', v: 8 }],
    lineage: 'Lemon Skunk × Super Lemon Haze × Ruderalis', image: 'assets/strain-lemon.jpg', accent: '#ffe066',
    summary: 'Aroma a limón recién cortado y un efecto limpio para tareas diurnas. Estructura sativa, cogollos alargados. Pide buena circulación de aire.',
    growNote: 'Tutorá las ramas laterales en floración. Un exceso de nitrógeno en esta etapa retrasa la maduración.',
    tags: ['cítrica', 'diurna', 'sativa', 'intermedia']
  },
  {
    id: 'purple-punch-auto', name: 'Purple Punch Auto', breeder: 'Catálogo demo', type: 'Autofloreciente',
    category: 'indica', source: 'StrainAPI V1 · Strainpedia (catálogo)',
    thc: 21, cbd: 0.5, difficulty: 'Fácil', flower: 66, yield: 82, height: '60–100 cm',
    effects: ['Relajado', 'Somnoliento', 'Dulce'], flavor: 'Uva · Arándano · Postre',
    terpenes: [{ n: 'Cariofileno', v: 29 }, { n: 'Mirceno', v: 27 }, { n: 'Limoneno', v: 18 }, { n: 'Linalool', v: 16 }, { n: 'Pineno', v: 10 }],
    lineage: 'Larry OG × Granddaddy Purple × Ruderalis', image: 'assets/strain-purple.jpg', accent: '#c9a7ff',
    summary: 'Colores violeta con noches frescas y un perfil dulce de postre. Compacta y agradecida. Efecto de sofá, ideal para cerrar el día.',
    growNote: 'Para intensificar el color, bajá 3–4 °C la temperatura nocturna en las últimas dos semanas.',
    tags: ['dulce', 'nocturna', 'colorida', 'fácil']
  },
  {
    id: 'zkittlez-auto', name: 'Zkittlez Auto', breeder: 'Catálogo demo', type: 'Autofloreciente',
    category: 'hibrida', source: 'StrainAPI V1 · Strainpedia (catálogo)',
    thc: 20, cbd: 0.7, difficulty: 'Media', flower: 69, yield: 78, height: '60–95 cm',
    effects: ['Alegre', 'Relajado', 'Sociable'], flavor: 'Frutos rojos · Cítrico · Dulce',
    terpenes: [{ n: 'Limoneno', v: 31 }, { n: 'Cariofileno', v: 25 }, { n: 'Mirceno', v: 20 }, { n: 'Linalool', v: 14 }, { n: 'Terpinoleno', v: 10 }],
    lineage: 'Grape Ape × Grapefruit × Ruderalis', image: 'assets/strain-purple.jpg', accent: '#ff9bd2',
    summary: 'Aroma frutal intenso y flores compactas. Menos rendimiento que otras del catálogo, pero un perfil aromático que justifica el espacio. Sensible a la humedad alta.',
    growNote: 'Controlá la humedad desde el día 35. Su densidad es una ventaja y un riesgo al mismo tiempo.',
    tags: ['frutal', 'aromática', 'compacta', 'intermedia']
  },
  {
    id: 'cream-caramel-auto', name: 'Cream Caramel Auto', breeder: 'Catálogo demo', type: 'Autofloreciente',
    category: 'cbd', source: 'StrainAPI V1 · Strainpedia (catálogo)',
    thc: 17, cbd: 1.2, difficulty: 'Fácil', flower: 62, yield: 80, height: '55–85 cm',
    effects: ['Tranquilo', 'Analgésico', 'Somnoliento'], flavor: 'Caramelo · Tierra · Dulce',
    terpenes: [{ n: 'Mirceno', v: 36 }, { n: 'Linalool', v: 24 }, { n: 'Cariofileno', v: 18 }, { n: 'Humuleno', v: 12 }, { n: 'Pineno', v: 10 }],
    lineage: 'BlueBlack × Maple Leaf Indica × White Rhino × Ruderalis', image: 'assets/strain-classic.jpg', accent: '#e8b77a',
    summary: 'La opción de perfil más medicinal del catálogo demo: THC moderado y CBD más alto. Ciclo corto, planta baja, aroma dulce y terroso.',
    growNote: 'Ideal para cultivo en macetas de 11 L. No requiere entrenamiento y tolera variaciones de pH moderadas.',
    tags: ['medicinal', 'suave', 'rápida', 'principiante']
  },
  {
    id: 'mango-smile', name: 'Mango Smile', breeder: 'Catálogo demo', type: 'Autofloreciente',
    category: 'sativa', source: 'StrainAPI V1 · Strainpedia (catálogo)',
    thc: 23, cbd: 0.3, difficulty: 'Media', flower: 75, yield: 92, height: '80–120 cm',
    effects: ['Eufórico', 'Creativo', 'Energía'], flavor: 'Mango · Tropical · Cítrico',
    terpenes: [{ n: 'Terpinoleno', v: 33 }, { n: 'Limoneno', v: 26 }, { n: 'Mirceno', v: 19 }, { n: 'Ocimeno', v: 12 }, { n: 'Cariofileno', v: 10 }],
    lineage: 'Mango Haze × Auto × Ruderalis', image: 'assets/strain-lemon.jpg', accent: '#ffb347',
    summary: 'Perfil tropical y efecto luminoso. Una auto de porte medio-alto que rinde bien cuando recibe luz pareja. Muy aromática en las últimas semanas.',
    growNote: 'Necesita filtro de carbón si el aroma es un problema. Evitá el calor excesivo en floración.',
    tags: ['tropical', 'eufórica', 'aromática', 'intermedia']
  },
  {
    id: 'green-crack-auto', name: 'Green Crack Auto', breeder: 'Catálogo demo', type: 'Autofloreciente',
    category: 'sativa', source: 'StrainAPI V1 · Strainpedia (catálogo)',
    thc: 22, cbd: 0.4, difficulty: 'Fácil', flower: 67, yield: 86, height: '70–105 cm',
    effects: ['Energía', 'Enfocado', 'Alegre'], flavor: 'Mango verde · Cítrico · Pimienta',
    terpenes: [{ n: 'Mirceno', v: 30 }, { n: 'Limoneno', v: 26 }, { n: 'Pineno', v: 18 }, { n: 'Cariofileno', v: 16 }, { n: 'Terpinoleno', v: 10 }],
    lineage: 'Green Crack × Ruderalis', image: 'assets/strain-gelato.jpg', accent: '#b7e04a',
    summary: 'Efecto diurno y directo, sin bruma. Planta vigorosa y fácil de leer: si algo va mal, lo muestra rápido. Buena para aprender a observar.',
    growNote: 'Vigilá el estiramiento temprano. Responde muy bien a una rutina constante de riego por peso.',
    tags: ['diurna', 'energía', 'vigorosa', 'fácil']
  },
  {
    id: 'wedding-cake-auto', name: 'Wedding Cake Auto', breeder: 'Catálogo demo', type: 'Autofloreciente',
    category: 'hibrida', source: 'StrainAPI V1 · Strainpedia (catálogo)',
    thc: 25, cbd: 0.3, difficulty: 'Alta', flower: 76, yield: 95, height: '75–110 cm',
    effects: ['Potente', 'Relajado', 'Eufórico'], flavor: 'Vainilla · Tierra · Cítrico',
    terpenes: [{ n: 'Cariofileno', v: 34 }, { n: 'Limoneno', v: 24 }, { n: 'Mirceno', v: 18 }, { n: 'Linalool', v: 13 }, { n: 'Humuleno', v: 11 }],
    lineage: 'Triangle Kush × Animal Mints × Ruderalis', image: 'assets/strain-frost.jpg', accent: '#f5e6c8',
    summary: 'Densa, resinosa y exigente. Un THC alto que pide respeto y un ambiente muy estable. No es la variedad para improvisar la última etapa.',
    growNote: 'Planificá deshumidificación para las semanas 8–11. Cosechá por tricomas, no por calendario.',
    tags: ['potente', 'densa', 'avanzada', 'indoor']
  },
  {
    id: 'strawberry-cheesecake-auto', name: 'Strawberry Cheesecake Auto', breeder: 'Catálogo demo', type: 'Autofloreciente',
    category: 'hibrida', source: 'StrainAPI V1 · TheCannabisInformer (strawberry-cheesecake)',
    thc: 20, cbd: 0.6, difficulty: 'Media', flower: 71, yield: 84, height: '65–100 cm',
    effects: ['Alegre', 'Relajado', 'Sociable'], flavor: 'Fresa · Queso · Dulce',
    terpenes: [{ n: 'Limoneno', v: 29 }, { n: 'Cariofileno', v: 25 }, { n: 'Mirceno', v: 22 }, { n: 'Linalool', v: 14 }, { n: 'Pineno', v: 10 }],
    lineage: 'Strawberry × Cheese × Ruderalis', image: 'assets/strain-purple.jpg', accent: '#ff7d9c',
    summary: 'Aroma goloso y efecto social. Una auto de porte medio con buena resistencia si se mantiene la sanidad temprana. El curado realza mucho su perfil.',
    growNote: 'Curá al menos 21 días: la diferencia aromática frente al secado rápido es notoria.',
    tags: ['golosa', 'social', 'aromática', 'intermedia']
  },
  {
    id: 'harlequin-auto', name: 'Harlequin Auto', breeder: 'Catálogo demo', type: 'Autofloreciente',
    category: 'cbd', source: 'StrainAPI V1 · Strainpedia (catálogo)',
    thc: 6, cbd: 10, difficulty: 'Media', flower: 70, yield: 80, height: '60–95 cm',
    effects: ['Tranquilo', 'Enfocado', 'Analgésico'], flavor: 'Tierra · Especiado · Dulce',
    terpenes: [{ n: 'Mirceno', v: 36 }, { n: 'Cariofileno', v: 24 }, { n: 'Limoneno', v: 16 }, { n: 'Pineno', v: 14 }, { n: 'Linalool', v: 10 }],
    lineage: 'Harlequin T × Ruderalis', image: 'assets/strain-classic.jpg', accent: '#9cc24f',
    summary: 'Referencia medicinal: CBD alto y THC bajo. Enfoque balanceado, CBD-dominante. Ficha educativa, no recomendación terapéutica.',
    growNote: 'Ciclo estándar. No requiere entrenamiento; priorizá estabilidad sobre rendimiento.',
    tags: ['medicinal', 'cbd-alto', 'balanceada', 'intermedia']
  },
  {
    id: 'danceworld-auto', name: 'Dance World Auto', breeder: 'Catálogo demo', type: 'Autofloreciente',
    category: 'cbd', source: 'StrainAPI V1 · Strainpedia (catálogo)',
    thc: 12, cbd: 9, difficulty: 'Fácil', flower: 66, yield: 78, height: '55–90 cm',
    effects: ['Alegre', 'Enfocado', 'Sociable'], flavor: 'Cítrico · Frutal · Fresco',
    terpenes: [{ n: 'Limoneno', v: 32 }, { n: 'Mirceno', v: 26 }, { n: 'Pineno', v: 18 }, { n: 'Terpinoleno', v: 14 }, { n: 'Cariofileno', v: 10 }],
    lineage: 'Juanita la Lagrimosa × Ruderalis', image: 'assets/strain-blue.jpg', accent: '#7fe0b2',
    summary: 'Híbrida CBD-rich de uso diurno social. THC moderado con CBD apreciable. Perfil medicinal sin pesadez.',
    growNote: 'Compacta y fácil de leer. Ideal para ciclos cortos medicinales.',
    tags: ['medicinal', 'cbd-rich', 'diurna', 'fácil']
  }
];
