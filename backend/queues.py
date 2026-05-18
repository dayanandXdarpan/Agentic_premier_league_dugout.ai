"""
queues.py — Central Event Bus for Dugout.ai Multi-Agent Pipeline

Two asyncio.Queue instances form the backbone of the event-driven architecture:

  ┌──────────┐   raw_data_queue   ┌──────────────┐   ui_broadcast_queue   ┌──────────┐
  │ Scraper  │ ────────────────▶ │ Orchestrator │ ──────────────────────▶ │ SSE      │
  │ Agent    │                    │ (Supervisor) │                        │ Endpoint │
  └──────────┘                    └──────────────┘                        └──────────┘
                                       │
                                  ┌────┴────┐
                                  │ Gemini  │
                                  │ Agents  │
                                  └─────────┘

- raw_data_queue:     Scraper pushes raw commentary strings here.
                      Orchestrator consumes and routes to specialized agents.

- ui_broadcast_queue: Agents push formatted GenerativeUI JSON here.
                      The SSE endpoint fans out to all connected clients.
"""

import asyncio

# --- Raw Data Queue ---
# Carries raw scraped commentary strings from Scraper → Orchestrator
# Bounded to 500 items to apply backpressure if the orchestrator falls behind
raw_data_queue: asyncio.Queue[str] = asyncio.Queue(maxsize=500)

# --- UI Broadcast Queue ---
# Carries formatted GenerativeUI JSON dicts from Agents → SSE Endpoint
# Bounded to 1000 items to buffer bursts of AI-generated events
ui_broadcast_queue: asyncio.Queue[dict] = asyncio.Queue(maxsize=1000)
