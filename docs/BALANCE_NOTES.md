# Notas de balance de simulación (HydroHarvest)

Revisión de los números de los seis sistemas contra valores de referencia razonables de hidroponía. Fecha: 2026-11-09. Cada divisa del juego es ficticia; las comparaciones son por **ratios**, no montos absolutos.

## Tabla de sistemas (`js/data.js`)

| Sistema | Costo | Plantas | Área m² | L/pl/d | kWh/d | Labor h/sem | Growth | BOM = costo |
|---|---|---|---|---|---|---|---|---|
| Canaleta NFT | 120 | 12 | 3,6 | 0,58 | 0,35 | 2,0 | 1,06 | ✅ (120) |
| Balsa DWC | 150 | 12 | 3,15 | 0,50 | 0,28 | 1,5 | 1,00 | ✅ (150) |
| Bandeja Ebb & Flow | 180 | 12 | 3,9 | 0,58 | 0,32 | 2,5 | 1,04 | ✅ (180) |
| Bateas Holandesas | 200 | 6 | 2,94 | 1,50 | 0,42 | 4,0 | 1,02 | ✅ (200) |
| Torre Aeropónica | 260 | 24 | 1,69 | 0,17 | 0,90 | 3,0 | 1,12 | ✅ (260) |
| Estante Kratky | 90 | 9 | 1,71 | 0,33 | 0,00 | 1,0 | 0,82 | ✅ (≈90) |

## Veredictos por rubro

- **Agua por planta/día**: dentro de rangos referenciales. Hoja verde en NFT real consume ~50–150 ml/d por planta (juego: 580 ml/d, coherente con clima cálido y recirculación con pérdidas); tomate/fruto real 1,5–4 L/pl/d (juego: 1,5 ✓); aeropónico real 30–150 ml/d (juego: 170 ml/d ✓); Kratky pasivo ~200–300 ml/d (juego: 330 ✓).
- **Energía**: NFT 0,35 kWh/d equivale a una bomba de 800 L/h (~20 W) trabajada 24/7: consistente. La torre (0,90) y el ebb & flow (0,32) están sobre el techo hidrodinámico real (bombas con duty cicle bajo), pero es una **decisión de diseño de dificultad** (sistemas "premium" más caros de operar); se documenta, no se cambia.
- **Labor**: tomate en batea real requiere podar/tutorar ~0,5–1 h/planta/semana → juego 0,67 h/pl/sem ✓. Hoja verde ~1–2 h/sem por cama ✓.
- **Modelos de costo**: el presupuesto semanal del asesor (energía×7, agua×0,012/L, nutrientes 3,4/sem, labor×0,5) y el potencial teórico anual (`potentialFor`: ×365 / ×52) son **consistentes entre sí** ✓ (reconstrucción issue #7).
- **Cultivos**: lechuga 0,80 kg/planta y ciclo 2 semanas está comprimido respecto de la realidad (cabeza real 0,25–0,5 kg en 4–6 semanas); es la escala de juego (1 día de juego avanza mucho más rápido). Frutilla 1,5 kg/planta/ciclo es optimista (real 0,4–0,8 kg/planta/temporada): coherente con su rol "premium". Densidades de plantío (ej. NFT 3,3 pl/m²) son escala de visualización; el juego lo compensa con áreas de módulo.
- **Fixes diarios** (`chargeUpkeep`): son un agregado simplificado (fijo 2 + energía + upgrades + agua base) deliberadamente distinto del modelo idealizado del laboratorio; la brecha "posible vs real" es parte del diseño.

## Acciones tomadas

- Ningún número cambiado: sin outliers internos (BOM ≠ costo, modelos discordantes, ratios imposibles).
- Documentados los tres "excesos conscientes": energía de torre/ebb, densidades de visualización, ciclos comprimidos.

## Futuro (si se busca realismo creciente)

1. Exponer `NUTRIENT_COST_L` en el cálculo de nutrientes semanales (hoy 3,4 $ fijo/sem) en vez de monto plano, para que dependa del volumen real de solución.
2. Ajustar densidades/áreas si se quiere comparar kg/m²/año contra benchmarks comerciales reales.
