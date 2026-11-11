"use strict";
/* CBN · Notlar — zengin metin editörü (bağımlılıksız), klasör, etiket, sabitleme, favori,
   arşiv, çöp kutusu, sürüm geçmişi, ekler, ilişkili notlar, Markdown/PDF dışa aktarma, tam metin arama. */
(() => {
  const { S, L, esc, uid, put, del, idb, fmtDate, fmtStamp, fmtTime, modal, confirmBox, promptBox, toast, empty, low, sanitize, toText, download } = CBN;
  const MAX_FILE = 10 * 1024 * 1024, MAX_VERSIONS = 20;
  let st = { scope: 'all', q: '', tag: '' }, flush = null;
  const title = n => n.title || L('Başlıksız not', 'Untitled note');
  const folderName = id => { const f = S.folders.find(x => x.id === id); return f ? f.name : ''; };
  const folders = () => S.folders.slice().sort((a, b) => (a.order || 0) - (b.order || 0) || a.createdAt - b.createdAt);
  const active = n => !n.deletedAt && !n.archivedAt;

  function create(p) {
    const now = Date.now(), n = Object.assign({ id: uid(), title: '', content: '', text: '', folderId: null, tags: [], attachments: [], links: [], isPinned: false, isFavorite: false, createdAt: now, updatedAt: now, archivedAt: null, deletedAt: null }, p || {});
    n.content = sanitize(n.content); n.text = toText(n.content);
    return put('notes', n).then(() => n);
  }
  async function purge(n) {
    const [vs, fs] = await Promise.all([idb.byIndex('versions', 'noteId', n.id), idb.byIndex('files', 'noteId', n.id)]);
    for (const v of vs) await idb.del('versions', v.id);
    for (const f of fs) await idb.del('files', f.id);
    S.notes.forEach(o => { if ((o.links || []).includes(n.id)) { o.links = o.links.filter(x => x !== n.id); put('notes', o); } });
    await del('notes', n.id);
  }

  /* ---------- liste ---------- */
  function filtered() {
    const words = low(st.q).split(/\s+/).filter(Boolean);
    return S.notes.filter(n => {
      if (st.scope === 'trash') { if (!n.deletedAt) return false; }
      else if (st.scope === 'archived') { if (n.deletedAt || !n.archivedAt) return false; }
      else { if (!active(n)) return false; if (st.scope === 'fav' && !n.isFavorite) return false; if (st.scope === 'none' && n.folderId && folderName(n.folderId)) return false; if (!['all', 'fav', 'none'].includes(st.scope) && n.folderId !== st.scope) return false; }
      if (st.tag && !(n.tags || []).includes(st.tag)) return false;
      if (words.length) { const hay = low(n.title + ' ' + n.text + ' ' + (n.tags || []).join(' ')); if (!words.every(w => hay.includes(w))) return false; }
      return true;
    }).sort((a, b) => (b.isPinned - a.isPinned) || b.updatedAt - a.updatedAt);
  }
  function list(main) {
    if (!['all', 'none', 'fav', 'archived', 'trash'].includes(st.scope) && !S.folders.some(f => f.id === st.scope)) st.scope = 'all';
    const act = S.notes.filter(active), cnt = id => act.filter(n => n.folderId === id).length, view = ['list', 'cards', 'compact'].includes(S.settings.notesView) ? S.settings.notesView : 'list';
    const tags = [...new Set(act.flatMap(n => n.tags || []))].sort((a, b) => a.localeCompare(b, 'tr'));
    const fb = (k, label, c, ic) => `<button type="button" class="nt-f${st.scope === k ? ' on' : ''}" data-s="${esc(k)}" ${st.scope === k ? 'aria-current="true"' : ''}><span>${ic ? ic + ' ' : ''}${esc(label)}</span>${c != null ? `<i>${c}</i>` : ''}</button>`;
    const isFolder = S.folders.some(f => f.id === st.scope);
    main.innerHTML = `<header class="cbn-head"><div><h1>${esc(CBN.modName('notes'))}</h1><p class="cbn-sub">${act.length} ${L('not', 'notes')} · ${S.folders.length} ${L('klasör', 'folders')}</p></div><button type="button" class="cbn-btn" data-a="new">＋ ${L('Yeni not', 'New note')}</button></header>
      <div class="nts">
        <aside class="nt-folders" aria-label="${L('Klasörler', 'Folders')}">
          ${fb('all', L('Tüm notlar', 'All notes'), act.length)}${fb('fav', L('Favoriler', 'Favorites'), act.filter(n => n.isFavorite).length, '★')}
          <div class="nt-sep">${L('Klasörler', 'Folders')}</div>
          ${folders().map(f => fb(f.id, f.name, cnt(f.id))).join('')}${fb('none', L('Klasörsüz', 'No folder'), act.filter(n => !n.folderId || !folderName(n.folderId)).length)}
          <button type="button" class="nt-f add" data-a="addf">＋ ${L('Klasör', 'Folder')}</button>
          <div class="nt-sep"></div>
          ${fb('archived', L('Arşiv', 'Archive'), S.notes.filter(n => !n.deletedAt && n.archivedAt).length, '🗄')}${fb('trash', L('Çöp kutusu', 'Trash'), S.notes.filter(n => n.deletedAt).length, '🗑')}
        </aside>
        <div class="nt-wrap">
          <div class="nt-bar"><input type="search" class="cbn-search" value="${esc(st.q)}" placeholder="${L('Notlarda ara (başlık, içerik, etiket)…', 'Search notes (title, content, tags)…')}" aria-label="${L('Notlarda ara', 'Search notes')}">
            <select class="nt-tag" aria-label="${L('Etikete göre süz', 'Filter by tag')}"><option value="">${L('Tüm etiketler', 'All tags')}</option>${tags.map(t => `<option value="${esc(t)}" ${st.tag === t ? 'selected' : ''}>#${esc(t)}</option>`).join('')}</select>
            <div class="cbn-seg sm" role="group" aria-label="${L('Görünüm', 'View')}">${[['list', L('Liste', 'List')], ['cards', L('Kart', 'Cards')], ['compact', L('Kompakt', 'Compact')]].map(v => `<button type="button" data-v="${v[0]}" class="${view === v[0] ? 'on' : ''}" aria-pressed="${view === v[0]}">${v[1]}</button>`).join('')}</div></div>
          ${isFolder ? `<div class="nt-fact"><b>${esc(folderName(st.scope))}</b><button type="button" class="cbn-btn ghost sm" data-a="renf">${L('Yeniden adlandır', 'Rename')}</button><button type="button" class="cbn-btn ghost sm danger" data-a="delf">${L('Klasörü sil', 'Delete folder')}</button></div>` : ''}
          ${st.scope === 'trash' && S.notes.some(n => n.deletedAt) ? `<div class="nt-fact"><span>${L('Çöp kutusundaki notlar sen silene kadar durur.', 'Notes stay in trash until you delete them.')}</span><button type="button" class="cbn-btn ghost sm danger" data-a="emptytrash">${L('Çöpü boşalt', 'Empty trash')}</button></div>` : ''}
          <div class="nt-list v-${view}"></div>
        </div></div>`;
    const box = main.querySelector('.nt-list');
    const draw = () => {
      const a = filtered();
      box.innerHTML = a.length ? a.map(n => {
        const meta = `<span class="nt-meta">${n.isPinned ? '<i title="' + L('Sabitlendi', 'Pinned') + '">📌</i>' : ''}${n.isFavorite ? '<i>★</i>' : ''}${(n.attachments || []).length ? '<i>📎</i>' : ''}${folderName(n.folderId) ? `<em>${esc(folderName(n.folderId))}</em>` : ''}<time>${esc(fmtDate(n.updatedAt))}</time>${(n.tags || []).slice(0, 3).map(t => `<u>#${esc(t)}</u>`).join('')}</span>`;
        if (st.scope === 'trash') return `<div class="nt-item" data-id="${esc(n.id)}"><b>${esc(title(n))}</b><p>${esc(n.text.slice(0, 160))}</p>${meta}<div class="nt-tr"><button type="button" class="cbn-btn ghost sm" data-x="restore">${L('Geri yükle', 'Restore')}</button><button type="button" class="cbn-btn ghost sm danger" data-x="kill">${L('Kalıcı sil', 'Delete forever')}</button></div></div>`;
        return `<a class="nt-item${n.isPinned ? ' pin' : ''}" href="#cbn/notes/${encodeURIComponent(n.id)}"><b>${esc(title(n))}</b><p>${esc(n.text.slice(0, 160)) || `<span class="muted">${L('Boş not', 'Empty note')}</span>`}</p>${meta}</a>`;
      }).join('') : empty(st.q || st.tag ? '🔍' : st.scope === 'trash' ? '🗑' : '📝', st.q || st.tag ? L('Eşleşen not yok', 'No matching notes') : st.scope === 'trash' ? L('Çöp kutusu boş', 'Trash is empty') : L('Burada henüz not yok', 'No notes here yet'), st.q || st.tag || st.scope === 'trash' || st.scope === 'archived' ? '' : L('“Yeni not” ile ilk notunu oluştur.', 'Create your first note with “New note”.'));
      box.querySelectorAll('[data-x]').forEach(b => b.onclick = async () => {
        const n = S.notes.find(x => x.id === b.closest('.nt-item').dataset.id); if (!n) return;
        if (b.dataset.x === 'restore') { n.deletedAt = null; await put('notes', n); toast(L('Not geri yüklendi', 'Note restored')); }
        else { if (!await confirmBox(L('Bu not, sürüm geçmişi ve ekleriyle birlikte kalıcı olarak silinsin mi? Bu işlem geri alınamaz.', 'Permanently delete this note with its history and attachments? This cannot be undone.'), L('Kalıcı sil', 'Delete forever'), true)) return; await purge(n); }
        CBN.refresh();
      });
    };
    draw();
    main.querySelectorAll('[data-s]').forEach(b => b.onclick = () => { st.scope = b.dataset.s; CBN.refresh(); });
    main.querySelector('.cbn-search').oninput = e => { st.q = e.target.value; draw(); };
    main.querySelector('.nt-tag').onchange = e => { st.tag = e.target.value; draw(); };
    main.querySelectorAll('[data-v]').forEach(b => b.onclick = () => { S.settings.notesView = b.dataset.v; CBN.saveSettings(); CBN.refresh(); });
    const on = (a, f) => { const b = main.querySelector(`[data-a=${a}]`); if (b) b.onclick = f; };
    on('new', async () => { const n = await create({ folderId: isFolder ? st.scope : null }); CBN.go('notes/' + n.id); });
    on('addf', async () => { const v = await promptBox(L('Yeni klasör', 'New folder'), L('Klasör adı', 'Folder name'), ''); if (!v) return; const f = { id: uid(), name: v, order: S.folders.length, createdAt: Date.now() }; await put('folders', f); st.scope = f.id; CBN.refresh(); });
    on('renf', async () => { const f = S.folders.find(x => x.id === st.scope); if (!f) return; const v = await promptBox(L('Klasörü yeniden adlandır', 'Rename folder'), L('Klasör adı', 'Folder name'), f.name); if (!v) return; f.name = v; await put('folders', f); CBN.refresh(); });
    on('delf', async () => { const f = S.folders.find(x => x.id === st.scope); if (!f) return; const k = S.notes.filter(n => n.folderId === f.id).length; if (!await confirmBox(L(`“${f.name}” klasörü silinsin mi? İçindeki ${k} not silinmez, “Klasörsüz” olur.`, `Delete folder “${f.name}”? Its ${k} notes are kept and become “No folder”.`), L('Klasörü sil', 'Delete folder'), true)) return; for (const n of S.notes.filter(x => x.folderId === f.id)) { n.folderId = null; await put('notes', n); } await del('folders', f.id); st.scope = 'all'; CBN.refresh(); });
    on('emptytrash', async () => { const tr = S.notes.filter(n => n.deletedAt); if (!await confirmBox(L(`Çöp kutusundaki ${tr.length} not kalıcı olarak silinsin mi? Bu işlem geri alınamaz.`, `Permanently delete ${tr.length} notes in trash? This cannot be undone.`), L('Çöpü boşalt', 'Empty trash'), true)) return; for (const n of tr) await purge(n); CBN.refresh(); });
  }

  /* ---------- HTML → Markdown ---------- */
  function toMd(html) {
    const doc = new DOMParser().parseFromString('<body>' + html, 'text/html'), BLOCK = /^(P|DIV|H[1-3]|UL|OL|BLOCKQUOTE|PRE|TABLE|HR)$/;
    const inl = n => [...n.childNodes].map(c => {
      if (c.nodeType === 3) return c.nodeValue.replace(/\s+/g, ' ');
      if (c.nodeType !== 1) return '';
      const x = inl(c), w = (m) => x.trim() ? x.replace(/^(\s*)([\s\S]*?)(\s*)$/, `$1${m}$2${m}$3`) : x;
      switch (c.tagName) {
        case 'B': case 'STRONG': return w('**'); case 'I': case 'EM': return w('*'); case 'S': case 'STRIKE': return w('~~'); case 'CODE': return '`' + x + '`';
        case 'A': return `[${x}](${c.getAttribute('href') || ''})`; case 'IMG': return `![${c.getAttribute('alt') || 'image'}](${c.getAttribute('src') || ''})`; case 'BR': return '  \n'; default: return x;
      }
    }).join('');
    const li = (ul, depth) => [...ul.children].filter(c => c.tagName === 'LI').map((c, i) => {
      const own = [...c.childNodes].filter(k => !(k.nodeType === 1 && /^(UL|OL)$/.test(k.tagName))), tmp = doc.createElement('span'); own.forEach(k => tmp.appendChild(k.cloneNode(true)));
      const mark = ul.classList.contains('cl') ? `- [${c.getAttribute('data-c') === '1' ? 'x' : ' '}] ` : ul.tagName === 'OL' ? `${i + 1}. ` : '- ';
      return '  '.repeat(depth) + mark + inl(tmp).trim() + '\n' + [...c.children].filter(k => /^(UL|OL)$/.test(k.tagName)).map(k => li(k, depth + 1)).join('');
    }).join('');
    const blk = n => { let out = '', run = doc.createElement('span'); const fl = () => { const s = inl(run).trim(); if (s) out += s + '\n\n'; run = doc.createElement('span'); };
      [...n.childNodes].forEach(c => { if (c.nodeType === 1 && (BLOCK.test(c.tagName) || [...c.children].some(k => BLOCK.test(k.tagName)))) { fl(); out += one(c); } else if (c.nodeType === 1 || c.nodeType === 3) run.appendChild(c.cloneNode(true)); }); fl(); return out; };
    const one = c => {
      const t = c.tagName;
      if (/^H[1-3]$/.test(t)) return '#'.repeat(+t[1]) + ' ' + inl(c).trim() + '\n\n';
      if (t === 'UL' || t === 'OL') return li(c, 0) + '\n';
      if (t === 'BLOCKQUOTE') return blk(c).trim().split('\n').map(l => '> ' + l).join('\n') + '\n\n';
      if (t === 'PRE') return '```\n' + c.textContent.replace(/\n$/, '') + '\n```\n\n';
      if (t === 'HR') return '---\n\n';
      if (t === 'TABLE') { const rows = [...c.querySelectorAll('tr')].map(r => [...r.children].map(d => inl(d).trim().replace(/\|/g, '\\|') || ' ')); if (!rows.length) return ''; const w = Math.max(...rows.map(r => r.length)), line = r => '| ' + Array.from({ length: w }, (_, i) => r[i] || ' ').join(' | ') + ' |'; return [line(rows[0]), '| ' + Array(w).fill('---').join(' | ') + ' |', ...rows.slice(1).map(line)].join('\n') + '\n\n'; }
      if ([...c.children].some(k => BLOCK.test(k.tagName))) return blk(c);
      const s = inl(c).trim(); return s ? s + '\n\n' : '';
    };
    return blk(doc.body).replace(/\n{3,}/g, '\n\n').trim() + '\n';
  }
  const fileSafe = s => (s || 'not').replace(/[\\/:*?"<>|]+/g, ' ').trim().slice(0, 60) || 'not';
  function printNote(n) {
    const fr = document.createElement('iframe'); fr.setAttribute('aria-hidden', 'true'); fr.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
    fr.srcdoc = `<!DOCTYPE html><html lang="${S.settings.lang}"><head><meta charset="utf-8"><title>${esc(title(n))}</title><style>body{font:12pt/1.55 Inter,"Helvetica Neue",Arial,sans-serif;color:#111;margin:18mm}h1{font-size:22pt;margin:0 0 4pt}h2{font-size:16pt}h3{font-size:13pt}.m{color:#666;font-size:9pt;margin-bottom:14pt}img{max-width:100%}pre{background:#f3f4f6;padding:8pt;border-radius:4pt;white-space:pre-wrap;font-size:10pt}blockquote{border-left:3pt solid #ccc;margin-left:0;padding-left:10pt;color:#444}table{border-collapse:collapse;width:100%}td,th{border:1px solid #bbb;padding:4pt 6pt;text-align:left}ul.cl{list-style:none;padding-left:0}ul.cl li:before{content:"☐ "}ul.cl li[data-c="1"]:before{content:"☑ "}a{color:#111}</style></head><body><h1>${esc(title(n))}</h1><div class="m">${esc(fmtStamp(n.updatedAt))}${folderName(n.folderId) ? ' · ' + esc(folderName(n.folderId)) : ''}${(n.tags || []).map(t => ' · #' + esc(t)).join('')}</div>${sanitize(n.content)}</body></html>`;
    fr.onload = () => { try { fr.contentWindow.focus(); fr.contentWindow.print(); } catch (e) { toast(L('Yazdırma penceresi açılamadı', 'Could not open the print dialog'), { type: 'err' }); } setTimeout(() => fr.remove(), 60000); };
    document.body.appendChild(fr);
  }
  const imgData = (file, max = 1600) => new Promise((res, rej) => {
    const fr = new FileReader(); fr.onerror = rej;
    fr.onload = () => { const im = new Image(); im.onerror = rej; im.onload = () => { const k = Math.min(1, max / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.max(1, Math.round(im.width * k)); c.height = Math.max(1, Math.round(im.height * k)); const g = c.getContext('2d'); const png = file.type === 'image/png' && file.size < 600000 && k === 1; if (!png) { g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); } g.drawImage(im, 0, 0, c.width, c.height); res(c.toDataURL(png ? 'image/png' : 'image/jpeg', .85)); }; im.src = fr.result; };
    fr.readAsDataURL(file);
  });
  const fmtSize = b => b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB';

  /* ---------- editör ---------- */
  function editor(main, id) {
    const n = S.notes.find(x => x.id === id);
    if (!n) { main.innerHTML = empty('🔎', L('Not bulunamadı', 'Note not found'), L('Silinmiş ya da bu cihazda hiç oluşturulmamış olabilir.', 'It may have been deleted or never created on this device.'), `<a class="cbn-btn" href="#cbn/notes">← ${esc(CBN.modName('notes'))}</a>`); return; }
    n.tags = n.tags || []; n.attachments = n.attachments || []; n.links = n.links || [];
    const ro = !!n.deletedAt;
    const tb = (c, label, txt, v) => `<button type="button" data-c="${c}" ${v ? `data-v="${v}"` : ''} title="${esc(label)}" aria-label="${esc(label)}">${txt}</button>`;
    main.innerHTML = `<div class="ne">
      <div class="ne-top"><a class="cbn-btn ghost sm" href="#cbn/notes">← ${esc(CBN.modName('notes'))}</a><span class="ne-status" role="status" aria-live="polite"></span>
        <div class="ne-acts">${ro ? `<button type="button" class="cbn-btn sm" data-a="restore">${L('Geri yükle', 'Restore')}</button>` : `
          <button type="button" class="cbn-btn ghost sm" data-a="pin" aria-pressed="${!!n.isPinned}">📌 <span>${L('Sabitle', 'Pin')}</span></button>
          <button type="button" class="cbn-btn ghost sm" data-a="fav" aria-pressed="${!!n.isFavorite}">★ <span>${L('Favori', 'Favorite')}</span></button>
          <button type="button" class="cbn-btn ghost sm" data-a="history">${L('Geçmiş', 'History')}</button>
          <button type="button" class="cbn-btn ghost sm" data-a="md">Markdown</button>
          <button type="button" class="cbn-btn ghost sm" data-a="pdf">PDF</button>
          <button type="button" class="cbn-btn ghost sm" data-a="archive">${n.archivedAt ? L('Arşivden çıkar', 'Unarchive') : L('Arşivle', 'Archive')}</button>
          <button type="button" class="cbn-btn ghost sm danger" data-a="del">${L('Sil', 'Delete')}</button>`}</div></div>
      ${ro ? `<p class="ne-ro">${L('Bu not çöp kutusunda; düzenlemek için geri yükle.', 'This note is in the trash; restore it to edit.')}</p>` : ''}
      <input class="ne-title" value="${esc(n.title)}" placeholder="${L('Başlık', 'Title')}" maxlength="200" aria-label="${L('Not başlığı', 'Note title')}" ${ro ? 'disabled' : ''}>
      <div class="ne-meta"><label>${L('Klasör', 'Folder')} <select class="ne-folder" ${ro ? 'disabled' : ''}><option value="">${L('Klasörsüz', 'No folder')}</option>${folders().map(f => `<option value="${esc(f.id)}" ${n.folderId === f.id ? 'selected' : ''}>${esc(f.name)}</option>`).join('')}</select></label>
        <div class="ne-tags"></div></div>
      ${ro ? '' : `<div class="ne-tools" role="toolbar" aria-label="${L('Biçimlendirme', 'Formatting')}">
        ${tb('undo', L('Geri al', 'Undo'), '↶')}${tb('redo', L('Yinele', 'Redo'), '↷')}<i></i>
        ${tb('formatBlock', L('Başlık 1', 'Heading 1'), 'H1', 'H1')}${tb('formatBlock', L('Başlık 2', 'Heading 2'), 'H2', 'H2')}${tb('formatBlock', L('Başlık 3', 'Heading 3'), 'H3', 'H3')}${tb('formatBlock', L('Paragraf', 'Paragraph'), '¶', 'P')}<i></i>
        ${tb('bold', L('Kalın', 'Bold'), '<b>B</b>')}${tb('italic', L('İtalik', 'Italic'), '<em>I</em>')}${tb('underline', L('Altı çizili', 'Underline'), '<u>U</u>')}${tb('strikeThrough', L('Üstü çizili', 'Strikethrough'), '<s>S</s>')}<i></i>
        ${tb('insertUnorderedList', L('Madde işaretleri', 'Bullet list'), '•')}${tb('insertOrderedList', L('Numaralı liste', 'Numbered list'), '1.')}${tb('check', L('Kontrol listesi', 'Checklist'), '☑')}<i></i>
        ${tb('formatBlock', L('Alıntı', 'Quote'), '❝', 'BLOCKQUOTE')}${tb('formatBlock', L('Kod bloğu', 'Code block'), '&lt;/&gt;', 'PRE')}${tb('table', L('Tablo', 'Table'), '▦')}${tb('insertHorizontalRule', L('Ayırıcı çizgi', 'Divider'), '―')}<i></i>
        ${tb('link', L('Bağlantı ekle', 'Add link'), '🔗')}${tb('image', L('Görsel ekle', 'Add image'), '🖼')}${tb('file', L('Dosya ekle', 'Attach file'), '📎')}
        <input type="file" class="ne-img" accept="image/*" hidden><input type="file" class="ne-file" hidden multiple></div>`}
      <div class="ne-body" ${ro ? '' : 'contenteditable="true"'} role="textbox" aria-multiline="true" aria-label="${L('Not içeriği', 'Note content')}" data-ph="${L('Yazmaya başla…', 'Start writing…')}"></div>
      <section class="ne-extra"><div><h2>${L('Ekler', 'Attachments')}</h2><div class="ne-files"></div></div><div><h2>${L('İlişkili notlar', 'Related notes')}</h2><div class="ne-links"></div></div></section>
      <p class="cbn-hint">${L('Otomatik kaydedilir · Bağlantıyı açmak için Ctrl/⌘ + tık · Kontrol kutusunu işaretlemek için kutuya tıkla', 'Saves automatically · Ctrl/⌘ + click opens a link · Click a checkbox to tick it')}</p></div>`;
    const $ = s => main.querySelector(s), tEl = $('.ne-title'), bEl = $('.ne-body'), stEl = $('.ne-status');
    bEl.innerHTML = sanitize(n.content);
    let timer = null, dirty = false, lastSnap = 0, range = null, selch = () => {};
    const status = s => { if (stEl.isConnected) stEl.textContent = s; };
    status(L('Son kayıt: ', 'Last saved: ') + fmtStamp(n.updatedAt));

    async function snapshot(v) {
      if (!v.title && !toText(v.content)) return false;
      await idb.put('versions', { id: uid(), noteId: n.id, title: v.title, content: v.content, at: v.at });
      const all = (await idb.byIndex('versions', 'noteId', n.id)).sort((a, b) => b.at - a.at);
      for (const o of all.slice(MAX_VERSIONS)) await idb.del('versions', o.id);
      return true;
    }
    async function save() {
      clearTimeout(timer); timer = null; if (!dirty || ro) return; dirty = false;
      const nt = tEl.value.trim(), nc = sanitize(bEl.innerHTML), prev = { title: n.title, content: n.content, at: n.updatedAt }, now = Date.now();
      if (nt === n.title && nc === n.content) return status(L('Kaydedildi', 'Saved'));
      const needSnap = now - lastSnap > 10 * 60000;
      n.title = nt; n.content = nc; n.text = toText(nc); n.updatedAt = now;
      try { if (needSnap && await snapshot(prev)) lastSnap = now; await put('notes', n); status(L('Kaydedildi · ', 'Saved · ') + fmtTime(now)); } catch (e) { status(L('Kaydedilemedi', 'Save failed')); }
    }
    const touch = () => { if (ro) return; dirty = true; status(L('Kaydediliyor…', 'Saving…')); clearTimeout(timer); timer = setTimeout(save, 700); };
    const vis = () => { if (document.hidden) save(); };
    document.addEventListener('visibilitychange', vis); addEventListener('pagehide', save);
    flush = () => {
      document.removeEventListener('visibilitychange', vis); removeEventListener('pagehide', save); document.removeEventListener('selectionchange', selch); flush = null;
      save();
      if (!ro && !n.title && !n.text && !n.content.includes('<img') && !n.attachments.length && S.notes.includes(n)) purge(n);    // hiç yazılmamış boş notu bırakma
    };
    CBN.onLeave(() => flush && flush());

    if (ro) { $('[data-a=restore]').onclick = async () => { n.deletedAt = null; await put('notes', n); toast(L('Not geri yüklendi', 'Note restored')); CBN.refresh(); }; drawFiles(); drawLinks(); drawTags(); return; }

    /* seçim + komutlar */
    selch = () => { const s = getSelection(); if (s.rangeCount && bEl.contains(s.anchorNode)) range = s.getRangeAt(0).cloneRange(); };
    document.addEventListener('selectionchange', selch);
    const restore = () => { bEl.focus(); if (range) { const s = getSelection(); s.removeAllRanges(); s.addRange(range); } };
    const exec = (c, v) => { restore(); document.execCommand(c, false, v); touch(); };
    try { document.execCommand('defaultParagraphSeparator', false, 'p'); } catch (e) {}
    const insertBlock = html => {
      let top = range && bEl.contains(range.startContainer) ? range.startContainer : null;
      while (top && top.parentNode !== bEl) top = top.parentNode;
      const t = document.createElement('template'); t.innerHTML = html; const first = t.content.firstElementChild, nodes = [...t.content.childNodes];
      if (top && top.nodeType === 1 && !top.textContent.trim() && !top.querySelector('img,table,hr')) { top.after(...nodes); top.remove(); } else if (top) top.after(...nodes); else bEl.append(...nodes);
      const tgt = first.querySelector('li,th,td') || first, r = document.createRange(); r.selectNodeContents(tgt); r.collapse(true);
      bEl.focus(); const s = getSelection(); s.removeAllRanges(); s.addRange(r); range = r; touch();
    };
    const insertImg = async file => { try { const src = await imgData(file); exec('insertHTML', `<img src="${src}" alt="${esc(file.name || 'image')}">`); } catch (e) { toast(L('Görsel eklenemedi', 'Could not add the image'), { type: 'err' }); } };
    const tools = $('.ne-tools');
    tools.addEventListener('mousedown', e => { if (e.target.closest('button')) e.preventDefault(); });
    tools.querySelectorAll('button[data-c]').forEach(b => b.onclick = async () => {
      const c = b.dataset.c;
      if (c === 'check') { const li = range && bEl.contains(range.startContainer) && (range.startContainer.nodeType === 1 ? range.startContainer : range.startContainer.parentNode).closest('li'), ul = li && li.parentNode; if (ul && ul.tagName === 'UL' && ul.parentNode === bEl) { ul.classList.toggle('cl'); ul.querySelectorAll(':scope > li').forEach(x => ul.classList.contains('cl') ? x.setAttribute('data-c', '0') : x.removeAttribute('data-c')); if (!ul.classList.length) ul.removeAttribute('class'); touch(); } else insertBlock('<ul class="cl"><li data-c="0"><br></li></ul>'); }
      else if (c === 'table') insertBlock('<table><tbody><tr><th><br></th><th><br></th><th><br></th></tr><tr><td><br></td><td><br></td><td><br></td></tr><tr><td><br></td><td><br></td><td><br></td></tr></tbody></table><p><br></p>');
      else if (c === 'link') { const saved = range, u = await promptBox(L('Bağlantı ekle', 'Add link'), L('Adres (https://…)', 'URL (https://…)'), 'https://'); if (!u) return; if (!/^(https?:\/\/|mailto:)/i.test(u)) return toast(L('Adres https:// ile başlamalı', 'URL must start with https://'), { type: 'err' }); range = saved; if (saved && !saved.collapsed) exec('createLink', u); else exec('insertHTML', `<a href="${esc(u)}">${esc(u)}</a>&nbsp;`); }
      else if (c === 'image') $('.ne-img').click();
      else if (c === 'file') $('.ne-file').click();
      else exec(c, b.dataset.v);
    });
    $('.ne-img').onchange = e => { const f = e.target.files[0]; e.target.value = ''; if (f) insertImg(f); };
    $('.ne-file').onchange = async e => {
      const fs = [...e.target.files]; e.target.value = '';
      for (const f of fs) {
        if (f.size > MAX_FILE) { toast(L(`“${f.name}” çok büyük (en fazla 10 MB)`, `“${f.name}” is too large (max 10 MB)`), { type: 'err' }); continue; }
        const rec = { id: uid(), noteId: n.id, name: f.name, type: f.type || 'application/octet-stream', size: f.size, blob: f };
        try { await idb.put('files', rec); n.attachments.push({ id: rec.id, name: rec.name, type: rec.type, size: rec.size }); n.updatedAt = Date.now(); await put('notes', n); } catch (err) { toast(L('Dosya kaydedilemedi (depolama dolu olabilir)', 'Could not store the file (storage may be full)'), { type: 'err' }); }
      }
      drawFiles();
    };
    tEl.oninput = touch; bEl.addEventListener('input', touch);
    tEl.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); bEl.focus(); } };
    bEl.addEventListener('paste', e => {
      const cd = e.clipboardData; if (!cd) return; e.preventDefault();
      const im = [...(cd.files || [])].find(f => f.type.startsWith('image/')); if (im) return insertImg(im);
      const h = cd.getData('text/html');
      if (h) document.execCommand('insertHTML', false, sanitize(h)); else document.execCommand('insertText', false, cd.getData('text/plain'));
      touch();
    });
    bEl.addEventListener('click', e => {
      const a = e.target.closest('a'); if (a && (e.ctrlKey || e.metaKey)) { e.preventDefault(); window.open(a.href, '_blank', 'noopener'); return; }
      const li = e.target; if (li.tagName === 'LI' && li.parentNode.classList.contains('cl') && e.clientX - li.getBoundingClientRect().left < 28) { li.setAttribute('data-c', li.getAttribute('data-c') === '1' ? '0' : '1'); touch(); }
    });
    bEl.addEventListener('keyup', e => { if (e.key !== 'Enter') return; const s = getSelection(), li = s.anchorNode && (s.anchorNode.nodeType === 1 ? s.anchorNode : s.anchorNode.parentNode).closest('ul.cl > li'); if (li && !li.textContent.trim()) li.setAttribute('data-c', '0'); });
    bEl.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { const s = getSelection(), li = s.anchorNode && (s.anchorNode.nodeType === 1 ? s.anchorNode : s.anchorNode.parentNode).closest('ul.cl > li'); if (li) { e.preventDefault(); li.setAttribute('data-c', li.getAttribute('data-c') === '1' ? '0' : '1'); touch(); } } });

    /* üst düğmeler */
    const meta = async () => { n.updatedAt = Date.now(); await put('notes', n); status(L('Kaydedildi · ', 'Saved · ') + fmtTime(n.updatedAt)); };
    $('.ne-folder').onchange = e => { n.folderId = e.target.value || null; meta(); };
    $('[data-a=pin]').onclick = e => { n.isPinned = !n.isPinned; e.currentTarget.setAttribute('aria-pressed', n.isPinned); meta(); };
    $('[data-a=fav]').onclick = e => { n.isFavorite = !n.isFavorite; e.currentTarget.setAttribute('aria-pressed', n.isFavorite); meta(); };
    $('[data-a=md]').onclick = async () => { await save(); download(fileSafe(n.title) + '.md', `# ${title(n)}\n\n${(n.tags || []).length ? n.tags.map(t => '#' + t).join(' ') + '\n\n' : ''}${toMd(n.content)}`, 'text/markdown'); };
    $('[data-a=pdf]').onclick = async () => { await save(); printNote(n); toast(L('Yazdırma penceresinde “PDF olarak kaydet”i seç', 'Choose “Save as PDF” in the print dialog')); };
    $('[data-a=archive]').onclick = async () => { await save(); const was = n.archivedAt; n.archivedAt = was ? null : Date.now(); await put('notes', n); toast(was ? L('Arşivden çıkarıldı', 'Unarchived') : L('Not arşivlendi', 'Note archived'), { action: L('Geri al', 'Undo'), onAction: async () => { n.archivedAt = was; await put('notes', n); CBN.refresh(); } }); CBN.go('notes'); };
    $('[data-a=del]').onclick = async () => { if (!await confirmBox(L('Not çöp kutusuna taşınsın mı?', 'Move this note to trash?'), L('Çöpe taşı', 'Move to trash'), true)) return; await save(); n.deletedAt = Date.now(); await put('notes', n); toast(L('Not çöp kutusuna taşındı', 'Note moved to trash'), { action: L('Geri al', 'Undo'), onAction: async () => { n.deletedAt = null; await put('notes', n); CBN.refresh(); } }); CBN.go('notes'); };
    $('[data-a=history]').onclick = async () => {
      await save();
      const vs = (await idb.byIndex('versions', 'noteId', n.id)).sort((a, b) => b.at - a.at);
      modal({ title: L('Sürüm geçmişi', 'Version history'), wide: true, html: vs.length ? `<p class="cbn-hint">${L('Düzenleme oturumlarından önceki halleri (en fazla 20 sürüm). Geri yüklersen şu anki hali de geçmişe eklenir.', 'States from before your editing sessions (up to 20). Restoring also keeps the current state in history.')}</p><div class="ne-vers">${vs.map((v, i) => `<div class="ne-ver"><div><b>${esc(fmtStamp(v.at))}</b><span>${esc(v.title || L('Başlıksız', 'Untitled'))}</span><p>${esc(toText(v.content).slice(0, 180))}</p></div><button type="button" class="cbn-btn ghost sm" data-i="${i}">${L('Geri yükle', 'Restore')}</button></div>`).join('')}</div>` : empty('🕘', L('Henüz eski sürüm yok', 'No earlier versions yet'), L('Notu düzenledikçe önceki halleri burada birikir.', 'Earlier states appear here as you edit the note.')),
        onOpen(box, close) { box.querySelectorAll('[data-i]').forEach(b => b.onclick = async () => { const v = vs[+b.dataset.i]; await snapshot({ title: n.title, content: n.content, at: n.updatedAt }); n.title = v.title; n.content = sanitize(v.content); n.text = toText(n.content); n.updatedAt = Date.now(); await put('notes', n); close(); toast(L('Sürüm geri yüklendi', 'Version restored')); CBN.refresh(); }); } });
    };
    drawFiles(); drawLinks(); drawTags();
    if (!n.title && !n.text) tEl.focus();

    function drawTags() {
      const box = $('.ne-tags'), all = [...new Set(S.notes.flatMap(x => x.tags || []))].filter(t => !n.tags.includes(t));
      box.innerHTML = n.tags.map((t, i) => `<span class="cbn-tag">#${esc(t)}${ro ? '' : `<button type="button" data-i="${i}" aria-label="${L('Etiketi kaldır', 'Remove tag')}: ${esc(t)}">✕</button>`}</span>`).join('') + (ro ? '' : `<input class="ne-tagin" list="neTags" maxlength="30" placeholder="${L('＋ etiket', '＋ tag')}" aria-label="${L('Etiket ekle', 'Add tag')}"><datalist id="neTags">${all.map(t => `<option value="${esc(t)}">`).join('')}</datalist>`);
      if (ro) return;
      box.querySelectorAll('[data-i]').forEach(b => b.onclick = () => { n.tags.splice(+b.dataset.i, 1); meta(); drawTags(); });
      const inp = box.querySelector('.ne-tagin'), add = keep => { const v = inp.value.trim().replace(/^#/, '').replace(/,/g, '').slice(0, 30); if (!v) return; if (!n.tags.includes(v) && n.tags.length < 12) { n.tags.push(v); meta(); } drawTags(); if (keep) box.querySelector('.ne-tagin').focus(); };
      inp.onkeydown = e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(true); } else if (e.key === 'Backspace' && !inp.value && n.tags.length) { n.tags.pop(); meta(); drawTags(); box.querySelector('.ne-tagin').focus(); } };
      inp.onchange = () => add(false);
    }
    function drawFiles() {
      const box = $('.ne-files');
      box.innerHTML = n.attachments.length ? n.attachments.map((a, i) => `<div class="ne-file-row"><button type="button" class="ne-dl" data-i="${i}" title="${L('İndir', 'Download')}">📎 <span>${esc(a.name)}</span> <small>${fmtSize(a.size)}</small></button>${ro ? '' : `<button type="button" class="cbn-ib" data-rm="${i}" aria-label="${L('Eki kaldır', 'Remove attachment')}: ${esc(a.name)}">✕</button>`}</div>`).join('') : `<p class="muted">${L('Ek yok. Araç çubuğundaki 📎 ile dosya ekle (en fazla 10 MB).', 'No attachments. Use 📎 in the toolbar (max 10 MB).')}</p>`;
      box.querySelectorAll('.ne-dl').forEach(b => b.onclick = async () => { const a = n.attachments[+b.dataset.i], f = await idb.get('files', a.id); if (f && f.blob) download(a.name, f.blob); else toast(L('Dosya bu cihazda bulunamadı', 'File not found on this device'), { type: 'err' }); });
      box.querySelectorAll('[data-rm]').forEach(b => b.onclick = async () => { const a = n.attachments[+b.dataset.rm]; if (!await confirmBox(L(`“${a.name}” eki silinsin mi?`, `Delete attachment “${a.name}”?`), L('Sil', 'Delete'), true)) return; await idb.del('files', a.id); n.attachments = n.attachments.filter(x => x.id !== a.id); await meta(); drawFiles(); });
    }
    function drawLinks() {
      const box = $('.ne-links'), rel = n.links.map(i => S.notes.find(x => x.id === i)).filter(x => x && !x.deletedAt), others = S.notes.filter(x => x.id !== n.id && active(x) && !n.links.includes(x.id)).sort((a, b) => b.updatedAt - a.updatedAt);
      box.innerHTML = (rel.length ? rel.map(x => `<span class="cbn-tag link"><a href="#cbn/notes/${encodeURIComponent(x.id)}">${esc(title(x))}</a>${ro ? '' : `<button type="button" data-id="${esc(x.id)}" aria-label="${L('İlişkiyi kaldır', 'Remove relation')}">✕</button>`}</span>`).join('') : `<p class="muted">${L('İlişkili not yok.', 'No related notes.')}</p>`) +
        (ro || !others.length ? '' : `<select class="ne-addlink" aria-label="${L('İlişkili not ekle', 'Add related note')}"><option value="">＋ ${L('Not ilişkilendir…', 'Relate a note…')}</option>${others.slice(0, 200).map(x => `<option value="${esc(x.id)}">${esc(title(x))}</option>`).join('')}</select>`);
      if (ro) return;
      const pair = async (o, on) => { n.links = n.links.filter(i => i !== o.id); o.links = (o.links || []).filter(i => i !== n.id); if (on) { n.links.push(o.id); o.links.push(n.id); } await put('notes', o); await meta(); drawLinks(); };
      box.querySelectorAll('[data-id]').forEach(b => b.onclick = () => { const o = S.notes.find(x => x.id === b.dataset.id); if (o) pair(o, false); });
      const sel = box.querySelector('.ne-addlink'); if (sel) sel.onchange = () => { const o = S.notes.find(x => x.id === sel.value); if (o) pair(o, true); };
    }
  }

  function render(main, sub) { if (flush) flush(); if (sub[0]) editor(main, sub[0]); else list(main); }
  CBN.notes = { scope: s => { st.scope = s; }, create, title, folderName, toMd };
  CBN.register('notes', { render });
})();
