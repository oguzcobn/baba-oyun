"use strict";
/* CBN · Ana Sayfa — karşılama, bugünün özeti, Quick Capture, günün odağı, yaklaşanlar, son notlar.
   Tüm sayılar gerçek kayıtlardan hesaplanır. Widget'lar taşınabilir, boyutlanabilir, gizlenebilir. */
(() => {
  const { S, L, esc, uid, pad, put, today, addDays, pd, ymd, fmtDate, fmtDay, toast, empty, loc } = CBN;
  let editing = false, capType = 'note', clock = null, dragId = null;
  const TYPES = [['note', 'Not', 'Note'], ['task', 'Görev', 'Task'], ['event', 'Etkinlik', 'Event'], ['idea', 'Fikir', 'Idea'], ['expense', 'Harcama', 'Expense'], ['reminder', 'Hatırlatma', 'Reminder']];
  const NAMES = { overview: ['Bugüne bakış', 'Today Overview'], capture: ['Hızlı kayıt', 'Quick Capture'], focus: ['Günün odağı', 'Daily Focus'], upcoming: ['Yaklaşan 7 gün', 'Upcoming 7 days'], recent: ['Son notlar', 'Recent Notes'], ai: ['AI özeti', 'AI Briefing'] };
  const T = () => CBN.tasks;
  const stats = () => {
    const td = today(), open = S.tasks.filter(T().isOpen), wk = addDays(td, 6);
    return { today: open.filter(t => t.due === td).length, done: S.tasks.filter(t => t.status === 'completed' && t.completedAt && ymd(new Date(t.completedAt)) === td).length, late: open.filter(T().overdue).length, events: S.events.filter(e => e.date >= td && e.date <= wk).length, evToday: S.events.filter(e => e.date === td).length, pri: open.filter(t => T().pri(t) >= 2).length, projects: CBN.items('project').filter(p => p.status === 'active').length };
  };

  const W = {
    overview() {
      const s = stats(), tile = (n, label, href, cls) => `<a class="hm-tile ${cls || ''}" href="${href}"><b>${n}</b><span>${esc(label)}</span></a>`;
      return tile(s.today, L('Bugünkü görev', 'Tasks today'), '#cbn/tasks/today') + tile(s.done, L('Bugün tamamlanan', 'Completed today'), '#cbn/tasks/completed', 'ok') + tile(s.late, L('Gecikmiş görev', 'Overdue'), '#cbn/tasks/today', s.late ? 'bad' : '') + tile(s.events, L('Etkinlik (7 gün)', 'Events (7 days)'), '#cbn/calendar') + tile(s.pri, L('Öncelikli iş', 'High priority'), '#cbn/tasks/all', s.pri ? 'warn' : '') + tile(s.projects, L('Aktif proje', 'Active projects'), '#cbn/projects');
    },
    capture() {
      return `<form class="qc"><textarea name="t" rows="2" maxlength="8000" placeholder="${L('Aklındakini yaz ya da yapıştır…', 'Type or paste what’s on your mind…')}" aria-label="${L('Hızlı kayıt metni', 'Quick capture text')}"></textarea>
        <div class="qc-types" role="radiogroup" aria-label="${L('Kayıt türü', 'Record type')}">${TYPES.map(t => `<button type="button" class="qc-t${capType === t[0] ? ' on' : ''}" role="radio" aria-checked="${capType === t[0]}" data-t="${t[0]}">${L(t[1], t[2])}</button>`).join('')}</div>
        <div class="qc-when" ${['task', 'event', 'reminder', 'expense'].includes(capType) ? '' : 'hidden'}><label>${L('Tarih', 'Date')}<input type="date" name="d"></label><label>${L('Saat', 'Time')}<input type="time" name="h"></label></div>
        <div class="qc-foot"><span class="cbn-hint">${L('Ctrl/⌘ + Enter ile kaydet', 'Ctrl/⌘ + Enter to save')}</span><button class="cbn-btn">${L('Kaydet', 'Save')}</button></div></form>`;
    },
    focus() {
      const ids = S.settings.focus.filter(i => S.tasks.some(t => t.id === i && T().isOpen(t))), list = ids.map(i => S.tasks.find(t => t.id === i));
      const rest = S.tasks.filter(t => T().isOpen(t) && !ids.includes(t.id)).sort((a, b) => T().pri(b) - T().pri(a) || T().byDue(a, b));
      return (list.length ? `<ol class="fc">${list.map((t, i) => `<li draggable="true" data-id="${esc(t.id)}"><span class="fc-n" aria-hidden="true">${i + 1}</span><button type="button" class="tk-check" role="checkbox" aria-checked="false" aria-label="${L('Tamamla', 'Complete')}: ${esc(t.title)}"></button><button type="button" class="fc-t">${esc(t.title)}${t.due ? `<small class="${T().overdue(t) ? 'late' : ''}">${esc(fmtDay(t.due))}</small>` : ''}</button><span class="fc-a"><button type="button" class="cbn-ib" data-mv="-1" ${i ? '' : 'disabled'} aria-label="${L('Yukarı taşı', 'Move up')}">↑</button><button type="button" class="cbn-ib" data-mv="1" ${i < list.length - 1 ? '' : 'disabled'} aria-label="${L('Aşağı taşı', 'Move down')}">↓</button><button type="button" class="cbn-ib" data-rm aria-label="${L('Odaktan çıkar', 'Remove from focus')}">✕</button></span></li>`).join('')}</ol>` : `<p class="muted">${L('Bugün en önemli üç işini seç.', 'Pick your three most important tasks for today.')}</p>`) +
        (list.length < 3 ? (rest.length ? `<select class="fc-add" aria-label="${L('Odağa görev ekle', 'Add task to focus')}"><option value="">＋ ${L('Görev seç…', 'Pick a task…')}</option>${rest.slice(0, 100).map(t => `<option value="${esc(t.id)}">${esc(t.title)}</option>`).join('')}</select>` : (list.length ? '' : `<a class="cbn-btn ghost sm" href="#cbn/tasks">${L('Önce görev ekle', 'Add a task first')}</a>`)) : '');
    },
    upcoming() {
      const td = today(), days = Array.from({ length: 7 }, (_, i) => addDays(td, i));
      const out = days.map(d => { const ev = S.events.filter(e => e.date === d).sort((a, b) => (a.start || '').localeCompare(b.start || '')), tk = S.tasks.filter(t => t.due === d && T().isOpen(t)).sort(T().byDue); if (!ev.length && !tk.length) return '';
        return `<div class="up-day"><h3>${esc(fmtDay(d))} <span>${esc(fmtDate(d))}</span></h3>${ev.map(e => `<button type="button" class="up-it" data-ev="${esc(e.id)}"><i class="c-${CBN.calendar.cat(e)}"></i><time>${e.start ? esc(e.start) : L('gün boyu', 'all day')}</time><span>${esc(e.title)}</span></button>`).join('')}${tk.map(t => `<button type="button" class="up-it" data-tk="${esc(t.id)}"><i class="c-task"></i><time>${t.dueTime ? esc(t.dueTime) : L('görev', 'task')}</time><span>${esc(t.title)}</span></button>`).join('')}</div>`; }).join('');
      return out || empty('🗓️', L('Önümüzdeki 7 gün boş', 'Nothing in the next 7 days'), '', `<a class="cbn-btn ghost sm" href="#cbn/calendar">${L('Takvimi aç', 'Open calendar')}</a>`);
    },
    recent() {
      const a = S.notes.filter(n => !n.deletedAt && !n.archivedAt).sort((x, y) => y.updatedAt - x.updatedAt).slice(0, 5);
      return a.length ? a.map(n => `<a class="rc-it" href="#cbn/notes/${encodeURIComponent(n.id)}"><b>${esc(CBN.notes.title(n))}</b><p>${esc(n.text.slice(0, 90))}</p><time>${esc(fmtDate(n.updatedAt))}${CBN.notes.folderName(n.folderId) ? ' · ' + esc(CBN.notes.folderName(n.folderId)) : ''}</time></a>`).join('') : empty('📝', L('Henüz not yok', 'No notes yet'), '', `<a class="cbn-btn ghost sm" href="#cbn/notes">${L('Notlara git', 'Go to notes')}</a>`);
    },
    ai() { return /^https:\/\//i.test(S.settings.aiUrl || '') ? `<div class="ai-off"><span class="cbn-badge ok">${L('Bağlı', 'Connected')}</span><p>${L('Günlük plan ve özet için asistana sor.', 'Ask the assistant for a daily plan and briefing.')}</p><a class="cbn-btn ghost sm" href="#cbn/ai">${L('Asistanı aç', 'Open assistant')}</a></div>` : `<div class="ai-off"><span class="cbn-badge">${L('Bağlı değil', 'Not connected')}</span><p>${L('CBN AI için güvenli bir sunucu bağlantısı gerekiyor. Bağlanana kadar hiçbir yapay zekâ yanıtı üretilmez.', 'CBN AI needs a secure server connection. No AI output is generated until one is connected.')}</p><a class="cbn-btn ghost sm" href="#cbn/ai">${L('Bağlantıyı kur', 'Set up connection')}</a></div>`; }
  };

  function render(main) {
    const d = new Date(), h = d.getHours(), s = stats();
    const hello = h < 12 ? L('Günaydın', 'Good Morning') : h < 18 ? L('İyi günler', 'Good Afternoon') : L('İyi akşamlar', 'Good Evening');
    const sum = [s.today ? L(`Bugün ${s.today} görevin var`, `${s.today} task${s.today > 1 ? 's' : ''} due today`) : L('Bugün için planlı görev yok', 'No tasks due today'), s.evToday ? L(`${s.evToday} etkinlik`, `${s.evToday} event${s.evToday > 1 ? 's' : ''}`) : '', s.late ? L(`${s.late} görev gecikmiş`, `${s.late} overdue`) : ''].filter(Boolean).join(' · ') + '.';
    const ws = S.settings.widgets, shown = ws.filter(w => !w.hidden), hidden = ws.filter(w => w.hidden), nm = id => L(NAMES[id][0], NAMES[id][1]);
    main.innerHTML = `<header class="hm-hero"><div><p class="cbn-eyebrow">${esc(d.toLocaleDateString(loc(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))}</p><h1>${hello}, Oğuzhan</h1><p class="cbn-sub">${esc(sum)}</p></div>
        <div class="hm-side"><b class="hm-clock" aria-label="${L('Saat', 'Time')}">${pad(h)}:${pad(d.getMinutes())}</b><button type="button" class="cbn-btn ${editing ? '' : 'ghost'} sm" data-a="edit" aria-pressed="${editing}">${editing ? L('Bitti', 'Done') : L('Düzenle', 'Customize')}</button></div></header>
      ${editing ? `<div class="hm-edit"><span>${L('Kartları sürükle ya da ◀ ▶ ile taşı; ⇔ genişliği değiştirir, ✕ gizler.', 'Drag cards or move with ◀ ▶; ⇔ changes width, ✕ hides.')}</span>${hidden.map(w => `<button type="button" class="cbn-btn ghost sm" data-show="${w.id}">＋ ${esc(nm(w.id))}</button>`).join('')}<button type="button" class="cbn-btn ghost sm" data-a="reset">${L('Varsayılana dön', 'Reset layout')}</button></div>` : ''}
      <div class="hm-grid${editing ? ' editing' : ''}">${shown.map((w, i) => `<section class="cbn-card hm-w w${w.w}" data-w="${w.id}" ${editing ? 'draggable="true"' : ''} aria-label="${esc(nm(w.id))}"><header><h2>${esc(nm(w.id))}</h2>${editing ? `<span class="hm-tools"><button type="button" class="cbn-ib" data-m="-1" ${i ? '' : 'disabled'} aria-label="${L('Öne taşı', 'Move earlier')}">◀</button><button type="button" class="cbn-ib" data-m="1" ${i < shown.length - 1 ? '' : 'disabled'} aria-label="${L('Sona taşı', 'Move later')}">▶</button><button type="button" class="cbn-ib" data-size aria-label="${L('Genişlik', 'Width')}: ${w.w}/3" title="${L('Genişlik', 'Width')} ${w.w}/3">⇔${w.w}</button><button type="button" class="cbn-ib" data-hide aria-label="${L('Gizle', 'Hide')}">✕</button></span>` : ''}</header><div class="hm-wb hm-${w.id}">${W[w.id]()}</div></section>`).join('') || empty('🧩', L('Tüm kartlar gizli', 'All cards are hidden'), L('“Düzenle” ile geri ekleyebilirsin.', 'Use “Customize” to add them back.'))}</div>`;
    clearInterval(clock); clock = setInterval(() => { const c = document.querySelector('.hm-clock'); if (!c) return clearInterval(clock); const n = new Date(); c.textContent = pad(n.getHours()) + ':' + pad(n.getMinutes()); }, 15000);

    const save = () => { CBN.saveSettings(); CBN.refresh(); }, $ = s => main.querySelector(s);
    $('[data-a=edit]').onclick = () => { editing = !editing; CBN.refresh(); };
    if ($('[data-a=reset]')) $('[data-a=reset]').onclick = () => { S.settings.widgets = CBN.defaults().widgets; save(); };
    main.querySelectorAll('[data-show]').forEach(b => b.onclick = () => { ws.find(w => w.id === b.dataset.show).hidden = false; save(); });
    const move = (id, to) => { const from = ws.findIndex(w => w.id === id); if (from < 0 || to < 0 || from === to) return; const [x] = ws.splice(from, 1); ws.splice(to, 0, x); save(); };
    main.querySelectorAll('.hm-w').forEach(card => {
      const id = card.dataset.w, w = ws.find(x => x.id === id), q = s => card.querySelector(s);
      if (!editing) return;
      card.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { const vis = ws.filter(x => !x.hidden), j = vis.findIndex(x => x.id === id) + (+b.dataset.m), other = vis[j]; if (other) move(id, ws.indexOf(other)); });
      q('[data-size]').onclick = () => { w.w = w.w % 3 + 1; save(); };
      q('[data-hide]').onclick = () => { w.hidden = true; save(); };
      card.ondragstart = e => { dragId = id; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', id); card.classList.add('drag'); };
      card.ondragend = () => { dragId = null; card.classList.remove('drag'); };
      card.ondragover = e => { if (dragId && dragId !== id) { e.preventDefault(); card.classList.add('over'); } };
      card.ondragleave = () => card.classList.remove('over');
      card.ondrop = e => { e.preventDefault(); if (dragId && dragId !== id) move(dragId, ws.findIndex(x => x.id === id)); };
    });

    /* hızlı kayıt */
    const f = $('.qc');
    if (f) {
      f.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { capType = b.dataset.t; f.querySelectorAll('[data-t]').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-checked', x === b); }); f.querySelector('.qc-when').hidden = !['task', 'event', 'reminder', 'expense'].includes(capType); });
      f.t.onkeydown = e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); f.requestSubmit(); } };
      f.onsubmit = async e => {
        e.preventDefault();
        const raw = f.t.value.trim(); if (!raw) return f.t.focus();
        const lines = raw.split('\n'), head = lines[0].trim().slice(0, 200), rest = lines.slice(1).join('\n').trim(), dv = f.d.value, hv = f.h.value;
        const para = s => s.split('\n').map(l => `<p>${esc(l) || '<br>'}</p>`).join('');
        let msg, href;
        if (capType === 'expense') {
          const m = raw.replace(/\s/g, ' ').match(/(\d+(?:[.,]\d{1,2})?)/); if (!m) return toast(L('Harcama için metne tutar yaz (örn. “Market 450”)', 'Type an amount for the expense (e.g. “Groceries 45”)'), { type: 'err' });
          const amt = parseFloat(m[1].replace(',', '.')), cu = (raw.toUpperCase().match(/\b(TRY|GBP|EUR|USD)\b/) || [])[1] || CBN.finance.cur();
          await CBN.saveItem(CBN.newItem('txn', { type: 'expense', amount: amt, cur: cu, date: dv || today(), cat: '', rep: 'none', desc: head.replace(m[1], '').replace(/\b(TRY|GBP|EUR|USD|TL)\b/i, '').trim() || head }));
          msg = L('Harcama kaydedildi', 'Expense saved') + ' · ' + CBN.money(amt, cu); href = 'finance/expense';
        } else if (capType === 'note' || capType === 'idea') {
          const idea = capType === 'idea', fo = idea ? S.folders.find(x => x.name.toLowerCase() === 'ideas') : null;
          const n = await CBN.notes.create({ title: head, content: rest ? para(rest) : '', folderId: fo ? fo.id : null, tags: idea ? ['idea'] : [] });
          msg = idea ? L('Fikir kaydedildi', 'Idea saved') : L('Not kaydedildi', 'Note saved'); href = 'notes/' + n.id;
        } else if (capType === 'event') {
          await put('events', CBN.calendar.blank({ title: head, desc: rest, date: dv || today(), start: hv }));
          msg = L('Etkinlik eklendi', 'Event added') + ' · ' + fmtDay(dv || today()); href = 'calendar/' + (dv || today());
        } else {
          const rem = capType === 'reminder';
          if (rem && (!dv || !hv)) return toast(L('Hatırlatma için tarih ve saat seç', 'Pick a date and time for the reminder'), { type: 'err' });
          const at = rem ? new Date(dv + 'T' + hv).getTime() : null;
          await put('tasks', T().blank({ title: head, desc: rest, due: dv, dueTime: dv ? hv : '', status: dv ? 'planned' : 'inbox', remindAt: at, tags: rem ? ['reminder'] : [] }));
          msg = rem ? L('Hatırlatma kuruldu', 'Reminder set') + ' · ' + fmtDay(dv) + ' ' + hv : L('Görev eklendi', 'Task added'); href = 'tasks/' + (dv ? (dv === today() ? 'today' : 'upcoming') : 'all');
          if (rem && 'Notification' in window && Notification.permission === 'default') { try { Notification.requestPermission(); } catch (er) {} }
        }
        toast(msg, { action: L('Aç', 'Open'), onAction: () => CBN.go(href) });
        CBN.refresh(); const ta = document.querySelector('.qc textarea'); if (ta) ta.focus();
      };
    }
    /* günün odağı */
    const fc = $('.hm-focus');
    if (fc) {
      const ids = () => S.settings.focus.filter(i => S.tasks.some(t => t.id === i && T().isOpen(t))), setIds = a => { S.settings.focus = a.slice(0, 3); save(); };
      const add = fc.querySelector('.fc-add'); if (add) add.onchange = () => { if (add.value) setIds([...ids(), add.value]); };
      let fd = null;
      fc.querySelectorAll('li').forEach(li => {
        const id = li.dataset.id, t = S.tasks.find(x => x.id === id);
        li.querySelector('.tk-check').onclick = () => T().setDone(t, true);
        li.querySelector('.fc-t').onclick = () => T().form(t);
        li.querySelector('[data-rm]').onclick = () => setIds(ids().filter(i => i !== id));
        li.querySelectorAll('[data-mv]').forEach(b => b.onclick = () => { const a = ids(), i = a.indexOf(id), j = i + (+b.dataset.mv); if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; setIds(a); });
        li.ondragstart = e => { fd = id; e.stopPropagation(); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', id); };
        li.ondragover = e => { if (fd && fd !== id) { e.preventDefault(); e.stopPropagation(); } };
        li.ondrop = e => { e.preventDefault(); e.stopPropagation(); if (!fd || fd === id) return; const a = ids().filter(i => i !== fd); a.splice(a.indexOf(id), 0, fd); fd = null; setIds(a); };
      });
    }
    main.querySelectorAll('.hm-upcoming [data-ev]').forEach(b => b.onclick = () => { const e = S.events.find(x => x.id === b.dataset.ev); if (e) CBN.calendar.form(e); });
    main.querySelectorAll('.hm-upcoming [data-tk]').forEach(b => b.onclick = () => { const t = S.tasks.find(x => x.id === b.dataset.tk); if (t) T().form(t); });
  }
  CBN.register('home', { render });
})();
