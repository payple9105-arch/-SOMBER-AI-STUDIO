from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from somber_ai.core import SomberAI

app = FastAPI(
    title="SOMBER AI API",
    description="Servidor central de SOMBER AI STUDIO",
    version="0.1.0",
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
    text: str
    source_path: str | None = None


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
        return {
            "estado": "error",
            "mensaje": "Escribe una instrucción para la IA.",
        }

    resultado = ai.run(
        text=request.text,
        source_path=request.source_path,
    )

    return resultado
