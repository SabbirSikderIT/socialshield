from datetime import datetime

from flask import Blueprint, abort, flash, redirect, render_template, request, url_for
from flask_login import current_user, login_required
from sqlalchemy import func

from models import RSVP, Event, EventReview, UserReport, db

bp = Blueprint("events", __name__, url_prefix="/events")

CATEGORIES = ["Books & Reading", "Art & Craft", "Nature & Walks", "Games", "Tech & Learning",
              "Music (Soft)", "Food & Cafe", "Wellness", "Volunteering", "Networking (Gentle)",
              "Film & Photography", "Language Exchange"]
CROWDS = ["tiny", "small", "medium", "large"]
EMOJI_BY_CAT = {"Books & Reading": "📚", "Art & Craft": "🎨", "Nature & Walks": "🌳", "Games": "🎲",
                "Tech & Learning": "💻", "Music (Soft)": "🎧", "Food & Cafe": "☕", "Wellness": "🧘",
                "Volunteering": "🤝", "Networking (Gentle)": "🌱", "Film & Photography": "📷",
                "Language Exchange": "🗣️"}


@bp.route("/")
def index():
    a = request.args
    comfort = func.avg(EventReview.comfort_rating).label("comfort")
    creep = func.avg(EventReview.creep_risk).label("creep")
    nrev = func.count(EventReview.id).label("nrev")
    q = (db.session.query(Event, comfort, creep, nrev)
         .outerjoin(EventReview, EventReview.event_id == Event.id)
         .group_by(Event.id))

    if a.get("when", "upcoming") == "upcoming":
        q = q.filter(Event.start_time >= datetime.utcnow())
    if a.get("q"):
        like = f"%{a['q']}%"
        q = q.filter(Event.title.ilike(like) | Event.description.ilike(like) | Event.venue.ilike(like))
    if a.get("category"):
        q = q.filter(Event.category == a["category"])
    if a.get("area"):
        q = q.filter(Event.area == a["area"])
    if a.get("crowd"):
        q = q.filter(Event.crowd_size == a["crowd"])
    if a.get("max_noise"):
        q = q.filter(Event.noise_level <= int(a["max_noise"]))
    if a.get("free"):
        q = q.filter(Event.price == 0)
    if a.get("quiet"):
        q = q.filter(Event.quiet_zone.is_(True))
    if a.get("min_comfort"):
        q = q.having(func.coalesce(func.avg(EventReview.comfort_rating), 0) >= float(a["min_comfort"]))
    if a.get("max_creep"):
        q = q.having(func.coalesce(func.avg(EventReview.creep_risk), 0) <= float(a["max_creep"]))

    sort = a.get("sort", "date")
    if sort == "comfort":
        q = q.order_by(func.coalesce(func.avg(EventReview.comfort_rating), 0).desc())
    elif sort == "safe":
        q = q.order_by(func.coalesce(func.avg(EventReview.creep_risk), 5).asc())
    elif sort == "quiet":
        q = q.order_by(Event.noise_level.asc(), Event.start_time)
    else:
        q = q.order_by(Event.start_time)

    rows = q.all()
    areas = [r[0] for r in db.session.query(Event.area).distinct().order_by(Event.area)]
    alert_counts = dict(db.session.query(UserReport.event_id, func.count(UserReport.id))
                        .filter(UserReport.status != "resolved").group_by(UserReport.event_id).all())
    my_rsvps = set()
    if current_user.is_authenticated:
        my_rsvps = {r.event_id for r in RSVP.query.filter_by(user_id=current_user.id)}
    return render_template("events/index.html", rows=rows, categories=CATEGORIES, crowds=CROWDS,
                           areas=areas, args=a, alert_counts=alert_counts, my_rsvps=my_rsvps)


@bp.route("/<int:event_id>")
def detail(event_id):
    event = db.session.get(Event, event_id) or abort(404)
    my_review = my_rsvp = None
    if current_user.is_authenticated:
        my_review = EventReview.query.filter_by(event_id=event.id, user_id=current_user.id).first()
        my_rsvp = db.session.get(RSVP, (current_user.id, event.id))
    similar = (Event.query.filter(Event.category == event.category, Event.id != event.id,
                                  Event.start_time >= datetime.utcnow())
               .order_by(Event.start_time).limit(3).all())
    going = RSVP.query.filter_by(event_id=event.id).count()
    buddies = RSVP.query.filter_by(event_id=event.id, buddy_wanted=True).count()
    reviews = sorted(event.reviews, key=lambda r: r.created_at, reverse=True)
    reports = sorted(event.reports, key=lambda r: r.created_at, reverse=True)
    return render_template("events/detail.html", event=event, s=event.stats(), my_review=my_review,
                           my_rsvp=my_rsvp, similar=similar, going=going, buddies=buddies,
                           reviews=reviews, reports=reports)


@bp.route("/<int:event_id>/rsvp", methods=["POST"])
@login_required
def rsvp(event_id):
    event = db.session.get(Event, event_id) or abort(404)
    existing = db.session.get(RSVP, (current_user.id, event.id))
    action = request.form.get("action", "going")
    if action == "cancel":
        if existing:
            db.session.delete(existing)
        flash("RSVP cancelled. No pressure, ever 🌿", "info")
    else:
        if not existing:
            existing = RSVP(user_id=current_user.id, event_id=event.id)
            db.session.add(existing)
        existing.status = action if action in ("going", "maybe") else "going"
        existing.buddy_wanted = bool(request.form.get("buddy"))
        flash("You're on the list! Remember: you can leave whenever you want 💜", "success")
    db.session.commit()
    return redirect(url_for("events.detail", event_id=event.id))


def _clamp(v, lo=1, hi=5):
    try:
        return max(lo, min(hi, int(v)))
    except (TypeError, ValueError):
        return lo


@bp.route("/<int:event_id>/review", methods=["POST"])
@login_required
def review(event_id):
    event = db.session.get(Event, event_id) or abort(404)
    r = EventReview.query.filter_by(event_id=event.id, user_id=current_user.id).first()
    if not r:
        r = EventReview(event_id=event.id, user_id=current_user.id)
        db.session.add(r)
    r.comfort_rating = _clamp(request.form.get("comfort"))
    r.creep_risk = _clamp(request.form.get("creep"))
    r.crowd_type = request.form.get("crowd_type", "")[:40]
    r.comment = request.form.get("comment", "").strip()[:1000]
    r.created_at = datetime.utcnow()
    db.session.commit()
    flash("Thanks for rating. You just helped a fellow introvert 🙌", "success")
    return redirect(url_for("events.detail", event_id=event.id) + "#reviews")


@bp.route("/<int:event_id>/report", methods=["POST"])
@login_required
def report(event_id):
    event = db.session.get(Event, event_id) or abort(404)
    desc = request.form.get("description", "").strip()
    if len(desc) < 10:
        flash("Please describe what happened (at least 10 characters).", "error")
    else:
        sev = request.form.get("severity", "medium")
        db.session.add(UserReport(
            event_id=event.id, reporter_id=current_user.id, description=desc[:1500],
            severity=sev if sev in ("low", "medium", "high") else "medium",
            location_hint=request.form.get("location_hint", "")[:120],
            anonymous=bool(request.form.get("anonymous")),
        ))
        db.session.commit()
        flash("Creep alert sent 🚨 Attendees will see a warning. If you're in danger, call 999.", "warning")
    return redirect(url_for("events.detail", event_id=event.id) + "#alerts")


@bp.route("/new", methods=["GET", "POST"])
@login_required
def new():
    if request.method == "POST":
        f = request.form
        try:
            start = datetime.strptime(f["start_time"], "%Y-%m-%dT%H:%M")
        except (KeyError, ValueError):
            flash("Please choose a valid date and time.", "error")
            return render_template("events/new.html", categories=CATEGORIES, crowds=CROWDS, form=f)
        if not f.get("title") or not f.get("venue"):
            flash("Title and venue are required.", "error")
            return render_template("events/new.html", categories=CATEGORIES, crowds=CROWDS, form=f)
        cat = f.get("category") if f.get("category") in CATEGORIES else CATEGORIES[0]
        e = Event(
            title=f["title"][:150], description=f.get("description", ""), category=cat,
            emoji=EMOJI_BY_CAT.get(cat, "🌿"), venue=f["venue"][:120], area=f.get("area", "Dhanmondi")[:60],
            start_time=start, duration_minutes=_clamp(f.get("duration"), 15, 600),
            crowd_size=f.get("crowd_size") if f.get("crowd_size") in CROWDS else "small",
            noise_level=_clamp(f.get("noise_level")), price=max(0, int(f.get("price") or 0)),
            organizer=f.get("organizer") or current_user.username, quiet_zone=bool(f.get("quiet_zone")),
            easy_exit=bool(f.get("easy_exit")), structured=bool(f.get("structured")),
            capacity=_clamp(f.get("capacity"), 2, 5000), created_by=current_user.id,
        )
        db.session.add(e)
        db.session.commit()
        flash("Event published 🎉", "success")
        return redirect(url_for("events.detail", event_id=e.id))
    return render_template("events/new.html", categories=CATEGORIES, crowds=CROWDS, form={})
