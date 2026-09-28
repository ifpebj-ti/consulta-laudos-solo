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

WORKDIR /app

COPY --from=builder /install /usr/local

COPY . .

RUN useradd --create-home --shell /bin/bash appuser

USER appuser

EXPOSE 8080

CMD ["uvicorn", "src.application.main:app", "--host", "0.0.0.0", "--port", "8080"]
