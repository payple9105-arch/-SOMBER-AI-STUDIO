"""Utilidades sin dependencias externas para la IA de SOMBER AI STUDIO.

Aquí viven los textos de sistema del asistente, el mejorador de prompts
local (funciona sin ninguna clave) y pequeñas ayudas para fal.ai.
"""

from __future__ import annotations

import re

ASSISTANT_SYSTEM = (
    "Eres SOMBER, el asistente creativo de SOMBER AI STUDIO, una app para crear "
    "vídeos, anime e imágenes con IA. Respondes siempre en el idioma del usuario "
    "(por defecto español), de forma breve, cercana y práctica. Ayudas a: escribir "
    "guiones y escenas, crear personajes de anime, proponer estilos visuales y "
    "redactar prompts listos para generar. Cuando des un prompt para generar, "
    "ponlo en una línea aparte que empiece con 'PROMPT:' para que el usuario lo copie. "
    "Si te piden algo sexual con menores, violencia gráfica real o contenido de odio, "
    "lo rechazas con amabilidad. Puedes usar personajes originales, pero no copies "
    "personajes con derechos de autor: propone alternativas originales."
)

ENHANCER_SYSTEM = (
    "Eres un experto en prompts para generadores de vídeo e imagen con IA. "
    "Recibes una idea corta y devuelves UN solo prompt mejorado, en inglés, de "
    "40 a 90 palabras, que describa: sujeto, acción, escenario, iluminación, "
    "movimiento de cámara (solo si es vídeo), paleta de color y estilo. "
    "No añadas comillas, títulos, explicaciones ni listas: solo el prompt."
)

STYLE_HINTS: dict[str, str] = {
    "cinemático": "cinematic film still, anamorphic lens, dramatic lighting, shallow depth of field",
    "cine": "cinematic film still, anamorphic lens, dramatic lighting, shallow depth of field",
    "anime": "high quality anime style, clean line art, vibrant cel shading, detailed background",
    "cyberpunk": "cyberpunk aesthetic, neon lights, rain-soaked streets, magenta and cyan palette",
    "documental": "documentary style, natural light, handheld camera, realistic textures",
    "noir": "film noir, high contrast black and white, hard shadows, moody atmosphere",
    "digital": "digital art, crisp details, stylized lighting, rich colors",
    "shonen épico": "epic shonen anime style, dynamic action pose, speed lines, intense energy aura",
    "ghibli suave": "soft hand-painted anime style, gentle watercolor backgrounds, warm pastoral light",
    "noir urbano": "urban noir anime style, rainy night city, deep shadows, neon reflections",
    "mecha nocturno": "mecha anime style, giant detailed robot, night city, glowing cockpit lights",
    "romance pastel": "romantic anime style, pastel colors, soft bloom, cherry blossoms, tender mood",
}

VIDEO_HINT = "smooth camera movement, coherent motion, high detail, 24fps"
IMAGE_HINT = "masterpiece, highly detailed, sharp focus, beautiful composition"

IMAGE_SIZES = {"9:16": "portrait_16_9", "16:9": "landscape_16_9", "1:1": "square_hd"}


def style_hint(style: str | None) -> str:
    if not style:
        return ""
    return STYLE_HINTS.get(style.strip().lower(), style.strip())


def local_enhance(text: str, kind: str = "video", style: str | None = None) -> str:
    """Mejora un prompt sin llamar a ningún modelo (respaldo sin clave)."""
    idea = re.sub(r"\s+", " ", text).strip().rstrip(".")
    parts = [idea]
    hint = style_hint(style)
    if kind == "anime" and not hint:
        hint = STYLE_HINTS["anime"]
    if hint:
        parts.append(hint)
    parts.append(IMAGE_HINT if kind == "image" else VIDEO_HINT)
    return ", ".join(p for p in parts if p)


def build_generation_prompt(text: str, style: str | None, kind: str) -> str:
    """Añade el estilo al prompt final que se envía a fal.ai."""
    idea = text.strip()
    hint = style_hint(style)
    if kind in {"anime", "anime_image"} and "anime" not in (idea + hint).lower():
        hint = f"{hint}, anime style" if hint else STYLE_HINTS["anime"]
    if hint and hint.lower() not in idea.lower():
        return f"{idea}. Style: {hint}"
    return idea


def fal_app_root(model: str) -> str:
    """fal.ai consulta estado y resultado usando solo 'propietario/app'."""
    return "/".join(model.split("/")[:2])


def clean_chat_messages(messages: list[dict], max_messages: int = 20) -> list[dict]:
    """Deja solo turnos user/assistant válidos, alternados y empezando por user."""
    cleaned: list[dict] = []
    for m in messages[-max_messages:]:
        role = m.get("role")
        content = str(m.get("content", "")).strip()
        if role not in {"user", "assistant"} or not content:
            continue
        if cleaned and cleaned[-1]["role"] == role:
            cleaned[-1]["content"] += "\n\n" + content
        else:
            cleaned.append({"role": role, "content": content[:4000]})
    while cleaned and cleaned[0]["role"] != "user":
        cleaned.pop(0)
    return cleaned
