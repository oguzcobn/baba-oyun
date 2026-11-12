// BABA Messenger — uygulama kapalıyken bildirim gönderen Supabase Edge Function (ücretsiz katman).
// Kurulum: Supabase → Edge Functions → Deploy a new function → Via Editor → adı: msn-push → bu dosyanın tamamını yapıştır → Deploy.
// Sonra fonksiyonun Details/Settings bölümünde "Verify JWT" (JWT doğrulama) seçeneğini KAPAT ve kaydet.
// Gizli anahtar girmen gerekmez: bildirim anahtarları ilk çalışmada üretilip veritabanında saklanır.
import { generateVAPIDKeys, sendNotification } from 'npm:web-push-neo@0.1.2';

const BASE = Deno.env.get('SUPABASE_URL')!;
const KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SB_SECRET_KEY') || '';
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'content-type, apikey, authorization, x-client-info', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' };
const json = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { ...CORS, 'Content-Type': 'application/json' } });

async function db(path: string, init: RequestInit & { prefer?: string } = {}) {
  const h: Record<string, string> = { apikey: KEY, 'Content-Type': 'application/json' };
  if (!KEY.startsWith('sb_')) h.Authorization = 'Bearer ' + KEY;
  if (init.prefer) h.Prefer = init.prefer;
  const r = await fetch(BASE + '/rest/v1/' + path, { ...init, headers: h });
  const t = await r.text();
  if (!r.ok) throw new Error(r.status + ' ' + t);
  return t ? JSON.parse(t) : null;
}

let keys: { pub: string; priv: string } | null = null;
async function vapid() {
  if (keys) return keys;
  let k = (await db('msn_push_keys?select=pub,priv&id=eq.1'))[0];
  if (!k) {
    const g = await generateVAPIDKeys();
    await db('msn_push_keys', { method: 'POST', body: JSON.stringify({ id: 1, pub: g.publicKey, priv: g.privateKey }), prefer: 'resolution=ignore-duplicates,return=minimal' });
    k = (await db('msn_push_keys?select=pub,priv&id=eq.1'))[0];
  }
  return (keys = k);
}

const L = (lang: string, tr: string, en: string) => (lang === 'en' ? en : tr);
const cut = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    if (req.method === 'GET') return json({ publicKey: (await vapid()).pub });
    if (req.method !== 'POST') return json({ error: 'method' }, 405);
    const p = await req.json().catch(() => ({}));
    const table = p.table || (p.record && p.table), id = Number(p.id ?? (p.record && p.record.id));
    if (!['msn_messages', 'msn_room_msgs'].includes(table) || !Number.isSafeInteger(id) || id <= 0) return json({ error: 'bad request' }, 400);

    // her mesaj yalnızca bir kez (dışarıdan tekrar çağrılsa da)
    const fresh = await db('msn_push_sent', { method: 'POST', body: JSON.stringify({ tbl: table, rid: id }), prefer: 'resolution=ignore-duplicates,return=representation' });
    if (!fresh || !fresh.length) return json({ skipped: 'already sent' });

    const rec = (await db(`${table}?select=*&id=eq.${id}`))[0];
    if (!rec) return json({ skipped: 'no record' });
    const sender = (await db(`msn_profiles?select=name,code&id=eq.${rec.sender}`))[0] || {};
    const who = sender.name || sender.code || 'BABA.';
    let to: string[] = [], title = (_: string) => who, body = (_: string) => '', key = '';
    if (table === 'msn_messages') {
      if (!['text', 'nudge'].includes(rec.kind)) return json({ skipped: 'kind' });
      to = [rec.receiver]; key = rec.sender;
      body = (lg) => rec.kind === 'nudge' ? L(lg, '📳 Sana titreşim gönderdi!', '📳 Sent you a nudge!') : cut(rec.body, 160);
    } else {
      if (rec.kind !== 'text') return json({ skipped: 'kind' });
      const room = (await db(`msn_rooms?select=name&id=eq.${rec.room}`))[0];
      const mem = await db(`msn_room_members?select=member&room=eq.${rec.room}`);
      to = (mem || []).map((m: { member: string }) => m.member).filter((m: string) => m !== rec.sender);
      key = 'r:' + rec.room; const rn = (room && room.name) || 'Grup';
      title = () => `${rn} · ${who}`; body = () => cut(rec.body, 160);
    }
    if (!to.length) return json({ sent: 0 });
    const subs = await db(`msn_push?select=endpoint,p256dh,auth,lang,url&member=in.(${to.join(',')})`);
    const k = await vapid();
    let sent = 0;
    await Promise.all((subs || []).map(async (s: { endpoint: string; p256dh: string; auth: string; lang: string; url: string }) => {
      const payload = JSON.stringify({ msn: 1, title: title(s.lang), body: body(s.lang), tag: 'msn-' + key, k: key, url: (s.url || '') + '#msn' });
      try {
        await sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, {
          vapidDetails: { subject: 'https://oguzcobn.github.io/baba./', publicKey: k.pub, privateKey: k.priv },
          TTL: 6 * 3600, urgency: 'high', topic: ('msn' + key.replace(/[^A-Za-z0-9]/g, '')).slice(0, 32), signal: AbortSignal.timeout(8000),
        });
        sent++;
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) await db(`msn_push?endpoint=eq.${encodeURIComponent(s.endpoint)}`, { method: 'DELETE' }).catch(() => {});
      }
    }));
    return json({ sent });
  } catch (e) {
    return json({ error: String((e as Error).message || e) }, 500);
  }
});
