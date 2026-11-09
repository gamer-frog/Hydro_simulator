# Rescate de HydroHarvest desde PLAYGROUND

Este repositorio conserva la aplicación de hidroponía NFT recuperada del repositorio `gamer-frog/PlayGround`, antes de que ese repositorio sea retirado.

## Aplicación recuperada

- La versión completa más reciente está en la raíz: `index.html`, `css/`, `js/` y `vendor/three.min.js`.
- Corresponde al checkpoint `opencode-checkpoints/23` de PLAYGROUND (6 de noviembre de 2026). Incluye el simulador 3D HydroHarvest, seis sistemas hidropónicos, cultivos, presupuesto/mercado, construcción, eventos y controles táctiles.
- Se preservó también la versión modular anterior en `archive/hydroharvest-v1/` (checkpoint 2), con sus hojas de estilo, módulos JavaScript, iconos, manifest y Three.js modular. Es una referencia archivada y no forma parte del arranque actual.
- Los historiales de conversaciones originales de los checkpoints 1, 2, 3, 22 y 23 están comprimidos en `docs/history/`. Se incluyen para no perder especificaciones y decisiones que no quedaron plasmadas en el código.

## Ejecutar

Es una aplicación estática. Desde la raíz del proyecto, iniciá un servidor HTTP local, por ejemplo:

```sh
python3 -m http.server 8000
```

Luego abrí `http://localhost:8000`. También se puede publicar como sitio estático. No usa paquetes externos de npm: Three.js está incluido en `vendor/three.min.js`.

## Verificación

Los módulos JavaScript recuperados pasan `node --check`. La partida y las preferencias se guardan en el almacenamiento local del navegador. Los costos y rendimientos son supuestos de simulación para comparar diseños; no reemplazan cotizaciones ni asesoramiento agronómico local.

## Procedencia

Los archivos principales se copiaron sin alterar su contenido desde el árbol del checkpoint 23 de PLAYGROUND. La implementación modular del checkpoint 2 se conserva separada para evitar mezclar dos versiones de la aplicación.

## Referencias Git rescatadas

Se verificaron los refs remotos disponibles de `gamer-frog/PlayGround` contra `origin`. Las referencias que sí llegaron están bajo `rescued/playground/*`. No se pudieron crear las siguientes ramas: `opencode-checkpoints/{1,2,3,4,5,6}`, `opencode-deployments/{2,4,5,9,23}`, `opencode-resume/9cdd1166f0588ac380ab` y `opencode/{42152735535,42187724047,42201185979}`. Sus árboles contienen `.github/workflows/opencode.yml`; el permiso de GitHub App no permite crear o actualizar workflows. Los refs originales siguen disponibles localmente como `playground/*` mientras exista este clon. No se eliminaron ni modificaron workflows para forzar la publicación, a fin de preservar el contenido original.

## Reconstrucciones desde sesiones previas de este repo

- **Desglose de costos operativos** (desde `origin/opencode-checkpoints/7`, sesión de la issue #7): `potentialFor()` ahora descompone la operación anual en semillas, energía, agua, nutrientes y mano de obra (al 50% de la tarifa), y la tabla "Potencial teórico" del laboratorio muestra "Ver desglose" por fila con etiquetas en español. Reconstruido de forma compatible sobre los guards defensivos de main (`bt.water?.consumptionLDay ?? 0`, etc.), sin merge directo de la branch.
