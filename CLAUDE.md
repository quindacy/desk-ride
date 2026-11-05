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
  - Family mode: "Keep separate" or "Ride together", with a leaderboard and other riders' journeys on the map (backend: see Status).
- `routes/routes.json`: curated scenic routes (seven as of 2026-11-04; the first three are below) with waypoints, coverage stats, and landmarks with mileposts:
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
- Driving video: a route in `routes.json` can have `videos` (a list) or the older single `video` block. Each entry has a YouTube id, channel, from/to names, and `sync` = [route mile, video second] pairs. Sync points come from the video's chapter list, or from YouTube storyboard frames when there are no chapters, and are placed on the route with OpenStreetMap coordinates. A video that skips part of the route (a side loop, or a stop) is listed twice with the same id, so the gap shows photos. Inside a video's span the app plays it muted with the YouTube IFrame API: pedaling plays it, the rider's speed sets the playback rate (0.25x minimum, so it pauses to wait for slow riders), stopping pauses it. Between and outside videos it falls back to Mapillary photos. A Video/Photos switch sits on the photo. Route cards offer "Ride with video" (a journey with `from`/`to` route miles from the first video's start to the last one's end) or "Full route". Videos now:
  - Big Sur: Adventure Theater (ubexuErXeyI), route miles 7.5 to 90.6.
  - Zion to Capitol Reef: AdventureEveryDay Zion to Bryce (th4ykU59Np8), then World of Drives Scenic Byway 12 (-6Ycfg41XjE), miles 7.7 to 213.6. The Bryce Lodge side trip (82.4 to 92.5) shows photos.
  - Red Rock to the Rim (now via US 180, 220 mi): AdventureEveryDay Oak Creek Canyon (XhKSbMF6Qm8), then Asphalt Cruiser POV Flagstaff to the South Rim and Desert View (psViPelEbLo) and Desert View to Flagstaff (axc_Mq4H3Qg). Downtown Flagstaff (26 to 32), the Village loop (107.5 to 111) and the Cameron trip (165.8 to 168.9) show photos.
  - Florida Keys (82 mi): World of Drives Overseas Highway (kMiIE0sZb90), Islamorada to the Southernmost Point.
  - Acadia Park Loop (23 mi): World of Drives (W94fTllBU7g), Hulls Cove to the Cadillac Mountain summit.
  - Smoky Mountains (39 mi): By Any Route (xIx53MWI16g), park entrance up Newfound Gap Road and back to Gatlinburg (split at the stop at the gap).
  - Going-to-the-Sun Road (50 mi): AdventureEveryDay (nte4LCVh7-E). The video is two drives in the wrong order, so it is listed twice: 1:01:10 onward covers West Glacier to The Loop, the start covers The Loop to St. Mary.
- `build-frames.mjs` grades photos by camera pitch/roll (from `computed_rotation`) and `quality_score`: good ones win, so-so ones (pitch up to 32°, quality ≥ 0.25) fill in only when nothing better is near, bad ones are never used.

- Bluetooth: the sensor sleeps when the pedals stop. Every connection step has a time limit (Windows can leave `gatt.connect()` hanging) and the app keeps retrying every few seconds, so it should reconnect by itself once pedaling resumes. Not yet confirmed on the real sensor.
- Pause ride button (header; shows once you start pedaling or after a sensor has been connected, even while it sleeps): saves your spot, disconnects the sensor without the reconnect loop, stops alerts and the video, and shows a session summary with a Resume ride button.

- Family sharing (2026-11-04): Firebase project `desk-ride-quindacy` (free Spark plan, Firestore in nam5, created with the Firebase CLI logged in as the family Google account). Riders are stored at `families/{familyCode}/riders/{riderId}`. The family code is a 20-character random string made with "Make a new code" in the Family ride panel and kept in each browser's localStorage (`desk-ride-family`); the rider id is random per browser (`desk-ride-rider`). Rules in `firebase/firestore.rules` (deploy with `firebase deploy --only firestore:rules` from `firebase/`) allow read/write only with a code of 16+ characters, validate every field, and block listing families. Never commit a family code. The Firebase web config in the app is public by design. Only the leaderboard row is shared; each rider's full logbook still lives in their own browser.
- Family challenge (2026-11-05): one per family at `families/{code}/challenge/current` (`kind` race or miles, `route`, `start`/`end` day keys). Miles count from midnight on the start day by each computer's clock, summed from the local day log, so nobody has to start at the same moment. Race: on the start day the app switches each joined rider's journey to the route's video stretch (saving their own journey in `S.chal.prev`, restored with "Back to your own journey" without the race miles); first to the end wins. Most miles: start day through last day. Riders share `cId`, `cMi`, `cDone` (finish time). Other riders on the same scenic route show as named dots on the street map.
- Calories in the top bar: an estimate from cadence and the rider's weight setting (MET = 1.5 + 0.04 × RPM, capped at 7).
- Scenic routes are just their video stretch: one "Ride this route" button per card, and miles, landmarks and signs count from where the video starts.

## Next steps

1. Confirm Web Bluetooth works with the Magene sensor in Chrome or Edge, and check the player with a real Mapillary token.
2. Confirm family sharing between Dad's and Derek's computers.
3. Optional: real road routing for the pick-two-cities mode (OSRM) instead of straight lines.

## Preferences

Plain-English UI copy. Miles by default, plus km on non-US routes.
