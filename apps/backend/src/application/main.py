import logging
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from src.api.routers import auth, laudos
from src.core.config import settings
from src.core.limiter import limiter

logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_PREFIX}/openapi.json" if settings.ENVIRONMENT != "production" else None,
    docs_url=f"{settings.API_PREFIX}/docs" if settings.ENVIRONMENT != "production" else None,
    redoc_url=None,
)

# Acoplar SlowAPI State e Handler
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if settings.ENVIRONMENT == "dev" else ["https://laudos.instituto.edu.br"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


# Middleware de Headers de Segurança HTTP (SEC-001)
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    return response


# VULN-09: Handler global para capturar exceções não tratadas e não vazar traceback
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Exceção não tratada na rota {request.url.path}: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "sucesso": False,
            "mensagem": "Ocorreu um erro interno inesperado ao processar sua solicitação.",
            "codigoErro": "INTERNAL_SERVER_ERROR",
        },
    )


# Registro de Rotas sem prefixo /v1 (diretamente /api)
app.include_router(auth.router, prefix=settings.API_PREFIX)
app.include_router(laudos.router, prefix=settings.API_PREFIX)


@app.get(f"{settings.API_PREFIX}/health", tags=["Health"])
async def health_check():
    return {"status": "ok", "ambiente": settings.ENVIRONMENT}
