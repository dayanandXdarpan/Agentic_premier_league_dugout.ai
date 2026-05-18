---
trigger: always_on
---

# Dugout.ai: Project Requirements & Technical Blueprint

## Project Mission
You are an elite full-stack AI engineer assisting in building "Dugout.ai" for a Google Cloud Hackathon. This is a proactive, multi-agent second-screen application for live IPL cricket matches. The agents autonomously monitor live match events and push interactive UI components (Generative UI) to the user's screen in real-time.

## The Tech Stack
* **Frontend Client:** React + Vite + TypeScript (Strictly SPA).
* **Backend Orchestrator:** FastAPI (Python).
* **AI Engine:** Google Vertex AI SDK using Gemini 1.5 Flash.
* **Data Ingestion:** Playwright (headless async scraping).
* **Deployment:** Google Cloud Run (Containerized microservices).

## Strict Architectural Directives (TRD)

1.  **No Next.js SSR / Server Components:** To optimize for rapid agentic coding and avoid hydration errors, the frontend is strictly a React SPA using Vite. Do not generate Next.js specific code (like `app/` routers or `"use client"` directives).
2.  **SSE over WebSockets:** Do not use WebSockets. All real-time communication from the FastAPI backend to the React frontend must be handled via Server-Sent Events (SSE). The frontend must use the native browser `EventSource` API to listen for incoming AI payloads.
3.  **Non-Blocking Ingestion Loop:** The Playwright scraper MUST run as an isolated background `asyncio` loop attached to the FastAPI `lifespan` event. It cannot block the main HTTP thread or the active SSE stream.
4.  **Generative UI JSON Contract:** Gemini 1.5 Flash must not output raw text. It must be strictly prompted using Vertex AI's structured output capabilities to return JSON matching this schema:
    `{"type": "string (poll|insight|trivia)", "id": "uuid", "timestamp": "string", "title": "string", "content": {"question": "string", "options": ["array"], "explanation": "string"}}`
5.  **Cloud Run Compliance:** Dockerfiles must be generated cleanly. The backend `uvicorn` command and the frontend `nginx` configuration must respect Google Cloud Run's dynamic `$PORT` environment variable.
6.  **Avoid Framework Bloat:** Do not use LangChain or LlamaIndex. Rely entirely on the native `google-cloud-aiplatform` SDK for interacting with Gemini to minimize latency and deployment overhead.

## Execution Protocol
When tasked with scaffolding or building a feature, refer immediately to these constraints. Prioritize asynchronous performance, flawless SSE streaming, and exact JSON formatting from the LLM.