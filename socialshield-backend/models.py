"""SQLAlchemy models for Social Shield.

The same schema is available as raw PostgreSQL DDL in ../database/schema.sql.
"""
from datetime import datetime

from flask_login import UserMixin
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import func
from werkzeug.security import check_password_hash, generate_password_hash

db = SQLAlchemy()


user_triggers = db.Table(
    "user_triggers",
    db.Column("user_id", db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    db.Column("trigger_id", db.Integer, db.ForeignKey("triggers.id", ondelete="CASCADE"), primary_key=True),
)


class User(UserMixin, db.Model):
    __tablename__ = "users"
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(40), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    full_name = db.Column(db.String(100))
    introversion_level = db.Column(db.String(20), default="medium")  # low / medium / high / extreme
    city = db.Column(db.String(60), default="Dhaka")
    bio = db.Column(db.Text)
    avatar = db.Column(db.String(8), default="🌸")
    social_battery = db.Column(db.Integer, default=70)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    triggers = db.relationship("Trigger", secondary=user_triggers, backref="users")
    goals = db.relationship("UserGoal", backref="user", cascade="all, delete-orphan")

    def set_password(self, raw):
        self.password_hash = generate_password_hash(raw)

    def check_password(self, raw):
        return check_password_hash(self.password_hash, raw)


class Trigger(db.Model):
    __tablename__ = "triggers"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(60), unique=True, nullable=False)
    icon = db.Column(db.String(8))


class UserGoal(db.Model):
    __tablename__ = "user_goals"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = db.Column(db.String(150), nullable=False)
    target = db.Column(db.Integer, default=1)
    progress = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    @property
    def done(self):
        return self.progress >= self.target


class PasswordReset(db.Model):
    __tablename__ = "password_resets"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    code_hash = db.Column(db.String(255), nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)
    attempts = db.Column(db.Integer, default=0)
    used = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    user = db.relationship("User")


class Event(db.Model):
    __tablename__ = "events"
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(150), nullable=False)
    description = db.Column(db.Text)
    category = db.Column(db.String(40))
    emoji = db.Column(db.String(8), default="🌿")
    venue = db.Column(db.String(120))
    area = db.Column(db.String(60))
    city = db.Column(db.String(60), default="Dhaka")
    start_time = db.Column(db.DateTime, nullable=False)
    duration_minutes = db.Column(db.Integer, default=120)
    crowd_size = db.Column(db.String(20))   # tiny / small / medium / large
    noise_level = db.Column(db.Integer, default=2)  # 1-5
    price = db.Column(db.Integer, default=0)  # BDT
    organizer = db.Column(db.String(100))
    quiet_zone = db.Column(db.Boolean, default=False)
    easy_exit = db.Column(db.Boolean, default=True)
    structured = db.Column(db.Boolean, default=False)
    capacity = db.Column(db.Integer, default=30)
    created_by = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="SET NULL"))

    reviews = db.relationship("EventReview", backref="event", cascade="all, delete-orphan")
    reports = db.relationship("UserReport", backref="event", cascade="all, delete-orphan")
    rsvps = db.relationship("RSVP", backref="event", cascade="all, delete-orphan")

    def stats(self):
        r = self.reviews
        if not r:
            return {"comfort": None, "creep": None, "count": 0}
        return {
            "comfort": round(sum(x.comfort_rating for x in r) / len(r), 1),
            "creep": round(sum(x.creep_risk for x in r) / len(r), 1),
            "count": len(r),
        }

    @property
    def active_alerts(self):
        return [x for x in self.reports if x.status != "resolved"]


class EventReview(db.Model):
    __tablename__ = "event_reviews"
    id = db.Column(db.Integer, primary_key=True)
    event_id = db.Column(db.Integer, db.ForeignKey("events.id", ondelete="CASCADE"), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    comfort_rating = db.Column(db.Integer, nullable=False)  # 1-5 (5 = very comfortable)
    creep_risk = db.Column(db.Integer, nullable=False)      # 1-5 (5 = very risky)
    crowd_type = db.Column(db.String(40))
    comment = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    user = db.relationship("User")
    __table_args__ = (db.UniqueConstraint("event_id", "user_id", name="uq_review_once"),)


class UserReport(db.Model):
    """Creep alerts reported by users for an event."""
    __tablename__ = "user_reports"
    id = db.Column(db.Integer, primary_key=True)
    event_id = db.Column(db.Integer, db.ForeignKey("events.id", ondelete="CASCADE"), nullable=False)
    reporter_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="SET NULL"))
    severity = db.Column(db.String(10), default="medium")  # low / medium / high
    description = db.Column(db.Text, nullable=False)
    location_hint = db.Column(db.String(120))
    anonymous = db.Column(db.Boolean, default=True)
    status = db.Column(db.String(12), default="open")  # open / verified / resolved
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    reporter = db.relationship("User")


class RSVP(db.Model):
    __tablename__ = "rsvps"
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    event_id = db.Column(db.Integer, db.ForeignKey("events.id", ondelete="CASCADE"), primary_key=True)
    status = db.Column(db.String(12), default="going")  # going / maybe
    buddy_wanted = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    user = db.relationship("User")


class FakeCall(db.Model):
    __tablename__ = "fake_calls"
    id = db.Column(db.Integer, primary_key=True)
    caller_name = db.Column(db.String(60), nullable=False)
    caller_emoji = db.Column(db.String(8), default="📞")
    category = db.Column(db.String(30))
    script = db.Column(db.Text, nullable=False)
    urgency = db.Column(db.Integer, default=3)


class Template(db.Model):
    """Conversation starter templates."""
    __tablename__ = "templates"
    id = db.Column(db.Integer, primary_key=True)
    category = db.Column(db.String(30), nullable=False)
    text = db.Column(db.Text, nullable=False)
    follow_up = db.Column(db.Text)
    difficulty = db.Column(db.String(10), default="easy")


class ExitExcuse(db.Model):
    __tablename__ = "exit_excuses"
    id = db.Column(db.Integer, primary_key=True)
    category = db.Column(db.String(30))
    text = db.Column(db.Text, nullable=False)
    believability = db.Column(db.Integer, default=4)


class Tip(db.Model):
    """Tools-page suggestions."""
    __tablename__ = "tips"
    id = db.Column(db.Integer, primary_key=True)
    category = db.Column(db.String(40))
    icon = db.Column(db.String(8))
    title = db.Column(db.String(120), nullable=False)
    content = db.Column(db.Text, nullable=False)


class SelfDefense(db.Model):
    __tablename__ = "self_defense"
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(120), nullable=False)
    category = db.Column(db.String(30))  # verbal / body-language / physical / awareness
    icon = db.Column(db.String(8))
    summary = db.Column(db.Text)
    steps = db.Column(db.Text)  # newline separated
    media_url = db.Column(db.String(300))
    duration_minutes = db.Column(db.Integer, default=5)
    difficulty = db.Column(db.String(12), default="beginner")


class Book(db.Model):
    __tablename__ = "books"
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(150), nullable=False)
    author = db.Column(db.String(100))
    category = db.Column(db.String(40))
    year = db.Column(db.Integer)
    pages = db.Column(db.Integer)
    description = db.Column(db.Text)
    takeaways = db.Column(db.Text)  # newline separated
    read_url = db.Column(db.String(300))
    free = db.Column(db.Boolean, default=False)
    cover = db.Column(db.String(60))  # css gradient pair "c1,c2"


class UserBook(db.Model):
    __tablename__ = "user_books"
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    book_id = db.Column(db.Integer, db.ForeignKey("books.id", ondelete="CASCADE"), primary_key=True)
    status = db.Column(db.String(12), default="want")  # want / reading / finished
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    book = db.relationship("Book")


class Skill(db.Model):
    __tablename__ = "skills"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    icon = db.Column(db.String(8))
    category = db.Column(db.String(40))
    difficulty = db.Column(db.String(12))
    summary = db.Column(db.Text)
    details = db.Column(db.Text)
    steps = db.Column(db.Text)  # newline separated
    practice = db.Column(db.Text)
    best_for = db.Column(db.String(150))


class Resource(db.Model):
    """Articles, videos, podcasts, apps and helplines."""
    __tablename__ = "resources"
    id = db.Column(db.Integer, primary_key=True)
    kind = db.Column(db.String(20))  # article / video / podcast / app / helpline / worksheet
    title = db.Column(db.String(150), nullable=False)
    description = db.Column(db.Text)
    url = db.Column(db.String(300))
    icon = db.Column(db.String(8))


class Game(db.Model):
    __tablename__ = "games"
    id = db.Column(db.Integer, primary_key=True)
    slug = db.Column(db.String(40), unique=True, nullable=False)
    title = db.Column(db.String(80), nullable=False)
    icon = db.Column(db.String(8))
    category = db.Column(db.String(30))
    description = db.Column(db.Text)
    instructions = db.Column(db.Text)
    colors = db.Column(db.String(40))


class GameProgress(db.Model):
    __tablename__ = "game_progress"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    game_id = db.Column(db.Integer, db.ForeignKey("games.id", ondelete="CASCADE"), nullable=False)
    score = db.Column(db.Integer, default=0)
    level = db.Column(db.Integer, default=1)
    played_at = db.Column(db.DateTime, default=datetime.utcnow)
    game = db.relationship("Game")
    user = db.relationship("User")


class UserFeedback(db.Model):
    """Post-event reflection."""
    __tablename__ = "user_feedback"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    event_id = db.Column(db.Integer, db.ForeignKey("events.id", ondelete="SET NULL"))
    situation = db.Column(db.String(120))
    comfort_level = db.Column(db.Integer)   # 1-10
    anxiety_before = db.Column(db.Integer)  # 1-10
    anxiety_after = db.Column(db.Integer)   # 1-10
    people_talked = db.Column(db.Integer, default=0)
    used_tools = db.Column(db.String(200))
    went_well = db.Column(db.Text)
    challenges = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    event = db.relationship("Event")


class MoodLog(db.Model):
    __tablename__ = "mood_logs"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    mood = db.Column(db.Integer, nullable=False)    # 1-5
    energy = db.Column(db.Integer, nullable=False)  # 0-100 social battery
    note = db.Column(db.String(280))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class ChatMessage(db.Model):
    __tablename__ = "chat_messages"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="SET NULL"))
    session_key = db.Column(db.String(40), index=True)
    role = db.Column(db.String(10))  # user / model
    content = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class ContactMessage(db.Model):
    __tablename__ = "contact_messages"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80))
    email = db.Column(db.String(120))
    subject = db.Column(db.String(150))
    message = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


__all__ = [n for n in dir() if n[0].isupper()] + ["db", "func", "user_triggers"]
