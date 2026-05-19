"""
main.py — FastAPI Application Entry Point for Dugout.ai

Event-Driven Multi-Agent Architecture:
  ┌──────────┐    raw_data_queue    ┌──────────────┐    ui_broadcast_queue    ┌──────────┐
  │ Scraper  │ ──────────────────▶ │ Supervisor   │ ────────────────────────▶ │ SSE /api │
  │ (Task 1) │                     │ (Task 2)     │                          │ /stream  │
  └──────────┘                     └──────────────┘                          └──────────┘

Lifespan launches:
  Task 1: run_scraper()  — pushes raw strings into raw_data_queue
  Task 2: supervisor()   — consumes, routes to Gemini agents, pushes to ui_broadcast_queue
  Task 3: sse_fanout()   — fans out ui_broadcast_queue events to all SSE clients

All tasks run concurrently via asyncio — entirely non-blocking.
"""

import asyncio
import json
import logging
import os
from contextlib import asynccontextmanager
from datetime import datetime

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse

from queues import ui_broadcast_queue
from scraper import run_scraper
from orchestrator import supervisor, match_state, pending_bets

# --- Logging ---
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-7s | %(name)s | %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("dugout.main")


# ============================================
# SSE FAN-OUT: Per-Client Subscriber Pattern
# ============================================
# Each SSE client gets its own asyncio.Queue.
# A background task fans out ui_broadcast_queue to all client queues.

_subscribers: list[asyncio.Queue] = []


def _subscribe() -> asyncio.Queue:
    """Register a new SSE client and return its personal queue."""
    q: asyncio.Queue = asyncio.Queue()
    _subscribers.append(q)
    logger.info(f"New SSE subscriber. Total: {len(_subscribers)}")
    return q


def _unsubscribe(q: asyncio.Queue):
    """Remove a disconnected SSE client's queue."""
    try:
        _subscribers.remove(q)
    except ValueError:
        pass
    logger.info(f"SSE subscriber removed. Total: {len(_subscribers)}")


async def _sse_fanout() -> None:
    """
    Background task: continuously reads from ui_broadcast_queue and
    fans out each event to ALL connected SSE client queues.
    """
    logger.info("📡 SSE fan-out task started — broadcasting to clients")
    while True:
        try:
            event = await ui_broadcast_queue.get()

            # Skip internal match-state sentinel messages from scraper
            if isinstance(event, str) and event.startswith("__MATCH_STATE__"):
                continue

            # Fan out to all connected clients
            for q in list(_subscribers):
                try:
                    q.put_nowait(event)
                except asyncio.QueueFull:
                    logger.warning("Client queue full — dropping event for slow client")

            ui_broadcast_queue.task_done()

        except asyncio.CancelledError:
            logger.info("SSE fan-out task cancelled.")
            break
        except Exception as e:
            logger.error(f"SSE fan-out error: {e}", exc_info=True)
            await asyncio.sleep(0.5)


# ============================================
# LIFESPAN: Launch All Concurrent Tasks
# ============================================

_scraper_task: asyncio.Task | None = None
_supervisor_task: asyncio.Task | None = None
_fanout_task: asyncio.Task | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Startup: Launch the three concurrent background tasks.
    Shutdown: Cancel all tasks gracefully.
    """
    global _scraper_task, _supervisor_task, _fanout_task

    logger.info("🏏 Dugout.ai Backend starting up — Multi-Agent Architecture")
    logger.info("   Task 1: Scraper (data ingestion → raw_data_queue)")
    logger.info("   Task 2: Supervisor (routing → Gemini agents → ui_broadcast_queue)")
    logger.info("   Task 3: SSE Fan-out (ui_broadcast_queue → connected clients)")

    # Launch all three tasks concurrently
    _scraper_task = asyncio.create_task(run_scraper(), name="scraper")
    _supervisor_task = asyncio.create_task(supervisor(), name="supervisor")
    _fanout_task = asyncio.create_task(_sse_fanout(), name="sse_fanout")

    yield

    # Shutdown: cancel all tasks
    logger.info("Shutting down — cancelling all background tasks...")
    for task in [_scraper_task, _supervisor_task, _fanout_task]:
        if task and not task.done():
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass

    logger.info("All background tasks stopped. Goodbye! 👋")


# ============================================
# FASTAPI APPLICATION
# ============================================

app = FastAPI(
    title="Dugout.ai Backend",
    description="AI-powered second-screen experience for live cricket — Multi-Agent Architecture",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Tighten for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================
# SSE STREAMING ENDPOINT
# ============================================

@app.get("/api/stream")
async def stream_events(request: Request):
    """
    Streams GenerativeUI JSON events to the React frontend via SSE.
    Each client gets its own queue — events are fanned out from ui_broadcast_queue.
    """
    client_queue = _subscribe()

    async def event_generator():
        try:
            while True:
                if await request.is_disconnected():
                    logger.info("SSE client disconnected.")
                    break

                try:
                    # Wait up to 30s for next event, then send keepalive
                    event_data = await asyncio.wait_for(client_queue.get(), timeout=30.0)
                    yield json.dumps(event_data)
                except asyncio.TimeoutError:
                    yield ": keepalive\n\n"

        except asyncio.CancelledError:
            logger.info("SSE client generator cancelled.")
        finally:
            _unsubscribe(client_queue)

    return EventSourceResponse(event_generator())


# ============================================
# BET ENDPOINT
# ============================================

class BetRequest(BaseModel):
    user_id: str
    bet: str


@app.post("/api/bet")
def place_bet(req: BetRequest):
    """Receives a bet from the frontend and queues it for resolution."""
    pending_bets.append(req.model_dump() if hasattr(req, "model_dump") else req.dict())
    logger.info(f"Bet registered: user={req.user_id}, bet={req.bet}")
    return {"status": "success", "message": "Bet registered", "bet": req.bet}


# ============================================
# MATCH STATE ENDPOINT (REST fallback)
# ============================================

@app.get("/api/match-state")
def get_match_state():
    """Returns the current match state for clients that connect mid-match."""
    return {"status": "ok", "data": match_state}


# ============================================
# HEALTH CHECK WITH DIAGNOSTICS
# ============================================

@app.get("/api/diagnostics")
def read_root():
    """Full system diagnostics — moved from / so root serves the React app."""
    from agent import _init_mode
    return {
        "status": "ok",
        "service": "dugout-ai-backend",
        "version": "2.0.0",
        "architecture": "event-driven-multi-agent",
        "timestamp": datetime.now().isoformat(),
        "diagnostics": {
            "scraper_running": _scraper_task is not None and not _scraper_task.done(),
            "supervisor_running": _supervisor_task is not None and not _supervisor_task.done(),
            "fanout_running": _fanout_task is not None and not _fanout_task.done(),
            "gemini_mode": _init_mode,
            "active_sse_clients": len(_subscribers),
            "pending_bets": len(pending_bets),
        },
    }


@app.get("/api/health")
def health():
    """Simple health check for Cloud Run."""
    return {"status": "ok"}


# ============================================
# REACT FRONTEND — Static Files + SPA Catch-all
# (Must be LAST — after all /api routes)
# ============================================

import os as _os

# Path: /app/frontend/dist  (set by Dockerfile COPY --from=frontend-build)
_dist = _os.path.join(_os.path.dirname(_os.path.abspath(__file__)), "frontend", "dist")
_assets = _os.path.join(_dist, "assets")

logger.info(f"🗂️  React dist path: {_dist} — exists: {_os.path.isdir(_dist)}")

if _os.path.isdir(_assets):
    app.mount("/assets", StaticFiles(directory=_assets), name="assets")
    logger.info("✅ /assets static mount registered")

if _os.path.isdir(_dist):
    app.mount("/icons", StaticFiles(directory=_os.path.join(_dist)), name="icons")


@app.get("/{catchall:path}")
async def serve_react_app(catchall: str):
    """Catch-all: serve React index.html for all non-API routes (SPA routing)."""
    index = _os.path.join(_dist, "index.html")
    if _os.path.isfile(index):
        return FileResponse(index)
    # dist not built yet — return a helpful message instead of 500
    from fastapi.responses import JSONResponse
    return JSONResponse(
        {"error": "Frontend not built", "hint": "Run npm run build in /frontend"},
        status_code=503,
    )

