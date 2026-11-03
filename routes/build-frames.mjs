// Builds the photo list for each route in routes.json.
// For every 0.1 mile of road it picks the newest Mapillary photo facing the direction of travel.
//
//   MAPILLARY_TOKEN="MLY|..." node build-frames.mjs            (all routes)
//   MAPILLARY_TOKEN="MLY|..." node build-frames.mjs big-sur    (one route)
//
// Writes frames/<route-id>.json: { path, step, frames: [imageId | 0, ...] } and prints a coverage report.
// Needs Node 18+ (built-in fetch). Uses the public OSRM demo server for road geometry: light use only.

import { readFile, writeFile, mkdir } from 'node:fs/promises';

const TOKEN = process.env.MAPILLARY_TOKEN;
if (!TOKEN) { console.error('Set MAPILLARY_TOKEN first.'); process.exit(1); }
const STEP = 161;                 // meters between photos (0.1 mi)
const STRICT_DEG = 50, LOOSE_DEG = 80;
const MI = 1609.34;

const rad = d => d * Math.PI / 180;
const hav = (a, b) => { const dp = rad(b[0] - a[0]), dl = rad(b[1] - a[1]); const h = Math.sin(dp / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dl / 2) ** 2; return 2 * 6371000 * Math.asin(Math.sqrt(h)); };
const brg = (a, b) => { const p1 = rad(a[0]), p2 = rad(b[0]), dl = rad(b[1] - a[1]); return (Math.atan2(Math.sin(dl) * Math.cos(p2), Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl)) * 180 / Math.PI + 360) % 360; };
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function road(waypoints) {
  const q = waypoints.map(w => `${w.lon},${w.lat}`).join(';');
  const j = await (await fetch(`https://router.project-osrm.org/route/v1/driving/${q}?overview=full&geometries=geojson`)).json();
  if (j.code !== 'Ok') throw new Error('Routing failed: ' + j.code);
  return j.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
}

function sample(coords) {
  const out = []; let acc = 0, next = 0;
  for (let i = 1; i < coords.length; i++) {
    const a = coords[i - 1], b = coords[i], d = hav(a, b); if (!d) continue; const h = brg(a, b);
    while (next <= acc + d) { const f = (next - acc) / d; out.push({ lat: a[0] + (b[0] - a[0]) * f, lon: a[1] + (b[1] - a[1]) * f, h }); next += STEP; }
    acc += d;
  }
  return out;
}

async function photoAt(p, maxDeg, radius) {
  const url = `https://graph.mapillary.com/images?access_token=${encodeURIComponent(TOKEN)}&fields=id,computed_compass_angle,compass_angle,captured_at,is_pano&lat=${p.lat.toFixed(6)}&lng=${p.lon.toFixed(6)}&radius=${radius}&limit=50`;
  for (let tries = 0; tries < 3; tries++) {
    try {
      const r = await fetch(url);
      if (r.status === 429) { await sleep(1500); continue; }
      const j = await r.json();
      const c = (j.data || []).map(x => { const a = x.computed_compass_angle ?? x.compass_angle; return { ...x, diff: a == null ? 180 : Math.abs(((a - p.h) + 540) % 360 - 180) }; })
        .filter(x => x.is_pano || x.diff <= maxDeg);
      if (!c.length) return null;
      c.sort((a, b) => (b.captured_at || 0) - (a.captured_at || 0));
      return c[0];
    } catch { await sleep(800); }
  }
  return null;
}

async function pool(items, n, fn) { let i = 0; await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const k = i++; await fn(items[k], k); } })); }

async function build(route) {
  const coords = await road(route.waypoints);
  const S = sample(coords);
  const res = new Array(S.length).fill(null);
  await pool(S, 20, async (p, k) => { res[k] = await photoAt(p, STRICT_DEG, 40); });
  const missing = res.map((r, k) => r ? -1 : k).filter(k => k >= 0);
  await pool(missing, 16, async k => { res[k] = await photoAt(S[k], LOOSE_DEG, 50); });   // second, looser pass for gaps

  let gap = 0, longest = 0; for (const r of res) { if (!r) { gap++; longest = Math.max(longest, gap); } else gap = 0; }
  const years = res.filter(Boolean).map(r => new Date(r.captured_at).getFullYear()).sort((a, b) => a - b);
  const report = {
    miles: +(S.length * STEP / MI).toFixed(1),
    percent: +(res.filter(Boolean).length / res.length * 100).toFixed(1),
    longestGapMi: +(longest * STEP / MI).toFixed(1),
    medianPhotoYear: years[years.length >> 1]
  };
  const path = S.filter((_, k) => k % 5 === 0).map(p => [+p.lat.toFixed(5), +p.lon.toFixed(5)]);
  await mkdir('frames', { recursive: true });
  await writeFile(`frames/${route.id}.json`, JSON.stringify({ id: route.id, step: STEP, path, frames: res.map(r => r ? r.id : 0) }));
  return report;
}

const { routes } = JSON.parse(await readFile(new URL('./routes.json', import.meta.url)));
const only = process.argv[2];
for (const r of routes.filter(r => !only || r.id === only)) {
  process.stdout.write(`${r.name}... `);
  console.log(await build(r));
}
