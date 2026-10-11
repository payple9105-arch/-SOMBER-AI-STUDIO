"""SOMBER AI: núcleo que interpreta una orden y prepara la generación.

Etapa 1. No entrena un modelo de vídeo. Procesa la instrucción y deja
una orden lista para un modelo abierto cuando haya GPU.
"""

from somber_ai.core import SomberAI
from somber_ai.instruction import Instruction, parse_instruction

__all__ = ["SomberAI", "Instruction", "parse_instruction"]
__version__ = "0.1.0"
