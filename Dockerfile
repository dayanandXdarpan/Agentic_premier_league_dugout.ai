# ── Stage 1: Build React Frontend ─────────────────────────────────────────
FROM node:20-alpine AS frontend-build

WORKDIR /frontend

COPY frontend/package*.json ./
RUN npm ci --silent

COPY frontend/ ./

# Empty VITE_API_URL = relative URLs → same origin serves both API and frontend
ARG VITE_API_URL=""
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# ── Stage 2: Python Backend ────────────────────────────────────────────────
FROM python:3.11-slim

WORKDIR /app

ENV PYTHONUNBUFFERED=1
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

# Install system deps needed by Playwright Chromium
RUN apt-get update && apt-get install -y \
    libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 libcups2 \
    libdrm2 libdbus-1-3 libxkbcommon0 libxcomposite1 libxdamage1 \
    libxfixes3 libxrandr2 libgbm1 libasound2 libpango-1.0-0 \
    libcairo2 libatspi2.0-0 curl wget \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install only Chromium (not all browsers) — much smaller
RUN playwright install chromium

# Copy FastAPI source
COPY backend/ .

# Copy built React dist into the path FastAPI expects: /app/frontend/dist
COPY --from=frontend-build /frontend/dist ./frontend/dist

# Cloud Run sets $PORT — default 8080
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080}"]
