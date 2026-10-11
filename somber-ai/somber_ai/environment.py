"""Comprueba si este equipo puede ejecutar un modelo visual abierto."""

from __future__ import annotations

import importlib.util
import platform
import sys


def probe_environment() -> dict[str, object]:
    torch_spec = importlib.util.find_spec("torch")
    diffusers_spec = importlib.util.find_spec("diffusers")
    cuda = False
    if torch_spec is not None:
        import torch

        cuda = bool(torch.cuda.is_available())
    ready = bool(torch_spec and diffusers_spec and cuda)
    return {
        "python": platform.python_version(),
        "ejecutable": sys.executable,
        "torch": torch_spec is not None,
        "diffusers": diffusers_spec is not None,
        "cuda": cuda,
        "puede_generar": ready,
        "motivo": _reason(torch_spec is not None, diffusers_spec is not None, cuda),
    }


def _reason(torch_ok: bool, diffusers_ok: bool, cuda: bool) -> str:
    if torch_ok and diffusers_ok and cuda:
        return "Hay GPU y un modelo abierto puede cargarse."
    missing = []
    if not torch_ok:
        missing.append("PyTorch")
    if not diffusers_ok:
        missing.append("Diffusers")
    if not cuda:
        missing.append("una GPU CUDA")
    return (
        "Etapa 1: el núcleo prepara la orden, pero no genera el vídeo. "
        f"Falta {', '.join(missing)}. "
        "CogVideoX u otro modelo abierto se conectará cuando ese entorno exista."
    )
