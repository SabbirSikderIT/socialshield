import secrets

from flask import Blueprint, jsonify, request, session
from flask_login import current_user

from models import ChatMessage, ExitExcuse, Game, GameProgress, Template, db
from services import chatbot

bp = Blueprint("api", __name__, url_prefix="/api")


@bp.route("/chat", methods=["POST"])
def chat():
    msg = (request.get_json(silent=True) or {}).get("message", "").strip()
    if not msg:
        return jsonify(error="Empty message"), 400
    msg = msg[:1500]
    if "chat_key" not in session:
        session["chat_key"] = secrets.token_hex(10)
    key = session["chat_key"]
    history = [{"role": m.role, "content": m.content} for m in
               ChatMessage.query.filter_by(session_key=key).order_by(ChatMessage.id.desc()).limit(12)][::-1]
    reply, source = chatbot.answer(history, msg)
    uid = current_user.id if current_user.is_authenticated else None
    db.session.add_all([
        ChatMessage(user_id=uid, session_key=key, role="user", content=msg),
        ChatMessage(user_id=uid, session_key=key, role="model", content=reply),
    ])
    db.session.commit()
    return jsonify(reply=reply, source=source)


@bp.route("/chat/reset", methods=["POST"])
def chat_reset():
    session.pop("chat_key", None)
    return jsonify(ok=True)


@bp.route("/score", methods=["POST"])
def score():
    data = request.get_json(silent=True) or {}
    game = Game.query.filter_by(slug=data.get("game", "")).first()
    if not game:
        return jsonify(error="Unknown game"), 404
    if not current_user.is_authenticated:
        return jsonify(saved=False, message="Log in to save your scores")
    try:
        points = max(0, min(10**7, int(data.get("score", 0))))
        level = max(1, min(999, int(data.get("level", 1))))
    except (TypeError, ValueError):
        return jsonify(error="Bad score"), 400
    best = (db.session.query(db.func.max(GameProgress.score))
            .filter_by(user_id=current_user.id, game_id=game.id).scalar()) or 0
    db.session.add(GameProgress(user_id=current_user.id, game_id=game.id, score=points, level=level))
    db.session.commit()
    return jsonify(saved=True, best=max(best, points), new_best=points > best)


@bp.route("/starter")
def starter():
    q = Template.query
    if request.args.get("category"):
        q = q.filter_by(category=request.args["category"])
    t = q.order_by(db.func.random()).first()
    return jsonify(text=t.text if t else "", category=t.category if t else "", follow_up=t.follow_up if t else "")


@bp.route("/excuse")
def excuse():
    q = ExitExcuse.query
    if request.args.get("category"):
        q = q.filter_by(category=request.args["category"])
    e = q.order_by(db.func.random()).first()
    return jsonify(text=e.text if e else "", believability=e.believability if e else 0)


@bp.route("/battery", methods=["POST"])
def battery():
    if not current_user.is_authenticated:
        return jsonify(saved=False)
    try:
        current_user.social_battery = max(0, min(100, int((request.get_json(silent=True) or {}).get("value", 50))))
    except (TypeError, ValueError):
        return jsonify(error="Bad value"), 400
    db.session.commit()
    return jsonify(saved=True, value=current_user.social_battery)
