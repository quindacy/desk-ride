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

## Status (2026-11-02)

- Repo `quindacy/desk-ride` (public, so GitHub Pages works on the Free plan). Live at https://quindacy.github.io/desk-ride/ (root redirects to `app/`).
- `frames/*.json` are built and committed. The app loads them from `../frames/` and `../routes/routes.json`.
- Scenic routes mode is in the app: route picker next to the two-cities planner; street-photo player (one photo per 0.1 mi, crossfade, holds through gaps, preloads 5 ahead); highway-style landmark signs over the photo and beside the map; Mapillary attribution per photo. Image URLs are fetched at play time.
- The Mapillary token for the app is entered in Settings and kept in that browser's localStorage only (`desk-ride-mly`). It is a client token and is visible to the browser by design; never commit it.
- Scenic ride view: on a scenic route the stats, photo, signs and map fit on one screen. The map is Leaflet + OpenStreetMap tiles (zoom, Follow me, Whole route); clicking the small photo or small map swaps which one is big.
- Driving video: a route in `routes.json` can have a `video` block (YouTube id, channel, and `sync` = [route mile, video second] pairs taken from the video's chapter list and placed on the route with OpenStreetMap coordinates). Inside the synced span the app plays the video muted with the YouTube IFrame API: pedaling plays it, the rider's speed sets the playback rate (0.25x minimum, so it pauses to wait for slow riders), stopping pauses it. Outside the span it falls back to Mapillary photos. A Video/Photos switch sits on the photo. Big Sur uses Adventure Theater's southbound drive (ubexuErXeyI, route miles 7.5 to 90.6), and its landmark mileposts were re-placed from map coordinates.
- `build-frames.mjs` grades photos by camera pitch/roll (from `computed_rotation`) and `quality_score`: good ones win, so-so ones (pitch up to 32°, quality ≥ 0.25) fill in only when nothing better is near, bad ones are never used.

## Next steps

1. Confirm Web Bluetooth works with the Magene sensor in Chrome or Edge, and check the player with a real Mapillary token.
2. Replace the Claude artifact family sharing with a small backend, such as a Firebase or Supabase free tier.
3. Optional: real road routing for the pick-two-cities mode (OSRM) instead of straight lines.

## Preferences

Plain-English UI copy. Miles by default, plus km on non-US routes.
