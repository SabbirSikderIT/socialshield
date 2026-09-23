import re
import secrets
from datetime import datetime, timedelta
from urllib.parse import urlparse

from flask import Blueprint, current_app, flash, redirect, render_template, request, session, url_for
from flask_login import current_user, login_required, login_user, logout_user
from werkzeug.security import check_password_hash, generate_password_hash

from models import PasswordReset, Trigger, User, UserGoal, db
from services.mailer import mail_configured, send_mail, send_mail_async

bp = Blueprint("auth", __name__)

USERNAME_RE = re.compile(r"^[A-Za-z0-9_.]{3,30}$")
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
AVATARS = ["🌸", "🌿", "🍄", "🐢", "🦉", "🐱", "🌙", "☁️", "🦊", "🐼", "🌻", "💭"]


def password_problems(pw):
    probs = []
    if len(pw) < 8:
        probs.append("at least 8 characters")
    if not re.search(r"[A-Za-z]", pw) or not re.search(r"\d", pw):
        probs.append("both letters and numbers")
    return probs


def safe_next(target):
    if target and not urlparse(target).netloc and target.startswith("/"):
        return target
    return url_for("dashboard.index")


@bp.route("/register", methods=["GET", "POST"])
def register():
    if current_user.is_authenticated:
        return redirect(url_for("dashboard.index"))
    triggers = Trigger.query.order_by(Trigger.name).all()
    form = request.form
    if request.method == "POST":
        username = form.get("username", "").strip()
        email = form.get("email", "").strip().lower()
        pw = form.get("password", "")
        errors = []
        if not USERNAME_RE.match(username):
            errors.append("Username must be 3–30 letters, numbers, dots or underscores.")
        if not EMAIL_RE.match(email):
            errors.append("Please enter a valid email.")
        probs = password_problems(pw)
        if probs:
            errors.append("Password needs " + " and ".join(probs) + ".")
        if pw != form.get("confirm", ""):
            errors.append("Passwords don't match.")
        if User.query.filter(db.func.lower(User.username) == username.lower()).first():
            errors.append("That username is taken.")
        if User.query.filter_by(email=email).first():
            errors.append("An account with this email already exists.")
        if errors:
            for e in errors:
                flash(e, "error")
            return render_template("auth/register.html", triggers=triggers, avatars=AVATARS, form=form)

        user = User(
            username=username, email=email,
            full_name=form.get("full_name", "").strip() or username,
            introversion_level=form.get("introversion_level", "medium"),
            city=form.get("city", "Dhaka").strip() or "Dhaka",
            avatar=form.get("avatar") if form.get("avatar") in AVATARS else "🌸",
        )
        user.set_password(pw)
        ids = [int(x) for x in form.getlist("triggers") if x.isdigit()]
        if ids:
            user.triggers = Trigger.query.filter(Trigger.id.in_(ids)).all()
        goal = form.get("goal", "").strip()
        if goal:
            user.goals.append(UserGoal(title=goal[:150], target=int(form.get("goal_target") or 1)))
        db.session.add(user)
        db.session.commit()
        login_user(user)
        send_mail_async(
            email, "Welcome to Social Shield 🌿",
            f"Hi {user.full_name},\n\nWelcome to Social Shield — your quiet corner of the internet.\n"
            "Explore calm events, fake-call tools, conversation starters and cosy games.\n\nTake it slow 💜",
            f"<p>Hi <b>{user.full_name}</b>,</p><p>Welcome to your quiet corner of the internet 🌸.</p>"
            "<p>Explore calm events, fake-call tools, conversation starters and cosy games — at your own pace.</p>",
        )
        flash(f"Welcome aboard, {user.full_name}! Your shield is up 🛡️", "success")
        return redirect(url_for("dashboard.index"))
    return render_template("auth/register.html", triggers=triggers, avatars=AVATARS, form={})


@bp.route("/login", methods=["GET", "POST"])
def login():
    if current_user.is_authenticated:
        return redirect(url_for("dashboard.index"))
    if request.method == "POST":
        ident = request.form.get("identifier", "").strip()
        pw = request.form.get("password", "")
        user = User.query.filter(
            (db.func.lower(User.email) == ident.lower()) | (db.func.lower(User.username) == ident.lower())
        ).first()
        if user and user.check_password(pw):
            login_user(user, remember=bool(request.form.get("remember")))
            flash(f"Welcome back, {user.full_name or user.username} {user.avatar}", "success")
            return redirect(safe_next(request.args.get("next")))
        flash("Incorrect username/email or password.", "error")
    return render_template("auth/login.html")


@bp.route("/logout")
@login_required
def logout():
    logout_user()
    flash("You've logged out. Enjoy the quiet 🌙", "info")
    return redirect(url_for("main.home"))


# ---------------- Password recovery ----------------

@bp.route("/forgot-password", methods=["GET", "POST"])
def forgot_password():
    if request.method == "POST":
        email = request.form.get("email", "").strip().lower()
        user = User.query.filter_by(email=email).first()
        if user:
            PasswordReset.query.filter_by(user_id=user.id, used=False).update({"used": True})
            code = f"{secrets.randbelow(1_000_000):06d}"
            minutes = current_app.config["RESET_CODE_MINUTES"]
            db.session.add(PasswordReset(
                user_id=user.id, code_hash=generate_password_hash(code),
                expires_at=datetime.utcnow() + timedelta(minutes=minutes),
            ))
            db.session.commit()
            sent = send_mail(
                email, "Your Social Shield reset code",
                f"Your password reset code is {code}. It expires in {minutes} minutes.",
                f"<p>Use this code to reset your password:</p>"
                f"<p style='font-size:32px;letter-spacing:8px;font-weight:bold;color:#8e6bbf'>{code}</p>"
                f"<p>It expires in {minutes} minutes.</p>",
            )
            if not sent and current_app.config["DEV_SHOW_RESET_CODE"]:
                reason = "Email isn't configured" if not mail_configured() else "Email sending failed"
                flash(f"{reason}, so here is your dev reset code: {code}", "warning")
        session["reset_email"] = email
        flash("If that email is registered, a 6-digit code is on its way 📬", "info")
        return redirect(url_for("auth.verify_code"))
    return render_template("auth/forgot.html")


@bp.route("/verify-code", methods=["GET", "POST"])
def verify_code():
    email = session.get("reset_email")
    if not email:
        return redirect(url_for("auth.forgot_password"))
    if request.method == "POST":
        code = re.sub(r"\D", "", request.form.get("code", ""))
        user = User.query.filter_by(email=email).first()
        reset = None
        if user:
            reset = (PasswordReset.query.filter_by(user_id=user.id, used=False)
                     .order_by(PasswordReset.created_at.desc()).first())
        if not reset or reset.expires_at < datetime.utcnow():
            flash("That code has expired. Please request a new one.", "error")
            return redirect(url_for("auth.forgot_password"))
        if reset.attempts >= 5:
            reset.used = True
            db.session.commit()
            flash("Too many attempts. Please request a new code.", "error")
            return redirect(url_for("auth.forgot_password"))
        if check_password_hash(reset.code_hash, code):
            session["reset_id"] = reset.id
            return redirect(url_for("auth.reset_password"))
        reset.attempts += 1
        db.session.commit()
        flash(f"Incorrect code. {5 - reset.attempts} attempts left.", "error")
    return render_template("auth/verify.html", email=email)


@bp.route("/reset-password", methods=["GET", "POST"])
def reset_password():
    rid = session.get("reset_id")
    reset = db.session.get(PasswordReset, rid) if rid else None
    if not reset or reset.used or reset.expires_at < datetime.utcnow():
        session.pop("reset_id", None)
        flash("Your reset session expired. Please start again.", "error")
        return redirect(url_for("auth.forgot_password"))
    if request.method == "POST":
        pw = request.form.get("password", "")
        probs = password_problems(pw)
        if probs:
            flash("Password needs " + " and ".join(probs) + ".", "error")
        elif pw != request.form.get("confirm", ""):
            flash("Passwords don't match.", "error")
        else:
            reset.user.set_password(pw)
            reset.used = True
            db.session.commit()
            session.pop("reset_id", None)
            session.pop("reset_email", None)
            send_mail_async(reset.user.email, "Your password was changed",
                            "Your Social Shield password was just changed. If this wasn't you, reset it immediately.",
                            "<p>Your password was just changed. If this wasn't you, please reset it immediately.</p>")
            flash("Password updated! You can log in now 🔐", "success")
            return redirect(url_for("auth.login"))
    return render_template("auth/reset.html")


@bp.route("/change-password", methods=["POST"])
@login_required
def change_password():
    if not current_user.check_password(request.form.get("current", "")):
        flash("Current password is incorrect.", "error")
    else:
        pw = request.form.get("password", "")
        probs = password_problems(pw)
        if probs:
            flash("Password needs " + " and ".join(probs) + ".", "error")
        elif pw != request.form.get("confirm", ""):
            flash("Passwords don't match.", "error")
        else:
            current_user.set_password(pw)
            db.session.commit()
            flash("Password changed 🔐", "success")
    return redirect(url_for("dashboard.profile"))
