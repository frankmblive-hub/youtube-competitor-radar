# Build Breakdown

## Approach

I treated the brief as an ambiguous founder request and optimized for a demoable SaaS-style MVP:

- Built a polished single-page dashboard from scratch in React
- Prioritized the core loop first: paste channel, fetch videos, rank winners
- Added product polish that helps during a client demo: momentum scoring, quick chart, CSV export, clear empty/demo states

## Tools Used

- React and Vite for fast UI iteration
- Tailwind CSS for rapid styling
- YouTube Data API v3 for live data
- AI-assisted coding workflow for scaffolding, copy iteration, and implementation acceleration

## Tradeoffs

- The app currently calls the YouTube API from the client for speed of delivery. Production should proxy these requests through a serverless function.
- Handle and custom URL resolution use search heuristics. `/channel/{id}` URLs are more reliable than all other formats.
- The built-in demo mode keeps the product presentable even without API configuration, but obviously does not replace live analytics.

## What I Would Add In V2

- Multi-channel comparison
- Thumbnail and title pattern clustering
- Time-series performance trends
- Saved workspaces and exports to Sheets or Notion
- Benchmarks like median views per upload and outlier detection
