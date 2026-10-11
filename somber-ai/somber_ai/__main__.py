"""Uso: python3 -m somber_ai "un personaje camina, anime, vertical, 5 segundos" """

from __future__ import annotations

import argparse
import json
import sys

from somber_ai.core import SomberAI


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="somber_ai", description="Núcleo de SOMBER AI")
    parser.add_argument("texto", nargs="?", help="Instrucción en español")
    parser.add_argument("--archivo", help="Imagen o vídeo de origen, si la orden lo necesita")
    args = parser.parse_args(argv)
    text = args.texto
    if not text:
        text = sys.stdin.read().strip()
    if not text:
        parser.error("Escribe una instrucción.")
    plan = SomberAI().run(text, source_path=args.archivo)
    json.dump(plan, sys.stdout, ensure_ascii=False, indent=2)
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
