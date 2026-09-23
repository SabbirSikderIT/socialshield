from datetime import datetime

from flask import Blueprint, flash, redirect, render_template, request, url_for

from models import (Book, ContactMessage, Event, Game, Skill, Template, User,
                    UserReport, db)

bp = Blueprint("main", __name__)


@bp.route("/")
def home():
    upcoming = (Event.query.filter(Event.start_time >= datetime.utcnow())
                .order_by(Event.start_time).limit(24).all())
    # Show the six calmest upcoming events on the home page
    featured = sorted(upcoming, key=lambda e: -(e.stats()["comfort"] or 0))[:6]
    stats = {
        "users": User.query.count(),
        "events": Event.query.count(),
        "starters": Template.query.count(),
        "games": Game.query.count(),
        "books": Book.query.count(),
        "skills": Skill.query.count(),
        "alerts": UserReport.query.count(),
    }
    starter = Template.query.order_by(db.func.random()).first()
    games = Game.query.limit(6).all()
    return render_template("home.html", featured=featured, stats=stats, starter=starter, games=games)


@bp.route("/about")
def about():
    return render_template("pages/about.html")


FAQ = [
    ("What is Social Shield?", "A calm, database-driven toolkit for introverts and socially anxious people: find gentle events, escape awkward moments with fake calls, practise small talk, learn safety skills and play cosy games."),
    ("Is it free?", "Yes. Every tool, resource and game is free. Some events listed have their own entry fees set by the organisers."),
    ("How do comfort and creep-risk ratings work?", "After attending, members rate an event from 1–5 for comfort and 1–5 for creep risk. We show the average so you know what to expect before you go."),
    ("Are creep alerts anonymous?", "By default, yes. Your username is never shown to other members unless you untick the 'anonymous' box."),
    ("How does the fake call work?", "Open Tools → Fake Call, choose a caller and delay, then put your phone face down. A realistic incoming call screen rings with a script you can read out loud."),
    ("I forgot my password. What now?", "Use 'Forgot password' on the login page. We email you a 6-digit code valid for 15 minutes. Enter it and choose a new password."),
    ("Do I need an account to play games?", "No. Anyone can play. Logged-in members also get their scores saved on the leaderboard and their dashboard."),
    ("Who can see my mood logs and reflections?", "Only you. They're private and used to draw your personal progress charts."),
    ("Is this a replacement for therapy?", "No. Social Shield is a supportive toolkit, not medical care. If you're struggling, please reach out to a professional. See the helplines in Resources."),
    ("Can I suggest an event?", "Yes! Logged-in members can add events from the Events page."),
]


@bp.route("/faq")
def faq():
    return render_template("pages/faq.html", faq=FAQ)


@bp.route("/contact", methods=["GET", "POST"])
def contact():
    if request.method == "POST":
        f = request.form
        if not f.get("email") or not f.get("message"):
            flash("Please include your email and a message.", "error")
        else:
            db.session.add(ContactMessage(name=f.get("name", "")[:80], email=f.get("email")[:120],
                                          subject=f.get("subject", "")[:150], message=f.get("message")))
            db.session.commit()
            flash("Thanks! Your message floated safely to our inbox 🕊️", "success")
            return redirect(url_for("main.contact"))
    return render_template("pages/contact.html")


@bp.route("/privacy")
def privacy():
    return render_template("pages/privacy.html")


@bp.route("/terms")
def terms():
    return render_template("pages/terms.html")


@bp.route("/search")
def search():
    q = request.args.get("q", "").strip()
    results = {}
    if q:
        like = f"%{q}%"
        results = {
            "Events": [(e.title, url_for("events.detail", event_id=e.id), e.emoji)
                       for e in Event.query.filter(Event.title.ilike(like) | Event.description.ilike(like)).limit(10)],
            "Books": [(b.title, url_for("resources.book", book_id=b.id), "📚")
                      for b in Book.query.filter(Book.title.ilike(like) | Book.author.ilike(like)).limit(10)],
            "Skills": [(s.name, url_for("resources.skill", skill_id=s.id), s.icon)
                       for s in Skill.query.filter(Skill.name.ilike(like) | Skill.summary.ilike(like)).limit(10)],
            "Games": [(g.title, url_for("games.play", slug=g.slug), g.icon)
                      for g in Game.query.filter(Game.title.ilike(like) | Game.description.ilike(like)).limit(10)],
            "Conversation starters": [(t.text, url_for("tools.index") + "#starters", "💬")
                                      for t in Template.query.filter(Template.text.ilike(like)).limit(10)],
        }
    return render_template("pages/search.html", q=q, results=results)
