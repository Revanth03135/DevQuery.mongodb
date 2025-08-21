This project includes a simple Analytics demo page (analytics.html) and backend demo endpoints.

Frontend:
- Open analytics.html in the browser alongside the running backend (or via the project's static server).
- The page calls /api/analytics/overview (GET) and /api/analytics/query (POST) via the frontend API client.

Backend (auth-backend):
- GET /api/analytics/overview  -> returns demo overview JSON (months, monthly_signups, revenue_monthly, regions, daily)
- POST /api/analytics/query    -> accepts { metric: 'monthly_signups'|'daily_active'|'region_breakdown'|'revenue_monthly' } and returns { labels, values }

Notes:
- These endpoints are protected by auth middleware in the server; ensure your devquery_token is set in localStorage (or remove protect middleware for local testing).
- The frontend uses Chart.js if available as global `Chart`. A small `static/chart.umd.js` stub is present for CSP compatibility; replace it with the real Chart.js UMD bundle for full visuals.
