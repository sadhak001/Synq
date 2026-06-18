# 🔄 Synq

**Your 2-month goal, broken down into every single day.**

Synq is a smart schedule assistant that takes your big goal — a launch, a business, a fitness target, a career switch — and turns it into a daily, trackable plan. It watches your real progress, tells you honestly whether you're on track, and gives you an AI-generated recovery plan the moment you start slipping.

No sign-up. No backend. No subscription. It's a single static web app that runs entirely in your browser.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🎯 **2-month goal planner** | Set your main goal, start/end dates, and weekly milestones |
| 🗓️ **Daily schedule builder** | Build an hour-by-hour task template with category & priority tags |
| ✅ **Today view** | A live timeline of today's tasks with one-tap completion, a progress ring, and a countdown to your deadline |
| 📝 **Daily work log** | Log what you actually did each day, add notes, and rate your day |
| 📊 **Weekly report** | Completion rate, mood trend, milestone progress, and task-by-task breakdown — navigate week by week |
| 🌙 **Next-day check-in** | Each evening, Synq asks if tomorrow is busy, moderate, or free — and automatically trims your schedule to match |
| 🤖 **AI Coach** | Ask for a recovery plan, a motivation boost, or a schedule optimisation. Powered by the Claude API, fed with your real progress data so the advice is actually relevant |
| 🔥 **Streaks** | A daily streak counter to keep you consistent |
| 💾 **100% local storage** | All your data lives in your browser's `localStorage`. Nothing is sent anywhere except your own questions to the AI Coach |
| 📱 **Responsive** | Works on desktop and mobile browsers out of the box |

---

## 🚀 Getting started

### Option 1 — Just open it
1. [Download the latest release](../../releases) or clone this repo
2. Open `index.html` in any modern browser (Chrome, Edge, Firefox, Safari)
3. That's it — no build step, no `npm install`, no server

```bash
git clone https://github.com/your-username/synq.git
cd synq
open index.html      # macOS
start index.html     # Windows
xdg-open index.html  # Linux
```

### Option 2 — Local server (recommended for development)
Some browsers restrict certain features when opening files directly via `file://`. A tiny local server avoids that:

```bash
# Python 3
python3 -m http.server 8000

# Node
npx serve .
```
Then visit `http://localhost:8000`.

---

## 🗂️ Project structure

```
synq/
├── index.html          # App shell — all pages, modals, structure
├── css/
│   └── style.css        # Full design system (dark theme, responsive)
├── js/
│   ├── state.js          # Data layer — localStorage, CRUD, analytics calculations
│   ├── ui.js              # Rendering layer — turns state into DOM
│   └── app.js              # Controller layer — event handlers, AI Coach, navigation
└── README.md
```

**Architecture at a glance:** a simple three-layer pattern — `state.js` owns the data, `ui.js` renders it, `app.js` wires up events and ties the two together. No frameworks, no build tools, no dependencies.

---

## 🤖 AI Coach setup

The AI Coach tab calls the Anthropic API directly from the browser:

```js
fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'claude-sonnet-4-6',
    max_tokens: 1000,
    messages: [...]
  })
})
```

> ⚠️ **Note:** calling the Anthropic API directly from client-side JavaScript requires the request to include an API key, and doing that in a public-facing static site **exposes your key to anyone who views the page source**. This demo code assumes the call is proxied or run somewhere the key is protected (e.g. via a serverless function, or in an environment like Claude.ai's Artifacts where the API call is handled for you).
>
> For a real public deployment, put a small proxy server between the browser and the Anthropic API so your key never reaches the client. A minimal example:

```js
// server.js (Node/Express example)
app.post('/api/coach', async (req, res) => {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify(req.body)
  });
  res.json(await r.json());
});
```
Then point the front-end `fetch` at `/api/coach` instead of the Anthropic URL directly.

---

## 🛠️ Built with

- Vanilla HTML, CSS, JavaScript — zero dependencies, zero build step
- `localStorage` for persistence
- [Anthropic Claude API](https://docs.claude.com) for the AI Coach
- Google Fonts — Inter & Space Grotesk

---

## 🗺️ Roadmap ideas

- [ ] Export weekly report as PDF
- [ ] Browser notifications for upcoming tasks
- [ ] Drag-to-reorder daily schedule
- [ ] Light theme toggle
- [ ] Import/export data as JSON (backup/restore)
- [ ] Multi-goal support (run several 2-month plans at once)

Contributions and forks welcome — see below.

---

## 🤝 Contributing

1. Fork the repo
2. Create a branch: `git checkout -b feature/your-idea`
3. Commit your changes: `git commit -m 'Add some feature'`
4. Push: `git push origin feature/your-idea`
5. Open a Pull Request

---

## 📄 License

MIT — see [LICENSE](LICENSE). Use it, fork it, ship it.

---

## 🙋 Why "Synq"?

Your goal, your daily actions, and your real progress are usually three things that drift apart — you plan one thing, do another, and only find out how far off course you are weeks later. Synq exists to keep all three in sync, every single day, so the gap never gets a chance to grow.
