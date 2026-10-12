import os
import logging
from typing import Any
import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
# =========================================================
# CONFIGURACIÓN
# =========================================================
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("somber-ai")
app = FastAPI(
    title="SOMBER AI API",
    description="Servidor central de SOMBER AI STUDIO",
    version="1.0.0",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
FAL_KEY = os.getenv("FAL_KEY")
FAL_MODEL = "fal-ai/pixverse/v5.5/text-to-video"
FAL_QUEUE_URL = f"https://queue.fal.run/{FAL_MODEL}"
HTTP_TIMEOUT = 60.0
# =========================================================
# MODELOS DE DATOS
# =========================================================
class GenerateRequest(BaseModel):
    text: str = Field(
        ...,
        min_length=3,
        max_length=2000,
        description="Descripción del vídeo que se desea generar",
    )
    aspect: str = Field(
        default="9:16",
        description="Formato del vídeo: 9:16, 16:9 o 1:1",
    )
    duration_sec: int = Field(
        default=5,
        ge=5,
        le=15,
        description="Duración solicitada del vídeo en segundos",
    )
# =========================================================
# RUTAS PRINCIPALES
# =========================================================
@app.get("/")
async def home():
    return {
        "nombre": "SOMBER AI",
        "estado": "servidor_activo",
        "mensaje": "El servidor responde correctamente.",
        "version": "1.0.0",
    }
@app.get("/health")
async def health():
    return {
        "estado": "activo",
        "servicio": "SOMBER AI",
        "fal_configurado": bool(FAL_KEY),
    }
@app.get("/models")
async def models():
    return {
        "modelos": [
            {
                "id": FAL_MODEL,
                "tipo": "text-to-video",
                "descripcion": "Generación de vídeos a partir de texto",
            }
        ]
    }
# =========================================================
# GENERAR VÍDEOS
# =========================================================
@app.post("/generate")
async def generate_video(request: GenerateRequest):
    if not FAL_KEY:
        raise HTTPException(
            status_code=503,
            detail=(
                "FAL_KEY no está configurada. "
                "Añade la variable secreta en la configuración "
                "del servicio de Render."
            ),
        )
    allowed_aspects = {"9:16", "16:9", "1:1"}
    if request.aspect not in allowed_aspects:
        raise HTTPException(
            status_code=400,
            detail="El formato debe ser 9:16, 16:9 o 1:1.",
        )
    headers = {
        "Authorization": f"Key {FAL_KEY}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    payload = {
        "prompt": request.text,
        "aspect_ratio": request.aspect,
        "duration": str(request.duration_sec),
        "resolution": "720p",
        "generate_audio": False,
        "enable_safety_checker": True,
    }
    try:
        async with httpx.AsyncClient(
            timeout=HTTP_TIMEOUT
        ) as client:
            response = await client.post(
                FAL_QUEUE_URL,
                headers=headers,
                json=payload,
            )
        if response.status_code >= 400:
            logger.error(
                "Error de fal.ai al iniciar generación: %s",
                response.text[:1000],
            )
            raise HTTPException(
                status_code=502,
                detail={
                    "mensaje": (
                        "fal.ai rechazó la solicitud de generación."
                    ),
                    "estado": response.status_code,
                    "respuesta": response.text[:1000],
                },
            )
        data = response.json()
        request_id = data.get("request_id")
        status_url = data.get("status_url")
        response_url = data.get("response_url")
        if not request_id:
            logger.error(
                "Respuesta inesperada de fal.ai: %s",
                str(data)[:1000],
            )
            raise HTTPException(
                status_code=502,
                detail="fal.ai no devolvió un identificador de solicitud.",
            )
        return {
            "estado": "procesando",
            "request_id": request_id,
            "status_url": status_url,
            "response_url": response_url,
            "mensaje": "La solicitud de generación se ha enviado.",
        }
    except HTTPException:
        raise
    except httpx.TimeoutException:
        logger.exception("Tiempo de espera agotado al conectar con fal.ai")
        raise HTTPException(
            status_code=504,
            detail="fal.ai tardó demasiado en responder.",
        )
    except httpx.HTTPError:
        logger.exception("Error de conexión con fal.ai")
        raise HTTPException(
            status_code=502,
            detail="No se pudo conectar con el servicio de generación.",
        )
    except Exception:
        logger.exception("Error inesperado al iniciar la generación")
        raise HTTPException(
            status_code=500,
            detail="Se produjo un error interno al generar el vídeo.",
        )
# =========================================================
# CONSULTAR ESTADO DE GENERACIÓN
# =========================================================
@app.get("/generate/{request_id}")
async def get_video_status(request_id: str):
    if not FAL_KEY:
        raise HTTPException(
            status_code=503,
            detail="FAL_KEY no está configurada en Render.",
        )
    if not request_id.strip():
        raise HTTPException(
            status_code=400,
            detail="El identificador de la solicitud está vacío.",
        )
    headers = {
        "Authorization": f"Key {FAL_KEY}",
        "Accept": "application/json",
    }
    status_url = (
        f"{FAL_QUEUE_URL}/requests/{request_id}/status"
    )
    result_url = (
        f"{FAL_QUEUE_URL}/requests/{request_id}"
    )
    try:
        async with httpx.AsyncClient(
            timeout=HTTP_TIMEOUT
        ) as client:
            status_response = await client.get(
                status_url,
                headers=headers,
            )
            if status_response.status_code >= 400:
                raise HTTPException(
                    status_code=502,
                    detail=(
                        "No se pudo consultar el estado de generación "
                        "en fal.ai."
                    ),
                )
            status_data = status_response.json()
            status = status_data.get("status", "UNKNOWN")
            result = {
                "request_id": request_id,
                "estado": status,
                "detalles": status_data,
            }
            if status == "COMPLETED":
                result_response = await client.get(
                    result_url,
                    headers=headers,
                )
                if result_response.status_code >= 400:
                    raise HTTPException(
                        status_code=502,
                        detail=(
                            "El vídeo terminó de procesarse, "
                            "pero no se pudo recuperar el resultado."
                        ),
                    )
                result_data: dict[str, Any] = result_response.json()
                video_data = result_data.get("video", {})
                video_url = (
                    video_data.get("url")
                    if isinstance(video_data, dict)
                    else None
                )
                result["resultado"] = result_data
                result["video_url"] = video_url
            elif status in {"FAILED", "CANCELLED"}:
                result["mensaje"] = (
                    "La generación no terminó correctamente."
                )
            return result
    except HTTPException:
        raise
    except httpx.TimeoutException:
        logger.exception("Tiempo de espera al consultar fal.ai")
        raise HTTPException(
            status_code=504,
            detail="La consulta a fal.ai tardó demasiado.",
        )
    except httpx.HTTPError:
        logger.exception("Error de conexión al consultar fal.ai")
        raise HTTPException(
            status_code=502,
            detail="No se pudo conectar con fal.ai para consultar el vídeo.",
        )
    except Exception:
        logger.exception("Error inesperado al consultar el vídeo")
        raise HTTPException(
            status_code=500,
            detail="Se produjo un error al consultar el vídeo.",
        )
