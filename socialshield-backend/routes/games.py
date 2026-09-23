from flask import Blueprint, abort, render_template
from flask_login import current_user
from sqlalchemy import func

from models import Game, GameProgress, User, db

bp = Blueprint("games", __name__, url_prefix="/games")


def leaderboard(game_id, limit=10):
    best = func.max(GameProgress.score).label("best")
    return (db.session.query(User.username, User.avatar, best)
            .join(GameProgress, GameProgress.user_id == User.id)
            .filter(GameProgress.game_id == game_id)
            .group_by(User.id, User.username, User.avatar)
            .order_by(best.desc()).limit(limit).all())


@bp.route("/")
def index():
    games = Game.query.order_by(Game.id).all()
    plays = dict(db.session.query(GameProgress.game_id, func.count(GameProgress.id))
                 .group_by(GameProgress.game_id).all())
    my_best = {}
    if current_user.is_authenticated:
        my_best = dict(db.session.query(GameProgress.game_id, func.max(GameProgress.score))
                       .filter(GameProgress.user_id == current_user.id)
                       .group_by(GameProgress.game_id).all())
    return render_template("games/index.html", games=games, plays=plays, my_best=my_best)


@bp.route("/<slug>")
def play(slug):
    game = Game.query.filter_by(slug=slug).first() or abort(404)
    my_best = None
    if current_user.is_authenticated:
        my_best = (db.session.query(func.max(GameProgress.score))
                   .filter_by(user_id=current_user.id, game_id=game.id).scalar())
    others = Game.query.filter(Game.id != game.id).order_by(func.random()).limit(4).all()
    return render_template("games/play.html", game=game, board=leaderboard(game.id),
                           my_best=my_best, others=others)
