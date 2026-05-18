"""
agent.py — Specialized Gemini Agent Functions for Dugout.ai

This module contains:
  1. Gemini client initialization (API Key → Vertex AI → Mock fallback)
  2. Pydantic schemas for structured JSON output
  3. Two specialized agent functions:
     - generate_oracle_prediction()  → End-of-over "Next Ball Oracle" cards
     - generate_realistic_commentary() → Commentary, polls, insights, trivia
  4. Mock fallback data for when Gemini is unavailable or rate-limited

Both functions return a dict (GenerativeUI JSON) ready for ui_broadcast_queue.
They do NOT broadcast directly — the orchestrator handles that.
"""

import asyncio
import json
import logging
import time
import uuid
import random
import os
from datetime import datetime
from dotenv import load_dotenv
from pydantic import BaseModel, Field
from typing import Optional

load_dotenv()

logger = logging.getLogger("dugout.agent")

# ============================================
# GEMINI CLIENT INITIALIZATION
# ============================================
# Supports three modes:
#   1. GEMINI_API_KEY → google-genai SDK (Google AI Studio)
#   2. GCP_PROJECT_ID → google-genai SDK (Vertex AI)
#   3. Neither → MOCK mode (no API calls)

gemini_client = None
gemini_model_name = os.environ.get("GEMINI_MODEL", "gemini-2.0-flash")
_init_mode = "MOCK"
_rate_limit_until: float = 0  # Epoch timestamp of rate limit expiry

api_key = os.environ.get("GEMINI_API_KEY")
if api_key:
    try:
        from google import genai
        gemini_client = genai.Client(api_key=api_key)
        _init_mode = "GOOGLE_AI"
        logger.info(f"✅ Gemini initialized via Google AI Studio (API Key). Model: {gemini_model_name}")
    except ImportError:
        logger.warning("google-genai package not installed. pip install google-genai")
    except Exception as e:
        logger.warning(f"Google AI Studio init failed: {e}")

if not gemini_client:
    gcp_project = os.environ.get("GCP_PROJECT_ID")
    if gcp_project:
        try:
            from google import genai
            gemini_client = genai.Client(
                vertexai=True,
                project=gcp_project,
                location=os.environ.get("GCP_LOCATION", "us-central1"),
            )
            _init_mode = "VERTEX_AI"
            logger.info(f"✅ Gemini initialized via Vertex AI. Project: {gcp_project}")
        except ImportError:
            logger.warning("google-genai package not installed. pip install google-genai")
        except Exception as e:
            logger.warning(f"Vertex AI init failed: {e}")

if not gemini_client:
    logger.warning("⚠️  No Gemini credentials found. Running in MOCK mode.")
    logger.warning("   Set GEMINI_API_KEY in .env to enable live AI generation.")


# ============================================
# STRUCTURED OUTPUT SCHEMAS (Pydantic)
# ============================================

class EventContent(BaseModel):
    question: Optional[str] = Field(None, description="Used for polls, insights, trivia and oracle.")
    options: Optional[list[str]] = Field(None, description="Options for polls and oracle bets.")
    explanation: Optional[str] = Field(None, description="Detailed explanation for insights and trivia.")
    prediction: Optional[str] = Field(None, description="The AI's specific prediction for the oracle.")
    probability: Optional[int] = Field(None, description="A percentage (0-100) representing confidence.")
    stylized_text: Optional[str] = Field(None, description="DEPRECATED: Legacy single-language field. Use _en/_hi/_bho instead.")
    stylized_text_en: Optional[str] = Field(None, description="Commentary in English.")
    stylized_text_hi: Optional[str] = Field(None, description="Commentary in Hindi (Hinglish mix).")
    stylized_text_bho: Optional[str] = Field(None, description="Commentary in Bhojpuri flavor.")
    persona: Optional[str] = Field(None, description="The persona used for the commentary.")
    fun_fact: Optional[str] = Field(None, description="A fun trivia fact related to the match.")


class GenerativeUIEvent(BaseModel):
    type: str = Field(description="One of: poll, insight, oracle, commentary, trivia")
    id: str = Field(description="A unique UUID for this event.")
    timestamp: str = Field(description="ISO 8601 timestamp.")
    title: str = Field(description="Short, punchy title for the card.")
    content: EventContent = Field(description="The structured content payload.")


# ============================================
# PERSONAS & MOCK DATA
# ============================================

PERSONAS = ["Gen-Z Meme Lord", "Deep Analytics Nerd", "Fierce Die-Hard Supporter"]
LANGUAGES = ["English", "Hindi (Hinglish mix)", "Bhojpuri flavor"]

MOCK_TRIVIA = [
    {"question": "Which bowler has the most dot balls in IPL powerplays?", "fun_fact": "Jasprit Bumrah has bowled 847 dot balls in IPL powerplays — that's more than any other fast bowler in history!", "explanation": "Bumrah's yorker accuracy makes him nearly unplayable in the first 6 overs."},
    {"question": "What is the highest team total in an IPL final?", "fun_fact": "CSK scored 205/4 against GT in the 2023 Final — the highest-ever score in an IPL final!", "explanation": "Devon Conway and Shivam Dube were the architects of that explosive innings."},
    {"question": "Who hit the first ball six in IPL history?", "fun_fact": "Chris Gayle smashed the first ever ball-one six in IPL history against the Pune Warriors in 2011!", "explanation": "The 'Universe Boss' went on to score 175* in that match — still the highest individual IPL score."},
    {"question": "Which stadium has hosted the most IPL matches?", "fun_fact": "The Wankhede Stadium in Mumbai has hosted over 100 IPL matches, making it the most-used IPL venue ever.", "explanation": "Being the home ground for Mumbai Indians, it sees packed crowds almost every match day."},
    {"question": "How many hat-tricks have been taken in IPL?", "fun_fact": "Only 23 hat-tricks have been taken in the entire history of the IPL across 17 seasons!", "explanation": "Amit Mishra holds the record with the most IPL hat-tricks (3)."},
]

MOCK_POLLS = [
    {"question": "Will this over go for more than 10 runs?", "options": ["Yes, absolutely! 🔥", "No, tight bowling incoming 🎯", "Exactly 10 - balanced", "Wicket incoming! 🏐"]},
    {"question": "Who will be the top scorer today?", "options": ["Opening batter", "Middle-order anchor", "Finisher", "Someone unexpected 😱"]},
    {"question": "What will the powerplay score be?", "options": ["Under 40", "40-55 (steady)", "55-70 (aggressive)", "70+ (carnage!) 💥"]},
    {"question": "How many sixes in the next 5 overs?", "options": ["0-1 (defensive)", "2-3 (balanced)", "4-5 (aggressive)", "6+ (absolute carnage)"]},
]

MOCK_INSIGHTS = [
    {"question": "The batting team has a strike rate of 145+ in the last 3 overs - they're accelerating perfectly into the death phase.", "explanation": "Historical data shows teams scoring at 145+ SR in overs 15-17 win 67% of the time.", "options": ["Watch for a bowling change", "Expect a slower ball variation"]},
    {"question": "The spinner has an economy of 5.2 in the middle overs - a masterclass in containment.", "explanation": "Spinners with sub-6 economy in overs 7-14 have historically turned matches in the bowling team's favor.", "options": ["Captain may extend his spell", "Batters might target him next over"]},
    {"question": "The required run rate has climbed above 12 - this is historically the tipping point where chases collapse.", "explanation": "Teams chasing 12+ RPO in the last 5 overs have only won 23% of the time in IPL history.", "options": ["Need a big over immediately", "Time for calculated risks"]},
]


# ============================================
# CORE GEMINI CALL (with rate-limit handling)
# ============================================

_api_calls_made = 0
MAX_API_CALLS = 150  # Hard limit to prevent unlimited API consumption

async def _call_gemini(prompt: str, schema: type[BaseModel] = GenerativeUIEvent) -> dict | None:
    """
    Call Gemini with structured output and return parsed JSON.
    Returns None on failure (rate limit, API error, or no client).
    Non-blocking: runs SDK call in thread executor.
    """
    global _rate_limit_until, _api_calls_made

    if not gemini_client:
        return None

    if _api_calls_made >= MAX_API_CALLS:
        logger.warning(f"MAX_API_CALLS ({MAX_API_CALLS}) limit reached. Falling back to MOCK mode to prevent runaway billing.")
        return None

    now = time.time()
    if now < _rate_limit_until:
        remaining = int(_rate_limit_until - now)
        logger.warning(f"Rate-limited — skipping Gemini ({remaining}s remaining)")
        return None

    try:
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None,
            lambda: gemini_client.models.generate_content(
                model=gemini_model_name,
                contents=prompt,
                config={
                    "response_mime_type": "application/json",
                    "response_schema": schema,
                },
            ),
        )

        json_data = json.loads(response.text)
        
        _api_calls_made += 1
        if _api_calls_made % 10 == 0:
            logger.info(f"API Quota check: {_api_calls_made}/{MAX_API_CALLS} calls used this session.")

        # Ensure required fields
        if not json_data.get("id"):
            json_data["id"] = str(uuid.uuid4())
        if not json_data.get("timestamp"):
            json_data["timestamp"] = datetime.now().isoformat()

        return json_data

    except Exception as e:
        error_str = str(e)
        if "429" in error_str or "RESOURCE_EXHAUSTED" in error_str:
            _rate_limit_until = time.time() + 65
            logger.warning("Rate limited by Gemini API. Cooling down for 65s.")
        else:
            logger.error(f"Gemini API call failed: {e}")
        return None


# ============================================
# SPECIALIZED AGENT FUNCTIONS
# ============================================

async def generate_oracle_prediction(commentary_text: str) -> dict:
    """
    🔮 Oracle Agent — generates "Next Ball Oracle" prediction cards.
    Called when end-of-over is detected.
    Returns a GenerativeUI dict with type="oracle".
    """
    prompt = f"""You are a passionate human cricket expert and oracle on Dugout.ai, a live cricket app.
You specialize in NEXT BALL PREDICTIONS at the end of overs.
IMPORTANT: Act entirely like a real human fan. NEVER mention you are an AI, a bot, or an agent.

COMMENTARY: {commentary_text}

Generate a prediction card with:
- type: "oracle"
- title: A punchy prediction headline with 🔮 emoji
- content.prediction: A specific delivery prediction (e.g. "Yorker on middle stump", "Short ball outside off")
- content.probability: Your confidence percentage (55-95)
- content.question: An engaging question asking fans to bet on the next ball
- content.options: Exactly 4 betting options (e.g. ["Dot Ball", "Single", "Boundary 🏏", "WICKET! 💀"])

Be creative and specific with your predictions. Speak like a true cricket fanatic, showing emotion and expertise."""

    result = await _call_gemini(prompt)
    if result:
        result["type"] = "oracle"  # Enforce type
        logger.info(f"[GEMINI:ORACLE] {result.get('title', 'prediction')}")
        return result

    # --- Mock fallback ---
    logger.info("[MOCK:ORACLE] Using mock oracle prediction")
    return {
        "type": "oracle",
        "id": str(uuid.uuid4()),
        "timestamp": datetime.now().isoformat(),
        "title": "🔮 Next Ball Oracle",
        "content": {
            "question": "What will the next delivery be?",
            "options": random.choice([
                ["Yorker", "Bouncer", "Slower Ball", "Off-cutter"],
                ["Dot Ball", "Single", "Boundary", "Wicket"],
                ["Full Toss", "Good Length", "Short Ball", "Wide"],
            ]),
            "prediction": random.choice([
                "Yorker on middle stump",
                "Sharp bouncer outside off",
                "Slower ball variation",
                "Full and wide outside off",
            ]),
            "probability": random.randint(55, 95),
        },
    }


async def generate_realistic_commentary(commentary_text: str) -> dict:
    """
    🎙️ Commentary Agent — generates polls, insights, trivia, and stylized commentary.
    Called for all non-end-of-over deliveries.
    Returns a GenerativeUI dict with type in {commentary, poll, insight, trivia}.
    """
    text_lower = commentary_text.lower()
    chosen_persona = random.choice(PERSONAS)
    chosen_language = random.choice(LANGUAGES)

    is_wicket = any(kw in text_lower for kw in [
        "wicket", "out", "caught", "bowled", "lbw", "stumped", "run out"
    ])
    is_boundary = any(kw in text_lower for kw in [
        "four", "six", "boundary", "4 runs", "6 runs", "over the rope"
    ])

    # For wickets and boundaries, prompt Gemini for rich content
    if is_wicket or is_boundary:
        event_type_hint = "poll or insight" if is_wicket else "commentary or trivia"
    else:
        event_type_hint = "commentary, trivia, poll, or insight (choose one)"

    prompt = f"""You are a passionate human cricket fan on Dugout.ai, a live cricket app.
You react to live match events with engaging, interactive content.
IMPORTANT: Act entirely like a real human fan. NEVER mention you are an AI, a bot, or an agent. Show genuine emotion, excitement, or frustration.

COMMENTARY: {commentary_text}
EVENT CONTEXT: {"WICKET! Major event!" if is_wicket else "BOUNDARY! Exciting shot!" if is_boundary else "Regular delivery"}
PERSONA: {chosen_persona}

Generate ONE card of type: {event_type_hint}

Rules by type:
- type="commentary": You MUST generate the commentary in THREE languages simultaneously:
  * content.stylized_text_en: 2-3 sentences reacting as {chosen_persona} in vivid English.
  * content.stylized_text_hi: The SAME reaction in Hindi/Hinglish (Devanagari + Roman mix).
  * content.stylized_text_bho: The SAME reaction in Bhojpuri dialect flavor.
  * Also set content.stylized_text to the English version (for backward compatibility).
  * Set content.persona to "{chosen_persona}".
- type="trivia": Set content.question (cricket fact question), content.fun_fact (the answer), content.explanation.
- type="poll": Set content.question (engaging fan question), content.options (3-4 options with emojis).
- type="insight": Set content.question (tactical analysis), content.explanation (stat-backed reasoning), content.options (2 key takeaways).

ALWAYS set a punchy title with relevant emoji. Be entertaining and engaging!"""

    result = await _call_gemini(prompt)
    if result:
        logger.info(f"[GEMINI:COMMENTARY] {result.get('type')}: {result.get('title', '')}")
        return result

    # --- Mock fallback ---
    roll = random.random()

    if is_wicket and roll < 0.5:
        mock_type = "poll"
    elif is_wicket:
        mock_type = "insight"
    elif roll < 0.15:
        mock_type = "trivia"
    elif roll < 0.30:
        mock_type = "poll"
    elif roll < 0.45:
        mock_type = "insight"
    else:
        mock_type = "commentary"

    now = datetime.now().isoformat()
    event_id = str(uuid.uuid4())

    if mock_type == "trivia":
        trivia = random.choice(MOCK_TRIVIA)
        data = {"type": "trivia", "id": event_id, "timestamp": now, "title": "🧠 Cricket Trivia", "content": trivia}
    elif mock_type == "poll":
        poll = random.choice(MOCK_POLLS)
        data = {"type": "poll", "id": event_id, "timestamp": now, "title": "📊 Fan Poll", "content": poll}
    elif mock_type == "insight":
        insight = random.choice(MOCK_INSIGHTS)
        data = {"type": "insight", "id": event_id, "timestamp": now, "title": "💡 Tactical Insight", "content": insight}
    else:
        # Multilingual mock commentary — each entry has en/hi/bho variants
        mock_commentary = random.choice([
            {
                "en": "Broooo that was absolutely filthy! The way that ball moved - physics left the chat fr fr",
                "hi": "Bhai kya ball thi yaar! Physics ne toh group chhod diya bilkul! 🔥",
                "bho": "अरे भैया ई बॉल त एतना गंदा रहे कि फिजिक्स के दिमाग हिल गइल! 💀",
            },
            {
                "en": "Statistical anomaly alert: That shot had a 12% success probability. Incredible execution.",
                "hi": "Stats ke hisaab se is shot ka sirf 12% chance tha. Kamal ki execution! 📊",
                "bho": "आंकड़ा बोलत बा कि ई शॉट के बस 12% चांस रहे। का मारल बा! 📊",
            },
            {
                "en": "COME ONNNN! That's my team energy right there! Blood, sweat, and IPL tears!",
                "hi": "CHAL CHAL CHAL! Yahi toh hai hamari team ki energy! Khoon, pasina aur IPL ke aansu!",
                "bho": "चल बे चल! इहे हमनी के टीम के जोश बा! लहू, पसीना और IPL के आंसू!",
            },
            {
                "en": "Yaar, that ball was out of this world! What bowling, full respect!",
                "hi": "Yaar, ye ball toh out of this world thi! Kya bowling hai, full respect 🙏",
                "bho": "यार ई बॉल त दुनिया से बाहर के रहे! का बॉलिंग बा, पूरा इज्जत! 🙏",
            },
            {
                "en": "No cap, this innings is giving main character energy. Absolutely unreal.",
                "hi": "Sacchi mein, ye innings main character energy de rahi hai. Bilkul unreal! 🌟",
                "bho": "सच्ची बात बा, ई पारी त मेन कैरेक्टर वाला एनर्जी देत बा। पूरा अनरियल! 🌟",
            },
            {
                "en": "The run rate required is climbing - 11.4 per over now. The asking rate tells the story of mounting pressure.",
                "hi": "Required run rate badh raha hai - 11.4 per over. Pressure mount ho raha hai! 📈",
                "bho": "रन रेट बढ़त जात बा - 11.4 प्रति ओवर। दबाव बहुते बढ़ गइल बा! 📈",
            },
        ])
        data = {
            "type": "commentary",
            "id": event_id,
            "timestamp": now,
            "title": random.choice([
                "What a delivery! 🔥", "Absolutely smashed! 💥", "Dot ball pressure 🎯",
                "Edge... and safe!", "Clean strike! 🏐", "Bowling masterclass",
            ]),
            "content": {
                "stylized_text": mock_commentary["en"],
                "stylized_text_en": mock_commentary["en"],
                "stylized_text_hi": mock_commentary["hi"],
                "stylized_text_bho": mock_commentary["bho"],
                "persona": chosen_persona,
            },
        }

    logger.info(f"[MOCK:COMMENTARY] {data['type']}: {data['title']}")
    return data
