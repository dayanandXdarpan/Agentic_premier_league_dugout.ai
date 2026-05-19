# ── Stage 1: Build React Frontend ─────────────────────────────────────────
FROM node:20-alpine AS frontend-build

WORKDIR /frontend

COPY frontend/package*.json ./
RUN npm ci --silent

COPY frontend/ ./

# Point the React app at the same origin (empty = relative URLs)
# Since frontend and backend are served from the same Cloud Run URL,
# we use a relative path so /api/* calls work without CORS.
ARG VITE_API_URL=""
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# ── Stage 2: Python Backend ────────────────────────────────────────────────
FROM python:3.11-slim

WORKDIR /app

ENV PYTHONUNBUFFERED=1

# System deps for Playwright
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt && \
    playwright install --with-deps chromium

# Copy FastAPI source
COPY backend/ .

# Copy the built React app into backend/frontend/dist
# FastAPI will serve it via StaticFiles + catch-all
COPY --from=frontend-build /frontend/dist ./frontend/dist

# Cloud Run sets $PORT — default 8080
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080}"]
