# Markdown derivado — Verde

Esta carpeta es la **capa derivada**: un `.md` por PDF, en la misma ruta que `mdPath()` en `game.js`.

```
md/ci/modulo_1_introduccion/001_fundamentos_del_cultivo_indoor.md
```

Reglas:
- Un Markdown por PDF, con `# Título`, `## Módulo`, tablas y fórmulas cuando existen.
- Metadata al tope: `curso, módulo, año, idioma, tags, hash, páginas`.
- La Vista digerida y el Oráculo leen **solo** estos Markdown (no los PDFs crudos).
- Si un Markdown no existe, el recurso queda `pendiente/procesado` y no se inventa su contenido.
