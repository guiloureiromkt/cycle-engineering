# daily · routine

Every weekday morning this routine reads `data/sales.csv` and writes two files: `reports/daily.md` (three lines the partners read: yesterday's total, the best-selling item, one sentence of cause) and `data/summary.json` (`{"date": "...", "total": <number>, "top_item": "..."}`, read by the dashboard), and regenerates `scripts/summarize.py`, the small script the dashboard imports to recompute the total from the CSV (a function `total(path)` returning the sum of `amount`). It commits nothing and deploys nothing.
