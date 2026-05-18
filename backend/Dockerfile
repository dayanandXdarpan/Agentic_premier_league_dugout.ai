FROM python:3.11-slim

WORKDIR /app

# Unbuffered output for Cloud Run logging
ENV PYTHONUNBUFFERED=1

COPY requirements.txt .

# Install dependencies including Playwright browsers
RUN pip install --no-cache-dir -r requirements.txt && \
    playwright install --with-deps chromium

COPY . .

# Cloud Run sets the PORT environment variable
# Host must be 0.0.0.0
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080}"]
