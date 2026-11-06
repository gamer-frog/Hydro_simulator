# Ingesta de PDFs — Verde

Esta carpeta es la **capa de ingesta**: aquí van los PDFs originales, ordenados
exactamente como declara `library.js` (ruta `path` de cada recurso).

```
pdf/
  01_CultivoInterior/M1/01_fundamentos_indoor.pdf
  03_CannabisMedicinal/M1/11_cannabinoides.pdf
  ...
```

Reglas:
- El PDF original **nunca se mueve ni se sobrescribe**.
- Cada PDF conserva su checksum (`mdHash` en la app) y su ruta Markdown derivada.
- Los duplicados se vinculan con `dup`, no se borran.
- Al agregar un PDF, registrarlo en `library.js` con `id, title, diploma, code, module, year, pages, state, tags, path, summary`.
- La transcripción a Markdown vive en `md/` y alimenta insights y el oráculo.

Dataset actual: 28 recursos demo (no incluyen PDFs reales). Reemplazar por tus 4 diplomaturas
mantiene el mismo esquema `diploma → code → module → path → mdPath()`.
