"""Núcleo central de SOMBER AI."""

from __future__ import annotations

from somber_ai.environment import probe_environment
from somber_ai.instruction import Instruction, parse_instruction


_PIPELINES = {
    "texto_a_video": (
        "Procesador de texto",
        "Generador de vídeo",
    ),
    "imagen_a_video": (
        "Procesador de texto",
        "Sistema de imagen",
        "Generador de vídeo",
    ),
    "video_a_video": (
        "Procesador de texto",
        "Procesador de vídeo",
        "Motor de transformación",
    ),
    "imagen": (
        "Procesador de texto",
        "Generador de imágenes",
    ),
    "anime": (
        "Procesador de texto",
        "Sistema visual anime",
    ),
    "audio": (
        "Procesador de texto",
        "Motor de audio",
    ),
    "edicion": (
        "Procesador de texto",
        "Motor de edición",
    ),
}


class SomberAI:
    """Interpreta instrucciones y prepara el flujo de trabajo."""

    name = "SOMBER AI"

    def process(
        self,
        text: str,
        aspect: str | None = None,
        duration_sec: int | None = None,
    ) -> Instruction:
        return parse_instruction(
            text=text,
            aspect_override=aspect,
            duration_override=duration_sec,
        )

    def run(
        self,
        text: str,
        source_path: str | None = None,
        aspect: str | None = None,
        duration_sec: int | None = None,
    ) -> dict[str, object]:
        instruction = self.process(
            text=text,
            aspect=aspect,
            duration_sec=duration_sec,
        )

        environment = probe_environment()
        warnings: list[str] = []

        if instruction.needs_source and not source_path:
            warnings.append(
                "Esta operación necesita un archivo de imagen o vídeo."
            )

        if instruction.mode == "audio":
            warnings.append(
                "La generación de voz y audio todavía no está integrada."
            )

        if instruction.mode == "edicion":
            warnings.append(
                "La edición todavía no exporta archivos modificados."
            )

        if not environment["puede_generar"] and instruction.mode in {
            "texto_a_video",
            "imagen_a_video",
            "anime",
        }:
            warnings.append(
                "El motor de generación audiovisual todavía no está "
                "disponible en este servidor."
            )

        return {
            "nombre": self.name,
            "etapa": 1,
            "estado": "preparado",
            "instruccion": instruction.as_dict(),
            "archivo": source_path,
            "pasos": list(_PIPELINES[instruction.mode]),
            "resultado": None,
            "avisos": warnings,
            "entorno": environment,
        }
