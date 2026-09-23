from flask import Blueprint, render_template

from models import ExitExcuse, FakeCall, Template, Tip

bp = Blueprint("tools", __name__, url_prefix="/tools")


@bp.route("/")
def index():
    calls = FakeCall.query.order_by(FakeCall.category, FakeCall.id).all()
    starters = Template.query.order_by(Template.category, Template.id).all()
    excuses = ExitExcuse.query.all()
    tips = Tip.query.order_by(Tip.category, Tip.id).all()
    tip_groups = {}
    for t in tips:
        tip_groups.setdefault(t.category, []).append(t)
    return render_template(
        "tools/index.html",
        calls=[{"id": c.id, "name": c.caller_name, "emoji": c.caller_emoji, "category": c.category,
                "script": c.script, "urgency": c.urgency} for c in calls],
        starters=[{"id": s.id, "category": s.category, "text": s.text, "follow_up": s.follow_up,
                   "difficulty": s.difficulty} for s in starters],
        starter_cats=sorted({s.category for s in starters}),
        excuses=[{"category": e.category, "text": e.text, "believability": e.believability} for e in excuses],
        excuse_cats=sorted({e.category for e in excuses}),
        tip_groups=tip_groups,
    )
