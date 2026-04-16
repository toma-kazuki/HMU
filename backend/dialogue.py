"""
HMU Intelligence — GPT-4o powered conversational agent.

Endpoints
---------
POST /dialogue/command        Accept a user message; return an AI response.
POST /dialogue/clear-history  Wipe the session history for a given crew member.

Session design
--------------
Conversations are kept in-memory, keyed by crew_id.
The last MAX_HISTORY Q&A exchanges are injected as context on every call so
GPT-4o can refer to recent questions without re-sending the full log.
"""

from __future__ import annotations

import os
from collections import deque
from typing import Any

from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException
from openai import OpenAI, OpenAIError
from pydantic import BaseModel

load_dotenv()

router = APIRouter(prefix="/dialogue", tags=["dialogue"])

# ── OpenAI client (lazy-initialised so import never fails without a key) ─────
_client: OpenAI | None = None


def _get_client() -> OpenAI:
    global _client
    if _client is None:
        key = os.getenv("api_key")
        if not key:
            raise HTTPException(
                status_code=503,
                detail=(
                    "OpenAI API key not configured. "
                    "Create a .env file in the project root and set:  api_key=sk-..."
                ),
            )
        _client = OpenAI(api_key=key)
    return _client


# ── System prompt — customise [AGENT NAME] and [YOUR DOMAIN] ─────────────────
SYSTEM_PROMPT = (
    "You are HMU Intelligence, a virtual health assistant embedded in the "
    "Health Monitoring Unit (HMU) dashboard for long-duration crewed spaceflight. "
    "You help flight surgeons and crew members interpret physiological and "
    "environmental monitoring data — including heart rate, SpO₂, sleep quality, "
    "fatigue scores, stress indices, activity levels, and habitat conditions "
    "(CO₂ partial pressure, temperature, humidity, and cumulative radiation dose). "
    "Be concise, accurate, and conversational. "
    "When a crew member reports a symptom, acknowledge it clearly and suggest "
    "appropriate self-monitoring steps or escalation to the flight surgeon. "
    "Never make definitive medical diagnoses. "
    "If the question is unrelated to health or the mission, politely redirect."
)

MAX_HISTORY = 3  # last N Q&A exchanges kept per session

# Per-crew session store:  crew_id -> deque of (user_msg, assistant_msg)
_sessions: dict[str, deque[tuple[str, str]]] = {}


def _session(crew_id: str) -> deque[tuple[str, str]]:
    if crew_id not in _sessions:
        _sessions[crew_id] = deque(maxlen=MAX_HISTORY)
    return _sessions[crew_id]


# ── Request / response models ─────────────────────────────────────────────────

class CommandRequest(BaseModel):
    command: str
    crew_id: str = "default"


class ClearRequest(BaseModel):
    crew_id: str = "default"


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/command")
async def handle_command(body: CommandRequest) -> dict[str, Any]:
    """Accept a user message and return a GPT-4o response."""
    client = _get_client()
    hist   = _session(body.crew_id)

    # Build the messages list: system + last N exchanges + current question
    messages: list[dict[str, str]] = [{"role": "system", "content": SYSTEM_PROMPT}]
    for user_msg, asst_msg in hist:
        messages.append({"role": "user",      "content": user_msg})
        messages.append({"role": "assistant", "content": asst_msg})
    messages.append({"role": "user", "content": body.command})

    try:
        completion = client.chat.completions.create(
            model="gpt-4o",
            temperature=0,
            messages=messages,
        )
    except OpenAIError as exc:
        raise HTTPException(status_code=502, detail=f"OpenAI error: {exc}") from exc

    answer: str = completion.choices[0].message.content or ""

    # Persist exchange for next call
    hist.append((body.command, answer))

    return {
        "response": {
            "voice_message": answer,
            "visual_message_type": ["text"],
            "visual_message": [answer],
            "writer": "agent",
        }
    }


@router.post("/clear-history")
async def clear_history(body: ClearRequest) -> dict[str, str]:
    """Reset the conversation history for the given crew member session."""
    if body.crew_id in _sessions:
        _sessions[body.crew_id].clear()
    return {"status": "cleared", "crew_id": body.crew_id}
