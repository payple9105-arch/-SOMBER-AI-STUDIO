"""Núcleo de SOMBER AI. Ordena el trabajo; no inventa un vídeo."""

from __future__ import annotations

from somber_ai.environment import probe_environment
from somber_ai.instruction import Instruction, parse_instruction

_PIPELINES = {
    "texto_a_video": ("Procesador de texto", "Generador de vídeo"),
    "imagen_a_video": ("Procesador de texto", "Sistema de imagen", "Generador de vídeo"),
    "video_a_video": ("Procesador de texto", "Generador de vídeo"),
    "imagen": ("Procesador de texto", "Sistema de imagen"),
    "anime": ("Procesador de texto", "Sistema de imagen", "Generador de vídeo"),
    "audio": ("Procesador de texto", "Audio"),
    "edicion": ("Procesador de texto", "Edición"),
}


class SomberAI:
    """Etapa 1 del núcleo: entiende la orden y deja el plan de generación."""

    name = "SOMBER AI"

    def process(self, text: str) -> Instruction:
        return parse_instruction(text)

    def run(self, text: str, source_path: str | None = None) -> dict[str, object]:
        instruction = self.process(text)
        environment = probe_environment()
        warnings: list[str] = []
        if instruction.needs_source and not source_path:
            warnings.append("Esta orden necesita un archivo de imagen o vídeo, y no se indicó ninguno.")
        if instruction.mode == "audio":
            warnings.append("La voz sintética queda para más adelante. Esta etapa solo registra la narración.")
        if instruction.mode == "edicion":
            warnings.append("La edición inteligente todavía no corta ni exporta. La orden queda registrada.")

        can_render = bool(environment["puede_generar"]) and instruction.mode in {
            "texto_a_video",
            "imagen_a_video",
            "anime",
        }
        status = "listo_para_modelo" if can_render and not warnings else "preparado"
        return {
            "nombre": self.name,
            "etapa": 1,
            "estado": status,
            "instruccion": instruction.as_dict(),
            "archivo": source_path,
            "pasos": list(_PIPELINES[instruction.mode]),
            "resultado": None,
            "avisos": warnings,
            "entorno": environment,
        }
