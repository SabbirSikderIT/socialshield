# socialshield-backend

The Python/Flask half of Social Shield: routes, database models, business logic,
email sending and the chatbot integration. It renders pages using the templates and
static assets from the sibling [`socialshield-frontend/`](../socialshield-frontend)
folder — this backend has no HTML/CSS/JS of its own.

## Contents

| Path | Purpose |
|---|---|
| `app.py` | Application factory: picks PostgreSQL or SQLite, registers blueprints, error pages |
| `config.py` | Loads settings from `.env` |
| `models.py` | SQLAlchemy models (20+ tables) |
| `seed_data.py` | Sample data used to populate a fresh database |
| `routes/` | One Flask blueprint per site section (main, auth, events, tools, resources, games, dashboard, api) |
| `services/` | `mailer.py` (Gmail SMTP) and `chatbot.py` (Gemini + offline fallback) |
| `.env` | Local secrets/config — never commit this file |
| `instance/` | Auto-created SQLite fallback database (git-ignored) |

## Running

From inside this folder:

```
pip install -r requirements.txt
python app.py
```

Or use `run.bat` at the project root, which does both steps for you.

To reset and reseed the database:

```
flask --app app seed
```
