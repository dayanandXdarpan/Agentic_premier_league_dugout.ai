FROM python:3.11-slim

WORKDIR /app

# Unbuffered output for Cloud Run logging
ENV PYTHONUNBUFFERED=1

# Install system dependencies for Playwright
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt .

# Install Python deps + Playwright chromium
RUN pip install --no-cache-dir -r requirements.txt && \
    playwright install --with-deps chromium

# Copy backend source
COPY backend/ .

# Cloud Run sets PORT — default 8080
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080}"]
