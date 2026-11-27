import os
import sys
import time
import logging
from collections import defaultdict, deque
from typing import Any, Literal

import httpx
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from prompting import (  # noqa: E402
    ASSISTANT_SYSTEM,
    ENHANCER_SYSTEM,
    IMAGE_SIZES,
    build_generation_prompt,
    clean_chat_messages,
    fal_app_root,
    local_enhance,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("somber-ai")

VERSION = "1.2.0"

app = FastAPI(
    title="SOMBER AI API",
    description="Servidor central de SOMBER AI STUDIO (beta)",
    version=VERSION,
)

_raw_origins = os.getenv("CORS_ORIGINS", "*")
if _raw_origins.strip() == "*":
    allow_origins = ["*"]
    allow_credentials = False
else:
    allow_origins = [o.strip() for o in _raw_origins.split(",") if o.strip()]
    allow_credentials = True

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Claves y modelos (todo configurable desde Render) ---------------------
FAL_KEY = os.getenv("FAL_KEY")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
LLM_MODEL = os.getenv("LLM_MODEL", "claude-haiku-5-5")

MODELS: dict[str, str] = {
    "video": os.getenv("FAL_VIDEO_MODEL", "fal-ai/pixverse/v5.5/text-to-video"),
    "i2v": os.getenv("FAL_I2V_MODEL", "fal-ai/pixverse/v5.5/image-to-video"),
    "image": os.getenv("FAL_IMAGE_MODEL", "fal-ai/flux/schnell"),
}
FAL_MODEL = MODELS["video"]  # compatibilidad
HTTP_TIMEOUT = 60.0
MAX_IMAGE_DATA = 10 * 1024 * 1024  # ~10 MB en base64

# --- Supabase: créditos comprobados en el servidor --------------------------
# URL y clave publicable son públicas (las usa también la web).
# SUPABASE_SERVICE_ROLE_KEY es SECRETA: solo como variable de entorno en Render.
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://gdamdrgrtcncuwzmqiub.supabase.co").rstrip("/")
SUPABASE_PUBLIC_KEY = os.getenv("SUPABASE_ANON_KEY", "sb_publishable_NbS7gpKngLZ2JsHWUIHZQw_PXoeV1zA")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
UUID_PATTERN = r"^[0-9a-fA-F-]{36}$"

RATE_LIMIT = int(os.getenv("RATE_LIMIT_PER_HOUR", "20"))
CHAT_RATE_LIMIT = int(os.getenv("CHAT_RATE_LIMIT_PER_HOUR", "60"))
_hits: dict[str, deque[float]] = defaultdict(deque)

JobKind = Literal["video", "i2v", "image"]


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host or "unknown"
    return "unknown"


def _check_rate_limit(ip: str, bucket: str = "gen", limit: int | None = None) -> None:
    limit = RATE_LIMIT if limit is None else limit
    now = time.time()
    q = _hits[f"{bucket}:{ip}"]
    while q and now - q[0] > 3600.0:
        q.popleft()
    if len(q) >= limit:
        raise HTTPException(status_code=429, detail=f"Límite de {limit} usos por hora. Inténtalo más tarde.")
    q.append(now)


def _require_fal() -> None:
    if not FAL_KEY:
        raise HTTPException(
            status_code=503,
            detail="FAL_KEY no está configurada. Añade la variable secreta en Render.",
        )


def _fal_headers() -> dict[str, str]:
    return {
        "Authorization": f"Key {FAL_KEY}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }


async def _fal_submit(kind: JobKind, payload: dict[str, Any]) -> dict[str, Any]:
    _require_fal()
    url = f"https://queue.fal.run/{MODELS[kind]}"
    try:
        async with httpx.AsyncClient(timeout=HTTP_TIMEOUT) as client:
            response = await client.post(url, headers=_fal_headers(), json=payload)
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="fal.ai tardó demasiado en responder.")
    except httpx.HTTPError:
        logger.exception("Error de conexión con fal.ai")
        raise HTTPException(status_code=502, detail="No se pudo conectar con el servicio de generación.")
    if response.status_code >= 400:
        logger.error("fal.ai rechazó %s: %s", kind, response.text[:1000])
        raise HTTPException(
            status_code=502,
            detail={"mensaje": "fal.ai rechazó la solicitud.", "estado": response.status_code, "respuesta": response.text[:1000]},
        )
    data = response.json()
    request_id = data.get("request_id")
    if not request_id:
        raise HTTPException(status_code=502, detail="fal.ai no devolvió un identificador de solicitud.")
    return {
        "estado": "procesando",
        "tipo": kind,
        "request_id": request_id,
        "mensaje": "La solicitud de generación se ha enviado.",
    }


def _extract_media(data: dict[str, Any]) -> tuple[str | None, str | None]:
    video = data.get("video")
    video_url = video.get("url") if isinstance(video, dict) else None
    image_url = None
    images = data.get("images")
    if isinstance(images, list) and images and isinstance(images[0], dict):
        image_url = images[0].get("url")
    elif isinstance(data.get("image"), dict):
        image_url = data["image"].get("url")
    return video_url, image_url


async def _fal_status(kind: JobKind, request_id: str) -> dict[str, Any]:
    _require_fal()
    if not request_id.strip():
        raise HTTPException(status_code=400, detail="El identificador de la solicitud está vacío.")
    root = f"https://queue.fal.run/{fal_app_root(MODELS[kind])}/requests/{request_id}"
    headers = {"Authorization": f"Key {FAL_KEY}", "Accept": "application/json"}
    try:
        async with httpx.AsyncClient(timeout=HTTP_TIMEOUT) as client:
            status_response = await client.get(f"{root}/status", headers=headers)
            if status_response.status_code >= 400:
                raise HTTPException(status_code=502, detail="No se pudo consultar el estado en fal.ai.")
            status_data = status_response.json()
            status = status_data.get("status", "UNKNOWN")
            result: dict[str, Any] = {"request_id": request_id, "tipo": kind, "estado": status}
            if status == "COMPLETED":
                result_response = await client.get(root, headers=headers)
                if result_response.status_code >= 400:
                    # fal devuelve 4xx/5xx aquí cuando la generación falló dentro del modelo
                    result["estado"] = "FAILED"
                    result["mensaje"] = result_response.text[:500] or "La generación falló."
                    return result
                result_data = result_response.json()
                video_url, image_url = _extract_media(result_data)
                result["video_url"] = video_url
                result["image_url"] = image_url
            elif status in {"FAILED", "CANCELLED"}:
                result["mensaje"] = "La generación no terminó correctamente."
            return result
    except HTTPException:
        raise
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="La consulta a fal.ai tardó demasiado.")
    except httpx.HTTPError:
        logger.exception("Error de conexión al consultar fal.ai")
        raise HTTPException(status_code=502, detail="No se pudo conectar con fal.ai.")


async def _current_user(http_request: Request) -> str:
    """Valida el token de sesión de Supabase y devuelve el id del usuario."""
    auth = http_request.headers.get("authorization", "")
    if not auth.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Inicia sesión para generar.")
    token = auth[7:].strip()
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            r = await client.get(
                f"{SUPABASE_URL}/auth/v1/user",
                headers={"apikey": SUPABASE_PUBLIC_KEY, "Authorization": f"Bearer {token}"},
            )
    except httpx.HTTPError:
        logger.exception("No se pudo validar la sesión en Supabase")
        raise HTTPException(status_code=502, detail="No se pudo validar tu sesión. Inténtalo de nuevo.")
    if r.status_code != 200:
        raise HTTPException(status_code=401, detail="Tu sesión ha caducado. Vuelve a entrar.")
    user_id = (r.json() or {}).get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Sesión no válida.")
    return str(user_id)


def _service_headers() -> dict[str, str]:
    key = SUPABASE_SERVICE_KEY or ""
    headers = {"apikey": key, "Content-Type": "application/json"}
    # Las claves nuevas (sb_secret_...) van solo en "apikey"; las antiguas son JWT.
    if not key.startswith("sb_secret_"):
        headers["Authorization"] = f"Bearer {key}"
    return headers


async def _rpc(name: str, args: dict[str, Any]) -> Any:
    """Llama a una función de Supabase con la clave de servicio."""
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            r = await client.post(f"{SUPABASE_URL}/rest/v1/rpc/{name}", headers=_service_headers(), json=args)
    except httpx.HTTPError:
        logger.exception("Error de conexión con Supabase (%s)", name)
        raise HTTPException(status_code=502, detail="No se pudo comprobar tus créditos. Inténtalo de nuevo.")
    if r.status_code >= 400:
        logger.error("Supabase %s respondió %s: %s", name, r.status_code, r.text[:500])
        raise HTTPException(status_code=502, detail="No se pudo comprobar tus créditos. Inténtalo de nuevo.")
    return r.json() if r.content else None


async def _safe_refund(user_id: str, job_id: str, request_id: str | None, error: str) -> bool:
    try:
        return bool(
            await _rpc(
                "server_refund_job",
                {"p_user_id": user_id, "p_job_id": job_id, "p_request_id": request_id, "p_error": error[:500]},
            )
        )
    except HTTPException:
        logger.error("No se pudo devolver el crédito del trabajo %s", job_id)
        return False


async def _paid_submit(http_request: Request, job_id: str, kind: JobKind, payload: dict[str, Any]) -> dict[str, Any]:
    """Comprueba sesión y pago en Supabase, envía a fal.ai y devuelve el crédito si falla."""
    _require_fal()
    if not SUPABASE_SERVICE_KEY:
        raise HTTPException(
            status_code=503,
            detail="SUPABASE_SERVICE_ROLE_KEY no está configurada en Render: no se pueden comprobar créditos.",
        )
    user_id = await _current_user(http_request)
    # El trabajo tiene que estar cobrado y no usado antes. Esto lo decide Supabase.
    claimed = await _rpc("server_claim_job", {"p_user_id": user_id, "p_job_id": job_id})
    if claimed is not True:
        raise HTTPException(status_code=402, detail="Este trabajo no está pagado o ya se usó.")
    try:
        result = await _fal_submit(kind, payload)
    except HTTPException as exc:
        await _safe_refund(user_id, job_id, None, str(exc.detail))
        raise
    except Exception:
        logger.exception("Error inesperado al iniciar la generación")
        await _safe_refund(user_id, job_id, None, "error interno")
        raise HTTPException(status_code=500, detail="Se produjo un error interno al generar.")
    try:
        await _rpc(
            "server_set_request",
            {"p_user_id": user_id, "p_job_id": job_id, "p_request_id": result["request_id"]},
        )
    except HTTPException:
        logger.error("No se pudo guardar el request_id del trabajo %s", job_id)
    return result


async def _status_with_refund(
    http_request: Request, kind: JobKind, request_id: str, job_id: str | None
) -> dict[str, Any]:
    """Estado en fal.ai. Si fal confirma el fallo, el servidor devuelve el crédito (una vez)."""
    result = await _fal_status(kind, request_id)
    if result.get("estado") in {"FAILED", "CANCELLED"} and job_id and SUPABASE_SERVICE_KEY:
        try:
            user_id = await _current_user(http_request)
        except HTTPException:
            result["reembolsado"] = False
        else:
            result["reembolsado"] = await _safe_refund(user_id, job_id, request_id, f"fal.ai: {result['estado']}")
    return result


async def _llm(system: str, messages: list[dict], max_tokens: int = 800) -> str:
    if not ANTHROPIC_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="ANTHROPIC_API_KEY no está configurada. Añádela en Render para activar el asistente.",
        )
    try:
        async with httpx.AsyncClient(timeout=HTTP_TIMEOUT) as client:
            response = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": ANTHROPIC_API_KEY,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json={"model": LLM_MODEL, "max_tokens": max_tokens, "system": system, "messages": messages},
            )
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="El asistente tardó demasiado en responder.")
    except httpx.HTTPError:
        logger.exception("Error de conexión con el modelo de lenguaje")
        raise HTTPException(status_code=502, detail="No se pudo conectar con el asistente.")
    if response.status_code >= 400:
        logger.error("Error del modelo de lenguaje: %s", response.text[:1000])
        raise HTTPException(status_code=502, detail="El asistente no pudo responder ahora.")
    data = response.json()
    text = "".join(b.get("text", "") for b in data.get("content", []) if b.get("type") == "text").strip()
    if not text:
        raise HTTPException(status_code=502, detail="El asistente devolvió una respuesta vacía.")
    return text


# --- Esquemas ---------------------------------------------------------------
class GenerateRequest(BaseModel):
    text: str = Field(..., min_length=3, max_length=2000)
    aspect: str = Field(default="9:16")
    duration_sec: int = Field(default=5, ge=5, le=15)
    style: str | None = Field(default=None, max_length=60)
    anime: bool = False
    job_id: str = Field(..., pattern=UUID_PATTERN)


class ImageToVideoRequest(GenerateRequest):
    image: str = Field(..., description="URL https o data URI (data:image/...;base64,...)")


class ImageRequest(BaseModel):
    text: str = Field(..., min_length=3, max_length=2000)
    aspect: str = Field(default="9:16")
    style: str | None = Field(default=None, max_length=60)
    anime: bool = True
    job_id: str = Field(..., pattern=UUID_PATTERN)


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(..., max_length=4000)


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(..., min_length=1, max_length=40)


class EnhanceRequest(BaseModel):
    text: str = Field(..., min_length=3, max_length=2000)
    kind: Literal["video", "anime", "image"] = "video"
    style: str | None = Field(default=None, max_length=60)


ALLOWED_ASPECTS = {"9:16", "16:9", "1:1"}


def _check_aspect(aspect: str) -> None:
    if aspect not in ALLOWED_ASPECTS:
        raise HTTPException(status_code=400, detail="El formato debe ser 9:16, 16:9 o 1:1.")


def _video_payload(req: GenerateRequest) -> dict[str, Any]:
    return {
        "prompt": build_generation_prompt(req.text, req.style, "anime" if req.anime else "video"),
        "aspect_ratio": req.aspect,
        "duration": str(req.duration_sec),
        "resolution": "720p",
        "generate_audio": False,
        "enable_safety_checker": True,
    }


# --- Rutas ------------------------------------------------------------------
@app.get("/")
async def home():
    return {"nombre": "SOMBER AI", "estado": "servidor_activo", "version": VERSION, "beta": True}


@app.get("/health")
async def health():
    return {
        "estado": "activo",
        "servicio": "SOMBER AI",
        "version": VERSION,
        "fal_configurado": bool(FAL_KEY),
        "asistente_configurado": bool(ANTHROPIC_API_KEY),
        "creditos_configurados": bool(SUPABASE_SERVICE_KEY),
        "rate_limit_por_hora": RATE_LIMIT,
    }


@app.get("/models")
async def models():
    return {
        "modelos": [
            {"id": MODELS["video"], "tipo": "text-to-video", "descripcion": "Vídeo a partir de texto"},
            {"id": MODELS["i2v"], "tipo": "image-to-video", "descripcion": "Anima una imagen"},
            {"id": MODELS["image"], "tipo": "text-to-image", "descripcion": "Imágenes y personajes anime"},
            {"id": LLM_MODEL, "tipo": "chat", "descripcion": "Asistente creativo y mejora de prompts"},
        ]
    }


@app.post("/generate")
async def generate_video(request: GenerateRequest, http_request: Request):
    _check_rate_limit(_client_ip(http_request))
    _check_aspect(request.aspect)
    return await _paid_submit(http_request, request.job_id, "video", _video_payload(request))


@app.post("/image-to-video")
async def image_to_video(request: ImageToVideoRequest, http_request: Request):
    _check_rate_limit(_client_ip(http_request))
    _check_aspect(request.aspect)
    image = request.image.strip()
    if not (image.startswith("https://") or image.startswith("data:image/")):
        raise HTTPException(status_code=400, detail="La imagen debe ser una URL https o un data URI de imagen.")
    if len(image) > MAX_IMAGE_DATA:
        raise HTTPException(status_code=413, detail="La imagen es demasiado grande (máx. ~7 MB).")
    payload = _video_payload(request)
    payload.pop("aspect_ratio", None)  # el formato lo marca la propia imagen
    payload["image_url"] = image
    return await _paid_submit(http_request, request.job_id, "i2v", payload)


@app.post("/image")
async def generate_image(request: ImageRequest, http_request: Request):
    _check_rate_limit(_client_ip(http_request))
    _check_aspect(request.aspect)
    payload = {
        "prompt": build_generation_prompt(request.text, request.style, "anime_image" if request.anime else "image"),
        "image_size": IMAGE_SIZES[request.aspect],
        "num_images": 1,
        "enable_safety_checker": True,
    }
    return await _paid_submit(http_request, request.job_id, "image", payload)


@app.get("/jobs/{kind}/{request_id}")
async def job_status(kind: JobKind, request_id: str, http_request: Request, job_id: str | None = None):
    return await _status_with_refund(http_request, kind, request_id, job_id)


@app.get("/generate/{request_id}")
async def get_video_status(request_id: str, http_request: Request, job_id: str | None = None):
    return await _status_with_refund(http_request, "video", request_id, job_id)


@app.post("/chat")
async def chat(request: ChatRequest, http_request: Request):
    _check_rate_limit(_client_ip(http_request), "chat", CHAT_RATE_LIMIT)
    messages = clean_chat_messages([m.model_dump() for m in request.messages])
    if not messages:
        raise HTTPException(status_code=400, detail="Escribe un mensaje.")
    reply = await _llm(ASSISTANT_SYSTEM, messages)
    return {"reply": reply}


@app.post("/enhance")
async def enhance(request: EnhanceRequest, http_request: Request):
    _check_rate_limit(_client_ip(http_request), "chat", CHAT_RATE_LIMIT)
    if ANTHROPIC_API_KEY:
        tipo = {"video": "vídeo", "anime": "vídeo anime", "image": "imagen anime"}[request.kind]
        estilo = f" Estilo elegido: {request.style}." if request.style else ""
        try:
            prompt = await _llm(
                ENHANCER_SYSTEM,
                [{"role": "user", "content": f"Tipo: {tipo}.{estilo}\nIdea: {request.text}"}],
                max_tokens=300,
            )
            return {"prompt": prompt.strip().strip('"'), "fuente": "ia"}
        except HTTPException:
            logger.warning("Fallo el mejorador con IA; se usa el local")
    return {"prompt": local_enhance(request.text, request.kind, request.style), "fuente": "local"}
