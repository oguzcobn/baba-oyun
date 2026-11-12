"use strict";
/* CBN · Hesap ve bulut eşitleme (Supabase, ücretsiz katman).
   - Kimlik: e-posta + şifre (Supabase Auth REST). Oturum bu cihazda saklanır.
   - Veri: public.cbn_records tablosu; satır düzeyi güvenlik (RLS) ile herkes yalnızca kendi satırlarını görür.
   - Yöntem: yerel-öncelikli. Her değişiklik önce IndexedDB'ye yazılır, sonra "giden kutusu" üzerinden buluta gönderilir;
     diğer cihazlardaki değişiklikler çekilir. Çakışmada kaydın son değiştirilen hâli geçerlidir.
   - Eşitlenenler: notlar, klasörler, görevler, etkinlikler, proje/aile/finans/hedef/iş kayıtları, ayarlar + profil/avatar.
     Eşitlenmeyenler: not ekleri (dosyalar) ve sürüm geçmişi — bunlar cihazda kalır.
   Buradaki anahtar "publishable" anahtardır; herkese açık olması tasarım gereğidir, veriyi RLS korur. */
(() => {
  const { S, L, idb } = CBN;
  const BASE = 'https://zjzbpeiuhreyfdihzzzj.supabase.co', KEY = 'sb_publishable_LyV2L0UpIAPnuGEdfgNc2Q_hrY8uqgG';
  const STORES = ['notes', 'folders', 'tasks', 'events', 'items'], IDRE = /^[\w-]{1,80}$/;
  let auth = null, out = {}, sm = { user: '', cursor: '' }, st = { s: 'off', at: 0, err: '' }, busy = false, again = false, tmr = null, saveT = null, attached = '', wired = false;
  const akey = () => 'cbn_auth:' + CBN.dbName();
  const setSt = (s, err) => { st = { s, at: s === 'ok' ? Date.now() : st.at, err: err || '' }; const e = document.querySelector('.cbn-sync'); if (e) e.textContent = label(); const b = document.querySelector('.st-sync-state'); if (b) b.textContent = label(); };
  const label = () => !auth ? L('Veriler yalnızca bu cihazda', 'Data stays on this device') : st.s === 'sync' ? L('☁ Eşitleniyor…', '☁ Syncing…') : st.s === 'err' ? L('☁ Eşitlenemedi', '☁ Sync failed') + (st.err ? ' · ' + st.err : '') : st.at ? L('☁ Eşitlendi · ', '☁ Synced · ') + CBN.fmtTime(st.at) : L('☁ Hesap bağlı', '☁ Account linked');
  const saveAuth = () => { try { if (auth) localStorage.setItem(akey(), JSON.stringify(auth)); else localStorage.removeItem(akey()); } catch (e) {} };
  const persist = () => { clearTimeout(saveT); saveT = setTimeout(() => { idb.put('meta', { key: 'outbox', value: out }).catch(() => {}); }, 250); };
  const persistNow = () => { clearTimeout(saveT); return Promise.all([idb.put('meta', { key: 'outbox', value: out }), idb.put('meta', { key: 'sync', value: sm })]).catch(() => {}); };

  async function call(path, o, authed) {
    const h = { apikey: KEY, 'Content-Type': 'application/json' };
    if (authed) { await fresh(); h.Authorization = 'Bearer ' + auth.access_token; }
    if (o && o.prefer) h.Prefer = o.prefer;
    let r; try { r = await fetch(BASE + path, { method: (o && o.method) || 'GET', headers: h, body: o && o.body ? JSON.stringify(o.body) : undefined }); } catch (e) { const er = new Error(L('bağlantı yok', 'offline')); er.offline = true; throw er; }
    const txt = await r.text(); let j = null; try { j = txt ? JSON.parse(txt) : null; } catch (e) {}
    if (!r.ok) { const er = new Error((j && (j.msg || j.message || j.error_description || j.error)) || 'HTTP ' + r.status); er.status = r.status; er.code = j && (j.error_code || j.code); throw er; }
    return j;
  }
  const setSession = j => { auth = { access_token: j.access_token, refresh_token: j.refresh_token, expires_at: Math.floor(Date.now() / 1000) + (+j.expires_in || 3600), user: { id: j.user.id, email: j.user.email } }; saveAuth(); };
  async function fresh() {
    if (!auth) throw new Error(L('oturum yok', 'not signed in'));
    if (auth.expires_at - 90 > Date.now() / 1000) return;
    try { const j = await call('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: { refresh_token: auth.refresh_token } }); setSession(j); }
    catch (e) { if (!e.offline && (e.status === 400 || e.status === 401 || e.status === 403)) { auth = null; saveAuth(); setSt('off'); CBN.toast(L('Oturumun süresi doldu; Ayarlar’dan yeniden giriş yap', 'Your session expired; sign in again in Settings'), { type: 'err' }); } throw e; }
  }
  const trErr = e => { const m = String(e.message || e), c = e.code || ''; return e.offline ? L('İnternet bağlantısı yok', 'No internet connection') : /invalid.*credentials|invalid_credentials/i.test(m + c) ? L('E-posta ya da şifre hatalı', 'Wrong email or password') : /already registered|user_already_exists/i.test(m + c) ? L('Bu e-postayla zaten bir hesap var; giriş yap', 'An account with this email already exists; sign in') : /weak|at least|password/i.test(m + c) ? L('Şifre en az 6 karakter olmalı', 'Password must be at least 6 characters') : /not confirmed|email_not_confirmed/i.test(m + c) ? L('E-posta henüz onaylanmamış; gelen kutundaki bağlantıya tıkla', 'Email not confirmed yet; click the link in your inbox') : /rate|too many/i.test(m + c) ? L('Çok fazla deneme; biraz sonra tekrar dene', 'Too many attempts; try again later') : /signups? (are )?(not allowed|disabled)/i.test(m + c) ? L('Yeni hesap açma kapalı', 'New sign-ups are disabled') : m; };

  async function linkCheck() {        // bu cihazdaki kayıtlar başka bir hesaba bağlıysa karıştırma
    if (sm.user && auth && sm.user !== auth.user.id) {
      const ok = await CBN.confirmBox(L('Bu cihazdaki CBN kayıtları daha önce başka bir hesapla eşitlenmiş. Devam edersen bu kayıtlar şimdi giriş yaptığın hesaba da yüklenecek. Devam edilsin mi?', 'The CBN records on this device were synced with a different account before. If you continue, they will also be uploaded to the account you just signed in to. Continue?'), L('Devam et', 'Continue'), true);
      if (!ok) { auth = null; saveAuth(); setSt('off'); return false; }
    }
    return true;
  }
  async function signIn(email, password) { try { setSession(await call('/auth/v1/token?grant_type=password', { method: 'POST', body: { email, password } })); } catch (e) { throw new Error(trErr(e)); } if (!await linkCheck()) return false; await sync(); return true; }
  async function signUp(email, password) {
    let j; try { j = await call('/auth/v1/signup', { method: 'POST', body: { email, password } }); } catch (e) { throw new Error(trErr(e)); }
    if (j && j.access_token) { setSession(j); if (!await linkCheck()) return false; await sync(); return true; }
    return 'confirm';        // e-posta onayı açıksa oturum dönmez
  }
  async function signOut() { try { if (auth) await call('/auth/v1/logout', { method: 'POST' }, true); } catch (e) {} auth = null; saveAuth(); setSt('off'); }

  /* ---------- giden kutusu ---------- */
  function mark(store, id, delFlag) {
    if (store !== 'meta' && !STORES.includes(store)) return;
    if (store === 'meta' && id !== 'settings') return;
    out[store + '|' + id] = { at: Date.now(), del: !!delFlag }; persist();
    if (auth) { clearTimeout(tmr); tmr = setTimeout(sync, 2500); }
  }
  function markAll() { STORES.forEach(s => S[s].forEach(r => { const k = s + '|' + r.id; if (!out[k]) out[k] = { at: +r.updatedAt || +r.createdAt || 1, del: false }; })); if (!out['meta|settings']) out['meta|settings'] = { at: 1, del: false }; }
  async function markAllDeleted() { STORES.forEach(s => S[s].forEach(r => { out[s + '|' + r.id] = { at: Date.now(), del: true }; })); await persistNow(); }
  const afterRestore = async () => { STORES.forEach(s => S[s].forEach(r => { out[s + '|' + r.id] = { at: Date.now(), del: false }; })); out['meta|settings'] = { at: Date.now(), del: false }; await persistNow(); if (auth) sync(); };

  async function applyRow(r) {
    if (!r || !IDRE.test(r.id) || (r.store !== 'meta' && !STORES.includes(r.store))) return 0;
    const k = r.store + '|' + r.id, o = out[k];
    if (o && o.at >= +r.updated_at) return 0;           // yereldeki daha yeni: gönderilecek
    if (o) delete out[k];
    if (r.store === 'meta') {
      if (r.id !== 'settings' || r.deleted || !r.data || typeof r.data !== 'object') return 0;
      const ns = CBN.normSettings(r.data); if (JSON.stringify(ns) === JSON.stringify(S.settings)) return 0;
      S.settings = ns; await idb.put('meta', { key: 'settings', value: ns }); return 2;
    }
    const arr = S[r.store], i = arr.findIndex(x => x.id === r.id);
    if (r.deleted || !r.data) { if (i < 0) return 0; arr.splice(i, 1); await idb.del(r.store, r.id); return 1; }
    if (typeof r.data !== 'object' || r.data.id !== r.id) return 0;
    if (i >= 0 && JSON.stringify(arr[i]) === JSON.stringify(r.data)) return 0;
    if (i >= 0) arr[i] = r.data; else arr.push(r.data);
    await idb.put(r.store, r.data); return 1;
  }
  /* ilk bağlanışta: bu cihazın başlangıç kayıtları (klasör, örnek proje, profil) buluttakilerle aynı adlıysa tekilleştir */
  async function dedupe() {
    const local = (s, id) => !!out[s + '|' + id], drop = async (s, x) => { const a = S[s], i = a.indexOf(x); if (i >= 0) a.splice(i, 1); delete out[s + '|' + x.id]; await idb.del(s, x.id); };
    for (const f of S.folders.filter(f => local('folders', f.id))) { const twin = S.folders.find(o => o !== f && !local('folders', o.id) && CBN.low(o.name) === CBN.low(f.name)); if (!twin) continue; for (const n of S.notes.filter(n => n.folderId === f.id)) { n.folderId = twin.id; await idb.put('notes', n); out['notes|' + n.id] = { at: Date.now(), del: false }; } await drop('folders', f); }
    for (const p of S.items.filter(x => local('items', x.id) && (x.kind === 'project' || x.kind === 'member'))) {
      const twin = S.items.find(o => o !== p && o.kind === p.kind && !local('items', o.id) && CBN.low(o.name) === CBN.low(p.name)); if (!twin) continue;
      const empty = p.kind === 'member' ? !p.birthday && !p.role : !p.desc && !p.goals && !p.links && !(p.phases || []).length && !(p.ideas || []).length && !(p.decisions || []).length && !(p.noteIds || []).length;
      if (empty) await drop('items', p);
    }
  }
  async function sync() {
    if (!auth || attached !== CBN.dbName()) return;
    if (busy) { again = true; return; }
    busy = true; clearTimeout(tmr); setSt('sync'); let changed = 0;
    try {
      const first = sm.user !== auth.user.id;
      if (first) { sm = { user: auth.user.id, cursor: '' }; markAll(); }
      let off = 0, rows, max = sm.cursor;
      do {
        rows = await call(`/rest/v1/cbn_records?select=store,id,data,updated_at,deleted,server_at${sm.cursor ? '&server_at=gt.' + encodeURIComponent(sm.cursor) : ''}&order=server_at.asc&limit=500&offset=${off}`, null, true) || [];
        for (const r of rows) { changed = Math.max(changed, await applyRow(r)); if (!max || r.server_at > max) max = r.server_at; }
        off += rows.length;
      } while (rows.length === 500);
      if (first) await dedupe();
      const keys = Object.keys(out);
      for (let i = 0; i < keys.length; i += 20) {
        const part = keys.slice(i, i + 20), sent = {};
        const body = part.map(k => { const p = k.indexOf('|'), store = k.slice(0, p), id = k.slice(p + 1), o = out[k]; sent[k] = o.at; const rec = o.del ? null : store === 'meta' ? S.settings : S[store].find(x => x.id === id); return { store, id, data: rec || null, updated_at: o.at, deleted: !rec }; });
        await call('/rest/v1/cbn_records?on_conflict=user_id,store,id', { method: 'POST', body, prefer: 'resolution=merge-duplicates,return=minimal' }, true);
        part.forEach(k => { if (out[k] && out[k].at === sent[k]) delete out[k]; });
      }
      sm.cursor = max || sm.cursor; await persistNow(); setSt('ok');
    } catch (e) { await persistNow(); setSt(e.offline ? 'err' : 'err', e.offline ? L('çevrimdışı', 'offline') : String(e.message || e).slice(0, 80)); }
    busy = false;
    if (changed) { const a = document.activeElement, typing = a && (/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) || a.isContentEditable) || document.querySelector('.cbn-ov'); if (!typing) { if (changed === 2) CBN.redraw(); else CBN.refresh(); } }
    if (again) { again = false; tmr = setTimeout(sync, 800); }
  }

  /* çekirdek, veritabanı her açıldığında çağırır (kullanıcı değişince de) */
  async function attach() {
    attached = CBN.dbName(); out = {}; sm = { user: '', cursor: '' }; auth = null; st = { s: 'off', at: 0, err: '' };
    try { auth = JSON.parse(localStorage.getItem(akey()) || 'null'); if (!auth || !auth.refresh_token || !auth.user) auth = null; } catch (e) { auth = null; }
    try { const [o, m] = await Promise.all([idb.get('meta', 'outbox'), idb.get('meta', 'sync')]); if (o && o.value && typeof o.value === 'object') out = o.value; if (m && m.value && typeof m.value === 'object') sm = { user: String(m.value.user || ''), cursor: String(m.value.cursor || '') }; } catch (e) {}
    if (!wired) { wired = true; document.addEventListener('visibilitychange', () => { if (!document.hidden && auth) sync(); }); addEventListener('online', () => { if (auth) sync(); }); setInterval(() => { if (auth && !document.hidden) sync(); }, 60000); }
    if (auth) sync();
  }
  const token = async () => { await fresh(); return auth.access_token; };   // Messenger aynı oturumu kullanır
  CBN.sync = { token, attach, mark, markAllDeleted, afterRestore, signIn, signUp, signOut, now: sync, label, get user() { return auth && auth.user; }, get state() { return st; }, get pending() { return Object.keys(out).length; } };
})();
