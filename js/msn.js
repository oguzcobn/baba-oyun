"use strict";
/* =====================================================================
   BABA Messenger — MSN mantığında anlık mesajlaşma.
   - Hesap: CBN hesabı (Supabase Auth, aynı oturum). Veri: supabase/messenger.sql tabloları.
   - Anlık: Supabase Realtime (websocket). Bağlantı koparsa kısa aralıklı yoklama devreye girer.
   - Gruplar her kullanıcının kendi listesidir; karşı taraf hangi grupta olduğunu görmez.
   - Tamamen ücretsiz katmanla çalışır; dış kütüphane yok.
   Rota: #msn
   ===================================================================== */
const Msn = (() => {
  /* grup davet bağlantısı: ...?grup=<anahtar>#msn — anahtarı sakla, adres çubuğundan temizle */
  const JOIN_KEY = 'msn_join';
  try { const u = new URL(location.href), t = u.searchParams.get('grup'); if (t && /^[a-f0-9]{32}$/.test(t)) { localStorage.setItem(JOIN_KEY, JSON.stringify({ t, at: Date.now() })); u.searchParams.delete('grup'); history.replaceState(null, '', u.pathname + u.search + (u.hash || '#msn')); } } catch (e) {}
  const pendingJoin = () => { try { const j = JSON.parse(localStorage.getItem(JOIN_KEY) || 'null'); if (j && j.t && Date.now() - j.at < 7 * 864e5) return j.t; localStorage.removeItem(JOIN_KEY); } catch (e) {} return ''; };
  const BASE = 'https://zjzbpeiuhreyfdihzzzj.supabase.co', KEY = 'sb_publishable_LyV2L0UpIAPnuGEdfgNc2Q_hrY8uqgG';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const DEF_GROUPS = ['family', 'friends', 'work'];
  const GN = k => ({ family: T('Aile', 'Family'), friends: T('Arkadaşlar', 'Friends'), work: T('İş', 'Work') }[k] || k);
  const STATUS = () => ({ online: T('Çevrimiçi', 'Online'), busy: T('Meşgul', 'Busy'), away: T('Dışarıda', 'Away'), invisible: T('Görünmez', 'Appear offline'), offline: T('Çevrimdışı', 'Offline') });
  const EMO = [[':)', '🙂'], [':D', '😄'], [';)', '😉'], [':(', '🙁'], [':P', '😛'], [':O', '😮'], [':@', '😠'], [":'(", '😢'], ['(H)', '😎'], ['<3', '❤️'], ['(Y)', '👍'], ['(N)', '👎'], ['(K)', '💋'], ['(F)', '🌹'], ['(C)', '☕'], ['(*)', '⭐']];
  const PICK = ['🙂', '😄', '😂', '😉', '😍', '😘', '😎', '🤔', '😮', '😢', '😠', '🙏', '👍', '👎', '👏', '💪', '❤️', '💙', '🌹', '⭐', '☕', '⚽', '🎉', '🌊', '⛵'];

  /* ---------------- durum ---------------- */
  let me = null, uid = '', ready = false, setupMissing = false, lastErr = '';
  let friends = new Map(), profiles = new Map(), pending = [], msgs = new Map(), unread = new Map(), typing = new Map(), lastMsg = new Map();
  let prefs = { groups: DEF_GROUPS.slice(), closed: {} }, open = '', el = null, maxId = 0, booting = null;
  let rooms = new Map(), rUnread = new Map(), maxRid = 0, names = new Map();
  const isR = k => typeof k === 'string' && k.startsWith('r:'), rid = k => k.slice(2);
  let ws = null, wsOk = false, wsRef = 0, hbT = null, pollT = null, beatT = null, tokT = null, retry = 0, reT = null, typT = 0, lastNudge = 0, wasOn = new Map();

  /* ---------------- ağ ---------------- */
  const hasAcc = () => typeof CBN !== 'undefined' && CBN.sync && CBN.sync.user;
  async function api(path, o) {
    o = o || {};
    const h = { apikey: KEY, 'Content-Type': 'application/json', Authorization: 'Bearer ' + await CBN.sync.token() };
    if (o.prefer) h.Prefer = o.prefer;
    let r; try { r = await fetch(BASE + path, { method: o.method || 'GET', headers: h, body: o.body !== undefined ? JSON.stringify(o.body) : undefined }); }
    catch (e) { const er = new Error(T('İnternet bağlantısı yok', 'No internet connection')); er.offline = true; throw er; }
    const tx = await r.text(); let j = null; try { j = tx ? JSON.parse(tx) : null; } catch (e) {}
    if (!r.ok) { const er = new Error((j && (j.message || j.msg || j.error)) || 'HTTP ' + r.status); er.status = r.status; er.code = j && j.code; throw er; }
    return j;
  }
  const rpc = (fn, args) => api('/rest/v1/rpc/' + fn, { method: 'POST', body: args || {} });
  const missing = e => e && (e.status === 404 || /PGRST20[25]|42P01|42883/.test(String(e.code)) || /does not exist|Could not find/i.test(e.message));

  /* ---------------- açılış ---------------- */
  async function boot() {
    if (booting) return booting;
    return booting = (async () => {
      try {
        if (typeof CBN === 'undefined' || !App.user()) return;
        await CBN.ready().catch(() => {});
        if (!hasAcc()) { ready = false; return; }
        uid = CBN.sync.user.id;
        const nm = (CBN.profile && CBN.profile.name()) || App.user().name || '';
        me = await rpc('msn_me', { p_name: nm });
        setupMissing = false;
        await syncProfile();
        await Promise.all([loadFriends(), loadPrefs(), loadUnread()]);
        try { await loadRooms(true); } catch (e) { if (!missing(e)) throw e; }
        ready = true; lastErr = '';
        connect(); startTimers(); beat();
        setTimeout(checkJoin, 300);
      } catch (e) { if (missing(e)) setupMissing = true; else lastErr = e.message || String(e); ready = false; }
      finally { booting = null; draw(); badge(); }
    })();
  }
  async function syncProfile() {          // CBN'deki ad/avatar değişirse Messenger profiline de yansıt
    const p = CBN.S.settings && CBN.S.settings.profile, nm = ((p && p.name) || (CBN.profile && CBN.profile.name()) || '').slice(0, 40), av = (p && p.avatar) || null;
    if (me && (me.name !== nm && nm || JSON.stringify(me.avatar || null) !== JSON.stringify(av))) {
      const r = await api('/rest/v1/msn_profiles?id=eq.' + uid, { method: 'PATCH', body: { name: nm || me.name, avatar: av }, prefer: 'return=representation' });
      if (r && r[0]) me = r[0];
    }
  }
  async function loadFriends() {
    const [fr, pr, pe] = await Promise.all([
      api('/rest/v1/msn_friends?select=friend,state,grp'),
      api('/rest/v1/msn_profiles?select=id,code,name,psm,status,avatar,last_seen'),
      rpc('msn_pending')]);
    friends = new Map((fr || []).filter(f => f.state === 'accepted' || f.state === 'blocked').map(f => [f.friend, f]));
    const np = new Map((pr || []).map(p => [p.id, p]));
    np.forEach((p, id) => { if (id === uid) me = Object.assign(me || {}, p); });
    profiles = np; pending = pe || [];
    np.forEach(p => names.set(p.id, p.name || p.code)); pending.forEach(p => names.set(p.id, p.name || p.code));
    profiles.forEach((p, id) => { if (!wasOn.has(id)) wasOn.set(id, isOn(p)); });
  }
  async function loadPrefs() {
    const r = await api('/rest/v1/msn_prefs?select=data');
    const d = r && r[0] && r[0].data;
    if (d && Array.isArray(d.groups)) prefs = { groups: d.groups.filter(g => typeof g === 'string' && g.length <= 40).slice(0, 30), closed: (d.closed && typeof d.closed === 'object') ? d.closed : {}, mute: !!d.mute, nopop: !!d.nopop };
    DEF_GROUPS.forEach(g => { if (!prefs.groups.includes(g)) prefs.groups.push(g); });
    friends.forEach(f => { if (!prefs.groups.includes(f.grp)) prefs.groups.push(f.grp); });
  }
  let prefT = null;
  const savePrefs = () => { clearTimeout(prefT); prefT = setTimeout(() => api('/rest/v1/msn_prefs?on_conflict=id', { method: 'POST', body: { id: uid, data: prefs }, prefer: 'resolution=merge-duplicates,return=minimal' }).catch(() => {}), 400); };
  async function loadUnread() {
    const r = await api('/rest/v1/msn_messages?select=id,sender&receiver=eq.' + uid + '&read_at=is.null&order=id.desc&limit=500');
    unread = new Map(); (r || []).forEach(m => { unread.set(m.sender, (unread.get(m.sender) || 0) + 1); maxId = Math.max(maxId, m.id); });
    const last = await api('/rest/v1/msn_messages?select=id&order=id.desc&limit=1');
    if (last && last[0]) maxId = Math.max(maxId, last[0].id);
  }
  async function loadConv(peer) {
    const q = `or=(and(sender.eq.${uid},receiver.eq.${peer}),and(sender.eq.${peer},receiver.eq.${uid}))`;
    const r = await api('/rest/v1/msn_messages?select=*&' + q + '&order=id.desc&limit=80');
    msgs.set(peer, (r || []).reverse());
    (r || []).forEach(m => maxId = Math.max(maxId, m.id));
  }
  /* ---------- grup sohbetleri ---------- */
  async function loadRooms(init) {
    const [mm, rr] = await Promise.all([api('/rest/v1/msn_room_members?select=room,last_read&member=eq.' + uid), api('/rest/v1/msn_rooms?select=*')]);
    const lr = new Map((mm || []).map(m => [m.room, +m.last_read || 0])), old = rooms;
    rooms = new Map((rr || []).filter(r => lr.has(r.id)).map(r => [r.id, Object.assign({ people: (old.get(r.id) || {}).people || null }, r, { last_read: lr.get(r.id) })]));
    rUnread = new Map();
    if (rooms.size) {
      const min = Math.min(...[...rooms.values()].map(r => r.last_read));
      const u = await api(`/rest/v1/msn_room_msgs?select=id,room&kind=eq.text&sender=neq.${uid}&id=gt.${min}&order=id.desc&limit=500`);
      (u || []).forEach(m => { const r = rooms.get(m.room); if (r && m.id > r.last_read) rUnread.set(m.room, (rUnread.get(m.room) || 0) + 1); });
      if (init) { const last = await api('/rest/v1/msn_room_msgs?select=id&order=id.desc&limit=1'); if (last && last[0]) maxRid = Math.max(maxRid, last[0].id); }
    }
  }
  async function loadPeople(id) {
    const ps = await rpc('msn_room_people', { p_room: id }), r = rooms.get(id);
    (ps || []).forEach(p => names.set(p.id, p.name || p.code));
    if (r) r.people = ps || [];
  }
  async function loadRoomMsgs(id) {
    const r = await api(`/rest/v1/msn_room_msgs?select=*&room=eq.${id}&order=id.desc&limit=80`);
    msgs.set('r:' + id, (r || []).reverse()); (r || []).forEach(m => maxRid = Math.max(maxRid, m.id));
  }
  async function markRoomRead(id) {
    const a = msgs.get('r:' + id), r = rooms.get(id); if (!a || !a.length || !r) return;
    const top = Math.max(...a.filter(m => !m.tmp).map(m => m.id)); rUnread.delete(id); badge(); drawList();
    if (top > r.last_read) { r.last_read = top; try { await api(`/rest/v1/msn_room_members?room=eq.${id}&member=eq.${uid}`, { method: 'PATCH', body: { last_read: top }, prefer: 'return=minimal' }); } catch (e) {} }
  }
  const readOpen = () => { if (!open) return; if (isR(open)) markRoomRead(rid(open)); else markRead(open); };
  function addRoomMsg(m, live) {
    if (!m || !m.id || !rooms.has(m.room)) return;
    maxRid = Math.max(maxRid, m.id);
    const key = 'r:' + m.room, a = msgs.get(key), r = rooms.get(m.room);
    if (a) { if (a.some(x => x.id === m.id)) return; const t = a.findIndex(x => x.tmp && x.body === m.body && m.sender === uid); if (t >= 0) a.splice(t, 1, m); else a.push(m); }
    if (m.kind === 'system' && /^renamed:/.test(m.body)) r.name = m.body.slice(8);
    if (m.kind === 'system' && r.people && /^(added|removed):|^left$/.test(m.body)) loadPeople(m.room).then(() => { if (open === key) drawRoomHead(); }).catch(() => {});
    if (m.sender !== uid && m.kind === 'text') {
      const seen = open === key && !document.hidden && live_();
      if (seen) { clearTimeout(mrT); mrT = setTimeout(() => markRoomRead(m.room), 400); } else rUnread.set(m.room, (rUnread.get(m.room) || 0) + 1);
      if (live) { sound('msg'); if (!seen) { toast(`${r.name} · ${names.get(m.sender) || T('Biri', 'Someone')}: ${m.body.slice(0, 70)}`, '👥', key); popup(key); } }
    }
    if (el && el.isConnected) { if (open === key) drawMsgs(); drawList(); }
    badge();
  }
  let rrT = null;
  const refreshRooms = () => { clearTimeout(rrT); rrT = setTimeout(async () => { const had = new Set(rooms.keys()); try { await loadRooms(); } catch (e) { return; } let pop = ''; rooms.forEach((r, id) => { if (!had.has(id)) { toast(T(`“${r.name}” grubuna eklendin`, `You were added to “${r.name}”`), '👥', 'r:' + id); sound('in'); pop = pop || 'r:' + id; } }); if (pop) popup(pop); if (isR(open) && !rooms.has(rid(open))) { toast(T('Bu grup sohbetinden çıktın', 'You’re no longer in this group chat'), '👋'); closeChat(); } drawList(); badge(); if (isR(open)) drawRoomHead(); }, 350); };

  async function markRead(peer) {
    if (!peer) return;
    const a = msgs.get(peer);
    if (!unread.get(peer) && !(a && a.some(m => m.sender === peer && !m.read_at))) return;
    if (a) a.forEach(m => { if (m.sender === peer && !m.read_at) m.read_at = new Date().toISOString(); });
    unread.delete(peer); badge(); drawList();
    try { await api(`/rest/v1/msn_messages?receiver=eq.${uid}&sender=eq.${peer}&read_at=is.null`, { method: 'PATCH', body: { read_at: new Date().toISOString() }, prefer: 'return=minimal' }); } catch (e) {}
  }

  /* ---------------- anlık bağlantı (Supabase Realtime, Phoenix protokolü) ---------------- */
  function connect() {
    if (ws || !uid) return;
    try { ws = new WebSocket(BASE.replace('https', 'wss') + '/realtime/v1/websocket?apikey=' + KEY + '&vsn=1.0.0'); } catch (e) { ws = null; return; }
    const topic = 'realtime:msn-' + uid.slice(0, 8);
    const send = (event, payload, t) => { try { ws.send(JSON.stringify({ topic: t || topic, event, payload, ref: String(++wsRef), join_ref: '1' })); } catch (e) {} };
    ws.onopen = async () => {
      let tok = ''; try { tok = await CBN.sync.token(); } catch (e) {}
      send('phx_join', { config: { broadcast: { self: false }, presence: { key: '' }, private: false, postgres_changes: [
        { event: '*', schema: 'public', table: 'msn_messages' },
        { event: '*', schema: 'public', table: 'msn_friends', filter: 'owner=eq.' + uid },
        { event: 'UPDATE', schema: 'public', table: 'msn_profiles' },
        { event: '*', schema: 'public', table: 'msn_typing', filter: 'peer=eq.' + uid },
        { event: 'INSERT', schema: 'public', table: 'msn_room_msgs' },
        { event: '*', schema: 'public', table: 'msn_room_members' },
        { event: 'UPDATE', schema: 'public', table: 'msn_rooms' }] }, access_token: tok });
      clearInterval(hbT); hbT = setInterval(() => send('heartbeat', {}, 'phoenix'), 25000);
      clearInterval(tokT); tokT = setInterval(async () => { try { send('access_token', { access_token: await CBN.sync.token() }); } catch (e) {} }, 10 * 60000);
    };
    ws.onmessage = ev => {
      let m; try { m = JSON.parse(ev.data); } catch (e) { return; }
      if (m.event === 'phx_reply' && m.payload && m.ref === '1') { wsOk = m.payload.status === 'ok'; retry = 0; if (wsOk) catchUp(); }
      else if (m.event === 'postgres_changes' && m.payload && m.payload.data) onChange(m.payload.data);
      else if (m.event === 'system' && m.payload && m.payload.status === 'error') wsOk = false;
    };
    ws.onclose = () => { wsOk = false; ws = null; clearInterval(hbT); clearInterval(tokT); if (!uid) return; clearTimeout(reT); reT = setTimeout(connect, Math.min(30000, 1500 * Math.pow(2, retry++))); };
    ws.onerror = () => { try { ws.close(); } catch (e) {} };
  }
  function onChange(d) {
    const r = d.record || {}, t = d.table;
    if (t === 'msn_messages') {
      if (d.type === 'INSERT') addMsg(r, true);
      else if (d.type === 'UPDATE') { const a = msgs.get(r.sender === uid ? r.receiver : r.sender); const x = a && a.find(m => m.id === r.id); if (x) { x.read_at = r.read_at; if (open && el) drawMsgs(); } }
    } else if (t === 'msn_profiles') {
      if (r.id === uid) { me = Object.assign(me || {}, r); return; }
      if (!profiles.has(r.id)) return;
      profiles.set(r.id, Object.assign(profiles.get(r.id), r)); presence(r.id); drawList(); if (open === r.id) drawHead();
    } else if (t === 'msn_friends') { refreshFriends(); }
    else if (t === 'msn_room_msgs') addRoomMsg(r, true);
    else if (t === 'msn_room_members') {
      const room = r.room || (d.old_record && d.old_record.room), ro = rooms.get(room);
      if (d.type === 'UPDATE' && ro && ro.people) { const p = ro.people.find(x => x.id === r.member); if (p) { p.last_read = r.last_read; if (open === 'r:' + room) drawMsgs(); } }
      else refreshRooms();
    }
    else if (t === 'msn_rooms') { const ro = rooms.get(r.id); if (ro) { ro.name = r.name; ro.owner = r.owner; drawList(); if (open === 'r:' + r.id) drawRoomHead(); } }
    else if (t === 'msn_typing' && r.owner && r.peer === uid) { typing.set(r.owner, Date.now()); if (open === r.owner) drawTyping(); setTimeout(() => { if (open === r.owner) drawTyping(); }, 5200); }
  }
  let rfT = null;
  const refreshFriends = () => { clearTimeout(rfT); rfT = setTimeout(async () => { const before = pending.filter(p => p.dir === 'in').length; try { await loadFriends(); } catch (e) {} const after = pending.filter(p => p.dir === 'in'); if (after.length > before) { toast(T(`${after[0].name || after[0].code} seni eklemek istiyor`, `${after[0].name || after[0].code} wants to add you`), '👋'); sound('in'); } drawList(); badge(); if (open && !isR(open) && !friends.has(open)) closeChat(); }, 300); };
  function addMsg(r, live) {
    if (!r || !r.id) return;
    maxId = Math.max(maxId, r.id);
    const peer = r.sender === uid ? r.receiver : r.sender;
    const a = msgs.get(peer);
    if (a) { if (a.some(m => m.id === r.id)) return; const tmp = a.findIndex(m => m.tmp && m.body === r.body && m.kind === r.kind && r.sender === uid); if (tmp >= 0) a.splice(tmp, 1, r); else a.push(r); }
    lastMsg.set(peer, r.created_at);
    if (r.sender !== uid) {
      const seen = open === peer && !document.hidden && live_();
      if (seen) markReadSoon(peer); else unread.set(peer, (unread.get(peer) || 0) + 1);
      typing.delete(peer);
      if (live) {
        const who = name(peer);
        if (r.kind === 'nudge') { if (!seen) { toast(T(`${who} sana titreşim gönderdi!`, `${who} just sent you a nudge!`), '📳', peer); popup(peer); } shake(); sound('nudge'); }
        else { sound('msg'); if (!seen) { toast(`${who}: ${r.body.slice(0, 80)}`, '💬', peer); popup(peer); } }
      }
    }
    if (el && el.isConnected) { if (open === peer) drawMsgs(); drawList(); }
    badge();
  }
  let mrT = null; const markReadSoon = peer => { clearTimeout(mrT); unread.set(peer, 1); mrT = setTimeout(() => markRead(peer), 400); };
  async function catchUp() {
    if (!uid) return;
    try { const r = await api('/rest/v1/msn_messages?select=*&id=gt.' + maxId + '&order=id.asc&limit=200'); (r || []).forEach(m => addMsg(m, true)); } catch (e) {}
    if (rooms.size) try { const r = await api('/rest/v1/msn_room_msgs?select=*&id=gt.' + maxRid + '&order=id.asc&limit=200'); (r || []).forEach(m => addRoomMsg(m, true)); } catch (e) {}
  }
  function startTimers() {
    clearInterval(pollT); pollT = setInterval(async () => {
      if (!uid || document.hidden) return;
      if (!wsOk) { catchUp(); connect(); refreshRooms(); if (isR(open) && rooms.has(rid(open))) loadPeople(rid(open)).then(() => { if (isR(open)) drawMsgs(); }).catch(() => {}); }
      try { const pr = await api('/rest/v1/msn_profiles?select=id,code,name,psm,status,avatar,last_seen'); (pr || []).forEach(p => { if (p.id !== uid && profiles.has(p.id)) { profiles.set(p.id, p); presence(p.id); } }); drawList(); if (open) drawHead(); } catch (e) {}
    }, wsOk ? 60000 : 20000);
    clearInterval(beatT); beatT = setInterval(beat, 60000);
  }
  function beat() { if (!uid || document.hidden || !me) return; api('/rest/v1/msn_profiles?id=eq.' + uid, { method: 'PATCH', body: { last_seen: new Date().toISOString() }, prefer: 'return=minimal' }).catch(() => {}); }
  document.addEventListener('visibilitychange', () => { if (!document.hidden && uid) { beat(); catchUp(); if (!ws) connect(); if (open && el && el.isConnected) readOpen(); } });

  /* ---------------- yardımcılar ---------------- */
  const live_ = () => !!(el && el.isConnected && !el.closest('[hidden]'));     // sohbet şu an ekranda mı (sayfa ya da köşe paneli)
  const isOn = p => !!p && p.status !== 'invisible' && Date.now() - Date.parse(p.last_seen) < 150000;
  const stOf = p => isOn(p) ? p.status : 'offline';
  const name = id => { const p = profiles.get(id) || pending.find(x => x.id === id); return (p && (p.name || p.code)) || T('Arkadaş', 'Friend'); };
  function presence(id) {
    const on = isOn(profiles.get(id)), was = wasOn.get(id); wasOn.set(id, on);
    if (on && was === false && friends.get(id) && friends.get(id).state === 'accepted') { toast(T(`${name(id)} oturum açtı`, `${name(id)} has just signed in`), '🟢', id); sound('on'); }
  }
  function avatar(p, size) {
    const av = p && p.avatar;
    if (av && typeof CBN !== 'undefined' && CBN.profile) { try { return CBN.profile.svg(av, size); } catch (e) {} }
    const n = (p && (p.name || p.code) || '?').trim(), h = [...n].reduce((a, c) => a + c.charCodeAt(0), 0) % 4;
    return `<span class="ms-ini c${h}" style="width:${size}px;height:${size}px;font-size:${Math.round(size * .42)}px">${esc(n.slice(0, 1).toLocaleUpperCase(I18N.locale))}</span>`;
  }
  const emo = s => { let x = esc(s); EMO.forEach(([k, v]) => { x = x.split(esc(k)).join(v); }); return x.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>').replace(/\n/g, '<br>'); };
  const hm = iso => new Date(iso).toLocaleTimeString(I18N.locale, { hour: '2-digit', minute: '2-digit' });
  const dayOf = iso => new Date(iso).toLocaleDateString(I18N.locale, { weekday: 'long', day: 'numeric', month: 'long' });
  function ago(iso) {
    const s = (Date.now() - Date.parse(iso)) / 1000;
    if (s < 3600) return T(`${Math.max(1, Math.round(s / 60))} dk önce`, `${Math.max(1, Math.round(s / 60))} min ago`);
    if (s < 86400) return T(`${Math.round(s / 3600)} sa önce`, `${Math.round(s / 3600)} h ago`);
    return new Date(iso).toLocaleDateString(I18N.locale, { day: 'numeric', month: 'short' });
  }
  function sound(k) {
    if (prefs.mute || typeof Snd === 'undefined') return;
    if (k === 'msg') { Snd.note(880, .09, 'sine', .05); Snd.note(1320, .14, 'sine', .05, .1); }
    else if (k === 'on') [523, 659, 784].forEach((f, i) => Snd.note(f, .18, 'triangle', .045, i * .09));
    else if (k === 'in') [660, 990].forEach((f, i) => Snd.note(f, .12, 'sine', .05, i * .12));
    else if (k === 'nudge') for (let i = 0; i < 6; i++) Snd.note(i % 2 ? 140 : 180, .07, 'square', .03, i * .07);
  }
  function shake() { const w = (live_() && el.querySelector('.ms-chat')) || document.querySelector('.ms-fab') || document.body; w.classList.remove('ms-shake'); void w.offsetWidth; w.classList.add('ms-shake'); setTimeout(() => w.classList.remove('ms-shake'), 900); if (navigator.vibrate) try { navigator.vibrate([90, 40, 90, 40, 140]); } catch (e) {} }
  function toast(text, ic, peer) {
    let box = document.querySelector('.ms-toasts'); if (!box) { box = document.createElement('div'); box.className = 'ms-toasts'; box.setAttribute('aria-live', 'polite'); document.body.appendChild(box); }
    const t = document.createElement('button'); t.type = 'button'; t.className = 'ms-toast'; t.innerHTML = `<i>${ic || '💬'}</i><span>${esc(text)}</span>`;
    t.onclick = () => { t.remove(); if (peer) openTarget(peer); };
    box.appendChild(t); setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 400); }, 5200);
  }
  function badge() {
    const n = [...unread.values()].reduce((a, b) => a + b, 0) + [...rUnread.values()].reduce((a, b) => a + b, 0) + pending.filter(p => p.dir === 'in').length;
    if (dock) { const fb = dock.querySelector('.ms-fb'); fb.hidden = !n; fb.textContent = n > 9 ? '9+' : n; }
    document.querySelectorAll('.nav a[data-r=msn]').forEach(a => { let b = a.querySelector('.ms-nb'); if (!n) { if (b) b.remove(); return; } if (!b) { b = document.createElement('b'); b.className = 'ms-nb'; a.appendChild(b); } b.textContent = n > 9 ? '9+' : n; });
  }
  function modal(html, onReady) {
    const ov = document.createElement('div'); ov.className = 'ms-ov'; ov.innerHTML = `<div class="ms-modal" role="dialog" aria-modal="true">${html}<button type="button" class="ms-x" aria-label="${T('Kapat', 'Close')}">×</button></div>`;
    const close = () => { ov.remove(); document.removeEventListener('keydown', k); };
    const k = e => { if (e.key === 'Escape') close(); };
    ov.onclick = e => { if (e.target === ov) close(); }; ov.querySelector('.ms-x').onclick = close; document.addEventListener('keydown', k);
    document.body.appendChild(ov); onReady && onReady(ov.querySelector('.ms-modal'), close); const f = ov.querySelector('input,select,button'); if (f) f.focus();
  }

  /* ---------------- sayfa ---------------- */
  const SEA = () => `<svg class="ms-sea" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id="msSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0a1a4a"/><stop offset=".55" stop-color="#1d3f9a"/><stop offset="1" stop-color="#6aa9e0"/></linearGradient>
      <radialGradient id="msSun" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff4d6"/><stop offset=".45" stop-color="#ffe2a8" stop-opacity=".9"/><stop offset="1" stop-color="#ffd27a" stop-opacity="0"/></radialGradient>
      <linearGradient id="msSea1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2c63c9"/><stop offset="1" stop-color="#143585"/></linearGradient>
      <linearGradient id="msSea2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1b48a8"/><stop offset="1" stop-color="#0d2463"/></linearGradient>
      <linearGradient id="msSea3" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#11307f"/><stop offset="1" stop-color="#08174a"/></linearGradient>
      <linearGradient id="msSailR" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#9a2a4c"/><stop offset="1" stop-color="#5e1129"/></linearGradient>
      <linearGradient id="msSailB" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8fdcff"/><stop offset="1" stop-color="#3fa6dc"/></linearGradient>
      <path id="msWave" d="M0 30 Q 100 0 200 30 T 400 30 T 600 30 T 800 30 T 1000 30 T 1200 30 T 1400 30 T 1600 30 T 1800 30 T 2000 30 T 2200 30 T 2400 30 T 2600 30 T 2800 30 T 3000 30 T 3200 30 V 400 H 0 Z"/>
    </defs>
    <rect width="1600" height="900" fill="url(#msSky)"/>
    <g class="ms-stars" fill="#fff">${[[120, 90], [260, 160], [410, 70], [560, 130], [700, 60], [1180, 80], [1320, 150], [1460, 70], [980, 120], [860, 40]].map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${i % 3 ? 1.4 : 2.2}" style="--d:${i * .37}s"/>`).join('')}</g>
    <circle cx="1240" cy="330" r="210" fill="url(#msSun)" class="ms-glow"/><circle cx="1240" cy="330" r="62" fill="#fff1cf"/>
    <g class="ms-clouds" fill="#fff" opacity=".18"><g class="ms-cl a"><ellipse cx="260" cy="250" rx="120" ry="24"/><ellipse cx="330" cy="236" rx="70" ry="22"/></g><g class="ms-cl b"><ellipse cx="980" cy="200" rx="150" ry="22"/><ellipse cx="1050" cy="186" rx="80" ry="20"/></g></g>
    <path d="M0 560 L 120 540 L 220 552 L 300 528 L 420 548 L 520 538 L 600 560 Z" fill="#0d2766" opacity=".55"/>
    <path d="M1100 560 L 1180 536 L 1260 546 L 1350 520 L 1460 544 L 1600 548 L 1600 560 Z" fill="#0d2766" opacity=".45"/>
    <rect y="556" width="1600" height="344" fill="#1c4aa6"/>
    <g class="ms-shine" fill="#fff6dc" opacity=".55">${[0, 1, 2, 3, 4, 5].map(i => `<rect x="${1180 + (i % 2) * 30 - i * 6}" y="${572 + i * 16}" width="${120 - i * 14}" height="3" rx="1.5" style="--d:${i * .4}s"/>`).join('')}</g>
    <g class="ms-w w1"><use href="#msWave" y="560" fill="url(#msSea1)" opacity=".9"/></g>
    <g class="ms-boat-wrap"><g class="ms-boat">
      <path d="M-150 0 Q -60 22 0 0" class="ms-wake" fill="none" stroke="#e8f6ff" stroke-width="3" stroke-linecap="round" opacity=".55"/>
      <path d="M-120 -112 L 4 -112 L -4 -116 L -120 -116 Z" fill="#3a2410"/>
      <rect x="-6" y="-330" width="7" height="322" rx="3" fill="#f3ead8"/>
      <path class="ms-flag" d="M1 -330 L 46 -318 L 1 -304 Z" fill="#7b1e3b"/>
      <path class="ms-sail main" d="M-8 -318 Q -96 -200 -150 -30 L -8 -30 Z" fill="url(#msSailR)"/>
      <path d="M-8 -230 Q -70 -150 -102 -60 L -8 -60 Z" fill="url(#msSailB)" opacity=".95"/>
      <path class="ms-sail jib" d="M6 -300 Q 70 -170 112 -36 L 6 -36 Z" fill="url(#msSailB)"/>
      <path d="M6 -200 Q 44 -120 70 -36 L 6 -36 Z" fill="#7b1e3b" opacity=".9"/>
      <path d="M-178 -24 L 150 -24 Q 132 22 96 30 L -136 30 Q -168 18 -178 -24 Z" fill="#f6f1e7"/>
      <path d="M-170 -4 L 142 -4 Q 132 22 96 30 L -136 30 Q -162 20 -170 -4 Z" fill="#7b1e3b"/>
      <path d="M-162 12 L 132 12" stroke="#5ec8f2" stroke-width="5"/>
      <circle cx="-60" cy="-12" r="5" fill="#0d2463"/><circle cx="-20" cy="-12" r="5" fill="#0d2463"/><circle cx="20" cy="-12" r="5" fill="#0d2463"/>
    </g></g>
    <g class="ms-w w2"><use href="#msWave" y="650" fill="url(#msSea2)"/></g>
    <g class="ms-foam" stroke="#e8f6ff" stroke-width="2.5" fill="none" stroke-linecap="round" opacity=".35">${[[160, 700], [520, 760], [860, 690], [1260, 740], [1480, 690], [340, 830], [1080, 820]].map(([x, y], i) => `<path d="M${x} ${y} q 24 -10 48 0" style="--d:${i * .6}s"/>`).join('')}</g>
    <g class="ms-w w3"><use href="#msWave" y="760" fill="url(#msSea3)"/></g>
    <g class="ms-birds" fill="none" stroke="#e9f2ff" stroke-width="3" stroke-linecap="round"><path d="M0 0 q 12 -10 24 0 q 12 -10 24 0"/><path d="M60 -26 q 9 -8 18 0 q 9 -8 18 0" stroke-width="2.4"/><path d="M40 30 q 8 -7 16 0 q 8 -7 16 0" stroke-width="2"/></g>
  </svg>`;
  const WAVE_EDGE = c => `<svg class="ms-edge" viewBox="0 0 1440 60" preserveAspectRatio="none" aria-hidden="true"><path d="M0 30 C 160 0 320 60 480 30 C 640 0 800 60 960 30 C 1120 0 1280 60 1440 30 V 60 H 0 Z" fill="${c}"/></svg>`;

  function page(root) {
    el = root; pageEl = root; if (dock && !dock.querySelector('.ms-panel').hidden) { dock.querySelector('.ms-panel').hidden = true; dock.classList.remove('open'); }
    const acc = hasAcc(), owner = App.isOwner();
    el.innerHTML = `<div class="ms">
      <section class="ms-hero${ready ? ' in' : ''}">${SEA()}
        <div class="ms-hero-txt">
          <p class="ms-eye"><span>BABA<em>.</em></span><span>${T('Davetlilere özel mesajlaşma', 'Invitation-only messaging')}</span></p>
          <h1 class="ms-h1"><span class="a">Messenger</span><span class="b">${T('Sakin denizlerde,<br>sevdiklerinle.', 'Calm seas,<br>with the people you love.')}</span></h1>
          ${ready ? '' : `<a class="ms-cta" href="#ms-start">${T('Sohbete başla', 'Start chatting')} <i>→</i></a>`}
        </div>
        <span class="ms-sticker s1" aria-hidden="true">✦</span><span class="ms-sticker s2" aria-hidden="true"><svg viewBox="0 0 60 60"><path d="M30 6 V44" stroke="#fff" stroke-width="2.5"/><path d="M29 9 Q 14 26 10 42 H29 Z" fill="#5ec8f2"/><path d="M31 12 Q 43 28 48 42 H31 Z" fill="#fff"/><path d="M6 46 H54 Q 50 54 42 55 H16 Q 9 53 6 46 Z" fill="#5ec8f2"/></svg><small>${T('bordo · mavi', 'claret · blue')}</small></span>
        ${WAVE_EDGE('#fef1e2')}</section>
      <section class="ms-sec cream" id="ms-start">${ready ? '<div class="ms-app"></div>' : gate(acc, owner)}</section>
      ${ready ? '' : features()}
    </div>`;
    if (ready) { drawApp(); readOpen(); }
    else wireGate();
    const c = el.querySelector('.ms-cta'); if (c) c.onclick = e => { e.preventDefault(); el.querySelector('#ms-start').scrollIntoView({ behavior: 'smooth' }); };
    el.querySelectorAll('[data-go=start]').forEach(b => b.onclick = e => { e.preventDefault(); el.querySelector('#ms-start').scrollIntoView({ behavior: 'smooth' }); });
  }
  function gate(acc, owner) {
    if (booting) return `<div class="ms-card ms-gate"><p class="ms-k">…</p><h2>${T('Bağlanıyor', 'Connecting')}</h2></div>`;
    if (setupMissing) return `<div class="ms-card ms-gate"><p class="ms-k">${T('Kurulum', 'Set-up')}</p><h2>${T('Messenger henüz hazır değil', 'Messenger isn’t ready yet')}</h2>
      <p>${owner ? T('Supabase’de bir kez SQL dosyasını çalıştırman gerekiyor: Supabase → SQL Editor → <b>supabase/messenger.sql</b> içeriğini yapıştır → Run. Sonra bu sayfayı yenile.', 'You need to run the SQL file once in Supabase: Supabase → SQL Editor → paste the contents of <b>supabase/messenger.sql</b> → Run. Then reload this page.') : T('Uygulamanın sahibi kurulumu bitirince burada sohbet edebileceksin.', 'You’ll be able to chat here once the app’s owner has finished the set-up.')}</p>
      <button type="button" class="ms-btn" data-a="retry">${T('Tekrar dene', 'Try again')} <i>↻</i></button></div>`;
    if (acc && lastErr) return `<div class="ms-card ms-gate"><p class="ms-k">${T('Bağlantı', 'Connection')}</p><h2>${T('Bağlanılamadı', 'Couldn’t connect')}</h2><p>${esc(lastErr)}</p><button type="button" class="ms-btn" data-a="retry">${T('Tekrar dene', 'Try again')} <i>↻</i></button></div>`;
    return `<div class="ms-card ms-gate"><p class="ms-k">${T('Hesap', 'Account')}</p><h2>${T('Giriş yap ya da hesap aç', 'Sign in or create an account')}</h2>
      ${pendingJoin() ? `<p class="ms-invite-note">👥 ${T('Bir grup sohbetine davet edildin. Giriş yapınca ya da hesap açınca katılabileceksin.', 'You’ve been invited to a group chat. Sign in or create an account to join.')}</p>` : ''}
      <p>${T('Messenger, CBN hesabınla çalışır. Aynı e-posta ve şifreyle her cihazdan bağlanırsın.', 'Messenger uses your CBN account. Sign in from any device with the same email and password.')}</p>
      <form class="ms-form" data-f="login" autocomplete="on">
        <label><span>${T('E-posta', 'Email')}</span><input name="email" type="email" required autocomplete="email" inputmode="email"></label>
        <label><span>${T('Şifre', 'Password')}</span><input name="pw" type="password" required minlength="6" autocomplete="current-password"></label>
        <label class="ms-check"><input name="rem" type="checkbox" checked> <span>${T('Beni hatırla — bu cihazda her seferinde e-posta ve şifre sorulmasın', 'Remember me — don’t ask for my email and password on this device each time')}</span></label>
        <p class="ms-msg" role="status"></p>
        <div class="ms-row"><button class="ms-btn" type="submit" data-m="in">${T('Giriş yap', 'Sign in')} <i>→</i></button><button class="ms-btn ghost" type="submit" data-m="up">${T('Hesap aç', 'Create account')}</button></div>
      </form></div>`;
  }
  function wireGate() {
    const q = s => el.querySelector(s);
    if (q('[data-a=retry]')) q('[data-a=retry]').onclick = () => { setupMissing = false; lastErr = ''; draw(); boot(); };
    const f = q('[data-f=login]'); if (!f) return;
    try { const em = localStorage.getItem('msn_email'); if (em) f.email.value = em; } catch (e) {}
    let mode = 'in'; f.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { mode = b.dataset.m; });
    f.onsubmit = async e => {
      e.preventDefault(); const m = f.querySelector('.ms-msg'); m.textContent = T('Bekle…', 'Please wait…'); f.querySelectorAll('button').forEach(b => b.disabled = true);
      try {
        await CBN.ready();
        const rem = f.rem.checked; try { if (rem) localStorage.setItem('msn_email', f.email.value.trim()); else localStorage.removeItem('msn_email'); } catch (e) {}
        const r = mode === 'up' ? await CBN.sync.signUp(f.email.value.trim(), f.pw.value, rem) : await CBN.sync.signIn(f.email.value.trim(), f.pw.value, rem);
        if (r === 'confirm') { m.textContent = T('E-postana bir onay bağlantısı gönderdik. Onayladıktan sonra burada giriş yap.', 'We’ve sent a confirmation link to your email. Once confirmed, sign in here.'); f.querySelectorAll('button').forEach(b => b.disabled = false); return; }
        if (r === false) { m.textContent = ''; f.querySelectorAll('button').forEach(b => b.disabled = false); return; }
        await boot();
      } catch (er) { m.textContent = er.message || String(er); f.querySelectorAll('button').forEach(b => b.disabled = false); }
    };
  }
  function features() {
    const F = [[T('Durumun', 'Your status'), T('Çevrimiçi, Meşgul, Dışarıda ya da Görünmez. Bir de kısa kişisel mesajın.', 'Online, Busy, Away or Appear offline. Plus a short personal message.')],
      [T('Titreşim', 'Nudge'), T('Bir dokunuşla karşı tarafın penceresini salla. Eskilerin bildiği o his.', 'Shake their window with one tap. That old familiar feeling.')],
      [T('Gruplar', 'Groups'), T('Aile, Arkadaşlar, İş ve kendi grupların. Gruplarını yalnızca sen görürsün.', 'Family, Friends, Work and groups of your own. Only you see your groups.')],
      [T('Gizlilik', 'Privacy'), T('Sadece onayladığın kişiler seni görür ve sana yazar. İstediğini engelleyebilirsin.', 'Only people you approve can see you and message you. Block anyone you like.')]];
    return `<section class="ms-sec blue">${WAVE_EDGE('#0b2a8f').replace('ms-edge', 'ms-edge top')}<h2 class="ms-h2">${T('Neden <em>Messenger?</em>', 'Why <em>Messenger?</em>')}</h2>
      <div class="ms-tiles">${F.map((f, i) => `<article class="ms-tile"><span class="ms-n">${String(i + 1).padStart(2, '0')}</span><h3>${f[0]}</h3><p>${f[1]}</p><span class="ms-arr" aria-hidden="true">→</span></article>`).join('')}</div></section>
      <section class="ms-sec sky"><h2 class="ms-h2 dark">${T('Üç adımda <em>bağlan</em>', 'Connect in <em>three steps</em>')}</h2>
      <ol class="ms-steps"><li><b>01</b><h3>${T('Hesabını aç', 'Create your account')}</h3><p>${T('E-posta ve şifreyle; CBN’deki hesabın varsa onu kullan.', 'With an email and password; use your CBN account if you have one.')}</p></li>
        <li><b>02</b><h3>${T('Kodunu paylaş', 'Share your code')}</h3><p>${T('Her kişinin OGUZ-4821 gibi kısa bir kodu var.', 'Everyone has a short code such as OGUZ-4821.')}</p></li>
        <li><b>03</b><h3>${T('Sohbete başla', 'Start chatting')}</h3><p>${T('İstek onaylanınca listende belirir.', 'Once the request is accepted, they appear in your list.')}</p></li></ol></section>
      <section class="ms-sec ink"><h2 class="ms-h2 light">${T('Sohbete <em>hazır mısın?</em>', 'Ready to <em>chat?</em>')}</h2><a class="ms-cta" href="#ms-start" data-go="start">${T('Hemen başla', 'Get started')} <i>→</i></a></section>`;
  }

  /* ---------------- uygulama ---------------- */
  function drawApp() {
    const a = el.querySelector('.ms-app'); if (!a) return;
    a.classList.toggle('chatting', !!open);
    a.innerHTML = `<aside class="ms-list"><div class="ms-me"></div>
        <div class="ms-tools"><input class="ms-search" type="search" placeholder="${T('Kişi ara', 'Search contacts')}" aria-label="${T('Kişi ara', 'Search contacts')}"><button type="button" class="ms-btn sm" data-a="add">+ ${T('Ekle', 'Add')}</button></div>
        <div class="ms-groups"></div>
        <div class="ms-list-foot"><button type="button" class="ms-link" data-a="newroom2">👥 ${T('Grup sohbeti', 'Group chat')}</button><button type="button" class="ms-link" data-a="newgrp">+ ${T('Liste grubu', 'List group')}</button><button type="button" class="ms-link" data-a="mute">${prefs.mute ? '🔇 ' + T('Sesler kapalı', 'Sounds off') : '🔊 ' + T('Sesler açık', 'Sounds on')}</button><button type="button" class="ms-link" data-a="out">↩ ${T('Çıkış yap', 'Sign out')}</button><button type="button" class="ms-link" data-a="pop">${prefs.nopop ? '🔕 ' + T('Açılır pencere kapalı', 'Pop-ups off') : '🔔 ' + T('Açılır pencere açık', 'Pop-ups on')}</button><span class="ms-live" title="${wsOk ? T('Anlık bağlantı açık', 'Live connection on') : T('Yoklama ile güncelleniyor', 'Updating by polling')}">${wsOk ? '● ' + T('Canlı', 'Live') : '○ ' + T('Bağlanıyor', 'Connecting')}</span></div></aside>
      <section class="ms-chat" aria-live="off"></section>`;
    a.querySelector('.ms-search').oninput = () => drawList();
    a.querySelector('[data-a=add]').onclick = addFriend;
    a.querySelector('[data-a=newgrp]').onclick = newGroup;
    a.querySelector('[data-a=newroom2]').onclick = newRoom;
    a.querySelector('[data-a=out]').onclick = async () => { if (!confirm(T('Bu cihazda Messenger’dan (ve CBN hesabından) çıkılsın mı?', 'Sign out of Messenger (and your CBN account) on this device?'))) return; try { await CBN.sync.signOut(); } catch (e) {} stopAll(); closeDock(); if (pageEl && pageEl.isConnected) page(pageEl); };
    a.querySelector('[data-a=pop]').onclick = e => { prefs.nopop = !prefs.nopop; savePrefs(); e.target.textContent = prefs.nopop ? '🔕 ' + T('Açılır pencere kapalı', 'Pop-ups off') : '🔔 ' + T('Açılır pencere açık', 'Pop-ups on'); };
    a.querySelector('[data-a=mute]').onclick = e => { prefs.mute = !prefs.mute; savePrefs(); e.target.textContent = prefs.mute ? '🔇 ' + T('Sesler kapalı', 'Sounds off') : '🔊 ' + T('Sesler açık', 'Sounds on'); };
    drawMe(); drawList(); drawChat();
  }
  function drawMe() {
    const b = el && el.querySelector('.ms-me'); if (!b || !me) return;
    const S = STATUS();
    b.innerHTML = `<div class="ms-av lg st-${me.status}">${avatar(me, 56)}</div><div class="ms-me-t"><button type="button" class="ms-name" data-a="rename" title="${T('Adını değiştir', 'Change your name')}"><b>${esc(me.name || me.code)}</b> <i aria-hidden="true">✎</i></button>
      <select class="ms-status" aria-label="${T('Durumun', 'Your status')}">${['online', 'busy', 'away', 'invisible'].map(s => `<option value="${s}"${me.status === s ? ' selected' : ''}>${S[s]}</option>`).join('')}</select>
      <input class="ms-psm" maxlength="120" value="${esc(me.psm)}" placeholder="${T('Kişisel mesajını yaz…', 'Type a personal message…')}" aria-label="${T('Kişisel mesaj', 'Personal message')}"></div>
      <button type="button" class="ms-code" data-a="code" title="${T('Arkadaş kodun', 'Your friend code')}">${esc(me.code)}</button>`;
    const up = async body => { try { const r = await api('/rest/v1/msn_profiles?id=eq.' + uid, { method: 'PATCH', body, prefer: 'return=representation' }); if (r && r[0]) me = r[0]; } catch (e) { toast(e.message, '⚠️'); } };
    b.querySelector('.ms-status').onchange = async e => { await up({ status: e.target.value, last_seen: new Date().toISOString() }); drawMe(); };
    const ps = b.querySelector('.ms-psm'); ps.onchange = () => up({ psm: ps.value.trim().slice(0, 120) }); ps.onkeydown = e => { if (e.key === 'Enter') ps.blur(); };
    b.querySelector('[data-a=code]').onclick = addFriend;
    b.querySelector('[data-a=rename]').onclick = renameMe;
  }
  function renameMe() {
    modal(`<p class="ms-k">${T('Profil', 'Profile')}</p><h2>${T('Adını değiştir', 'Change your name')}</h2>
      <form class="ms-form" data-f="nm"><label><span>${T('Görünen ad', 'Display name')}</span><input name="n" required maxlength="40" value="${esc(me.name || '')}" autocomplete="nickname"></label>
        <p class="ms-small">${T('Arkadaşların seni bu adla görür. CBN’deki adın da güncellenir.', 'Your friends will see you by this name. Your name in CBN is updated too.')}</p><p class="ms-msg" role="status"></p>
        <button class="ms-btn" type="submit">${T('Kaydet', 'Save')} <i>→</i></button></form>`, (m, close) => {
      const f = m.querySelector('form');
      f.onsubmit = async e => {
        e.preventDefault(); const n = f.n.value.trim().replace(/\s+/g, ' ').slice(0, 40); if (!n) return;
        try {
          const st = CBN.S.settings; st.profile = Object.assign({ avatar: null }, st.profile && typeof st.profile === 'object' ? st.profile : {}, { name: n, at: Date.now() });
          await CBN.saveSettings();
          const r = await api('/rest/v1/msn_profiles?id=eq.' + uid, { method: 'PATCH', body: { name: n }, prefer: 'return=representation' }); if (r && r[0]) me = r[0];
          close(); drawMe(); toast(T('Adın güncellendi', 'Your name has been updated'), '✓');
          if (typeof App !== 'undefined' && !(el && el.isConnected && el === pageEl)) { /* başka sayfadaysa bir sonraki açılışta yansır */ }
        } catch (er) { f.querySelector('.ms-msg').textContent = er.message; }
      };
    });
  }
  function drawList() {
    const box = el && el.isConnected && el.querySelector('.ms-groups'); if (!box) return;
    const q = (el.querySelector('.ms-search').value || '').trim().toLocaleLowerCase(I18N.locale), S = STATUS();
    const inc = pending.filter(p => p.dir === 'in'), outg = pending.filter(p => p.dir === 'out');
    const row = id => {
      const p = profiles.get(id) || { id, name: name(id) }, f = friends.get(id), blocked = f.state === 'blocked', st = blocked ? 'offline' : stOf(p), n = unread.get(id) || 0;
      return `<button type="button" class="ms-c${open === id ? ' on' : ''}${st === 'offline' ? ' off' : ''}" data-c="${id}"><span class="ms-av st-${st}">${avatar(p, 40)}</span><span class="ms-c-t"><b>${esc(p.name || p.code)}${blocked ? ' 🚫' : ''}</b><small>${esc(p.psm || (st === 'offline' && p.last_seen ? T('Son görülme ', 'Last seen ') + ago(p.last_seen) : S[st]))}</small></span>${n ? `<em class="ms-ub">${n}</em>` : ''}</button>`;
    };
    let html = '';
    const rl = [...rooms.values()].filter(r => !q || r.name.toLocaleLowerCase(I18N.locale).includes(q)).sort((a, b) => (rUnread.get(b.id) || 0) - (rUnread.get(a.id) || 0) || a.name.localeCompare(b.name, I18N.locale));
    if (rl.length || !q) html += `<div class="ms-g ms-rooms"><div class="ms-gh"><span class="ms-gt-s">👥 ${T('Grup sohbetleri', 'Group chats')} <span>(${rooms.size})</span></span><button type="button" class="ms-link sm" data-a="newroom" aria-label="${T('Yeni grup sohbeti', 'New group chat')}">+</button></div>${rl.map(r => { const n = rUnread.get(r.id) || 0, ppl = (r.people || []).filter(p => p.id !== uid); return `<button type="button" class="ms-c${open === 'r:' + r.id ? ' on' : ''}" data-room="${r.id}"><span class="ms-stack">${ppl.length ? ppl.slice(0, 3).map(p => `<span>${avatar(p, 26)}</span>`).join('') : '<span class="ms-ini c1" style="width:40px;height:40px;font-size:18px">👥</span>'}</span><span class="ms-c-t"><b>${esc(r.name)}</b><small>${r.people ? T(`${r.people.length} kişi`, `${r.people.length} people`) : T('Grup sohbeti', 'Group chat')}</small></span>${n ? `<em class="ms-ub">${n}</em>` : ''}</button>`; }).join('') || `<p class="ms-empty">${T('En çok 6 kişiyle aynı odada konuşmak için + düğmesine bas', 'Press + to chat with up to 6 people in one room')}</p>`}</div>`;
    if (inc.length) html += `<div class="ms-req"><p class="ms-gh">${T('Arkadaşlık istekleri', 'Friend requests')} <span>${inc.length}</span></p>${inc.map(p => `<div class="ms-rq"><span class="ms-av">${avatar(p, 36)}</span><span class="ms-c-t"><b>${esc(p.name || p.code)}</b><small>${esc(p.code)}</small></span><button type="button" class="ms-btn sm" data-acc="${p.id}">${T('Kabul et', 'Accept')}</button><button type="button" class="ms-link" data-rej="${p.id}">${T('Reddet', 'Decline')}</button></div>`).join('')}</div>`;
    prefs.groups.forEach(g => {
      const ids = [...friends.values()].filter(f => f.grp === g).map(f => f.friend).filter(id => !q || name(id).toLocaleLowerCase(I18N.locale).includes(q) || (profiles.get(id) && (profiles.get(id).code || '').toLowerCase().includes(q)));
      ids.sort((a, b) => ((unread.get(b) || 0) - (unread.get(a) || 0)) || (isOn(profiles.get(b)) - isOn(profiles.get(a))) || name(a).localeCompare(name(b), I18N.locale));
      const on = ids.filter(id => isOn(profiles.get(id)) && friends.get(id).state !== 'blocked').length, closed = !!prefs.closed[g];
      if (q && !ids.length) return;
      html += `<div class="ms-g${closed ? ' closed' : ''}"><div class="ms-gh"><button type="button" class="ms-gt" data-g="${esc(g)}" aria-expanded="${!closed}"><i>▾</i> ${esc(GN(g))} <span>(${on}/${ids.length})</span></button>${DEF_GROUPS.includes(g) ? '' : `<button type="button" class="ms-link sm" data-gm="${esc(g)}" aria-label="${T('Grubu düzenle', 'Edit group')}">⋯</button>`}</div>${closed ? '' : ids.map(row).join('') || `<p class="ms-empty">${T('Bu grupta henüz kimse yok', 'Nobody in this group yet')}</p>`}</div>`;
    });
    if (outg.length) html += `<div class="ms-g"><p class="ms-gh">${T('Yanıt bekleyenler', 'Waiting for a reply')}</p>${outg.map(p => `<div class="ms-rq"><span class="ms-av">${avatar(p, 32)}</span><span class="ms-c-t"><b>${esc(p.name || p.code)}</b><small>${T('İstek gönderildi', 'Request sent')}</small></span><button type="button" class="ms-link" data-rej="${p.id}">${T('Geri çek', 'Withdraw')}</button></div>`).join('')}</div>`;
    if (!friends.size && !pending.length) html += `<div class="ms-hello"><b>👋 ${T('Listen boş', 'Your list is empty')}</b><p>${T('“+ Ekle” ile arkadaşının kodunu yaz ya da kendi kodunu paylaş:', 'Use “+ Add” to enter a friend’s code, or share your own:')} <code>${esc(me && me.code)}</code></p></div>`;
    box.innerHTML = html;
    box.querySelectorAll('[data-c]').forEach(b => b.onclick = () => openChat(b.dataset.c));
    box.querySelectorAll('[data-room]').forEach(b => b.onclick = () => openRoom(b.dataset.room));
    const nr = box.querySelector('[data-a=newroom]'); if (nr) nr.onclick = newRoom;
    box.querySelectorAll('[data-g]').forEach(b => b.onclick = () => { const g = b.dataset.g; prefs.closed[g] = !prefs.closed[g]; savePrefs(); drawList(); });
    box.querySelectorAll('[data-gm]').forEach(b => b.onclick = () => editGroup(b.dataset.gm));
    box.querySelectorAll('[data-acc]').forEach(b => b.onclick = () => acceptReq(b.dataset.acc));
    box.querySelectorAll('[data-rej]').forEach(b => b.onclick = async () => { if (!confirm(T('Emin misin?', 'Are you sure?'))) return; try { await rpc('msn_remove', { p_friend: b.dataset.rej }); await loadFriends(); drawList(); badge(); } catch (e) { toast(e.message, '⚠️'); } });
    const live = el.querySelector('.ms-live'); if (live) live.textContent = wsOk ? '● ' + T('Canlı', 'Live') : '○ ' + T('Bağlanıyor', 'Connecting');
  }
  const grpSelect = (sel, name) => `<select name="${name || 'grp'}">${prefs.groups.map(g => `<option value="${esc(g)}"${g === sel ? ' selected' : ''}>${esc(GN(g))}</option>`).join('')}</select>`;
  function addFriend() {
    modal(`<p class="ms-k">${T('Arkadaş ekle', 'Add a friend')}</p><h2>${T('Senin kodun', 'Your code')}</h2>
      <div class="ms-mycode"><b>${esc(me.code)}</b><button type="button" class="ms-btn sm" data-a="share">${navigator.share ? T('Paylaş', 'Share') : T('Kopyala', 'Copy')}</button></div>
      <form class="ms-form" data-f="add"><label><span>${T('Arkadaşının kodu', 'Your friend’s code')}</span><input name="code" required maxlength="12" placeholder="NICO-1234" autocapitalize="characters" autocomplete="off" spellcheck="false"></label>
        <label><span>${T('Hangi gruba?', 'Which group?')}</span>${grpSelect('friends')}</label><p class="ms-msg" role="status"></p>
        <button class="ms-btn" type="submit">${T('İstek gönder', 'Send request')} <i>→</i></button></form>`, (m, close) => {
      m.querySelector('[data-a=share]').onclick = async () => {
        const t = T(`BABA. Messenger’da beni ekle: ${me.code}`, `Add me on BABA. Messenger: ${me.code}`);
        if (navigator.share) navigator.share({ text: t }).catch(() => {}); else { try { await navigator.clipboard.writeText(me.code); toast(T('Kod kopyalandı', 'Code copied'), '📋'); } catch (e) {} }
      };
      const f = m.querySelector('[data-f=add]');
      f.onsubmit = async e => {
        e.preventDefault(); const msg = f.querySelector('.ms-msg'); msg.textContent = '…';
        try {
          const r = await rpc('msn_request', { p_code: f.code.value.trim().toUpperCase(), p_grp: f.grp.value });
          const M = { sent: T('İstek gönderildi. Onaylayınca listende görünecek.', 'Request sent. They’ll appear in your list once they accept.'), accepted: T('Artık arkadaşsınız!', 'You’re now friends!'), notfound: T('Bu kodla kimse bulunamadı', 'Nobody found with that code'), self: T('Bu senin kodun 🙂', 'That’s your own code 🙂'), exists: T('Bu kişi zaten listende', 'This person is already in your list'), pending: T('İstek zaten gönderilmiş', 'A request has already been sent'), limit: T('Liste sınırına ulaştın', 'You’ve reached the list limit') };
          msg.textContent = M[r] || r;
          if (r === 'sent' || r === 'accepted') { await loadFriends(); drawList(); badge(); setTimeout(close, 1400); }
        } catch (er) { msg.textContent = er.message; }
      };
    });
  }
  function acceptReq(id) {
    const p = pending.find(x => x.id === id);
    modal(`<p class="ms-k">${T('Arkadaşlık isteği', 'Friend request')}</p><h2>${esc(p ? p.name || p.code : '')}</h2><form class="ms-form" data-f="acc"><label><span>${T('Hangi gruba eklensin?', 'Which group should they go in?')}</span>${grpSelect('friends')}</label><button class="ms-btn" type="submit">${T('Kabul et', 'Accept')} <i>→</i></button></form>`, (m, close) => {
      m.querySelector('form').onsubmit = async e => { e.preventDefault(); try { await rpc('msn_accept', { p_friend: id, p_grp: e.target.grp.value }); await loadFriends(); close(); drawList(); badge(); sound('on'); } catch (er) { toast(er.message, '⚠️'); } };
    });
  }
  function newGroup() {
    const n = (prompt(T('Yeni grubun adı:', 'Name of the new group:')) || '').trim().slice(0, 40);
    if (!n) return; if (prefs.groups.some(g => GN(g).toLocaleLowerCase(I18N.locale) === n.toLocaleLowerCase(I18N.locale))) return toast(T('Bu adda bir grup var', 'A group with that name already exists'), '⚠️');
    prefs.groups.push(n); savePrefs(); drawList();
  }
  function editGroup(g) {
    modal(`<p class="ms-k">${T('Grup', 'Group')}</p><h2>${esc(g)}</h2><form class="ms-form" data-f="eg"><label><span>${T('Yeni ad', 'New name')}</span><input name="n" maxlength="40" value="${esc(g)}"></label><div class="ms-row"><button class="ms-btn" type="submit">${T('Kaydet', 'Save')}</button><button class="ms-btn ghost" type="button" data-a="del">${T('Grubu sil', 'Delete group')}</button></div><p class="ms-small">${T('Silinen gruptaki kişiler “Arkadaşlar”a taşınır.', 'People in a deleted group move to “Friends”.')}</p></form>`, (m, close) => {
      const move = async to => { await rpc('msn_move_group', { p_from: g, p_to: to }); friends.forEach(f => { if (f.grp === g) f.grp = to; }); };
      m.querySelector('form').onsubmit = async e => { e.preventDefault(); const n = e.target.n.value.trim().slice(0, 40); if (!n || n === g) return close(); if (prefs.groups.includes(n)) return toast(T('Bu adda bir grup var', 'A group with that name already exists'), '⚠️'); try { await move(n); prefs.groups[prefs.groups.indexOf(g)] = n; if (prefs.closed[g]) { prefs.closed[n] = 1; delete prefs.closed[g]; } savePrefs(); close(); drawList(); } catch (er) { toast(er.message, '⚠️'); } };
      m.querySelector('[data-a=del]').onclick = async () => { try { await move('friends'); prefs.groups = prefs.groups.filter(x => x !== g); delete prefs.closed[g]; savePrefs(); close(); drawList(); } catch (er) { toast(er.message, '⚠️'); } };
    });
  }

  /* ---------------- sohbet ---------------- */
  async function openChat(id) {
    if (!friends.has(id)) return;
    open = id; const a = el && el.querySelector('.ms-app'); if (a) a.classList.add('chatting');
    drawChat(); drawList();
    if (!msgs.has(id)) { try { await loadConv(id); } catch (e) { toast(e.message, '⚠️'); } if (open === id) drawMsgs(); }
    markRead(id); drawList();
    const t = el && el.querySelector('.ms-in'); if (t && matchMedia('(min-width: 900px)').matches) t.focus();
  }
  function closeChat() { open = ''; const a = el && el.querySelector('.ms-app'); if (a) a.classList.remove('chatting'); drawChat(); drawList(); }
  function drawChat() {
    const c = el && el.querySelector('.ms-chat'); if (!c) return;
    if (isR(open)) return drawRoom(c);
    if (!open) { c.innerHTML = `<div class="ms-blank"><svg viewBox="0 0 120 120" aria-hidden="true"><path d="M60 14 L60 86" stroke="#151010" stroke-width="3"/><path d="M58 18 Q 26 52 18 82 L58 82 Z" fill="#7b1e3b"/><path d="M62 24 Q 86 54 96 82 L62 82 Z" fill="#5ec8f2"/><path d="M14 88 L106 88 Q 98 104 84 106 L 30 106 Q 18 102 14 88 Z" fill="#151010"/></svg><h3>${T('Bir sohbet seç', 'Pick a conversation')}</h3><p>${T('Soldaki listeden birine dokun. Titreşim göndermek için sohbetteki 📳 düğmesini kullan.', 'Tap someone in the list on the left. Use the 📳 button in a chat to send a nudge.')}</p></div>`; return; }
    const f = friends.get(open), blocked = f && f.state === 'blocked';
    c.innerHTML = `<header class="ms-ch"></header><div class="ms-msgs" role="log" aria-live="polite"></div><p class="ms-typing" aria-live="polite"></p>
      ${blocked ? `<p class="ms-blocked">${T('Bu kişiyi engelledin. Engeli kaldırana kadar mesajlaşamazsınız.', 'You’ve blocked this person. You can’t message each other until you unblock them.')}</p>` : `<form class="ms-comp"><button type="button" class="ms-ic" data-a="emo" aria-label="${T('İfadeler', 'Emoticons')}" aria-expanded="false">🙂</button><button type="button" class="ms-ic" data-a="nudge" aria-label="${T('Titreşim gönder', 'Send a nudge')}" title="${T('Titreşim gönder', 'Send a nudge')}">📳</button>
        <textarea class="ms-in" rows="1" maxlength="2000" placeholder="${T('Bir mesaj yaz…', 'Type a message…')}" aria-label="${T('Mesaj', 'Message')}"></textarea><button class="ms-send" type="submit" aria-label="${T('Gönder', 'Send')}">→</button>
        <div class="ms-pick" hidden>${PICK.map(e => `<button type="button" data-e="${e}">${e}</button>`).join('')}</div></form>`}`;
    drawHead(); drawMsgs(); drawTyping();
    const form = c.querySelector('.ms-comp'); if (!form) return;
    const ta = form.querySelector('.ms-in'), pick = form.querySelector('.ms-pick'), eb = form.querySelector('[data-a=emo]');
    const grow = () => { ta.style.height = 'auto'; ta.style.height = Math.min(140, ta.scrollHeight) + 'px'; };
    ta.oninput = () => { grow(); typingPing(); };
    ta.onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); form.requestSubmit(); } };
    form.onsubmit = e => { e.preventDefault(); const v = ta.value.trim(); if (!v) return; ta.value = ''; grow(); send('text', v); pick.hidden = true; eb.setAttribute('aria-expanded', 'false'); };
    eb.onclick = () => { pick.hidden = !pick.hidden; eb.setAttribute('aria-expanded', String(!pick.hidden)); };
    pick.querySelectorAll('[data-e]').forEach(b => b.onclick = () => { const s = ta.selectionStart || ta.value.length; ta.value = ta.value.slice(0, s) + b.dataset.e + ta.value.slice(ta.selectionEnd || s); ta.focus(); grow(); });
    form.querySelector('[data-a=nudge]').onclick = () => { if (Date.now() - lastNudge < 8000) return toast(T('Biraz bekle; çok sık titreşim gönderilemez', 'Hold on; you can’t send nudges that often'), '⏳'); lastNudge = Date.now(); send('nudge', ''); shake(); sound('nudge'); };
  }
  function drawHead() {
    if (isR(open)) return drawRoomHead();
    const h = el && el.querySelector('.ms-ch'); if (!h || !open) return;
    const p = profiles.get(open) || { name: name(open) }, f = friends.get(open), blocked = f && f.state === 'blocked', st = blocked ? 'offline' : stOf(p), S = STATUS();
    h.innerHTML = `<button type="button" class="ms-back" data-a="back" aria-label="${T('Listeye dön', 'Back to list')}">←</button><span class="ms-av st-${st}">${avatar(p, 46)}</span>
      <div class="ms-ch-t"><b>${esc(p.name || p.code)}</b><small>${S[st]}${st === 'offline' && p.last_seen ? ' · ' + T('son görülme ', 'last seen ') + ago(p.last_seen) : ''}${p.psm ? ' · ' + esc(p.psm) : ''}</small></div>
      <div class="ms-menu"><button type="button" class="ms-ic" data-a="menu" aria-label="${T('Kişi seçenekleri', 'Contact options')}" aria-expanded="false">⋯</button>
        <div class="ms-dd" hidden><label>${T('Grup', 'Group')} ${grpSelect(f && f.grp, 'mv')}</label><button type="button" data-a="block">${blocked ? T('Engeli kaldır', 'Unblock') : T('Engelle', 'Block')}</button><button type="button" data-a="remove" class="danger">${T('Listeden sil', 'Remove from list')}</button></div></div>`;
    h.querySelector('[data-a=back]').onclick = closeChat;
    const dd = h.querySelector('.ms-dd'), mb = h.querySelector('[data-a=menu]');
    mb.onclick = () => { dd.hidden = !dd.hidden; mb.setAttribute('aria-expanded', String(!dd.hidden)); };
    dd.querySelector('select').onchange = async e => { try { await api(`/rest/v1/msn_friends?owner=eq.${uid}&friend=eq.${open}`, { method: 'PATCH', body: { grp: e.target.value }, prefer: 'return=minimal' }); f.grp = e.target.value; drawList(); toast(T('Grup değişti', 'Group changed'), '✓'); } catch (er) { toast(er.message, '⚠️'); } };
    dd.querySelector('[data-a=block]').onclick = async () => {
      const to = blocked ? 'accepted' : 'blocked';
      if (to === 'blocked' && !confirm(T('Engellenen kişi seni hep çevrimdışı görür ve sana yazamaz. Engellensin mi?', 'A blocked person always sees you as offline and can’t message you. Block them?'))) return;
      try { await api(`/rest/v1/msn_friends?owner=eq.${uid}&friend=eq.${open}`, { method: 'PATCH', body: { state: to }, prefer: 'return=minimal' }); f.state = to; drawChat(); drawList(); } catch (er) { toast(er.message, '⚠️'); }
    };
    dd.querySelector('[data-a=remove]').onclick = async () => { if (!confirm(T('Bu kişi listenden silinsin mi? Yeniden eklemek için kod gerekir.', 'Remove this person from your list? You’ll need their code to add them again.'))) return; try { await rpc('msn_remove', { p_friend: open }); friends.delete(open); msgs.delete(open); closeChat(); } catch (er) { toast(er.message, '⚠️'); } };
  }
  function drawMsgs() {
    const box = el && el.querySelector('.ms-msgs'); if (!box || !open) return;
    if (isR(open)) return drawRoomMsgs(box);
    const a = msgs.get(open), stick = box.scrollHeight - box.scrollTop - box.clientHeight < 80;
    if (!a) { box.innerHTML = `<p class="ms-empty">${T('Yükleniyor…', 'Loading…')}</p>`; return; }
    if (!a.length) { box.innerHTML = `<p class="ms-empty">${T('Henüz mesaj yok. İlk merhabayı sen de!', 'No messages yet. Why not say hello first?')}</p>`; return; }
    let day = '', html = '';
    const lastMine = [...a].reverse().find(m => m.sender === uid && m.kind === 'text');
    a.forEach(m => {
      const d = dayOf(m.created_at); if (d !== day) { day = d; html += `<p class="ms-day"><span>${esc(d)}</span></p>`; }
      const mine = m.sender === uid;
      if (m.kind === 'nudge') html += `<p class="ms-sys">📳 ${mine ? T('Titreşim gönderdin', 'You sent a nudge') : T(`${esc(name(m.sender))} sana titreşim gönderdi`, `${esc(name(m.sender))} sent you a nudge`)} · ${hm(m.created_at)}</p>`;
      else html += `<div class="ms-b ${mine ? 'me' : 'them'}${m.tmp ? ' tmp' : ''}${m.fail ? ' fail' : ''}"><p>${emo(m.body)}</p><small>${hm(m.created_at)}${mine && m === lastMine ? (m.fail ? ' · ' + T('gönderilemedi', 'not sent') : m.tmp ? ' · …' : m.read_at ? ' · ' + T('görüldü', 'seen') : ' · ✓') : ''}</small></div>`;
    });
    box.innerHTML = html;
    if (stick || box.dataset.peer !== open) box.scrollTop = box.scrollHeight;
    box.dataset.peer = open;
  }
  function drawTyping() { const t = el && el.querySelector('.ms-typing'); if (!t || isR(open)) return; const at = typing.get(open); t.textContent = at && Date.now() - at < 5000 ? T(`${name(open)} yazıyor…`, `${name(open)} is typing…`) : ''; }
  function typingPing() { if (!open || Date.now() - typT < 3000) return; typT = Date.now(); api('/rest/v1/msn_typing?on_conflict=owner,peer', { method: 'POST', body: { owner: uid, peer: open }, prefer: 'resolution=merge-duplicates,return=minimal' }).catch(() => {}); }
  async function send(kind, body) {
    const peer = open, tmp = { id: 'tmp' + Date.now(), tmp: true, sender: uid, receiver: peer, kind, body, created_at: new Date().toISOString() };
    const a = msgs.get(peer) || []; msgs.set(peer, a); a.push(tmp); drawMsgs();
    try { const r = await api('/rest/v1/msn_messages', { method: 'POST', body: { receiver: peer, kind, body }, prefer: 'return=representation' }); const i = a.indexOf(tmp); if (r && r[0]) { if (a.some(m => m.id === r[0].id)) { if (i >= 0) a.splice(i, 1); } else if (i >= 0) a.splice(i, 1, r[0]); maxId = Math.max(maxId, r[0].id); } typT = 0; }
    catch (e) { tmp.fail = true; toast(e.status === 403 || /row-level/i.test(e.message) ? T('Mesaj gönderilemedi: bu kişiyle artık bağlantınız yok', 'Message not sent: you’re no longer connected with this person') : e.message, '⚠️'); }
    if (open === peer) drawMsgs();
  }

  /* ---------------- grup sohbeti arayüzü ---------------- */
  const okFriends = () => [...friends.values()].filter(f => f.state === 'accepted').map(f => f.friend);
  function newRoom() {
    const fl = okFriends();
    if (!fl.length) return toast(T('Grup sohbeti için önce arkadaş eklemelisin', 'Add some friends first to start a group chat'), '👥');
    modal(`<p class="ms-k">${T('Yeni grup sohbeti', 'New group chat')}</p><h2>${T('Aynı odada en çok 6 kişi', 'Up to 6 people in one room')}</h2>
      <form class="ms-form" data-f="room"><label><span>${T('Grubun adı', 'Group name')}</span><input name="n" required maxlength="40" placeholder="${T('Örn. Aile sohbeti', 'e.g. Family chat')}"></label>
        <p class="ms-pickc">${T('Kişileri seç', 'Choose people')} <b>0/5</b></p>
        <div class="ms-people">${fl.sort((a, b) => name(a).localeCompare(name(b), I18N.locale)).map(id => `<label class="ms-person"><input type="checkbox" value="${id}"><span class="ms-av">${avatar(profiles.get(id), 34)}</span><span>${esc(name(id))}</span></label>`).join('')}</div>
        <p class="ms-msg" role="status"></p><button class="ms-btn" type="submit">${T('Grubu kur', 'Create group')} <i>→</i></button></form>`, (m, close) => {
      const f = m.querySelector('form'), boxes = [...f.querySelectorAll('input[type=checkbox]')], cnt = f.querySelector('.ms-pickc b');
      const upd = () => { const n = boxes.filter(b => b.checked).length; cnt.textContent = n + '/5'; boxes.forEach(b => { b.disabled = !b.checked && n >= 5; }); };
      boxes.forEach(b => b.onchange = upd);
      f.onsubmit = async e => {
        e.preventDefault(); const ids = boxes.filter(b => b.checked).map(b => b.value), msg = f.querySelector('.ms-msg');
        if (!ids.length) { msg.textContent = T('En az bir kişi seç', 'Choose at least one person'); return; }
        msg.textContent = '…'; f.querySelector('[type=submit]').disabled = true;
        try { const id = await rpc('msn_room_create', { p_name: f.n.value.trim(), p_members: ids }); await loadRooms(); close(); openRoom(id); sound('on'); }
        catch (er) { msg.textContent = missing(er) ? T('Grup sohbeti için Supabase’de messenger.sql dosyasını yeniden çalıştırman gerekiyor.', 'For group chats, run messenger.sql again in Supabase.') : er.message; f.querySelector('[type=submit]').disabled = false; }
      };
    });
  }
  async function openRoom(id) {
    if (!rooms.has(id)) return;
    open = 'r:' + id; const a = el && el.querySelector('.ms-app'); if (a) a.classList.add('chatting');
    drawChat(); drawList();
    const r = rooms.get(id);
    try { await Promise.all([msgs.has(open) ? null : loadRoomMsgs(id), r.people ? null : loadPeople(id)]); } catch (e) { toast(e.message, '⚠️'); }
    if (open === 'r:' + id) { drawRoomHead(); drawMsgs(); markRoomRead(id); drawList(); }
    const t = el && el.querySelector('.ms-in'); if (t && matchMedia('(min-width: 900px)').matches) t.focus();
  }
  function drawRoom(c) {
    c.innerHTML = `<header class="ms-ch"></header><div class="ms-msgs" role="log" aria-live="polite"></div><p class="ms-typing"></p>
      <form class="ms-comp"><button type="button" class="ms-ic" data-a="emo" aria-label="${T('İfadeler', 'Emoticons')}" aria-expanded="false">🙂</button>
        <textarea class="ms-in" rows="1" maxlength="2000" placeholder="${T('Gruba yaz…', 'Message the group…')}" aria-label="${T('Mesaj', 'Message')}"></textarea><button class="ms-send" type="submit" aria-label="${T('Gönder', 'Send')}">→</button>
        <div class="ms-pick" hidden>${PICK.map(e => `<button type="button" data-e="${e}">${e}</button>`).join('')}</div></form>`;
    drawRoomHead(); drawMsgs();
    const form = c.querySelector('.ms-comp'), ta = form.querySelector('.ms-in'), pick = form.querySelector('.ms-pick'), eb = form.querySelector('[data-a=emo]');
    const grow = () => { ta.style.height = 'auto'; ta.style.height = Math.min(140, ta.scrollHeight) + 'px'; };
    ta.oninput = grow;
    ta.onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); form.requestSubmit(); } };
    form.onsubmit = e => { e.preventDefault(); const v = ta.value.trim(); if (!v) return; ta.value = ''; grow(); sendRoom(v); pick.hidden = true; };
    eb.onclick = () => { pick.hidden = !pick.hidden; eb.setAttribute('aria-expanded', String(!pick.hidden)); };
    pick.querySelectorAll('[data-e]').forEach(b => b.onclick = () => { const s = ta.selectionStart || ta.value.length; ta.value = ta.value.slice(0, s) + b.dataset.e + ta.value.slice(ta.selectionEnd || s); ta.focus(); grow(); });
  }
  function drawRoomHead() {
    const h = el && el.querySelector('.ms-ch'); if (!h || !isR(open)) return;
    const id = rid(open), r = rooms.get(id); if (!r) return;
    const ppl = r.people || [], others = ppl.filter(p => p.id !== uid), owner = r.owner === uid, full = ppl.length >= 6;
    const addable = okFriends().filter(f => !ppl.some(p => p.id === f));
    h.innerHTML = `<button type="button" class="ms-back" data-a="back" aria-label="${T('Listeye dön', 'Back to list')}">←</button><span class="ms-stack lg">${others.slice(0, 3).map(p => `<span>${avatar(p, 32)}</span>`).join('')}</span>
      <div class="ms-ch-t"><b>${esc(r.name)}</b><small>${ppl.length ? esc(others.map(p => p.name || p.code).join(', ')) + T(' ve sen', ' and you') + ` · ${ppl.length}/6` : '…'}</small></div>
      <div class="ms-menu"><button type="button" class="ms-ic" data-a="menu" aria-label="${T('Grup seçenekleri', 'Group options')}" aria-expanded="false">⋯</button>
        <div class="ms-dd" hidden>
          <p class="ms-ddh">${T('Kişiler', 'People')} (${ppl.length}/6)</p>
          ${ppl.map(p => `<div class="ms-ddp"><span class="ms-av">${avatar(p, 28)}</span><span>${esc(p.id === uid ? T('Sen', 'You') : p.name || p.code)}${p.id === r.owner ? ' <small>★</small>' : ''}</span>${owner && p.id !== uid ? `<button type="button" class="ms-link sm" data-kick="${p.id}" aria-label="${T('Gruptan çıkar', 'Remove from group')}">×</button>` : ''}</div>`).join('')}
          ${full ? `<p class="ms-small">${T('Grup dolu (6 kişi)', 'The group is full (6 people)')}</p>` : addable.length ? `<label>${T('Kişi ekle', 'Add someone')}<select data-a="addp"><option value="">—</option>${addable.map(f => `<option value="${f}">${esc(name(f))}</option>`).join('')}</select></label>` : ''}
          <button type="button" data-a="invite">🔗 ${T('Davet bağlantısı', 'Invite link')}</button><button type="button" data-a="rename">${T('Adını değiştir', 'Rename')}</button><button type="button" data-a="leave" class="danger">${T('Gruptan ayrıl', 'Leave group')}</button></div></div>`;
    h.querySelector('[data-a=back]').onclick = closeChat;
    const dd = h.querySelector('.ms-dd'), mb = h.querySelector('[data-a=menu]');
    mb.onclick = () => { dd.hidden = !dd.hidden; mb.setAttribute('aria-expanded', String(!dd.hidden)); };
    const after = async () => { await loadPeople(id); drawRoomHead(); drawList(); };
    const sel = dd.querySelector('[data-a=addp]'); if (sel) sel.onchange = async () => { if (!sel.value) return; try { const res = await rpc('msn_room_add', { p_room: id, p_member: sel.value }); if (res !== 'ok') toast({ full: T('Grup dolu (6 kişi)', 'The group is full (6 people)'), notfriend: T('Yalnızca arkadaşlarını ekleyebilirsin', 'You can only add your friends'), exists: T('Zaten grupta', 'Already in the group') }[res] || res, '⚠️'); await after(); } catch (e) { toast(e.message, '⚠️'); } };
    dd.querySelectorAll('[data-kick]').forEach(b => b.onclick = async () => { if (!confirm(T(`${name(b.dataset.kick)} gruptan çıkarılsın mı?`, `Remove ${name(b.dataset.kick)} from the group?`))) return; try { await rpc('msn_room_kick', { p_room: id, p_member: b.dataset.kick }); await after(); } catch (e) { toast(e.message, '⚠️'); } });
    dd.querySelector('[data-a=invite]').onclick = () => { dd.hidden = true; inviteLink(id); };
    dd.querySelector('[data-a=rename]').onclick = async () => { const n = (prompt(T('Grubun yeni adı:', 'New name for the group:'), r.name) || '').trim().slice(0, 40); if (!n || n === r.name) return; try { await rpc('msn_room_rename', { p_room: id, p_name: n }); r.name = n; drawRoomHead(); drawList(); } catch (e) { toast(e.message, '⚠️'); } };
    dd.querySelector('[data-a=leave]').onclick = async () => { if (!confirm(T('Bu grup sohbetinden ayrılmak istiyor musun? Mesajları artık göremezsin.', 'Leave this group chat? You won’t see its messages any more.'))) return; try { await rpc('msn_room_leave', { p_room: id }); rooms.delete(id); msgs.delete(open); closeChat(); badge(); } catch (e) { toast(e.message, '⚠️'); } };
  }
  function sysText(m) {
    const who = m.sender === uid ? T('Sen', 'You') : esc(names.get(m.sender) || T('Biri', 'Someone')), b = m.body, other = id => id === uid ? T('seni', 'you') : esc(names.get(id) || T('birini', 'someone'));
    if (b === 'created') return T(`${who} grubu kurdu`, `${who} created the group`);
    if (b === 'joined') return T(`${who} davet bağlantısıyla katıldı`, `${who} joined via the invite link`);
    if (b === 'left') return T(`${who} gruptan ayrıldı`, `${who} left the group`);
    if (b.startsWith('added:')) { const o = b.slice(6); return T(`${who}, ${o === uid ? 'seni' : esc(names.get(o) || 'birini')} ekledi`, `${who} added ${other(o)}`); }
    if (b.startsWith('removed:')) { const o = b.slice(8); return T(`${who}, ${o === uid ? 'seni' : esc(names.get(o) || 'birini')} çıkardı`, `${who} removed ${other(o)}`); }
    if (b.startsWith('renamed:')) return T(`${who} grubun adını “${esc(b.slice(8))}” yaptı`, `${who} renamed the group “${esc(b.slice(8))}”`);
    return esc(b);
  }
  function drawRoomMsgs(box) {
    const key = open, a = msgs.get(key), r = rooms.get(rid(key)), stick = box.scrollHeight - box.scrollTop - box.clientHeight < 80;
    if (!a) { box.innerHTML = `<p class="ms-empty">${T('Yükleniyor…', 'Loading…')}</p>`; return; }
    const others = (r && r.people || []).filter(p => p.id !== uid), lastMine = [...a].reverse().find(m => m.sender === uid && m.kind === 'text' && !m.tmp);
    let day = '', html = '', prev = '';
    a.forEach(m => {
      const d = dayOf(m.created_at); if (d !== day) { day = d; prev = ''; html += `<p class="ms-day"><span>${esc(d)}</span></p>`; }
      if (m.kind === 'system') { prev = ''; html += `<p class="ms-sys">👥 ${sysText(m)} · ${hm(m.created_at)}</p>`; return; }
      const mine = m.sender === uid, first = prev !== m.sender; prev = m.sender;
      const seen = mine && m === lastMine ? others.filter(p => +p.last_read >= m.id).length : 0;
      const pp = others.find(p => p.id === m.sender) || { name: names.get(m.sender) || '?' };
      html += `<div class="ms-b ${mine ? 'me' : 'them'}${m.tmp ? ' tmp' : ''}${m.fail ? ' fail' : ''}${!mine && first ? ' named' : ''}">${!mine && first ? `<span class="ms-who"><span class="ms-av">${avatar(pp, 20)}</span>${esc(pp.name || pp.code || names.get(m.sender) || '?')}</span>` : ''}<p>${emo(m.body)}</p><small>${hm(m.created_at)}${mine && m === lastMine ? (seen ? ' · ' + T(`${seen} kişi gördü`, `seen by ${seen}`) : ' · ✓') : mine && m.tmp ? ' · …' : mine && m.fail ? ' · ' + T('gönderilemedi', 'not sent') : ''}</small></div>`;
    });
    if (!a.length) html = `<p class="ms-empty">${T('Henüz mesaj yok. İlk merhabayı sen de!', 'No messages yet. Why not say hello first?')}</p>`;
    box.innerHTML = html;
    if (stick || box.dataset.peer !== key) box.scrollTop = box.scrollHeight;
    box.dataset.peer = key;
  }
  const linkOf = t => location.origin + location.pathname + '?grup=' + t + '#msn';
  function inviteLink(id) {
    const r = rooms.get(id); if (!r) return;
    const valid = () => r.invite_token && (!r.invite_expires || Date.parse(r.invite_expires) > Date.now());
    const body = () => valid() ? `<div class="ms-link-box"><input readonly value="${esc(linkOf(r.invite_token))}" aria-label="${T('Davet bağlantısı', 'Invite link')}"></div>
        <p class="ms-small">${T(`Son geçerlilik: ${new Date(r.invite_expires).toLocaleDateString(I18N.locale, { day: 'numeric', month: 'long' })}. Bağlantıyı alan, BABA.’ya girebilen herkes grup dolmadıysa (6 kişi) katılabilir.`, `Valid until ${new Date(r.invite_expires).toLocaleDateString(I18N.locale, { day: 'numeric', month: 'long' })}. Anyone with the link who can open BABA. can join while the group has room (6 people).`)}</p>
        <div class="ms-row"><button type="button" class="ms-btn" data-a="share">${navigator.share ? T('Paylaş', 'Share') : T('Kopyala', 'Copy')} <i>→</i></button>${navigator.share ? `<button type="button" class="ms-btn ghost" data-a="copy">${T('Kopyala', 'Copy')}</button>` : ''}</div>
        <div class="ms-row"><button type="button" class="ms-link" data-a="new">↻ ${T('Yeni bağlantı oluştur', 'Create a new link')}</button><button type="button" class="ms-link danger" data-a="off">${T('Bağlantıyı kapat', 'Turn the link off')}</button></div>`
      : `<p>${T('Bağlantıyla arkadaş olmadığın kişileri de gruba çağırabilirsin. Bağlantı 7 gün geçerli olur.', 'With a link you can invite people who aren’t your friends yet. The link stays valid for 7 days.')}</p><button type="button" class="ms-btn" data-a="new">${T('Bağlantı oluştur', 'Create link')} <i>→</i></button>`;
    modal(`<p class="ms-k">${T('Grup daveti', 'Group invite')}</p><h2>${esc(r.name)}</h2><div class="ms-inv"></div><p class="ms-msg" role="status"></p>`, m => {
      const box = m.querySelector('.ms-inv'), msg = m.querySelector('.ms-msg');
      const wire = () => {
        box.innerHTML = body();
        const q = s => box.querySelector(s), text = () => T(`“${r.name}” grup sohbetine katıl: ${linkOf(r.invite_token)}`, `Join the “${r.name}” group chat: ${linkOf(r.invite_token)}`);
        const copy = async () => { try { await navigator.clipboard.writeText(linkOf(r.invite_token)); msg.textContent = T('Bağlantı kopyalandı', 'Link copied'); } catch (e) { const i = q('input'); i.select(); msg.textContent = T('Bağlantıyı seçip kopyala', 'Select the link and copy it'); } };
        if (q('[data-a=share]')) q('[data-a=share]').onclick = () => navigator.share ? navigator.share({ title: r.name, text: text() }).catch(() => {}) : copy();
        if (q('[data-a=copy]')) q('[data-a=copy]').onclick = copy;
        if (q('input')) q('input').onfocus = e => e.target.select();
        q('[data-a=new]').onclick = async () => { msg.textContent = '…'; try { const res = await rpc('msn_room_invite', { p_room: id }); const x = res && res[0]; if (x) { r.invite_token = x.token; r.invite_expires = x.expires; } msg.textContent = ''; wire(); } catch (e) { msg.textContent = missing(e) ? T('Davet bağlantısı için Supabase’de messenger.sql dosyasını yeniden çalıştırman gerekiyor.', 'For invite links, run messenger.sql again in Supabase.') : e.message; } };
        if (q('[data-a=off]')) q('[data-a=off]').onclick = async () => { try { await rpc('msn_room_invite_off', { p_room: id }); r.invite_token = null; r.invite_expires = null; msg.textContent = T('Bağlantı kapatıldı; eski bağlantı artık çalışmaz.', 'Link turned off; the old link no longer works.'); wire(); } catch (e) { msg.textContent = e.message; } };
      };
      wire();
    });
  }
  let joining = false;
  async function checkJoin() {
    const t = pendingJoin(); if (!t || !ready || joining) return;
    joining = true;
    try {
      const pk = await rpc('msn_room_peek', { p_token: t }), p = pk && pk[0];
      const done = () => { try { localStorage.removeItem(JOIN_KEY); } catch (e) {} };
      if (!p) { done(); toast(T('Grup daveti geçersiz ya da kapatılmış', 'The group invite is invalid or has been turned off'), '⚠️'); return; }
      if (p.state === 'member') { done(); await loadRooms(); openTarget('r:' + p.room); return; }
      if (p.state !== 'ok') { done(); toast(p.state === 'full' ? T(`“${p.name}” grubu dolu (6 kişi)`, `The “${p.name}” group is full (6 people)`) : T('Grup davetinin süresi dolmuş', 'The group invite has expired'), '⚠️'); return; }
      modal(`<p class="ms-k">${T('Grup daveti', 'Group invite')}</p><h2>${esc(p.name)}</h2><p>${T(`Bu grup sohbetinde ${p.people} kişi var. Katılırsan gruptakiler adını ve avatarını görür.`, `There are ${p.people} people in this group chat. If you join, they’ll see your name and avatar.`)}</p><p class="ms-msg" role="status"></p>
        <div class="ms-row"><button type="button" class="ms-btn" data-a="join">${T('Gruba katıl', 'Join the group')} <i>→</i></button><button type="button" class="ms-btn ghost" data-a="no">${T('Vazgeç', 'Not now')}</button></div>`, (m, close) => {
        m.querySelector('[data-a=no]').onclick = () => { done(); close(); };
        m.querySelector('[data-a=join]').onclick = async () => {
          try {
            const res = String(await rpc('msn_room_join', { p_token: t }) || '');
            if (/^(ok|member):/.test(res)) { done(); close(); await loadRooms(); sound('on'); toast(T(`“${p.name}” grubuna katıldın`, `You joined “${p.name}”`), '👥'); openTarget('r:' + res.split(':')[1]); return; }
            m.querySelector('.ms-msg').textContent = { full: T('Grup dolu (6 kişi)', 'The group is full (6 people)'), expired: T('Davetin süresi dolmuş', 'The invite has expired'), invalid: T('Davet geçersiz', 'The invite is invalid'), limit: T('Çok fazla grubun var', 'You’re in too many groups') }[res] || res;
            if (res !== 'limit') done();
          } catch (e) { m.querySelector('.ms-msg').textContent = e.message; }
        };
      });
    } catch (e) { if (missing(e)) toast(T('Grup daveti için uygulama sahibinin kurulumu güncellemesi gerekiyor', 'The app owner needs to update the set-up for group invites'), '⚠️'); }
    finally { joining = false; }
  }

  async function sendRoom(body) {
    const key = open, id = rid(key), tmp = { id: 'tmp' + Date.now(), tmp: true, room: id, sender: uid, kind: 'text', body, created_at: new Date().toISOString() };
    const a = msgs.get(key) || []; msgs.set(key, a); a.push(tmp); drawMsgs();
    try { const r = await api('/rest/v1/msn_room_msgs', { method: 'POST', body: { room: id, body }, prefer: 'return=representation' }); const i = a.indexOf(tmp); if (r && r[0]) { if (a.some(m => m.id === r[0].id)) { if (i >= 0) a.splice(i, 1); } else if (i >= 0) a.splice(i, 1, r[0]); maxRid = Math.max(maxRid, r[0].id); const ro = rooms.get(id); if (ro) ro.last_read = Math.max(ro.last_read, r[0].id); } }
    catch (e) { tmp.fail = true; toast(e.message, '⚠️'); }
    if (open === key) drawMsgs();
  }

  /* ---------------- köşe paneli (her sayfada) ---------------- */
  let dock = null, pageEl = null;
  const onPage = () => (location.hash.slice(1) === 'msn');
  const canDock = () => ready && !onPage() && !document.body.classList.contains('locked') && typeof App !== 'undefined' && !!App.user();
  function ensureDock() {
    if (dock) return dock;
    dock = document.createElement('div'); dock.className = 'ms-dock';
    dock.innerHTML = `<div class="ms-panel" hidden role="dialog" aria-label="Messenger"><div class="ms-ph"><b>Messenger</b><a class="ms-link" href="#msn" data-a="full">${T('Tam ekran', 'Full screen')} ↗</a><button type="button" class="ms-x" data-a="close" aria-label="${T('Kapat', 'Close')}">×</button></div><div class="ms ms-mini"><div class="ms-app compact"></div></div></div>
      <button type="button" class="ms-fab" aria-label="Messenger" aria-expanded="false" title="${T('Messenger — sürükleyerek yerini değiştirebilirsin', 'Messenger — drag to move it')}"><svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 7 V33" stroke="#fff" stroke-width="2.6"/><path d="M23 10 Q 12 22 9 32 H23 Z" fill="#7b1e3b"/><path d="M25 13 Q 34 24 38 32 H25 Z" fill="#5ec8f2"/><path d="M6 35 H42 Q 39 41 33 42 H14 Q 8 41 6 35 Z" fill="#ceff00"/></svg><b class="ms-fb" hidden></b></button>`;
    document.body.appendChild(dock);
    dragFab(dock.querySelector('.ms-fab'));
    placeDock();
    addEventListener('resize', placeDock);
    dock.querySelector('[data-a=close]').onclick = closeDock;
    dock.querySelector('[data-a=full]').onclick = () => closeDock();
    return dock;
  }
  /* düğme sürüklenebilir: bırakınca en yakın kenara yapışır, yeri cihazda hatırlanır */
  const POS_KEY = 'msn_fab_pos';
  const getPos = () => { try { const p = JSON.parse(localStorage.getItem(POS_KEY) || 'null'); if (p && (p.s === 'l' || p.s === 'r') && p.y >= 0 && p.y <= 1) return p; } catch (e) {} return null; };
  function placeDock() {
    if (!dock) return;
    const p = getPos(), H = innerHeight, bar = document.querySelector('.cbn-tabs'), barH = bar && getComputedStyle(bar).display !== 'none' ? bar.getBoundingClientRect().height : 0;
    const minB = 12 + barH, maxB = Math.max(minB, H - 140);
    const b = p ? Math.round(minB + (maxB - minB) * p.y) : minB + 6;
    dock.style.setProperty('--fab-b', b + 'px');
    dock.classList.toggle('left', !!p && p.s === 'l');
  }
  function dragFab(fab) {
    let sx = 0, sy = 0, ox = 0, oy = 0, moved = false, id = null;
    fab.addEventListener('pointerdown', e => {
      if (e.button) return; id = e.pointerId; moved = false; sx = e.clientX; sy = e.clientY;
      const r = fab.getBoundingClientRect(); ox = sx - r.left; oy = sy - r.top;
      try { fab.setPointerCapture(id); } catch (er) {}
    });
    fab.addEventListener('pointermove', e => {
      if (e.pointerId !== id) return;
      if (!moved && Math.hypot(e.clientX - sx, e.clientY - sy) < 8) return;
      if (!moved) { moved = true; if (!dock.querySelector('.ms-panel').hidden) closeDock(); dock.classList.add('dragging'); }
      e.preventDefault();
      const w = fab.offsetWidth, x = Math.min(innerWidth - w - 4, Math.max(4, e.clientX - ox)), y = Math.min(innerHeight - w - 4, Math.max(4, e.clientY - oy));
      fab.style.position = 'fixed'; fab.style.left = x + 'px'; fab.style.top = y + 'px';
    });
    const end = e => {
      if (e.pointerId !== id) return; id = null;
      if (!moved) { dock.querySelector('.ms-panel').hidden ? openDock() : closeDock(); return; }
      const r = fab.getBoundingClientRect(), bar = document.querySelector('.cbn-tabs'), barH = bar && getComputedStyle(bar).display !== 'none' ? bar.getBoundingClientRect().height : 0;
      const minB = 12 + barH, maxB = Math.max(minB, innerHeight - 140), b = innerHeight - r.bottom;
      const pos = { s: r.left + r.width / 2 < innerWidth / 2 ? 'l' : 'r', y: Math.min(1, Math.max(0, (b - minB) / Math.max(1, maxB - minB))) };
      try { localStorage.setItem(POS_KEY, JSON.stringify(pos)); } catch (er) {}
      fab.style.position = fab.style.left = fab.style.top = ''; dock.classList.remove('dragging'); placeDock();
    };
    fab.addEventListener('pointerup', end); fab.addEventListener('pointercancel', end);
    fab.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); dock.querySelector('.ms-panel').hidden ? openDock() : closeDock(); } });
    fab.addEventListener('click', e => e.preventDefault());
  }
  function openDock() {
    if (!canDock()) return;
    ensureDock(); const pn = dock.querySelector('.ms-panel'); pn.hidden = false; dock.classList.add('open');
    dock.querySelector('.ms-fab').setAttribute('aria-expanded', 'true');
    el = dock.querySelector('.ms-mini'); drawApp(); readOpen();
  }
  function closeDock() {
    if (!dock) return; dock.querySelector('.ms-panel').hidden = true; dock.classList.remove('open'); dock.querySelector('.ms-fab').setAttribute('aria-expanded', 'false');
    if (el && dock.contains(el)) el = (pageEl && pageEl.isConnected) ? pageEl : null;
  }
  function updateDock() {
    if (!canDock()) { if (dock) { closeDock(); dock.hidden = true; } return; }
    ensureDock(); dock.hidden = false; placeDock();
    dock.querySelector('.ms-panel .ms-ph b').textContent = 'Messenger';
    dock.querySelector('[data-a=full]').textContent = T('Tam ekran', 'Full screen') + ' ↗';
  }
  function openTarget(k) {
    const go = () => isR(k) ? openRoom(rid(k)) : openChat(k);
    if (onPage() && pageEl && pageEl.isConnected) { el = pageEl; go(); return; }
    openDock(); go();
  }
  function popup(k) {        // bildirim gelince köşede sohbeti aç (bir şey yazıyorsan yalnızca simge zıplar)
    if (onPage() || !canDock() || prefs.nopop) return;
    ensureDock(); const fab = dock.querySelector('.ms-fab'); fab.classList.remove('ms-ping'); void fab.offsetWidth; fab.classList.add('ms-ping');
    const a = document.activeElement, typingNow = a && (/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) || a.isContentEditable) && !dock.contains(a);
    if (typingNow || document.querySelector('.bb-pin-ov, .cbn-ov, .ms-ov')) return;
    if (dock.querySelector('.ms-panel').hidden) { openDock(); }
    if (open !== k && !(el && el.querySelector('.ms-in') === document.activeElement && document.activeElement.value)) openTarget(k);
  }
  addEventListener('hashchange', () => setTimeout(() => { updateDock(); placeDock(); }, 60));

  /* ---------------- dış arayüz ---------------- */
  function draw() { if (el && el.isConnected) { if (dock && dock.contains(el)) drawApp(); else page(el); } updateDock(); }
  function mount(root) { page(root); if (!ready && !booting && hasAcc() && !setupMissing) boot(); else if (ready) { syncProfile().then(drawMe).catch(() => {}); catchUp(); } }
  function stopAll() { uid = ''; ready = false; me = null; try { ws && ws.close(); } catch (e) {} ws = null; clearInterval(pollT); clearInterval(beatT); clearInterval(hbT); clearInterval(tokT); clearTimeout(reT); friends.clear(); profiles.clear(); msgs.clear(); unread.clear(); rooms.clear(); rUnread.clear(); updateDock(); pending = []; open = ''; badge(); }
  function check() {          // hesap değiştiyse ya da çıkış yapıldıysa bağlantıyı yenile; açılışta arka planda başlat
    const u = hasAcc() ? CBN.sync.user.id : '';
    if (uid && u !== uid) stopAll();
    if (u && !ready && !booting && !setupMissing) boot();
  }
  setInterval(() => { try { check(); } catch (e) {} }, 15000);
  setTimeout(() => { try { if (typeof CBN !== 'undefined' && App.user()) CBN.ready().then(check).catch(() => {}); } catch (e) {} }, 2500);
  I18N.on(() => { updateDock(); if (el && dock && dock.contains(el)) drawApp(); badge(); });
  setInterval(() => { try { updateDock(); } catch (e) {} }, 3000);
  return { mount, check, get ready() { return ready; }, _emo: emo };
})();
