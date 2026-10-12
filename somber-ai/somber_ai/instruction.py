"""Procesador de texto de SOMBER AI."""

from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass

MODES = (
    "texto_a_video",
    "imagen_a_video",
    "video_a_video",
    "imagen",
    "anime",
    "audio",
    "edicion",
)

STYLES = {
    "cinematico": "Cinemático",
    "cinematografico": "Cinemático",
    "anime": "Anime",
    "manga": "Anime",
    "cyberpunk": "Cyberpunk",
    "documental": "Documental",
    "noir": "Noir",
    "acuarela": "Acuarela",
}


def _plain(text: str) -> str:
    normalized = unicodedata.normalize("NFD", text.lower())
    return "".join(
        char
        for char in normalized
        if unicodedata.category(char) != "Mn"
    )


@dataclass(frozen=True)
class Instruction:
    text: str
    mode: str
    style: str
    duration_sec: int
    aspect: str
    needs_source: bool

    def as_dict(self) -> dict[str, object]:
        return {
            "texto": self.text,
            "modo": self.mode,
            "estilo": self.style,
            "duracion_segundos": self.duration_sec,
            "formato": self.aspect,
            "necesita_archivo": self.needs_source,
        }


def parse_instruction(
    text: str,
    aspect_override: str | None = None,
    duration_override: int | None = None,
) -> Instruction:
    raw = " ".join(text.split())

    if not raw:
        raise ValueError("La instrucción está vacía.")

    folded = _plain(raw)
    mode = _mode(folded)

    aspect = (
        aspect_override
        if aspect_override in {"16:9", "9:16", "1:1"}
        else _aspect(folded)
    )

    duration = (
        min(10, max(1, duration_override))
        if duration_override is not None
        else _duration(folded)
    )

    return Instruction(
        text=raw,
        mode=mode,
        style=_style(folded, mode),
        duration_sec=duration,
        aspect=aspect,
        needs_source=mode in {
            "imagen_a_video",
            "video_a_video",
            "edicion",
        },
    )


def _mode(folded: str) -> str:
    # Editar un archivo existente.
    if re.search(
        r"\b(edita|edicion|recorta|subtitulos|subtitular)\b",
        folded,
    ):
        return "edicion"

    # Transformar un vídeo existente.
    if re.search(
        r"\b(video a video|transforma este video|"
        r"transformar un video existente)\b",
        folded,
    ):
        return "video_a_video"

    # Animar una imagen que ya existe.
    if re.search(
        r"\b(imagen a video|animar una imagen|"
        r"anima esta imagen|fotografia a video|"
        r"ilustracion a video)\b",
        folded,
    ):
        return "imagen_a_video"

    # Generación de audio independiente.
    if re.search(
        r"\b(narra|narracion|voz|audio|sonido)\b",
        folded,
    ) and not re.search(
        r"\b(video|escena|clip)\b",
        folded,
    ):
        return "audio"

    # Crear imágenes sin solicitar vídeo.
    if re.search(
        r"\b(dibuja|ilustra|genera una imagen|"
        r"crea una imagen|generar imagen|retrato)\b",
        folded,
    ) and not re.search(
        r"\b(video|clip)\b",
        folded,
    ):
        return "imagen"

    # Una descripción que pide vídeo debe crear vídeo desde texto.
    if re.search(
        r"\b(video|videos|clip|clips)\b",
        folded,
    ):
        return "texto_a_video"

    # Anime sin solicitud explícita de vídeo.
    if re.search(r"\b(anime|manga)\b", folded):
        return "anime"

    # Por defecto, una descripción creativa se interpreta como vídeo.
    return "texto_a_video"


def _style(folded: str, mode: str) -> str:
    if mode == "anime":
        return "Anime"

    for key, label in STYLES.items():
        if re.search(rf"\b{key}\b", folded):
            return label

    return "Cinemático"


def _duration(folded: str) -> int:
    match = re.search(
        r"\b(\d{1,2})\s*(segundos|segundo|s)\b",
        folded,
    )

    if not match:
        return 5

    value = int(match.group(1))
    return min(10, max(1, value))


def _aspect(folded: str) -> str:
    if re.search(
        r"\b(vertical|9:16|9x16|reel|tiktok|short)\b",
        folded,
    ):
        return "9:16"

    if re.search(
        r"\b(cuadrado|1:1|1x1)\b",
        folded,
    ):
        return "1:1"

    if re.search(
        r"\b(horizontal|16:9|16x9)\b",
        folded,
    ):
        return "16:9"

    return "16:9"
