# Desk Ride Journeys

A desk-bike companion app for Dan and his son. Each of them has a Magene S3+ cadence sensor (Bluetooth, cadence mode) on the desk bike under his standing desk. The app runs in a browser window beside work.

## What exists

- `app/index.html`: the current single-file app, first built as a Claude artifact. It has:
  - Web Bluetooth connection to the standard Cycling Speed and Cadence service (0x1816, characteristic 0x2A5B). It parses crank revolutions and computes RPM. This is untested until the sensors arrive.
  - A simulator slider for testing without a sensor.
  - Alerts: a chime when cadence stays under the target RPM past a grace period, a different sound when stopped, auto-pause after N minutes stopped, and a "Pause alerts" button.
  - Virtual speed and distance: distance per pedal turn is a setting (default 20 ft).
  - A journey map: pick any two US cities (about 265 built in) on an Albers-projected SVG map. The route is a straight line with miles × 1.2 as a road estimate. It shows highway-style signs (near / next stop / destination), arrival detection, and a list of completed journeys.
  - A logbook: today, this week (weeks start Monday), all time, and a 14-day bar chart.
  - Family mode: "Keep separate" or "Ride together", with a leaderboard and other riders' journeys on the map. This uses the Claude artifact `db`/`user` capabilities (`window.claude.use`), which do not exist outside claude.ai, so a hosted version needs its own backend. The app falls back to localStorage.
- `routes/routes.json`: three curated scenic routes with waypoints, coverage stats, and landmarks with mileposts:
  - Red Rock to the Rim (Sedona to Grand Canyon loop, 227 mi, 99% coverage)
  - Zion to Capitol Reef (214 mi, 95%)
  - Big Sur Coast (Monterey to Cambria, 105 mi, 87%)
- `routes/build-frames.mjs`: gets road geometry from OSRM, then picks one forward-facing Mapillary photo per 0.1 mi. It writes `frames/<id>.json`. It needs the `MAPILLARY_TOKEN` environment variable. Never commit the token.

## Why this is moving out of the Claude artifact

The artifact viewer blocks outside images (so Mapillary photos can't show) and probably blocks Web Bluetooth. A hosted page (GitHub Pages) fixes both.

## Next steps

1. Set up the repo, run `build-frames.mjs`, and commit `frames/*.json`.
2. Host on GitHub Pages and confirm Web Bluetooth works with the Magene sensor in Chrome or Edge.
3. Add the scenic-route mode with a street-view player. It shows the frame for the rider's current 0.1 mi, crossfades between frames, holds the last frame through gaps, and preloads a few frames ahead. Image URLs come from `graph.mapillary.com/<id>?fields=thumb_1024_url` and expire, so fetch them at play time rather than storing them. Show Mapillary attribution.
4. Filter out tilted or low-quality photos (one Big Sur frame pointed at the sky). Candidates: `quality_score`, camera pitch, or a quick image-brightness check.
5. Replace the Claude artifact family sharing with a small backend, such as a Firebase or Supabase free tier.
6. Optional: real road routing for the pick-two-cities mode (OSRM) instead of straight lines.

## Preferences

Plain-English UI copy. Miles by default, plus km on non-US routes.
