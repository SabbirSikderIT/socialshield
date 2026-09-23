"""Gemini-powered assistant ("Shelly") with an offline fallback."""
import json
import logging
import random
import urllib.error
import urllib.request
from datetime import datetime

from flask import current_app

from models import Book, Event, Game, Skill, Template

log = logging.getLogger(__name__)

FALLBACK_MODELS = ["gemini-3.6-flash", "gemini-flash-latest", "gemini-3-flash"]

SITE_GUIDE = """
You are "Shelly", the gentle, warm assistant of Social Shield, a website for introverts,
antisocial and socially anxious people. Speak softly, kindly, briefly (usually under 120 words),
use a little humour and an occasional emoji. Never shame anyone for being introverted.
If someone mentions self-harm or being in danger, calmly share: Bangladesh emergency 999,
Kaan Pete Roi emotional support (kaanpeteroi.org), and encourage contacting someone they trust.

Website map (link with relative paths like /events):
- / : Home page with overview, stats and highlights.
- /events : Nearby social events in Dhaka with comfort rating, creep-risk rating, crowd size,
  noise level, quiet zones and easy-exit flags. Filters by category, area, crowd, noise.
  Each event page (/events/<id>) lets logged-in users RSVP (optionally ask for a quiet buddy),
  rate comfort and creep risk, and file an anonymous Creep Alert report.
- /tools : Survival toolkit: Fake Call simulator (realistic ringing screen, voice script),
  Exit Excuse generator, Conversation Starter templates by context (party, classroom, bus queue,
  office, wedding, online, cafe, family), Box-breathing guide, 5-4-3-2-1 grounding, Social Battery
  meter, Panic button, Boundary phrase builder, Pre-event checklist, and many written tips.
- /resources : Book list (read/preview links, reading list tracking), Skills list (click a skill
  for full details, steps and practice), Self-defense & safety tutorials (verbal, body language,
  physical, awareness), articles, videos, podcasts, apps and helplines.
- /games : 17 lightweight browser games such as Escape the Party, Awkward Dodge, Small Talk Quiz,
  Memory Match, Flappy Introvert, Whack-a-Creep, Calm 2048 and more. Scores are saved for
  logged-in users on a leaderboard.
- /dashboard : Personal area: profile, trigger zones, goals, mood & social battery tracker,
  post-event reflections (feedback), progress charts, RSVPs, reading list, game stats.
- /login, /register, /forgot-password : Accounts. Password recovery emails a 6-digit code valid
  for 15 minutes.
- /about, /faq, /contact, /privacy, /terms : Info pages.

Database tables (for DBMS-curious users): users, triggers, user_triggers, user_goals,
password_resets, events, event_reviews, user_reports (creep alerts), rsvps, fake_calls,
templates (conversation starters), exit_excuses, tips, self_defense, books, user_books, skills,
resources, games, game_progress, user_feedback, mood_logs, chat_messages, contact_messages.
Stack: Python Flask backend, PostgreSQL database, HTML/CSS/JavaScript frontend, Gemini chatbot.

Only answer about Social Shield, social anxiety, introversion, confidence, safety and closely
related wellbeing topics. For unrelated topics, answer very briefly and steer back kindly.
"""


def _live_context():
    try:
        now = datetime.utcnow()
        upcoming = Event.query.filter(Event.start_time >= now).order_by(Event.start_time).limit(8).all()
        lines = ["Live data right now:"]
        lines.append(f"- {Event.query.count()} events, {Book.query.count()} books, "
                     f"{Skill.query.count()} skills, {Game.query.count()} games, "
                     f"{Template.query.count()} conversation starters.")
        for e in upcoming:
            s = e.stats()
            lines.append(f"- Event #{e.id} '{e.title}' ({e.category}) at {e.venue}, {e.area} on "
                         f"{e.start_time:%d %b %Y %I:%M %p}; crowd {e.crowd_size}, noise {e.noise_level}/5, "
                         f"comfort {s['comfort']}, creep risk {s['creep']} -> /events/{e.id}")
        lines.append("Games: " + ", ".join(f"{g.title} (/games/{g.slug})" for g in Game.query.all()))
        return "\n".join(lines)
    except Exception as exc:
        log.warning("live context failed: %s", exc)
        return ""


def ask_gemini(history, message):
    cfg = current_app.config
    key = cfg["GEMINI_API_KEY"]
    if not key:
        raise RuntimeError("GEMINI_API_KEY missing")
    contents = [{"role": h["role"], "parts": [{"text": h["content"]}]} for h in history[-12:]]
    contents.append({"role": "user", "parts": [{"text": message}]})
    body = {
        "systemInstruction": {"parts": [{"text": SITE_GUIDE + "\n" + _live_context()}]},
        "contents": contents,
        # thinking disabled: short chat replies don't need it and it eats the token budget
        "generationConfig": {"temperature": 0.7, "maxOutputTokens": 1024, "thinkingConfig": {"thinkingBudget": 0}},
    }
    # Google retires model names over time, so fall back to newer ones on 404
    models = list(dict.fromkeys([cfg["GEMINI_MODEL"], *FALLBACK_MODELS]))
    return _generate(body, models, key)


def _generate(body, models, key):
    last_error = None
    for model in models:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
        req = urllib.request.Request(
            url, data=json.dumps(body).encode(), method="POST",
            headers={"Content-Type": "application/json", "x-goog-api-key": key},
        )
        try:
            with urllib.request.urlopen(req, timeout=25) as r:
                data = json.loads(r.read().decode())
        except urllib.error.HTTPError as e:
            last_error = RuntimeError(f"Gemini HTTP {e.code} ({model}): {e.read().decode()[:300]}")
            if e.code == 404:
                continue
            if e.code == 400 and "thinkingConfig" in body["generationConfig"]:
                body["generationConfig"].pop("thinkingConfig")  # model doesn't support it; retry once
                return _generate(body, [model], key)
            raise last_error
        parts = data["candidates"][0]["content"]["parts"]
        return "".join(p.get("text", "") for p in parts).strip()
    raise last_error


FALLBACK = [
    (("fake call", "call", "phone"), "Need an escape hatch? 📞 Open **/tools** and tap *Fake Call*. Pick a caller (Mom, Boss, Vet…), set a delay, and a realistic incoming-call screen will ring so you can slip away gracefully."),
    (("event", "program", "gathering", "party", "meetup"), "You can browse calm, introvert-friendly events at **/events** 🌿. Every event shows comfort and creep-risk ratings, crowd size, noise level, and whether there's a quiet zone or easy exit."),
    (("creep", "unsafe", "harass", "report", "alert"), "I'm sorry you had to deal with that 💜. On any event page (**/events**) press *Report Creep Alert*. Reports can be anonymous and warn other attendees. If you're in immediate danger, call **999**."),
    (("starter", "talk", "conversation", "icebreaker", "say"), "Try this one: *\"Do you know any hidden gem spots in Dhaka?\"* 😊 There are many more starters for parties, classrooms, bus queues and offices in **/tools**."),
    (("game", "play"), "There are 17 cosy mini-games at **/games** 🎮. My favourite is *Escape the Party*: dodge the over-sharers and reach the exit!"),
    (("book", "read"), "Our book list lives at **/resources** 📚. You'll find *Quiet* by Susan Cain, *The Social Skills Guidebook*, free classics, and you can track what you're reading."),
    (("skill",), "Browse the Skills list at **/resources#skills** 💪 and click any skill to see step-by-step details and practice ideas."),
    (("defen", "safety", "protect"), "Self-defense and safety tutorials (verbal, body-language, physical and awareness) are at **/resources#defense** 🛡️."),
    (("password", "forgot", "reset", "login", "account", "register", "sign"), "Log in at **/login**. Forgot your password? Go to **/forgot-password** and we'll email you a 6-digit code (valid for 15 minutes) 🔐."),
    (("anxious", "anxiety", "panic", "overwhelm", "nervous", "stress"), "That sounds heavy. Let's breathe together 🌬️: in for 4, hold for 4, out for 4, hold for 4. The guided breathing and 5-4-3-2-1 grounding tools are in **/tools**. You're doing better than you think."),
    (("mood", "progress", "track", "dashboard", "reflect"), "Your personal **/dashboard** tracks mood, social battery, goals and post-event reflections so you can see how far you've come 📈."),
    (("database", "dbms", "table", "sql", "postgres"), "Social Shield runs on **PostgreSQL** with 20+ related tables such as users, events, event_reviews, user_reports, fake_calls, templates, self_defense, game_progress and user_feedback. See `database/schema.sql` 🗄️."),
    (("hello", "hi", "hey", "salam", "assalam"), "Hi there 🌸 I'm Shelly, your quiet companion. Ask me about events, fake calls, conversation starters, games, or anything on Social Shield."),
]


def fallback_answer(message):
    m = message.lower()
    for keys, answer in FALLBACK:
        if any(k in m for k in keys):
            return answer
    return random.choice([
        "I'm here for you 🌷. I can help with **events**, **fake calls**, **conversation starters**, **self-defense tips**, **books**, **skills** and **games**. What would you like?",
        "Hmm, I'm not sure about that one 🤔. Try asking about calm events, exit excuses, or how to start a conversation!",
    ])


def answer(history, message):
    try:
        text = ask_gemini(history, message)
        if text:
            return text, "gemini"
    except Exception as exc:
        log.warning("Gemini unavailable, using offline answer: %s", exc)
    return fallback_answer(message), "offline"
