# socialshield-frontend

The presentation layer of Social Shield: Jinja2 templates, CSS and vanilla
JavaScript. This folder has no server logic of its own — it's rendered and served
by the Flask app in the sibling [`socialshield-backend/`](../socialshield-backend)
folder, which points its `template_folder`/`static_folder` here.

## Contents

| Path | Purpose |
|---|---|
| `templates/base.html` | Shared page shell: navbar, flash messages, footer, floating chatbot |
| `templates/home.html` | Homepage |
| `templates/auth/` | Login, registration, forgot/verify/reset password |
| `templates/events/` | Event listing, detail, and "suggest an event" pages |
| `templates/tools/` | Fake call, exit excuses, conversation starters, calming tools |
| `templates/resources/` | Books, skills, self-defense tutorials, articles/media |
| `templates/games/` | Game hub and the shared game-player page |
| `templates/dashboard/` | Personal dashboard and profile settings |
| `templates/pages/` | About, FAQ, contact, privacy, terms, search |
| `templates/partials/` | Reusable fragments (chatbot widget, event card) |
| `static/css/style.css` | The entire design system: gradients, glass panels, layout |
| `static/js/main.js` | Shared UI behaviour (nav, flashes, tabs, modals) |
| `static/js/tools.js` | Logic for the fake call / excuses / breathing / battery tools |
| `static/js/chatbot.js` | The floating "Shelly" chat widget |
| `static/js/games/` | A shared mini game engine (`kit.js`) plus all 17 games |
| `design-reference/` | The original single-file homepage mockup, kept for history only |

Nothing in this folder is meant to be opened directly in a browser (aside from
`design-reference/original-homepage.html`, which is a static, disconnected
mockup) — run the backend to serve the real, database-backed site.
