# Social Shield

A calm, database-driven social app for introverts, socially anxious and antisocial people —
built as a DBMS course project.

Social Shield helps you discover gentle events, escape awkward situations with fake calls,
practise conversations, learn safety skills, track your mood, and unwind with 17 cosy
browser games — all backed by a relational PostgreSQL database.

## Tech stack

- **Backend:** Python 3, Flask, Flask-Login, SQLAlchemy
- **Database:** PostgreSQL (auto-creates the database on first run; falls back to a local
  SQLite file if PostgreSQL isn't reachable, so the app always runs)
- **Frontend:** HTML, CSS (glassmorphism + gradients), vanilla JavaScript, HTML5 Canvas games
- **Email:** Gmail SMTP (for the welcome email and 6-digit password-reset codes)
- **Chatbot:** Google Gemini API (with a built-in offline fallback if the API is unavailable)

## Project layout

The project is split into two independent folders, plus a few things that sit above both:

```
DBMS/
├── README.md                    This file
├── run.bat                      Double-click to install deps and start the app
├── .gitignore
├── database/
│   └── schema.sql               Hand-written PostgreSQL DDL, views, a trigger and example queries
│
├── socialshield-backend/        Python / Flask application (see its own README.md)
│   ├── app.py                   App factory, DB selection, blueprint registration
│   ├── config.py                Settings loaded from .env
│   ├── models.py                SQLAlchemy models (20+ tables)
│   ├── seed_data.py             Sample data used to populate a fresh database
│   ├── routes/                  One blueprint per site section
│   ├── services/                Email sending + Gemini chatbot integration
│   ├── .env / .env.example      Local configuration (never commit .env)
│   └── instance/                Auto-created SQLite fallback database
│
└── socialshield-frontend/       Templates, CSS and JavaScript (see its own README.md)
    ├── templates/                Jinja2 templates, organised by section
    ├── static/css/style.css      The whole design system
    ├── static/js/                Shared JS + the 17-game engine
    └── design-reference/         The original single-file homepage mockup (kept for history)
```

The backend has no HTML/CSS/JS of its own, and the frontend has no server logic of its
own — `socialshield-backend/app.py` points Flask's `template_folder` and `static_folder`
at the sibling `socialshield-frontend/` folder, so the two stay cleanly separated while
still working together as one app.

## Quick start

1. **Install Python 3.10+** and make sure PostgreSQL is installed and running (optional —
   the app works on SQLite out of the box).
2. Install dependencies:
   ```
   cd socialshield-backend
   pip install -r requirements.txt
   ```
3. A working `socialshield-backend/.env` is already included for local testing. To use
   your own values, copy `socialshield-backend/.env.example` to `socialshield-backend/.env`
   and fill in:
   - `DATABASE_URL` — your PostgreSQL connection string. Leave it pointing at a database
     that doesn't exist yet; the app creates it automatically. If PostgreSQL can't be
     reached, Social Shield silently falls back to SQLite so you can keep developing.
   - `MAIL_USERNAME` / `MAIL_PASSWORD` — a Gmail address and its 16-character
     [App Password](https://myaccount.google.com/apppasswords) (not your normal Gmail
     password). Used for the welcome email and password-reset codes.
   - `GEMINI_API_KEY` — a key from [Google AI Studio](https://aistudio.google.com/apikey)
     for the "Shelly" chatbot. Without a key, the chatbot still works using a built-in
     offline answer bank.
4. Run the app — either double-click **`run.bat`** at the project root, or:
   ```
   cd socialshield-backend
   python app.py
   ```
   Then open **http://127.0.0.1:5000**.

The first run automatically creates every table and seeds sample data: 50 events, 20 fake
call scripts, ~90 conversation starters, 40 exit excuses, 40 tips, 20 self-defense
tutorials, 30 books, 24 skills, 29 resources/helplines and 17 games.

**Demo account:** username `demo`, password `demo1234`.

## Resetting the database

From inside `socialshield-backend/`:

```
flask --app app seed
```

This drops and recreates all tables, then reseeds them with fresh sample data.

## Features

- **Accounts:** registration with introversion level, trigger zones and a starter goal;
  login; full password-recovery flow (email → 6-digit code → new password); profile
  editing; account deletion.
- **Events:** filterable by category, area, crowd size, noise, comfort rating, creep risk
  and price; RSVP with an optional "quiet buddy" request; comfort/creep-risk reviews;
  anonymous creep-alert reporting; users can publish their own events.
- **Tools:** realistic fake-call simulator (ringtone, vibration, text-to-speech script),
  exit-excuse generator, conversation starters by context, box-breathing guide, 5-4-3-2-1
  grounding, social-battery meter, panic button, boundary-phrase builder, pre-event
  checklist, and dozens of written tips.
- **Resources:** book list with a personal reading tracker, a skills library with
  step-by-step guides, self-defense & safety tutorials, plus curated articles, videos,
  podcasts, apps and helplines.
- **Games:** 17 original lightweight games (Escape the Party, Awkward Dodge, Small Talk
  Quiz, Memory Match, Bubble Calm, Social Battery Runner, Snack Snake, Whack-a-Creep, Word
  Scramble, Quiet Tic-Tac-Toe, Calm 2048, Mood Simon, Fake Call Reflex, Excuse Typer, Small
  Talk Sweeper, Flappy Introvert, Quiet Room Puzzle) with per-game leaderboards.
- **Dashboard:** mood & social-battery tracking with charts, goals, post-event
  reflections with before/after anxiety charts, RSVP history, reading list and game stats.
- **Chatbot:** a floating assistant ("Shelly") on every page, powered by Gemini with live
  site data (events, counts) in its context, and a graceful offline fallback.
- **Design:** soft organic gradients, glass-morphism cards and a frosted glass navbar
  throughout, mobile-responsive.

## Notes for the report / viva

`database/schema.sql` documents the same schema as plain PostgreSQL DDL (independent of
the ORM), including three views (`v_event_safety`, `v_leaderboard`, `v_user_progress`), a
trigger that syncs a user's social battery from their latest mood log, and example queries
useful for a DBMS report or viva.
