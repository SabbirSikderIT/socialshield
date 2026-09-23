from flask import Blueprint, abort, flash, redirect, render_template, request, url_for
from flask_login import current_user, login_required

from models import Book, Resource, SelfDefense, Skill, UserBook, db

bp = Blueprint("resources", __name__, url_prefix="/resources")


@bp.route("/")
def index():
    books = Book.query.order_by(Book.category, Book.title).all()
    skills = Skill.query.order_by(Skill.category, Skill.name).all()
    defense = SelfDefense.query.order_by(SelfDefense.category, SelfDefense.id).all()
    resources = Resource.query.order_by(Resource.kind, Resource.id).all()
    res_groups = {}
    for r in resources:
        res_groups.setdefault(r.kind, []).append(r)
    my_books = {}
    if current_user.is_authenticated:
        my_books = {ub.book_id: ub.status for ub in UserBook.query.filter_by(user_id=current_user.id)}
    return render_template(
        "resources/index.html", books=books, skills=skills, defense=defense, res_groups=res_groups,
        book_cats=sorted({b.category for b in books}), skill_cats=sorted({s.category for s in skills}),
        defense_cats=sorted({d.category for d in defense}), my_books=my_books,
    )


@bp.route("/book/<int:book_id>")
def book(book_id):
    b = db.session.get(Book, book_id) or abort(404)
    status = None
    if current_user.is_authenticated:
        ub = db.session.get(UserBook, (current_user.id, b.id))
        status = ub.status if ub else None
    more = Book.query.filter(Book.category == b.category, Book.id != b.id).limit(4).all()
    return render_template("resources/book.html", b=b, status=status, more=more)


@bp.route("/book/<int:book_id>/status", methods=["POST"])
@login_required
def book_status(book_id):
    b = db.session.get(Book, book_id) or abort(404)
    status = request.form.get("status")
    ub = db.session.get(UserBook, (current_user.id, b.id))
    if status == "remove":
        if ub:
            db.session.delete(ub)
        flash("Removed from your reading list.", "info")
    elif status in ("want", "reading", "finished"):
        if not ub:
            ub = UserBook(user_id=current_user.id, book_id=b.id)
            db.session.add(ub)
        ub.status = status
        flash({"want": "Added to Want to Read 📌", "reading": "Happy reading 📖",
               "finished": "Finished! Proud of you 🎉"}[status], "success")
    db.session.commit()
    return redirect(request.referrer or url_for("resources.book", book_id=b.id))


@bp.route("/skill/<int:skill_id>")
def skill(skill_id):
    s = db.session.get(Skill, skill_id) or abort(404)
    related = Skill.query.filter(Skill.category == s.category, Skill.id != s.id).limit(4).all()
    return render_template("resources/skill.html", s=s, related=related)


@bp.route("/defense/<int:item_id>")
def defense(item_id):
    d = db.session.get(SelfDefense, item_id) or abort(404)
    related = SelfDefense.query.filter(SelfDefense.category == d.category, SelfDefense.id != d.id).limit(3).all()
    return render_template("resources/defense.html", d=d, related=related)
