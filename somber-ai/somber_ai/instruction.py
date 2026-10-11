"""Procesador de texto. Convierte una frase en una orden estructurada."""

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
    return "".join(ch for ch in normalized if unicodedata.category(ch) != "Mn")


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


def parse_instruction(text: str) -> Instruction:
    raw = " ".join(text.split())
    if not raw:
        raise ValueError("La instrucción está vacía.")
    folded = _plain(raw)
    mode = _mode(folded)
    return Instruction(
        text=raw,
        mode=mode,
        style=_style(folded, mode),
        duration_sec=_duration(folded),
        aspect=_aspect(folded),
        needs_source=mode in {"imagen_a_video", "video_a_video", "edicion"},
    )


def _mode(folded: str) -> str:
    if re.search(r"\b(edita|edicion|recorta|subtitul)", folded):
        return "edicion"
    if re.search(r"\b(video a video|transforma (este |el )?video)", folded):
        return "video_a_video"
    if re.search(r"\b(imagen a video|anima|animar|fotografia|ilustracion a video)", folded):
        return "imagen_a_video"
    if re.search(r"\b(narra|narracion|voz|audio|sonido)\b", folded) and not re.search(
        r"\b(video|escena|clip)\b", folded
    ):
        return "audio"
    if re.search(r"\b(dibuja|ilustra|genera una imagen|crea una imagen|retrato)\b", folded):
        return "imagen"
    if re.search(r"\b(anime|manga)\b", folded):
        return "anime"
    return "texto_a_video"


def _style(folded: str, mode: str) -> str:
    if mode == "anime":
        return "Anime"
    for key, label in STYLES.items():
        if re.search(rf"\b{key}\b", folded):
            return label
    return "Cinemático"


def _duration(folded: str) -> int:
    match = re.search(r"\b(\d{1,2})\s*(segundos|segundo|s)\b", folded)
    if not match:
        return 5
    value = int(match.group(1))
    return min(10, max(1, value))


def _aspect(folded: str) -> str:
    if re.search(r"\b(vertical|9:16|9x16|reel|tiktok|short)\b", folded):
        return "9:16"
    if re.search(r"\b(cuadrado|1:1|1x1)\b", folded):
        return "1:1"
    if re.search(r"\b(horizontal|16:9|16x9|cine)\b", folded):
        return "16:9"
    return "16:9"
