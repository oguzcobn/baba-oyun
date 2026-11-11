"use strict";
/* CBN · Ayarlar — görünüm, dil, modüller, bildirimler, yedekleme / geri yükleme, entegrasyon durumu. */
(() => {
  const { S, L, esc, uid, idb, put, today, fmtStamp, modal, confirmBox, toast, download, sanitize, toText, icon } = CBN;
  const ID = /^[\w-]{1,64}$/, str = (v, n) => String(v == null ? '' : v).slice(0, n || 500), num = v => (typeof v === 'number' && isFinite(v)) ? v : null;
  const dateS = v => /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : '', timeS = v => /^\d{2}:\d{2}$/.test(v) ? v : '';
  const items = a => (Array.isArray(a) ? a : []).slice(0, 200).map(x => ({ id: ID.test(x && x.id) ? x.id : uid(), t: str(x && x.t, 200), done: !!(x && x.done) }));
  const tags = a => (Array.isArray(a) ? a : []).slice(0, 12).map(x => str(x, 30)).filter(Boolean);
  const ids = a => (Array.isArray(a) ? a : []).filter(x => ID.test(x)).slice(0, 500);
  /* içe aktarılan her kayıt tür tür doğrulanır; tanınmayan alanlar atılır */
  const NORM = {
    folders: f => ({ id: f.id, name: str(f.name, 80) || 'Folder', order: num(f.order) || 0, createdAt: num(f.createdAt) || Date.now() }),
    notes: n => { const content = sanitize(str(n.content, 5e6)); return { id: n.id, title: str(n.title, 200), content, text: toText(content), folderId: ID.test(n.folderId) ? n.folderId : null, tags: tags(n.tags), attachments: (Array.isArray(n.attachments) ? n.attachments : []).filter(a => a && ID.test(a.id)).map(a => ({ id: a.id, name: str(a.name, 200), type: str(a.type, 100), size: num(a.size) || 0 })), links: ids(n.links), isPinned: !!n.isPinned, isFavorite: !!n.isFavorite, createdAt: num(n.createdAt) || Date.now(), updatedAt: num(n.updatedAt) || Date.now(), archivedAt: num(n.archivedAt), deletedAt: num(n.deletedAt) }; },
    tasks: t => { const r = t.rep || {}; return { id: t.id, title: str(t.title, 200) || '—', desc: str(t.desc, 4000), priority: Math.min(3, Math.max(0, parseInt(t.priority, 10) || 0)), status: CBN.tasks.STATUS.includes(t.status) ? t.status : 'inbox', start: dateS(t.start), due: dateS(t.due), dueTime: timeS(t.dueTime), remindAt: num(t.remindAt), remFired: num(t.remFired), rep: { type: ['none', 'daily', 'weekly', 'monthly', 'yearly', 'custom'].includes(r.type) ? r.type : 'none', n: Math.min(365, Math.max(1, parseInt(r.n, 10) || 1)), unit: ['day', 'week', 'month'].includes(r.unit) ? r.unit : 'day' }, tags: tags(t.tags), project: str(t.project, 60), subtasks: items(t.subtasks), checklist: items(t.checklist), notes: str(t.notes, 8000), createdAt: num(t.createdAt) || Date.now(), updatedAt: num(t.updatedAt) || Date.now(), completedAt: num(t.completedAt) }; },
    events: e => ({ id: e.id, title: str(e.title, 200) || '—', date: dateS(e.date) || today(), start: timeS(e.start), end: timeS(e.end), location: str(e.location, 200), desc: str(e.desc, 4000), cat: CBN.calendar.CATS[e.cat] ? e.cat : 'personal', remindMin: num(e.remindMin) == null ? '' : e.remindMin, remFired: num(e.remFired), noteIds: ids(e.noteIds), project: str(e.project, 60), createdAt: num(e.createdAt) || Date.now(), updatedAt: num(e.updatedAt) || Date.now() }),
    items: x => (typeof x.kind === 'string' && /^[a-z]{2,12}$/.test(x.kind)) ? JSON.parse(JSON.stringify(x)) : null,
    versions: v => ID.test(v.noteId) ? { id: v.id, noteId: v.noteId, title: str(v.title, 200), content: sanitize(str(v.content, 5e6)), at: num(v.at) || Date.now() } : null
  };
  const b2d = b => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(b); });
  const d2b = async d => { const m = /^data:([^;,]*)(;base64)?,(.*)$/s.exec(d); if (!m) throw new Error('bad'); const bin = atob(m[3]), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return new Blob([u], { type: m[1] || 'application/octet-stream' }); };

  async function exportAll() {
    try {
      const [versions, files] = await Promise.all([idb.all('versions'), idb.all('files')]), f2 = [];
      for (const f of files) f2.push({ id: f.id, noteId: f.noteId, name: f.name, type: f.type, size: f.size, data: await b2d(f.blob) });
      const out = { app: 'cbn', schema: CBN.SCHEMA, exportedAt: new Date().toISOString(), data: { notes: S.notes, folders: S.folders, tasks: S.tasks, events: S.events, items: S.items, versions, files: f2, settings: S.settings } };
      download(`cbn-yedek-${today()}.json`, JSON.stringify(out), 'application/json');
      S.settings.lastBackup = Date.now(); await CBN.saveSettings(); toast(L('Yedek indirildi', 'Backup downloaded')); CBN.refresh();
    } catch (e) { console.error(e); toast(L('Yedek oluşturulamadı', 'Could not create the backup'), { type: 'err' }); }
  }
  async function importFile(file) {
    let j; try { j = JSON.parse(await file.text()); } catch (e) { return toast(L('Dosya okunamadı: geçerli bir JSON değil', 'Could not read the file: not valid JSON'), { type: 'err' }); }
    if (!j || j.app !== 'cbn' || !j.data || typeof j.data !== 'object') return toast(L('Bu bir CBN yedeği değil', 'This is not a CBN backup'), { type: 'err' });
    if (!(j.schema >= 1) || j.schema > CBN.SCHEMA) return toast(L('Bu yedek daha yeni bir CBN sürümünden; önce uygulamayı güncelle', 'This backup comes from a newer CBN version; update the app first'), { type: 'err' });
    const d = {}; let skipped = 0;
    Object.keys(NORM).forEach(k => { d[k] = []; (Array.isArray(j.data[k]) ? j.data[k] : []).forEach(x => { let o = null; try { if (x && typeof x === 'object' && ID.test(x.id)) o = NORM[k](x); } catch (e) {} if (o) d[k].push(o); else skipped++; }); });
    const files = (Array.isArray(j.data.files) ? j.data.files : []).filter(f => f && ID.test(f.id) && ID.test(f.noteId) && typeof f.data === 'string');
    const row = (a, b) => `<tr><td>${a}</td><td><b>${b}</b></td></tr>`;
    modal({ title: L('Yedeği geri yükle', 'Restore backup'), html: `<form class="cbn-form">
      <p>${L('Yedek tarihi', 'Backup date')}: <b>${esc(j.exportedAt ? fmtStamp(new Date(j.exportedAt).getTime()) : '—')}</b></p>
      <table class="st-tbl"><tbody>${row(L('Not', 'Notes'), d.notes.length)}${row(L('Klasör', 'Folders'), d.folders.length)}${row(L('Görev', 'Tasks'), d.tasks.length)}${row(L('Etkinlik', 'Events'), d.events.length)}${row(L('Proje, aile, finans, hedef, iş kayıtları', 'Project, family, finance, goal, work records'), d.items.length)}${row(L('Ek dosya', 'Attachments'), files.length)}${skipped ? row(L('Atlanan bozuk kayıt', 'Skipped invalid records'), skipped) : ''}</tbody></table>
      <label class="st-radio"><input type="radio" name="mode" value="merge" checked> <span><b>${L('Birleştir', 'Merge')}</b> — ${L('mevcut kayıtlar kalır; aynı kimlikli kayıtlar yedektekiyle güncellenir.', 'existing records stay; records with the same ID are updated from the backup.')}</span></label>
      <label class="st-radio"><input type="radio" name="mode" value="replace"> <span><b>${L('Değiştir', 'Replace')}</b> — ${L('bu cihazdaki tüm CBN verisi silinir, yerine yedek yüklenir.', 'all CBN data on this device is deleted and replaced by the backup.')}</span></label>
      <div class="cbn-actions"><button type="button" class="cbn-btn ghost" data-a="no">${L('Vazgeç', 'Cancel')}</button><button class="cbn-btn">${L('Geri yükle', 'Restore')}</button></div></form>`,
      onOpen(box, close) {
        box.querySelector('[data-a=no]').onclick = close;
        box.querySelector('form').onsubmit = async e => {
          e.preventDefault(); const replace = e.target.mode.value === 'replace';
          if (replace && !await confirmBox(L('Bu cihazdaki TÜM CBN notları, görevleri ve etkinlikleri silinip yedekle değiştirilecek. Emin misin?', 'ALL CBN notes, tasks and events on this device will be deleted and replaced by the backup. Are you sure?'), L('Sil ve geri yükle', 'Delete and restore'), true)) return;
          close();
          try {
            const stores = ['notes', 'folders', 'tasks', 'events', 'items', 'versions'];
            if (replace) for (const s of [...stores, 'files']) await idb.clear(s);
            for (const s of stores) for (const o of d[s]) await idb.put(s, o);
            let bad = 0; for (const f of files) { try { await idb.put('files', { id: f.id, noteId: f.noteId, name: str(f.name, 200), type: str(f.type, 100), size: num(f.size) || 0, blob: await d2b(f.data) }); } catch (er) { bad++; } }
            if (replace && j.data.settings) { const cur = S.settings, ns = CBN.normSettings(j.data.settings); ns.lastBackup = cur.lastBackup; await idb.put('meta', { key: 'settings', value: ns }); }
            await CBN.reload(); CBN.redraw();
            toast(L('Yedek geri yüklendi', 'Backup restored') + (bad ? ` · ${bad} ${L('ek okunamadı', 'attachments failed')}` : ''));
          } catch (er) { console.error(er); toast(L('Geri yükleme tamamlanamadı', 'Restore did not complete'), { type: 'err' }); try { await CBN.reload(); CBN.redraw(); } catch (e2) {} }
        };
      } });
  }

  function render(main) {
    const s = S.settings, sel = (name, opts, cur) => `<select name="${name}">${opts.map(o => `<option value="${o[0]}" ${o[0] === cur ? 'selected' : ''}>${esc(o[1])}</option>`).join('')}</select>`;
    const perm = 'Notification' in window ? Notification.permission : 'unsupported';
    const permTxt = { granted: L('İzin verildi', 'Allowed'), denied: L('Tarayıcıda engelli', 'Blocked in browser'), default: L('Henüz izin istenmedi', 'Not requested yet'), unsupported: L('Bu tarayıcı desteklemiyor', 'Not supported by this browser') }[perm];
    const soon = (v, a) => `<li><b>${v}</b> ${a.map(x => `<span class="cbn-badge">${x}</span>`).join(' ')}</li>`;
    main.innerHTML = `<header class="cbn-head"><div><h1>${esc(CBN.modName('settings'))}</h1><p class="cbn-sub">${L('Ayarlar ve tüm veriler yalnızca bu cihazda saklanır.', 'Settings and all data are stored on this device only.')}</p></div></header>
      <div class="st">
      <section class="cbn-card"><h2>${L('Görünüm ve dil', 'Appearance & language')}</h2><div class="cbn-fg">
        <label>${L('Tema', 'Theme')}${sel('theme', [['system', L('Sistem', 'System')], ['light', L('Açık', 'Light')], ['dark', L('Koyu', 'Dark')]], s.theme)}</label>
        <label>${L('Dil', 'Language')}${sel('lang', [['tr', 'Türkçe'], ['en', 'English']], s.lang)}</label>
        <label>${L('Tarih biçimi', 'Date format')}${sel('dateFmt', [['dmy', '31.12.2026'], ['mdy', '12/31/2026'], ['ymd', '2026-12-31']], s.dateFmt)}</label>
        <label>${L('Başlangıç sayfası', 'Start page')}${sel('startPage', CBN.MODS.filter(m => m !== 'settings').map(m => [m, CBN.modName(m)]), s.startPage)}</label>
        <label>${L('Varsayılan para birimi', 'Default currency')}${sel('cur', ['TRY', 'GBP', 'EUR', 'USD'].map(c => [c, c]), s.cur || 'TRY')}</label></div></section>

      <section class="cbn-card"><h2>${L('Modüller', 'Modules')}</h2><p class="cbn-hint">${L('Sırala, yeniden adlandır ya da menüden gizle. Gizlenen modülün verisi silinmez.', 'Reorder, rename or hide from the menu. Hiding a module never deletes its data.')}</p>
        <ul class="st-mods">${s.modules.map((m, i) => `<li data-id="${m.id}">${icon(m.id)}<input value="${esc(m.name)}" placeholder="${esc(L(CBN.MOD_NAME[m.id][0], CBN.MOD_NAME[m.id][1]))}" maxlength="30" aria-label="${L('Modül adı', 'Module name')}: ${esc(CBN.modName(m.id))}"><button type="button" class="cbn-ib" data-mv="-1" ${i ? '' : 'disabled'} aria-label="${L('Yukarı taşı', 'Move up')}">↑</button><button type="button" class="cbn-ib" data-mv="1" ${i < s.modules.length - 1 ? '' : 'disabled'} aria-label="${L('Aşağı taşı', 'Move down')}">↓</button>${m.id === 'settings' ? `<span class="st-fixed">${L('sabit', 'fixed')}</span>` : `<label class="st-sw"><input type="checkbox" ${m.hidden ? '' : 'checked'}> ${L('Göster', 'Show')}</label>`}</li>`).join('')}</ul></section>

      <section class="cbn-card"><h2>${L('Bildirimler', 'Notifications')}</h2>
        <label class="st-sw big"><input type="checkbox" name="notif" ${s.notif ? 'checked' : ''}> ${L('Görev ve etkinlik hatırlatmalarını göster', 'Show task and event reminders')}</label>
        <p>${L('Tarayıcı bildirimi', 'Browser notifications')}: <b>${permTxt}</b> ${perm === 'default' ? `<button type="button" class="cbn-btn ghost sm" data-a="perm">${L('İzin iste', 'Ask permission')}</button>` : ''}</p>
        <p class="cbn-hint">${L('Hatırlatmalar yalnızca BABA. açıkken (ya da arka planda çalışırken) gelir. Uygulama kapalıyken bildirim göndermek sunucu tarafı zamanlayıcı ve push altyapısı gerektirir; bu henüz yok. Kesin çalması gereken etkinlikleri .ics ile telefon takvimine ekle.', 'Reminders only arrive while BABA. is open (or running in the background). Sending notifications while the app is closed needs a server-side scheduler and push infrastructure, which does not exist yet. For must-not-miss events, add them to your phone calendar via .ics.')}</p></section>

      <section class="cbn-card"><h2>${L('Yedekleme ve geri yükleme', 'Backup & restore')}</h2>
        <p>${S.notes.length} ${L('not', 'notes')} · ${S.tasks.length} ${L('görev', 'tasks')} · ${S.events.length} ${L('etkinlik', 'events')} · ${S.folders.length} ${L('klasör', 'folders')} · ${S.items.length} ${L('diğer kayıt', 'other records')}<span class="st-usage"></span></p>
        <p>${L('Son yedek', 'Last backup')}: <b>${s.lastBackup ? esc(fmtStamp(s.lastBackup)) : L('hiç alınmadı', 'never')}</b></p>
        <div class="cbn-actions left"><button type="button" class="cbn-btn" data-a="export">${L('Yedeği indir (JSON)', 'Download backup (JSON)')}</button><button type="button" class="cbn-btn ghost" data-a="import">${L('Yedekten geri yükle…', 'Restore from backup…')}</button><button type="button" class="cbn-btn ghost" data-a="persist">${L('Kalıcı depolama iste', 'Request persistent storage')}</button><input type="file" accept="application/json,.json" hidden></div>
        <p class="cbn-hint">${L('Veriler tarayıcının IndexedDB deposunda durur: tarayıcı verisini temizlersen ya da cihaz değiştirirsen kaybolur, cihazlar arasında eşitlenmez. Düzenli yedek al. Yedek dosyası şifresizdir; notların ve eklerin tamamını içerir.', 'Data lives in the browser’s IndexedDB: clearing browser data or switching devices loses it, and nothing syncs across devices. Back up regularly. The backup file is unencrypted and contains all your notes and attachments.')}</p></section>

      <section class="cbn-card"><h2>${L('Entegrasyonlar', 'Integrations')}</h2><ul class="st-int">
        ${[['Google Calendar', L('Entegrasyon katmanı hazır, bağlantı yok', 'Integration layer ready, no connection')], [L('Bulut senkronizasyonu', 'Cloud sync'), L('Kimlik doğrulamalı backend (ör. Supabase) kurulmadan açılamaz', 'Cannot be enabled without an authenticated backend (e.g. Supabase)')], [L('Kur dönüşümü', 'Currency conversion'), L('Güvenilir kur servisi bağlı değil', 'No trusted rate service connected')], [L('Arka plan bildirimleri', 'Background push'), L('Sunucu tarafı zamanlayıcı gerekir', 'Needs a server-side scheduler')]].map(x => `<li><b>${esc(x[0])}</b><span>${esc(x[1])}</span><span class="cbn-badge${x[2] ? ' ok' : ''}">${x[2] ? L('Bağlı', 'Connected') : L('Bağlı değil', 'Not connected')}</span></li>`).join('')}</ul></section>

      <section class="cbn-card"><h2>${L('Yol haritası', 'Roadmap')}</h2><ul class="st-road">
        ${soon(L('Sürüm 1', 'Version 1'), ['Dashboard', 'Notes', 'Tasks', 'Calendar', 'Quick Capture', L('Yedekleme', 'Backup')])}
        ${soon(L('Sürüm 2', 'Version 2'), ['Projects & Idea Lab', 'Family Hub', 'Global Search', 'Voice Inbox'])}
        ${soon(L('Sürüm 3 — bu sürüm', 'Version 3 — this release'), ['Finance', 'Goals & Habits', 'Work Space', 'Knowledge Graph'])}
        ${soon(L('Altyapı bekleyenler', 'Waiting on infrastructure'), [L('Bulut senkronizasyonu', 'Cloud sync'), 'Vault', 'Smart Routines', L('Arka plan bildirimleri', 'Background push')])}</ul>
        <p class="cbn-hint">CBN ${L('veri şeması', 'data schema')} v${CBN.SCHEMA}</p></section></div>`;

    const $ = q => main.querySelector(q);
    ['theme', 'lang', 'dateFmt', 'startPage', 'cur'].forEach(k => $(`[name=${k}]`).onchange = e => { s[k] = e.target.value; CBN.saveSettings(); CBN.redraw(); });
    main.querySelectorAll('.st-mods li').forEach(li => {
      const m = s.modules.find(x => x.id === li.dataset.id), i = s.modules.indexOf(m);
      li.querySelector('input:not([type])').onchange = e => { m.name = e.target.value.trim().slice(0, 30); CBN.saveSettings(); CBN.redraw(); };
      li.querySelectorAll('[data-mv]').forEach(b => b.onclick = () => { const j = i + (+b.dataset.mv); if (j < 0 || j >= s.modules.length) return; s.modules.splice(i, 1); s.modules.splice(j, 0, m); CBN.saveSettings(); CBN.redraw(); });
      const cb = li.querySelector('input[type=checkbox]'); if (cb) cb.onchange = () => { m.hidden = !cb.checked; if (m.hidden && s.startPage === m.id) s.startPage = (s.modules.find(x => !x.hidden && x.id !== 'settings') || { id: 'home' }).id; CBN.saveSettings(); CBN.redraw(); };
    });
    $('[name=notif]').onchange = e => { s.notif = e.target.checked; CBN.saveSettings(); };
    if ($('[data-a=perm]')) $('[data-a=perm]').onclick = async () => { try { await Notification.requestPermission(); } catch (e) {} CBN.refresh(); };
    $('[data-a=export]').onclick = exportAll;
    const fi = $('input[type=file]'); $('[data-a=import]').onclick = () => fi.click(); fi.onchange = () => { const f = fi.files[0]; fi.value = ''; if (f) importFile(f); };
    $('[data-a=persist]').onclick = async () => { let ok = false; try { ok = !!(navigator.storage && navigator.storage.persist && await navigator.storage.persist()); } catch (e) {} toast(ok ? L('Kalıcı depolama etkin: tarayıcı bu veriyi kendiliğinden silmez', 'Persistent storage granted: the browser will not evict this data on its own') : L('Tarayıcı kalıcı depolama izni vermedi; düzenli yedek al', 'The browser did not grant persistent storage; keep regular backups'), { type: ok ? '' : 'err' }); };
    if (navigator.storage && navigator.storage.estimate) navigator.storage.estimate().then(e => { const u = $('.st-usage'); if (u && e && e.usage != null) u.textContent = ' · ' + (e.usage / 1048576).toFixed(1) + ' MB ' + L('kullanılıyor', 'used'); }).catch(() => {});
  }
  CBN.settings = { exportAll, importFile };
  CBN.register('settings', { render });
})();
