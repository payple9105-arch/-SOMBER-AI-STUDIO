# SOMBER AI STUDIO

Plataforma en **beta pública** para generar y editar ideas de vídeo con IA.

## Enlaces

- Página pública: https://payple9105-arch.github.io/-SOMBER-AI-STUDIO/
- Repositorio: https://github.com/payple9105-arch/-SOMBER-AI-STUDIO
- API: https://somber-ai-studio-api.onrender.com

## Qué incluye hoy

- Interfaz web (Inicio, Crear video, Anime, Editor, Proyectos, Nube, Planes, Pago, Panel, Cuenta, Soporte, Términos, Privacidad)
- Generación de vídeo vía API (`/generate`) cuando el servidor tiene `FAL_KEY`
- Seguimiento de trabajos y reproducción del resultado
- Subida local de archivos (IndexedDB en el navegador)
- Límite client-side de generaciones por hora (antiabuso básico)
- Textos legales y soporte en la propia app
- Núcleo Python en [`somber-ai/`](somber-ai/)

## Qué falta para producción completa

Ver [LANZAMIENTO.md](LANZAMIENTO.md). Resumen:

1. Auth real en servidor + base de datos
2. Créditos y límites en servidor
3. Almacenamiento en la nube de archivos
4. Stripe (cobros reales)
5. Dominio propio y secretos de producción

## Desarrollo local

```bash
npm install
npm run dev
```

API local (opcional):

```bash
cd somber-ai
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export FAL_KEY=tu_clave
uvicorn server:app --reload --port 8000
```

## Estructura

| Ruta | Contenido |
|------|-----------|
| `src/` | App React + Vite publicada en GitHub Pages |
| `public/` | Imágenes y assets estáticos |
| `somber-ai/` | API FastAPI de generación |
| `diseno/` | Referencias de diseño |
| `LANZAMIENTO.md` | Checklist de salida a público |

## Licencia y uso

Beta. Al usar el sitio aplican los términos y la privacidad mostrados en la aplicación.
