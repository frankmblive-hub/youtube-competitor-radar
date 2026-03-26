# VidMetrics Competitor Radar

Instantly analyze which videos are outperforming on any YouTube channel this month--no dashboards, no spreadsheets.
Designed to be demo-ready for client presentations within 5 minutes.
Built for fast decision-making without leaving the workflow.

Competitor analysis MVP for YouTube channels. Paste a channel URL or handle and surface the videos outperforming this month.

## Example Use Case

A media agency wants to quickly understand what content is working for a competitor.
Paste the channel -> instantly see top-performing videos this month -> export insights.

## Stack

- React + Vite
- Tailwind CSS
- YouTube Data API v3 via a serverless proxy

## Features

- Channel URL / handle input
- Top Performers This Month
- Sorting and filtering
- Momentum Score (Early Performance Signal) based on views, engagement, and upload velocity
- Simple chart for top performers
- CSV export
- Responsive dashboard
- Mock fallback data when the serverless API is unavailable

## How It Works

- Paste a YouTube channel URL or handle
- Instantly fetch recent videos
- Identify top performers based on views and momentum
- Sort, filter, and export insights

## Product Decisions

- Focused on monthly performance to match real client needs
- Prioritized speed and clarity over deep analytics
- Introduced a Momentum Score to highlight rising videos, not just total views
- Included CSV export for agency workflows

## Tradeoffs

- Used the YouTube API instead of building a full analytics backend, which limits historical depth
- Kept scoring simple for speed and explainability
- Skipped authentication and persistence to keep the MVP demo-ready

## AI-Assisted Workflow

- Used AI to scaffold components and layout
- Accelerated API integration and debugging
- Focused manual effort on product decisions and UX

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local` from `.env.example` and add a YouTube Data API key for the serverless function:

```bash
YOUTUBE_API_KEY=your_key_here
```

3. Run locally:

```bash
npm run dev
```

For live API access in local development, use `vercel dev` so the `/api/youtube` route is available. Plain `npm run dev` still works and will fall back to demo data.

4. Build for production:

```bash
npm run build
```

## Notes

- The app falls back to demo data if the serverless API is unavailable or a live fetch fails.
- Handle resolution uses YouTube search first. Direct `/channel/` URLs are the most reliable input.
- Live YouTube requests are proxied through `api/youtube.js` so the API key stays server-side.

## Suggested Next Steps

- Add historical trending across multiple months
- Cache channel lookups and exports
- Compare multiple competitor channels in one workspace
- Add thumbnail/title pattern analysis
