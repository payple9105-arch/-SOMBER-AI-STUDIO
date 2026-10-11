from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from somber_ai.core import SomberAI

app = FastAPI(
    title="SOMBER AI STUDIO API",
    description="API para procesar instrucciones de generación y edición multimedia.",
    version="0.1.0",
)

# Permite que la página web se conecte durante el desarrollo.
# En producción limitaremos el acceso al dominio autorizado.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "Authorization"],
)

ai = SomberAI()


class ProcessRequest(BaseModel):
    instruction: str = Field(
        min_length=1,
        max_length=2000,
        description="Describe el vídeo, imagen, audio o edición que deseas.",
    )


@app.get("/")
def home():
    return {
        "app": "SOMBER AI STUDIO",
        "status": "online",
        "message": "La API está funcionando.",
    }


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "somber-ai",
    }


@app.post("/api/process")
def process_instruction(request: ProcessRequest):
    try:
        result = ai.run(request.instruction.strip())

        if hasattr(result, "model_dump"):
            result = result.model_dump()
        elif hasattr(result, "to_dict"):
            result = result.to_dict()

        return {
            "success": True,
            "data": result,
        }

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail="No se pudo procesar la instrucción.",
        ) from exc