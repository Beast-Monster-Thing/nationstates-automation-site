# NS Issue Bot — Command Console

A GitHub Pages dashboard for the NationStates Issue Bot.

## Site structure

```
ns-bot-site/
├── index.html          # Main page
├── css/
│   └── style.css       # All styles
└── js/
    ├── priorities.js   # Default priorities + export logic
    ├── scoring.js      # CSV parsing and option scoring (mirrors main.py)
    ├── ui.js           # DOM rendering (priority list, issue cards, etc.)
    └── main.js         # Entry point: tabs, upload, events
```

## Hosting on GitHub Pages

1. Push this folder to a GitHub repository.
2. Go to **Settings → Pages**.
3. Set source to `main` branch, root folder (`/`).
4. Your dashboard will be live at `https://<user>.github.io/<repo>/`.

## Usage

1. Open the site.
2. On the **Overview** tab, drag in `ns_results.csv` (processed locally — nothing leaves your browser).
3. Explore issues in the **Issue Scorer** tab.
4. Adjust weights in the **Priorities** tab and export a new `priority.cfg`.

## Bot setup

See the **Setup** tab on the live site, or:

```bash
pip install -r requirements.txt
cp _env.example .env   # fill in NATION, PASSWORD, USER_AGENT
python main.py
```
