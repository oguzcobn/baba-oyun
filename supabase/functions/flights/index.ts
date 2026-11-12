// BABA. Seyahat — Antalya (AYT) kalkışlı en ucuz uçuş fiyatları. Supabase Edge Function, ücretsiz.
// Veri: Travelpayouts / Aviasales Data API (ücretsiz üyelik). Fiyatlar son 2–7 günde yapılan aramalardan gelir, yaklaşıktır.
// Kurulum: Edge Functions → Deploy a new function → Via Editor → adı: flights → bu dosyayı yapıştır → Deploy,
//          ayarlarda "Verify JWT" KAPALI. Edge Functions → Secrets → TP_TOKEN = Travelpayouts API anahtarın.
const TOKEN = Deno.env.get('TP_TOKEN') || '';
const ORIGIN = 'AYT';
const FAV = ['TZX', 'IST', 'SAW', 'EDI', 'GLA', 'AMS', 'DUS', 'ZRH', 'LON', 'BSL'];
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'content-type, apikey, authorization, x-client-info', 'Access-Control-Allow-Methods': 'GET, OPTIONS' };
const json = (d: unknown, s = 200, cache = 0) => new Response(JSON.stringify(d), { status: s, headers: { ...CORS, 'Content-Type': 'application/json', ...(cache ? { 'Cache-Control': `public, max-age=${cache}` } : {}) } });

type Row = { origin: string; destination: string; price: number; airline: string; flight_number: string | number; departure_at: string; transfers: number; duration?: number; link?: string };
const mem = new Map<string, { at: number; data: unknown }>();
let cities: Map<string, { n: string; c: string }> | null = null;

async function tp(params: Record<string, string>): Promise<Row[]> {
  const q = new URLSearchParams({ origin: ORIGIN, sorting: 'price', direct: 'false', currency: 'try', one_way: 'true', page: '1', token: TOKEN, ...params });
  const r = await fetch('https://api.travelpayouts.com/aviasales/v3/prices_for_dates?' + q, { signal: AbortSignal.timeout(9000) });
  if (r.status === 401) throw new Error('bad-token');
  const j = await r.json().catch(() => ({}));
  return j && j.success && Array.isArray(j.data) ? j.data : [];
}
async function cityNames() {
  if (cities) return cities;
  try {
    const r = await fetch('https://api.travelpayouts.com/data/en/cities.json', { signal: AbortSignal.timeout(9000) });
    const a = await r.json();
    cities = new Map(a.map((x: { code: string; name: string; country_code: string }) => [x.code, { n: x.name, c: x.country_code }]));
  } catch { cities = new Map(); }
  return cities;
}
const slim = (x: Row, names: Map<string, { n: string; c: string }>) => ({
  to: x.destination, name: (names.get(x.destination) || {}).n || x.destination, cc: (names.get(x.destination) || {}).c || '',
  price: Math.round(x.price), at: x.departure_at, transfers: x.transfers, airline: x.airline, dur: x.duration || 0,
  link: x.link ? 'https://www.aviasales.com' + x.link + (x.link.includes('?') ? '&' : '?') + 'currency=try' : '',
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'GET') return json({ error: 'method' }, 405);
  if (!TOKEN) return json({ error: 'no-token' });
  const m = new URL(req.url).searchParams.get('m') || new Date().toISOString().slice(0, 7);
  if (!/^20\d\d-(0[1-9]|1[0-2])$/.test(m)) return json({ error: 'bad month' }, 400);
  const hit = mem.get(m);
  if (hit && Date.now() - hit.at < 3 * 3600e3) return json(hit.data, 200, 1800);
  try {
    const names = await cityNames();
    const [fav, any] = await Promise.all([
      Promise.all(FAV.map((d) => tp({ destination: d, departure_at: m, limit: '1', unique: 'false' }).catch(() => []))),
      tp({ departure_at: m, limit: '40', unique: 'true' }),
    ]);
    const data = {
      ok: true, month: m, currency: 'TRY', at: new Date().toISOString(),
      fav: Object.fromEntries(FAV.map((d, i) => [d, fav[i][0] ? slim(fav[i][0], names) : null])),
      any: any.filter((x) => x.destination !== ORIGIN).slice(0, 24).map((x) => slim(x, names)),
    };
    mem.set(m, { at: Date.now(), data });
    return json(data, 200, 1800);
  } catch (e) {
    return json({ error: String((e as Error).message || e) }, 502);
  }
});
