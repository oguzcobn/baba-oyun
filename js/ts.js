"use strict";
/* =====================================================================
   TRABZONSPOR sayfası — sıradaki maç (tarih + saat), son 5 maç, kadro, TS Club bağlantısı.
   Veri ücretsiz ve anahtarsız kaynaklardan tarayıcıda çekilir:
     · Maçlar: ESPN herkese açık skor servisi (sezonun tüm maçları) + TheSportsDB herkese açık v1 API (anahtar "123", dakikada 30 istek)
     · Kadro:  Wikipedia (Trabzonspor maddesindeki güncel kadro tablosu); olmazsa TheSportsDB (kısmi liste)
   Sonuçlar 30 dk yerelde saklanır; kaynak yanıt vermezse son kayıtlı veri "eski" notuyla gösterilir.
   ===================================================================== */
const TS = (() => {
  const API = 'https://www.thesportsdb.com/api/v1/json/123/', KEY = 'baba_ts_cache2', TTL = 30 * 60000;
  const LINKS = [['TS Club', 'https://www.tsclub.com.tr/'], ['Resmî site', 'https://www.trabzonspor.org.tr/']];
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const TZ = 'Europe/Istanbul', isTS = n => /trabzonspor/i.test(n || '');
  const POS = { GK: 'Kaleci', DF: 'Defans', MF: 'Orta saha', FW: 'Forvet' };
  let el = null, timer = null;

  const get = async u => { const r = await fetch(u); if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); };
  const when = e => {           // TheSportsDB saatleri UTC verir
    if (e && e.ts) return { d: new Date(e.ts), has: e.has !== false };
    if (!e || !e.dateEvent) return null;
    const t = (e.strTime || '').slice(0, 8), has = /^\d{2}:\d{2}/.test(t) && t !== '00:00:00';
    const d = new Date(e.dateEvent + 'T' + (has ? t : '12:00:00') + 'Z');
    return isNaN(d) ? null : { d, has };
  };
  const fmtD = (w, long) => w.d.toLocaleDateString('tr-TR', long ? { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' } : { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric' });
  const fmtT = w => w.has ? w.d.toLocaleTimeString('tr-TR', { timeZone: TZ, hour: '2-digit', minute: '2-digit' }) : null;

  /* ESPN'in herkese açık (anahtarsız) skor servisi: sezonun tüm maçları, lig + Avrupa + kupa */
  const ESPN = 'https://site.api.espn.com/apis/site/v2/sports/soccer/', LG = { 'tur.1': 'Süper Lig', 'uefa.europa.conf': 'UEFA Konferans Ligi', 'uefa.europa': 'UEFA Avrupa Ligi', 'uefa.champions': 'UEFA Şampiyonlar Ligi', 'tur.cup': 'Türkiye Kupası' };
  async function espn() {
    const t = await get(ESPN + 'tur.1/teams?limit=100'), list = (((t.sports || [])[0] || {}).leagues || [])[0];
    const team = ((list && list.teams) || []).map(x => x.team).find(x => x && isTS(x.displayName || x.name)); if (!team) throw new Error('espn takım');
    const calls = Object.keys(LG).flatMap(l => [[l, ''], [l, '?fixture=true']]), rs = await Promise.allSettled(calls.map(c => get(ESPN + c[0] + '/teams/' + team.id + '/schedule' + c[1])));
    const out = [];
    rs.forEach((r, i) => { if (r.status !== 'fulfilled') return; ((r.value && r.value.events) || []).forEach(e => {
      const c = (e.competitions || [])[0] || {}, cs = c.competitors || [], h = cs.find(x => x.homeAway === 'home'), a = cs.find(x => x.homeAway === 'away'), ts = Date.parse(e.date);
      if (!h || !a || isNaN(ts)) return;
      const sc = x => { const v = x.score && typeof x.score === 'object' ? (x.score.displayValue != null ? x.score.displayValue : x.score.value) : x.score; return v == null || v === '' ? null : String(v).replace(/\.0$/, ''); };
      const st = (c.status && c.status.type) || {}, done = !!st.completed, nm = x => (x.team && (x.team.displayName || x.team.name)) || '';
      out.push({ ts, has: e.timeValid !== false && c.timeValid !== false, home: nm(h), away: nm(a), hs: done ? sc(h) : null, as: done ? sc(a) : null, done, league: LG[calls[i][0]], venue: (c.venue && c.venue.fullName) || '', round: '' });
    }); });
    if (!out.length) throw new Error('espn boş');
    return out;
  }
  async function squadWiki() {
    const j = await get('https://en.wikipedia.org/w/api.php?action=parse&page=Trabzonspor&prop=wikitext&format=json&formatversion=2&origin=*');
    let w = j && j.parse && j.parse.wikitext; if (!w) throw new Error('wiki');
    const a = w.search(/==+\s*Current squad\s*==+/i); if (a < 0) throw new Error('bölüm yok');
    w = w.slice(a); const b = w.slice(10).search(/\n==+[^=\n]+==+/); if (b > 0) w = w.slice(0, b + 10);
    const out = [], re = /\{\{\s*(?:fs|football squad) player\s*\|([^{}]*(?:\{\{[^{}]*\}\}[^{}]*)*)\}\}/gi; let m;
    while ((m = re.exec(w))) {
      const p = {}; m[1].replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1').replace(/\{\{[^{}]*\}\}/g, '').split('|').forEach(x => { const i = x.indexOf('='); if (i > 0) p[x.slice(0, i).trim().toLowerCase()] = x.slice(i + 1).trim(); });
      let name = (p.name || '').replace(/\{\{[^{}]*\}\}/g, '').replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1').replace(/'''?/g, '').replace(/<[^>]*>/g, '').trim();
      if (!name) continue;
      out.push({ no: (p.no || '').replace(/[^\d]/g, '').slice(0, 2), pos: (p.pos || '').toUpperCase().slice(0, 2), nat: (p.nat || '').slice(0, 30), name: name.slice(0, 60), note: /captain/i.test(p.other || '') ? 'kaptan' : /loan/i.test(p.other || '') ? 'kiralık' : '' });
    }
    if (out.length < 11) throw new Error('kadro okunamadı');
    return { list: out, src: 'Wikipedia', full: true };
  }
  async function squadDb(id) {
    const j = await get(API + 'lookup_all_players.php?id=' + id), pl = (j && j.player) || []; if (!pl.length) throw new Error('kadro yok');
    const map = p => /keeper/i.test(p) ? 'GK' : /back|defen/i.test(p) ? 'DF' : /mid/i.test(p) ? 'MF' : /forward|wing|strik/i.test(p) ? 'FW' : '';
    return { list: pl.filter(p => !/manager|coach/i.test(p.strPosition || '')).map(p => ({ no: String(p.strNumber || '').replace(/[^\d]/g, '').slice(0, 2), pos: map(p.strPosition || ''), nat: p.strNationality || '', name: p.strPlayer || '', note: '' })), src: 'TheSportsDB', full: false };
  }
  async function load() {
    const out = { at: Date.now(), errs: [] };
    try {
      const s = await get(API + 'searchteams.php?t=Trabzonspor'), t = ((s && s.teams) || []).find(x => x.strSport === 'Soccer' && /^trabzonspor$/i.test(x.strTeam)) || ((s && s.teams) || [])[0];
      if (!t) throw new Error('takım bulunamadı');
      out.team = { id: t.idTeam, stadium: t.strStadium || '', league: t.strLeague || '' };
      const [last, next] = await Promise.allSettled([get(API + 'eventslast.php?id=' + t.idTeam), get(API + 'eventsnext.php?id=' + t.idTeam)]);
      const pick = e => ({ home: e.strHomeTeam, away: e.strAwayTeam, hs: e.intHomeScore, as: e.intAwayScore, dateEvent: e.dateEvent, strTime: e.strTime, league: e.strLeague, venue: e.strVenue, round: e.intRound });
      if (last.status === 'fulfilled') out.last = ((last.value && last.value.results) || []).map(pick).slice(0, 5); else out.errs.push('son maçlar');
      if (next.status === 'fulfilled') out.next = ((next.value && next.value.events) || []).map(pick).filter(e => { const w = when(e); return w && w.d.getTime() > Date.now() - 3 * 3600e3; }).sort((a, b) => when(a).d - when(b).d); else out.errs.push('fikstür');
    } catch (e) { out.errs.push('TheSportsDB'); }
    try {         // iki kaynağı birleştir: aynı güne düşen maçta ESPN kaydı esas alınır
      const ev = await espn(), day = e => new Date(when(e).d.getTime() + 3 * 3600e3).toISOString().slice(0, 10), now = Date.now();
      const merge = (a, b) => { const m = new Map(); (b || []).filter(when).forEach(e => m.set(day(e), e)); a.forEach(e => m.set(day(e), e)); return [...m.values()]; };
      out.last = merge(ev.filter(e => e.done && e.hs != null), (out.last || []).filter(e => e.hs != null && e.hs !== '')).sort((a, b) => when(b).d - when(a).d).slice(0, 5);
      out.next = merge(ev.filter(e => !e.done && e.ts > now - 3 * 3600e3), out.next).sort((a, b) => when(a).d - when(b).d);
      out.errs = out.errs.filter(x => x !== 'son maçlar' && x !== 'fikstür');
    } catch (e) { out.errs.push('ESPN'); }
    if (!out.last && !out.next && !out.team) out.errs.push('maç verisi');
    try { out.squad = await squadWiki(); } catch (e) { try { if (out.team) out.squad = await squadDb(out.team.id); else throw e; } catch (e2) { out.errs.push('kadro'); } }
    return out;
  }

  function draw(d, stale, busy) {
    if (!el || !el.isConnected) return;
    const nx = d && d.next && d.next[0], w = when(nx), res = (d && d.last) || [], sq = d && d.squad;
    const outcome = e => { if (e.hs == null || e.as == null || e.hs === '' || e.as === '') return ['–', '']; const h = +e.hs, a = +e.as, ts = isTS(e.home) ? h - a : a - h; return ts > 0 ? ['G', 'w'] : ts < 0 ? ['M', 'l'] : ['B', 'd']; };
    let cd = '';
    if (w && w.has) { const ms = w.d - Date.now(), dd = Math.floor(ms / 864e5), hh = Math.floor(ms % 864e5 / 3600e3), mm = Math.floor(ms % 3600e3 / 60000); cd = ms > 0 ? (dd ? dd + ' gün ' : '') + hh + ' sa ' + mm + ' dk kaldı' : 'Maç başladı ya da bitti'; }
    else if (w) { const dd = Math.ceil((w.d - Date.now()) / 864e5); cd = dd > 0 ? dd + ' gün kaldı' : ''; }
    const groups = ['GK', 'DF', 'MF', 'FW', ''].map(k => [k, sq ? sq.list.filter(p => (POS[p.pos] ? p.pos : '') === k) : []]).filter(g => g[1].length);
    el.innerHTML = `<div class="ts">
      <header class="ts-hero"><div><p class="ts-eye">Bordo-Mavi · 1967</p><h1>Trabzonspor<i>.</i></h1><p class="ts-sub">Sıradaki maç, son beş sonuç ve kadro</p></div>
        <div class="ts-links">${LINKS.map((l, i) => `<a class="ts-btn${i ? ' ghost' : ''}" href="${l[1]}" target="_blank" rel="noopener noreferrer">${l[0]} ↗</a>`).join('')}</div></header>
      ${!d ? `<p class="ts-msg" role="status">${busy ? 'Veriler yükleniyor…' : 'Veri alınamadı. İnternet bağlantını kontrol edip yeniden dene.'}</p>` : `
      <section class="ts-next" aria-label="Sıradaki maç"><p class="ts-eye">En yakın maç</p>${nx && w ? `
        <div class="ts-vs"><b class="${isTS(nx.home) ? 'me' : ''}">${esc(nx.home)}</b><span>–</span><b class="${isTS(nx.away) ? 'me' : ''}">${esc(nx.away)}</b></div>
        <div class="ts-when"><div><small>Tarih</small><b>${esc(fmtD(w, true))}</b></div><div><small>Saat (Türkiye)</small><b>${fmtT(w) ? esc(fmtT(w)) : 'Henüz açıklanmadı'}</b></div><div><small>${isTS(nx.home) ? 'İç saha' : 'Deplasman'}</small><b>${esc(nx.venue || (isTS(nx.home) ? (d.team && d.team.stadium) : '') || '—')}</b></div></div>
        <p class="ts-cd">${esc([nx.league, +nx.round > 0 ? nx.round + '. hafta' : '', cd].filter(Boolean).join(' · '))}</p>` : `<p class="ts-msg">Kaynakta planlanmış maç görünmüyor. Güncel fikstür için resmî siteye bak.</p>`}</section>
      <div class="ts-cols">
        <section class="ts-card" aria-label="Son beş maç"><h2>${res.length >= 5 ? 'Son 5 maç' : 'Son maçlar'}</h2>${res.length ? `<div class="ts-form">${res.slice().reverse().map(e => `<i class="${outcome(e)[1]}">${outcome(e)[0]}</i>`).join('')}</div>${res.map(e => { const ww = when(e), o = outcome(e); return `<div class="ts-row"><i class="${o[1]}">${o[0]}</i><span><b>${esc(e.home)} ${e.hs != null && e.hs !== '' ? esc(e.hs) + ' – ' + esc(e.as) : 'v'} ${esc(e.away)}</b><small>${ww ? esc(fmtD(ww)) : ''}${e.league ? ' · ' + esc(e.league) : ''}</small></span></div>`; }).join('')}${res.length < 5 ? `<p class="ts-note">Kaynaklar şu an yalnızca ${res.length} sonuç verdi; tüm sonuçlar için resmî siteye bak.</p>` : ''}` : `<p class="ts-msg">Sonuçlar alınamadı.</p>`}</section>
        <section class="ts-card" aria-label="Kadro"><h2>Kadro ${sq ? `<small>${sq.list.length} oyuncu</small>` : ''}</h2>${sq ? groups.map(g => `<h3>${POS[g[0]] || 'Diğer'}</h3><div class="ts-squad">${g[1].map(p => `<div class="ts-p"><i>${esc(p.no || '–')}</i><span><b>${esc(p.name)}</b><small>${esc([p.nat, p.note].filter(Boolean).join(' · '))}</small></span></div>`).join('')}</div>`).join('') + (sq.full ? '' : `<p class="ts-note">Bu kaynak ücretsiz kullanımda kadronun yalnızca bir bölümünü veriyor; tam liste için resmî siteye bak.</p>`) : `<p class="ts-msg">Kadro alınamadı. Resmî siteden bakabilirsin.</p>`}</section>
      </div>
      <p class="ts-foot">${stale ? '⚠ Kaynağa ulaşılamadı; son kayıtlı veri gösteriliyor. ' : ''}Son güncelleme: ${esc(new Date(d.at).toLocaleString('tr-TR', { timeZone: TZ, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }))}${d.errs && d.errs.length ? ' · alınamayan: ' + esc(d.errs.join(', ')) : ''} · Kaynak: ESPN, TheSportsDB${sq ? ', ' + esc(sq.src) : ''} (gönüllü katkılı; saatler değişebilir, kesin bilgi için resmî site) <button type="button" class="ts-btn ghost sm" data-a="refresh" ${busy ? 'disabled' : ''}>${busy ? 'Yenileniyor…' : 'Yenile'}</button></p>`}
    </div>`;
    const b = el.querySelector('[data-a=refresh]'); if (b) b.onclick = () => refresh(true);
  }
  const cached = () => { try { const c = JSON.parse(localStorage.getItem(KEY) || 'null'); return c && c.at ? c : null; } catch (e) { return null; } };
  async function refresh(force) {
    const c = cached();
    if (c && !force && Date.now() - c.at < TTL) return draw(c, false, false);
    draw(c, false, true);
    let d = null; try { d = await load(); } catch (e) {}
    const ok = d && (d.last || d.next || d.squad);
    if (ok) { if (c) ['last', 'next', 'squad', 'team'].forEach(k => { if (d[k] == null && c[k] != null) d[k] = c[k]; }); try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {} draw(d, false, false); }
    else draw(c, !!c, false);
  }
  function open(root) { el = root; clearInterval(timer); refresh(false); timer = setInterval(() => { if (!el || !el.isConnected) return clearInterval(timer); const c = cached(); if (c) draw(c, false, false); }, 60000); }
  return { open };
})();
