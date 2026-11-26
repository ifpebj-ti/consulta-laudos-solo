# ============================================================================
# Stage 1 - Dependencies
# ============================================================================

FROM python:3.12-slim AS builder

WORKDIR /app

COPY requirements.txt .

RUN pip install --upgrade pip && \
    pip install --prefix=/install --no-cache-dir -r requirements.txt

# ============================================================================
# Stage 2 - Runtime
# ============================================================================

FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Aplica correções de segurança do Debian (ex.: zlib1g) publicadas depois da base.
RUN apt-get update && \
    apt-get upgrade -y --no-install-recommends && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /install /usr/local

COPY . .

# /app (código) fica somente leitura para o processo; dados graváveis só em /app/data e /app/storage.
# Sem PostgreSQL configurado, o SQLite de fallback é criado em /app/data (volume recomendado).
RUN useradd --create-home --shell /bin/bash appuser && \
    mkdir -p /app/storage /app/data && \
    chown -R appuser:appuser /app/storage /app/data

ENV DATABASE_URL=sqlite+aiosqlite:////app/data/laudos.db

USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/api/health', timeout=4).status == 200 else 1)"

CMD ["uvicorn", "src.application.main:app", "--host", "0.0.0.0", "--port", "8000"]
