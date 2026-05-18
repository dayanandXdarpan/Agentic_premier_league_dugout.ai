"""
orchestrator.py — Supervisor (Event-Driven Router) for Dugout.ai Multi-Agent Pipeline

The Supervisor is the central routing brain that:
  1. Continuously consumes raw commentary strings from raw_data_queue
  2. Classifies each event using keyword-based routing logic
  3. Dispatches to specialized Gemini agent functions:
     - End-of-over → generate_oracle_prediction()
     - All other deliveries → generate_realistic_commentary()
  4. Pushes the resulting GenerativeUI JSON into ui_broadcast_queue
  5. Handles bet resolution and match state updates inline

Architecture:
  raw_data_queue → [Supervisor] → agent functions → ui_broadcast_queue
"""

import asyncio
import logging
import re
import uuid
import random
from datetime import datetime

from queues import raw_data_queue, ui_broadcast_queue
from agent import generate_oracle_prediction, generate_realistic_commentary

logger = logging.getLogger("dugout.orchestrator")

# ============================================
# SHARED STATE
# ============================================

# In-memory store for pending bets (gamification)
pending_bets: list[dict] = []

# Live match state (served via REST + broadcast via SSE)
match_state: dict = {
    "team1": "KKR",
    "team2": "SRH",
    "score1": "——",
    "score2": "——",
    "overs": "0.0",
    "batting": "KKR",
    "status": "Simulation Mode",
    "venue": "MA Chidambaram Stadium, Chennai",
    # Player-level data (updated as commentary is parsed)
    "batters": [
        {"name": "V. Kohli", "runs": 0, "balls": 0, "fours": 0, "sixes": 0},
        {"name": "S. Iyer",  "runs": 0, "balls": 0, "fours": 0, "sixes": 0},
    ],
    "bowler": {"name": "J. Bumrah", "overs": "0.0", "runs": 0, "wickets": 0, "economy": "0.00"},
    "last_over": [],
}


# ============================================
# MATCH CONTEXT EXTRACTION
# ============================================

_SCORE_PATTERN = re.compile(r'(\w{2,4})\s+(\d{1,3})/(\d{1,2})\s*\((\d{1,2}\.\d)\)')


def extract_match_context(text: str) -> dict | None:
    """Extract score/over from commentary text. Returns state update dict or None."""
    match = _SCORE_PATTERN.search(text)
    if match:
        return {
            "batting": match.group(1),
            "score1": f"{match.group(2)}/{match.group(3)}",
            "overs": match.group(4),
        }
    return None


# ============================================
# END-OF-OVER DETECTION
# ============================================

# Patterns indicating the last ball of an over (x.6)
_OVER_END_KEYWORDS = [
    "end of over", "over complete",
    "0.6", "1.6", "2.6", "3.6", "4.6", "5.6",
    "6.6", "7.6", "8.6", "9.6", "10.6", "11.6",
    "12.6", "13.6", "14.6", "15.6", "16.6", "17.6",
    "18.6", "19.6",
]


def _is_end_of_over(text: str) -> bool:
    """Detect if the commentary text indicates the end of an over."""
    text_lower = text.lower()
    return any(kw in text_lower for kw in _OVER_END_KEYWORDS)


# ============================================
# BET RESOLUTION
# ============================================

async def _resolve_pending_bets() -> None:
    """Resolve any pending fan bets and push results to ui_broadcast_queue."""
    global pending_bets
    if not pending_bets:
        return

    for bet in pending_bets:
        won = random.random() < 0.6  # 60% win rate for demo excitement
        coins = 50 if won else 0
        result_event = {
            "type": "points_update",
            "id": str(uuid.uuid4()),
            "timestamp": datetime.now().isoformat(),
            "title": "Prediction Correct! 🎉" if won else "Better luck next time! 😅",
            "content": {
                "coins_awarded": coins,
                "question": f"You {'won' if won else 'lost'} your bet on: {bet.get('bet', 'unknown')}!",
            },
        }
        await ui_broadcast_queue.put(result_event)
        logger.info(f"Bet {'WON (+50 FC)' if won else 'LOST'} for user={bet.get('user_id')}")

    pending_bets.clear()


# ============================================
# MATCH STATE BROADCAST
# ============================================

async def _broadcast_match_state(state_update: dict) -> None:
    """Update and push match state changes to ui_broadcast_queue."""
    global match_state
    match_state.update(state_update)
    await ui_broadcast_queue.put({
        "type": "match_state",
        "id": str(uuid.uuid4()),
        "timestamp": datetime.now().isoformat(),
        "title": "Match Update",
        "content": match_state,
    })


# ============================================
# SUPERVISOR — The Central Event Router
# ============================================

async def supervisor() -> None:
    """
    Supervisor (Orchestrator) — runs as a persistent asyncio task.

    Continuously consumes raw commentary strings from raw_data_queue,
    routes them to specialized Gemini agent functions based on event type,
    and pushes the resulting UI events into ui_broadcast_queue.

    Routing Logic:
      - End of over detected → generate_oracle_prediction()
      - All other deliveries → generate_realistic_commentary()
    """
    logger.info("🎛️  Supervisor started — consuming from raw_data_queue")

    while True:
        try:
            # Block until a new raw commentary string arrives
            raw_text: str = await raw_data_queue.get()

            logger.debug(f"[SUPERVISOR] Processing: {raw_text[:60]}...")

            # --- Step 1: Resolve any pending bets ---
            await _resolve_pending_bets()

            # --- Step 2: Extract and broadcast match context ---
            ctx = extract_match_context(raw_text)
            if ctx:
                await _broadcast_match_state(ctx)

            # --- Step 3: Route to specialized agent ---
            if _is_end_of_over(raw_text):
                logger.info(f"[SUPERVISOR] 🔮 End-of-over detected → Oracle Agent")
                event = await generate_oracle_prediction(raw_text)
            else:
                logger.info(f"[SUPERVISOR] 🎙️ Regular delivery → Commentary Agent")
                event = await generate_realistic_commentary(raw_text)

            # --- Step 4: Push formatted event to UI broadcast queue ---
            await ui_broadcast_queue.put(event)

            # Mark queue item as processed
            raw_data_queue.task_done()

        except asyncio.CancelledError:
            logger.info("Supervisor cancelled — shutting down gracefully.")
            break
        except Exception as e:
            logger.error(f"[SUPERVISOR] Unhandled error: {e}", exc_info=True)
            # Don't crash — continue processing next item
            await asyncio.sleep(1)

    logger.info("🎛️  Supervisor stopped.")
