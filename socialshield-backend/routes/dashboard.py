from datetime import datetime, timedelta

from flask import Blueprint, abort, flash, redirect, render_template, request, url_for
from flask_login import current_user, login_required, logout_user
from sqlalchemy import func

from models import (RSVP, Event, Game, GameProgress, MoodLog, Trigger, UserBook,
                    UserFeedback, UserGoal, db)
from routes.auth import AVATARS

bp = Blueprint("dashboard", __name__, url_prefix="/dashboard")


def _int(v, lo, hi, default):
    try:
        return max(lo, min(hi, int(v)))
    except (TypeError, ValueError):
        return default


def suggestions(user, feedback, moods):
    tips = []
    if moods and sum(m.energy for m in moods[:3]) / min(3, len(moods)) < 35:
        tips.append("🔋 Your social battery has been low lately. Plan a cosy recharge day before your next event.")
    if feedback:
        f = feedback[0]
        if f.anxiety_after is not None and f.anxiety_before is not None and f.anxiety_after < f.anxiety_before:
            tips.append("🌱 Your anxiety dropped during your last outing. That's real progress, and worth noticing.")
        if (f.people_talked or 0) == 0:
            tips.append("💬 Try one conversation starter at your next event. Just one is a win.")
    if any(t.name.lower().startswith("loud") for t in user.triggers):
        tips.append("🎧 You marked loud crowds as a trigger. Filter events by noise level ≤ 2 on the Events page.")
    if not user.goals:
        tips.append("🎯 Set a tiny goal, like 'say hi to one new person per event'.")
    tips.append("🧘 Practise the box-breathing tool for 2 minutes before you leave home.")
    return tips[:4]


@bp.route("/")
@login_required
def index():
    uid = current_user.id
    moods = MoodLog.query.filter_by(user_id=uid).order_by(MoodLog.created_at.desc()).limit(30).all()
    feedback = UserFeedback.query.filter_by(user_id=uid).order_by(UserFeedback.created_at.desc()).all()
    rsvps = (db.session.query(RSVP, Event).join(Event, Event.id == RSVP.event_id)
             .filter(RSVP.user_id == uid).order_by(Event.start_time).all())
    upcoming = [(r, e) for r, e in rsvps if e.start_time >= datetime.utcnow()]
    past = [(r, e) for r, e in rsvps if e.start_time < datetime.utcnow()]
    games = (db.session.query(Game.title, Game.icon, Game.slug, func.max(GameProgress.score),
                              func.count(GameProgress.id))
             .join(GameProgress, GameProgress.game_id == Game.id)
             .filter(GameProgress.user_id == uid)
             .group_by(Game.id, Game.title, Game.icon, Game.slug)
             .order_by(func.count(GameProgress.id).desc()).all())
    books = UserBook.query.filter_by(user_id=uid).all()

    chart_moods = list(reversed(moods[:14]))
    chart = {
        "labels": [m.created_at.strftime("%d %b") for m in chart_moods],
        "mood": [m.mood for m in chart_moods],
        "energy": [m.energy for m in chart_moods],
    }
    fb_chart = list(reversed(feedback[:10]))
    anxiety = {
        "labels": [(f.situation or "Outing")[:14] for f in fb_chart],
        "before": [f.anxiety_before for f in fb_chart],
        "after": [f.anxiety_after for f in fb_chart],
    }
    week_ago = datetime.utcnow() - timedelta(days=7)
    stats = {
        "events_attended": len(past),
        "reflections": len(feedback),
        "people_talked": sum(f.people_talked or 0 for f in feedback),
        "games_played": sum(g[4] for g in games),
        "mood_week": round(sum(m.mood for m in moods if m.created_at >= week_ago) /
                           max(1, len([m for m in moods if m.created_at >= week_ago])), 1),
        "books_finished": len([b for b in books if b.status == "finished"]),
    }
    return render_template("dashboard/index.html", moods=moods, feedback=feedback[:6], upcoming=upcoming,
                           past=past, games=games, books=books, chart=chart, anxiety=anxiety,
                           stats=stats, tips=suggestions(current_user, feedback, moods),
                           events=Event.query.order_by(Event.start_time.desc()).limit(60).all())


@bp.route("/mood", methods=["POST"])
@login_required
def mood():
    m = MoodLog(user_id=current_user.id, mood=_int(request.form.get("mood"), 1, 5, 3),
                energy=_int(request.form.get("energy"), 0, 100, 50),
                note=request.form.get("note", "").strip()[:280])
    current_user.social_battery = m.energy
    db.session.add(m)
    db.session.commit()
    flash("Mood logged. Thank you for checking in with yourself 🌷", "success")
    return redirect(url_for("dashboard.index") + "#mood")


@bp.route("/reflection", methods=["POST"])
@login_required
def reflection():
    f = request.form
    event_id = f.get("event_id")
    fb = UserFeedback(
        user_id=current_user.id,
        event_id=int(event_id) if event_id and event_id.isdigit() else None,
        situation=f.get("situation", "").strip()[:120] or "Social outing",
        comfort_level=_int(f.get("comfort_level"), 1, 10, 5),
        anxiety_before=_int(f.get("anxiety_before"), 1, 10, 5),
        anxiety_after=_int(f.get("anxiety_after"), 1, 10, 5),
        people_talked=_int(f.get("people_talked"), 0, 999, 0),
        used_tools=", ".join(f.getlist("used_tools"))[:200],
        went_well=f.get("went_well", "").strip(),
        challenges=f.get("challenges", "").strip(),
    )
    db.session.add(fb)
    for g in current_user.goals:  # a reflection counts toward per-event goals
        if not g.done and "event" in g.title.lower():
            g.progress += 1
    db.session.commit()
    flash("Reflection saved. Every attempt counts 🌱", "success")
    return redirect(url_for("dashboard.index") + "#reflect")


@bp.route("/goal", methods=["POST"])
@login_required
def goal():
    action = request.form.get("action", "add")
    if action == "add":
        title = request.form.get("title", "").strip()
        if title:
            db.session.add(UserGoal(user_id=current_user.id, title=title[:150],
                                    target=_int(request.form.get("target"), 1, 100, 1)))
            flash("Goal added 🎯", "success")
    else:
        g = db.session.get(UserGoal, _int(request.form.get("goal_id"), 0, 10**9, 0))
        if not g or g.user_id != current_user.id:
            abort(404)
        if action == "inc":
            g.progress = min(g.target, g.progress + 1)
            if g.done:
                flash(f"Goal complete: {g.title} 🎉", "success")
        elif action == "dec":
            g.progress = max(0, g.progress - 1)
        elif action == "delete":
            db.session.delete(g)
    db.session.commit()
    return redirect(url_for("dashboard.index") + "#goals")


@bp.route("/profile", methods=["GET", "POST"])
@login_required
def profile():
    triggers = Trigger.query.order_by(Trigger.name).all()
    if request.method == "POST":
        f = request.form
        current_user.full_name = f.get("full_name", "").strip()[:100] or current_user.username
        current_user.city = f.get("city", "").strip()[:60] or "Dhaka"
        current_user.bio = f.get("bio", "").strip()[:500]
        if f.get("introversion_level") in ("low", "medium", "high", "extreme"):
            current_user.introversion_level = f["introversion_level"]
        if f.get("avatar") in AVATARS:
            current_user.avatar = f["avatar"]
        ids = [int(x) for x in f.getlist("triggers") if x.isdigit()]
        current_user.triggers = Trigger.query.filter(Trigger.id.in_(ids)).all() if ids else []
        db.session.commit()
        flash("Profile updated ✨", "success")
        return redirect(url_for("dashboard.profile"))
    return render_template("dashboard/profile.html", triggers=triggers, avatars=AVATARS)


@bp.route("/delete-account", methods=["POST"])
@login_required
def delete_account():
    if not current_user.check_password(request.form.get("password", "")):
        flash("Password incorrect; account not deleted.", "error")
        return redirect(url_for("dashboard.profile"))
    user = current_user._get_current_object()
    logout_user()
    db.session.delete(user)
    db.session.commit()
    flash("Your account and data were deleted. Take care of yourself 💜", "info")
    return redirect(url_for("main.home"))
