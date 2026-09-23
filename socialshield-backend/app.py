import logging
import os
import secrets
from datetime import datetime

from flask import Flask, abort, render_template, request, session
from flask_login import LoginManager
from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url

from config import BASE_DIR, Config
from models import User, db

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
log = logging.getLogger("social_shield")


def _ensure_postgres(url):
    """Return True if PostgreSQL is reachable, creating the database if it is missing."""
    try:
        u = make_url(url)
        try:
            with create_engine(url).connect() as c:
                c.execute(text("SELECT 1"))
            return True
        except Exception as exc:
            if "does not exist" not in str(exc):
                raise
        admin = create_engine(u.set(database="postgres"), isolation_level="AUTOCOMMIT")
        with admin.connect() as c:
            c.execute(text(f'CREATE DATABASE "{u.database}"'))
        log.info("Created PostgreSQL database %s", u.database)
        return True
    except Exception as exc:
        log.warning("PostgreSQL unavailable (%s). Falling back to SQLite.", str(exc).splitlines()[0])
        return False


def pick_database(cfg):
    url = cfg.DATABASE_URL
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+psycopg://", 1)
    elif url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+psycopg://", 1)
    if url.startswith("postgresql") and _ensure_postgres(url):
        return url
    os.makedirs(os.path.join(BASE_DIR, "instance"), exist_ok=True)
    return cfg.SQLITE_FALLBACK


def create_app():
    # Templates and static assets live in the sibling socialshield-frontend/ folder
    # rather than next to this file, so they're pointed to explicitly here.
    frontend_dir = os.path.join(BASE_DIR, "..", "socialshield-frontend")
    app = Flask(
        __name__,
        template_folder=os.path.join(frontend_dir, "templates"),
        static_folder=os.path.join(frontend_dir, "static"),
    )
    app.config.from_object(Config)
    app.config["SQLALCHEMY_DATABASE_URI"] = pick_database(Config)
    app.config["DB_ENGINE"] = "PostgreSQL" if app.config["SQLALCHEMY_DATABASE_URI"].startswith("postgresql") else "SQLite"
    log.info("Using %s database", app.config["DB_ENGINE"])

    db.init_app(app)

    login = LoginManager(app)
    login.login_view = "auth.login"
    login.login_message = "Please log in first — it's quiet in here, promise 🌿"
    login.login_message_category = "info"

    @login.user_loader
    def load_user(uid):
        return db.session.get(User, int(uid))

    # --- CSRF protection (forms send csrf_token, fetch() sends X-CSRF-Token) ---
    def csrf_token():
        if "_csrf" not in session:
            session["_csrf"] = secrets.token_hex(16)
        return session["_csrf"]

    @app.before_request
    def check_csrf():
        if request.method in ("POST", "PUT", "PATCH", "DELETE"):
            sent = request.form.get("csrf_token") or request.headers.get("X-CSRF-Token")
            if not sent or sent != session.get("_csrf"):
                abort(400, "Your session expired. Please refresh the page and try again.")

    @app.context_processor
    def inject_globals():
        return {
            "csrf_token": csrf_token,
            "credit_text": app.config["CREDIT_TEXT"],
            "db_engine": app.config["DB_ENGINE"],
            "now": datetime.utcnow(),
        }

    @app.template_filter("nl2list")
    def nl2list(value):
        return [x.strip() for x in (value or "").split("\n") if x.strip()]

    @app.template_filter("pretty_dt")
    def pretty_dt(value, fmt="%a, %d %b · %I:%M %p"):
        return value.strftime(fmt) if value else ""

    from routes.api import bp as api_bp
    from routes.auth import bp as auth_bp
    from routes.dashboard import bp as dash_bp
    from routes.events import bp as events_bp
    from routes.games import bp as games_bp
    from routes.main import bp as main_bp
    from routes.resources import bp as res_bp
    from routes.tools import bp as tools_bp

    for bp in (main_bp, auth_bp, events_bp, tools_bp, res_bp, games_bp, dash_bp, api_bp):
        app.register_blueprint(bp)

    @app.errorhandler(404)
    def not_found(e):
        return render_template("error.html", code=404, title="Lost in the crowd?",
                               message="This page slipped out of the party early."), 404

    @app.errorhandler(400)
    def bad_request(e):
        return render_template("error.html", code=400, title="Oops",
                               message=getattr(e, "description", "Bad request")), 400

    @app.errorhandler(500)
    def server_error(e):
        return render_template("error.html", code=500, title="Something went quiet",
                               message="An unexpected error happened. Please try again."), 500

    @app.cli.command("seed")
    def seed_cmd():
        """Drop, recreate and seed all tables."""
        from seed_data import seed
        db.drop_all()
        db.create_all()
        seed()
        print("Database seeded ✔")

    with app.app_context():
        db.create_all()
        from models import Event
        if Event.query.count() == 0:
            from seed_data import seed
            seed()
            log.info("Seeded sample data")

    return app


app = create_app()

if __name__ == "__main__":
    app.run(debug=True, port=int(os.getenv("PORT", "5000")))
