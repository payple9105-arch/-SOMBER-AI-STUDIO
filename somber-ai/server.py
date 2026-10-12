import os

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from somber_ai.core import SomberAI


app = FastAPI(
    title="SOMBER AI API",
    description="Servidor central de SOMBER AI STUDIO",
    version="0.3.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

ai = SomberAI()

FAL_MODEL = "fal-ai/pixverse/v5.5/text-to-video"
FAL_QUEUE_URL = f"https://queue.fal.run/{FAL_MODEL}"


class GenerateRequest(BaseModel):
    text: str = Field(min_length=1, max_length=10000)
    source_path: str | None = None
    aspect: str | None = None
    duration_sec: int | None = Field(default=None, ge=1, le=10)


def fal_headers() -> dict[str, str]:
    key = os.getenv("FAL_KEY")

    if not key:
        raise HTTPException(
            status_code=503,
            detail="La clave FAL_KEY no está configurada en el servidor.",
        )

    return {
        "Authorization": f"Key {key}",
        "Content-Type": "application/json",
    }


@app.get("/")
def home():
    return {
        "nombre": "SOMBER AI",
        "estado": "servidor_activo",
        "mensaje": "El servidor responde correctamente.",
    }


@app.get("/health")
def health():
    return {
        "estado": "activo",
        "servicio": "SOMBER AI",
    }


@app.post("/generate")
def generate(request: GenerateRequest):
    if not request.text.strip():
        raise HTTPException(
            status_code=400,
            detail="Escribe una instrucción para la IA.",
        )

    if request.aspect is not None and request.aspect not in {
        "16:9",
        "9:16",
        "1:1",
    }:
        raise HTTPException(
            status_code=422,
            detail="Formato no válido. Usa 16:9, 9:16 o 1:1.",
        )

    try:
        plan = ai.run(
            text=request.text,
            source_path=request.source_path,
            aspect=request.aspect,
            duration_sec=request.duration_sec,
        )
    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        ) from error

    instruction = plan["instruccion"]

    if instruction["modo"] != "texto_a_video":
        return plan

    headers = fal_headers()

    payload = {
        "prompt": instruction["texto"],
        "aspect_ratio": instruction["formato"],
        "duration": instruction["duracion_segundos"],
        "resolution": "720p",
        "generate_audio": False,
        "enable_safety_checker": True,
    }

    try:
        response = httpx.post(
            FAL_QUEUE_URL,
            headers=headers,
            json=payload,
            timeout=30.0,
        )
        response.raise_for_status()
        queued = response.json()

    except httpx.HTTPStatusError as error:
        raise HTTPException(
            status_code=502,
            detail=(
                "fal.ai rechazó la solicitud. "
                "Comprueba el saldo, los permisos de la clave "
                "y los parámetros del modelo."
            ),
        ) from error

    except httpx.RequestError as error:
        raise HTTPException(
            status_code=502,
            detail="No se pudo conectar con el servicio de generación.",
        ) from error

    request_id = queued.get("request_id")

    if not request_id:
        raise HTTPException(
            status_code=502,
            detail="fal.ai no devolvió un identificador de solicitud.",
        )

    return {
        "nombre": "SOMBER AI",
        "estado": "en_cola",
        "mensaje": "La solicitud de generación fue enviada a fal.ai.",
        "request_id": request_id,
        "modelo": FAL_MODEL,
        "instruccion": instruction,
        "resultado": None,
        "consulta": f"/generate/{request_id}",
    }


@app.get("/generate/{request_id}")
def generation_status(request_id: str):
    headers = fal_headers()

    status_url = (
        f"{FAL_QUEUE_URL}/requests/{request_id}/status"
    )

    result_url = (
        f"{FAL_QUEUE_URL}/requests/{request_id}"
    )

    try:
        status_response = httpx.get(
            status_url,
            headers=headers,
            timeout=20.0,
        )
        status_response.raise_for_status()
        status_data = status_response.json()

        status = status_data.get("status", "UNKNOWN")

        if status == "COMPLETED":
            result_response = httpx.get(
                result_url,
                headers=headers,
                timeout=30.0,
            )
            result_response.raise_for_status()
            result_data = result_response.json()

            video = result_data.get("video", {})
            video_url = video.get("url")

            if not video_url:
                raise HTTPException(
                    status_code=502,
                    detail="La generación terminó, pero no llegó el enlace del vídeo.",
                )

            return {
                "nombre": "SOMBER AI",
                "estado": "completado",
                "request_id": request_id,
                "resultado": {
                    "video_url": video_url,
                    "video": video,
                },
            }

        if status in {"FAILED", "CANCELLED"}:
            return {
                "nombre": "SOMBER AI",
                "estado": status.lower(),
                "request_id": request_id,
                "mensaje": "La generación no se completó.",
                "detalle": status_data,
            }

        return {
            "nombre": "SOMBER AI",
            "estado": status.lower(),
            "request_id": request_id,
            "mensaje": "El vídeo todavía se está procesando.",
        }

    except HTTPException:
        raise

    except httpx.HTTPStatusError as error:
        raise HTTPException(
            status_code=502,
            detail="No se pudo consultar el estado de la generación.",
        ) from error

    except httpx.RequestError as error:
        raise HTTPException(
            status_code=502,
            detail="No se pudo conectar con fal.ai para consultar el resultado.",
        ) from error
