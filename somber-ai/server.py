from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from somber_ai.core import SomberAI


app = FastAPI(
    title="SOMBER AI API",
    description="Servidor central de SOMBER AI STUDIO",
    version="0.2.0",
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


ai = SomberAI()


class GenerateRequest(BaseModel):
    text: str = Field(min_length=1, max_length=10000)
    source_path: str | None = None
    aspect: str | None = None
    duration_sec: int | None = Field(default=None, ge=1, le=10)


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
        return ai.run(
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
