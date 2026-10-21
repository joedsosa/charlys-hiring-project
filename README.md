# HireFlow — AI-assisted mass hiring (prototype)

A clickable prototype of a hiring platform for high-volume roles, with three portals:

- **Candidate portal** (`candidate.html`): browse and filter open positions, apply with basic info, a CV and a short voice note, answer a quick role-play question, and follow each application with a stage tracker.
- **Client portal** (`client.html`): post a position (title, requirements, schedule, headcount) and review an AI-ranked shortlist of approved candidates.
- **Admin dashboard** (`admin.html`): KPIs, a kanban pipeline (Applied → AI Screened → Role-play → Interview → Approved / Declined), and a candidate detail panel with AI score, 3-line summary, score breakdown, voice-note transcript and Approve / Decline actions.

> All companies, people and data are fictional. "HireFlow" is a sample brand.

## Try the 2-minute demo

1. **Client portal → Post a position** → “Fill sample” → *Publish position*.
2. **Candidate portal** → *Apply now* on the new position → “Fill sample” (or record a real voice note) → *Submit application*.
3. **Admin dashboard → Pipeline**: the new applicant appears in *Applied* with the AI analysis running; a few seconds later it moves to *AI Screened* with its score and summary. Open the card to see the details.
4. Click **Approve**.
5. **Client portal → View shortlist** shows the candidate, and **Candidate portal → My applications** shows the updated tracker.

Tip: keep the admin dashboard open in a second tab; it updates live.
Use **Reset demo data** in the top banner to start over.

## How it works

- Static site: HTML + CSS + vanilla JavaScript, no build step, no backend.
- Demo state lives in the browser's `localStorage` (`assets/js/store.js`), so the flow works across pages and tabs.
- The "AI" is simulated in the browser (`assets/js/ai.js`): scores and summaries are derived from the application with simple, explainable rules. `AI.analyze(candidate, position)` returns a Promise, so a real screening API can be plugged in by switching `AI.provider` to `'api'` and pointing it at a backend endpoint (never call a model provider from the browser with a secret key).
- Voice notes are recorded with `MediaRecorder` when the browser allows it, or uploaded as a file. Only file names and durations are stored in the demo.

## Project structure

```
index.html            Landing page
candidate.html        Candidate portal
client.html           Client portal
admin.html            Admin dashboard
assets/css/styles.css Styles (light and dark themes)
assets/js/config.js   Brand name and settings (change the brand here)
assets/js/data.js     Mock positions and candidates
assets/js/store.js    State + localStorage
assets/js/ai.js       Simulated AI screening
assets/js/common.js   Shared layout and UI helpers
assets/js/*.js        Page logic
```

## Run locally

Any static file server works, for example:

```
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Publish on GitHub Pages

Settings → Pages → *Deploy from a branch* → pick the branch and the folder that contains `index.html`. All paths are relative, so it works under `username.github.io/repository/`.

---

Prototype by Joed Sosa · Software Engineer
