import logging
import smtplib
import threading
from email.message import EmailMessage

from flask import current_app

log = logging.getLogger(__name__)


def mail_configured():
    cfg = current_app.config
    return bool(cfg["MAIL_USERNAME"] and cfg["MAIL_PASSWORD"])


def _wrap_html(title, body_html):
    return f"""\
<div style="font-family:Segoe UI,Arial,sans-serif;background:linear-gradient(135deg,#fde2e4,#e2ece9,#dfe7fd);padding:32px">
  <div style="max-width:520px;margin:auto;background:rgba(255,255,255,.85);border-radius:24px;padding:32px;color:#3d3553">
    <h2 style="margin-top:0;color:#8e6bbf">🛡️ Social Shield</h2>
    <h3 style="color:#3d3553">{title}</h3>
    {body_html}
    <p style="font-size:12px;color:#8a8199;margin-top:32px">You're receiving this because someone used this address on Social Shield.
    If it wasn't you, you can safely ignore this email.</p>
  </div>
</div>"""


def send_mail(to, subject, text, html=None):
    """Send synchronously. Returns True on success."""
    cfg = current_app.config
    if not mail_configured():
        log.warning("Mail not configured; would have sent '%s' to %s:\n%s", subject, to, text)
        return False
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = f"{cfg['MAIL_SENDER_NAME']} <{cfg['MAIL_USERNAME']}>"
    msg["To"] = to
    msg.set_content(text)
    if html:
        msg.add_alternative(_wrap_html(subject, html), subtype="html")
    try:
        with smtplib.SMTP(cfg["MAIL_SERVER"], cfg["MAIL_PORT"], timeout=15) as s:
            s.starttls()
            s.login(cfg["MAIL_USERNAME"], cfg["MAIL_PASSWORD"])
            s.send_message(msg)
        return True
    except Exception as exc:  # network / auth problems shouldn't crash a request
        log.error("Failed to send mail to %s: %s", to, exc)
        return False


def send_mail_async(to, subject, text, html=None):
    app = current_app._get_current_object()

    def run():
        with app.app_context():
            send_mail(to, subject, text, html)

    threading.Thread(target=run, daemon=True).start()
