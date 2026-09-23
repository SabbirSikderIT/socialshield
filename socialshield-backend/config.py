import os
from dotenv import load_dotenv

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "change-me-in-production")

    # PostgreSQL is the primary database. If it can't be reached, app.py falls
    # back to a local SQLite file so the site still runs during development.
    DATABASE_URL = os.getenv("DATABASE_URL", "")
    SQLITE_FALLBACK = "sqlite:///" + os.path.join(BASE_DIR, "instance", "social_shield.db")
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Gmail SMTP (use a Google "App password", not your normal password)
    MAIL_SERVER = os.getenv("MAIL_SERVER", "smtp.gmail.com")
    MAIL_PORT = int(os.getenv("MAIL_PORT", "587"))
    MAIL_USERNAME = os.getenv("MAIL_USERNAME", "")
    MAIL_PASSWORD = os.getenv("MAIL_PASSWORD", "").replace(" ", "")
    MAIL_SENDER_NAME = os.getenv("MAIL_SENDER_NAME", "Social Shield")

    # Gemini chatbot
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.6-flash")

    # Shown at the bottom of every page
    CREDIT_TEXT = os.getenv(
        "CREDIT_TEXT",
        "Designed & developed with 💜 by Team Social Shield · UIU DBMS Project",
    )

    RESET_CODE_MINUTES = 15
    DEV_SHOW_RESET_CODE = os.getenv("DEV_SHOW_RESET_CODE", "1") == "1"
