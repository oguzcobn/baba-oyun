"use strict";
/* CBN · Takvim — gün / hafta / ay. Etkinlikler yerelde tutulur; görevler bitiş tarihleriyle görünür.
   Harici takvimler için sağlayıcı katmanı hazır (CBN.calendar.providers) ama hiçbiri bağlı değil:
   bağlantı kurulmadan gerçek takvim verisi gösterilmez. */
(() => {
  const { S, L, esc, uid, pad, put, del, today, addDays, pd, ymd, fmtDate, fmtDay, modal, confirmBox, toast, empty, download, loc } = CBN;
  const CATS = { personal: ['Kişisel', 'Personal'], family: ['Aile', 'Family'], work: ['İş', 'Work'], project: ['Proje', 'Project'] };
  const REM = [['', 'Hatırlatma yok', 'No reminder'], [0, 'Başlangıçta', 'At start'], [10, '10 dk önce', '10 min before'], [30, '30 dk önce', '30 min before'], [60, '1 saat önce', '1 hour before'], [1440, '1 gün önce', '1 day before']];
  const catName = k => L(CATS[k][0], CATS[k][1]), cat = e => CATS[e.cat] ? e.cat : 'personal';
  let cursor = null, hide = new Set();
  /* entegrasyon katmanı: ileride { id:'google', connect(), list(from,to), push(event) } eklenecek */
  const providers = { local: { id: 'local', connected: true, list: (a, b) => S.events.filter(e => e.date >= a && e.date <= b) } };

  const blank = p => Object.assign({ id: uid(), title: '', date: today(), start: '', end: '', location: '', desc: '', cat: 'personal', remindMin: '', remFired: null, noteIds: [], project: '', createdAt: Date.now(), updatedAt: Date.now() }, p || {});
  const monday = s => { const d = pd(s); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return ymd(d); };
  const dayItems = d => ({
    ev: S.events.filter(e => e.date === d && !hide.has(cat(e))).sort((a, b) => (a.start || '').localeCompare(b.start || '') || a.title.localeCompare(b.title)),
    tk: hide.has('tasks') ? [] : S.tasks.filter(t => t.due === d && t.status !== 'cancelled').sort(CBN.tasks.byDue)
  });
  function ics(e) {
    const z = s => s.replace(/[-:]/g, ''), st = e.start ? `${z(e.date)}T${z(e.start)}00` : z(e.date), en = e.start ? `${z(e.date)}T${z(e.end && e.end > e.start ? e.end : e.start)}00` : z(addDays(e.date, 1)), x = s => String(s || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/[,;]/g, m => '\\' + m);
    const now = new Date(), stamp = now.getUTCFullYear() + pad(now.getUTCMonth() + 1) + pad(now.getUTCDate()) + 'T' + pad(now.getUTCHours()) + pad(now.getUTCMinutes()) + '00Z';
    download((e.title || 'etkinlik').replace(/[^\wçğıöşüÇĞİÖŞÜ ]+/g, '').slice(0, 40) + '.ics', ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//BABA//CBN//TR', 'BEGIN:VEVENT', 'UID:' + e.id + '@cbn', 'DTSTAMP:' + stamp, (e.start ? 'DTSTART:' : 'DTSTART;VALUE=DATE:') + st, (e.start ? 'DTEND:' : 'DTEND;VALUE=DATE:') + en, 'SUMMARY:' + x(e.title), e.location ? 'LOCATION:' + x(e.location) : '', e.desc ? 'DESCRIPTION:' + x(e.desc) : '', 'END:VEVENT', 'END:VCALENDAR'].filter(Boolean).join('\r\n'), 'text/calendar');
  }

  function form(src) {
    const isNew = !src || !S.events.some(x => x.id === src.id), e = JSON.parse(JSON.stringify(blank(src || {}))); e.noteIds = e.noteIds || [];
    const notes = S.notes.filter(n => !n.deletedAt).sort((a, b) => b.updatedAt - a.updatedAt), projects = [...new Set(S.tasks.map(x => x.project).concat(S.events.map(x => x.project)).filter(Boolean))];
    modal({ title: isNew ? L('Yeni etkinlik', 'New event') : L('Etkinliği düzenle', 'Edit event'), wide: true, html: `<form class="cbn-form">
      ${isNew ? `<p class="cbn-switch">${L('Etkinlik ekliyorsun.', 'Adding an event.')} <button type="button" class="cbn-link-btn" data-a="astask">${L('Bunun yerine görev ekle →', 'Add a task instead →')}</button></p>` : ''}
      <label>${L('Başlık', 'Title')}<input name="title" value="${esc(e.title)}" maxlength="200" required autofocus></label>
      <div class="cbn-fg">
        <label>${L('Tarih', 'Date')}<input type="date" name="date" value="${esc(e.date)}" required></label>
        <label>${L('Başlangıç', 'Start time')}<input type="time" name="start" value="${esc(e.start)}"></label>
        <label>${L('Bitiş', 'End time')}<input type="time" name="end" value="${esc(e.end)}"></label>
        <label>${L('Kategori', 'Category')}<select name="cat">${Object.keys(CATS).map(k => `<option value="${k}" ${cat(e) === k ? 'selected' : ''}>${esc(catName(k))}</option>`).join('')}</select></label>
        <label>${L('Konum', 'Location')}<input name="location" value="${esc(e.location)}" maxlength="200"></label>
        <label>${L('Hatırlatma', 'Reminder')}<select name="rem">${REM.map(r => `<option value="${r[0]}" ${String(e.remindMin == null ? '' : e.remindMin) === String(r[0]) ? 'selected' : ''}>${L(r[1], r[2])}</option>`).join('')}</select></label>
        <label>${L('İlgili proje', 'Related project')}<input name="project" value="${esc(e.project)}" maxlength="60" list="evProj"><datalist id="evProj">${projects.map(p => `<option value="${esc(p)}">`).join('')}</datalist></label>
      </div>
      <label>${L('Açıklama', 'Description')}<textarea name="desc" rows="3" maxlength="4000">${esc(e.desc)}</textarea></label>
      <fieldset><legend>${L('İlgili notlar', 'Related notes')}</legend><div class="ev-notes"></div></fieldset>
      <p class="cbn-hint">${L('Saat boş bırakılırsa tüm gün sayılır. Hatırlatmalar yalnızca BABA. açıkken çalışır; telefon takvimine eklemek için .ics kullan.', 'Leave the time empty for an all-day event. Reminders only fire while BABA. is open; use .ics to add it to your phone calendar.')}</p>
      <div class="cbn-actions">${isNew ? '' : `<button type="button" class="cbn-btn danger ghost" data-a="del">${L('Sil', 'Delete')}</button><button type="button" class="cbn-btn ghost" data-a="ics">.ics</button>`}<span class="sp"></span><button type="button" class="cbn-btn ghost" data-a="no">${L('Vazgeç', 'Cancel')}</button><button class="cbn-btn">${L('Kaydet', 'Save')}</button></div></form>`,
      onOpen(box, close) {
        const f = box.querySelector('form'), nb = box.querySelector('.ev-notes');
        const drawNotes = () => {
          const rel = e.noteIds.map(i => notes.find(n => n.id === i)).filter(Boolean), rest = notes.filter(n => !e.noteIds.includes(n.id));
          nb.innerHTML = rel.map(n => `<span class="cbn-tag link"><a href="#cbn/notes/${encodeURIComponent(n.id)}">${esc(CBN.notes.title(n))}</a><button type="button" data-id="${esc(n.id)}" aria-label="${L('Kaldır', 'Remove')}">✕</button></span>`).join('') + (rest.length ? `<select aria-label="${L('Not ekle', 'Add note')}"><option value="">＋ ${L('Not seç…', 'Pick a note…')}</option>${rest.slice(0, 200).map(n => `<option value="${esc(n.id)}">${esc(CBN.notes.title(n))}</option>`).join('')}</select>` : (rel.length ? '' : `<span class="muted">${L('Henüz not yok.', 'No notes yet.')}</span>`));
          nb.querySelectorAll('[data-id]').forEach(b => b.onclick = () => { e.noteIds = e.noteIds.filter(i => i !== b.dataset.id); drawNotes(); });
          const s = nb.querySelector('select'); if (s) s.onchange = () => { if (s.value) { e.noteIds.push(s.value); drawNotes(); } };
        };
        drawNotes();
        box.querySelector('[data-a=no]').onclick = close;
        const q = a => box.querySelector(`[data-a=${a}]`);
        if (q('astask')) q('astask').onclick = () => { const t = f.title.value.trim(), d = f.date.value; close(); CBN.tasks.form({ title: t, due: d, dueTime: f.start.value, status: 'planned' }); };
        if (q('ics')) q('ics').onclick = () => ics(src);
        if (q('del')) q('del').onclick = async () => { if (!await confirmBox(L('Bu etkinlik silinsin mi?', 'Delete this event?'), L('Sil', 'Delete'), true)) return; const orig = S.events.find(x => x.id === e.id); close(); await del('events', e.id); CBN.refresh(); toast(L('Etkinlik silindi', 'Event deleted'), { action: L('Geri al', 'Undo'), onAction: async () => { if (orig) { await put('events', orig); CBN.refresh(); } } }); };
        f.onsubmit = async ev => {
          ev.preventDefault();
          const title = f.title.value.trim(); if (!title || !f.date.value) return;
          if (f.start.value && f.end.value && f.end.value < f.start.value) return toast(L('Bitiş saati başlangıçtan önce olamaz', 'End time cannot be before the start'), { type: 'err' });
          Object.assign(e, { title, date: f.date.value, start: f.start.value, end: f.start.value ? f.end.value : '', location: f.location.value.trim(), desc: f.desc.value.trim(), cat: f.cat.value, remindMin: f.rem.value === '' ? '' : +f.rem.value, project: f.project.value.trim(), remFired: null, updatedAt: Date.now() });
          await put('events', e); close(); cursor = e.date; CBN.refresh(); if (isNew) toast(L('Etkinlik eklendi', 'Event added'));
        };
      } });
  }

  const evBtn = e => `<button type="button" class="cal-it c-${cat(e)}" data-ev="${esc(e.id)}" title="${esc(e.title)}">${e.start ? `<time>${esc(e.start)}</time>` : ''}<span>${esc(e.title)}</span></button>`;
  const tkBtn = t => `<button type="button" class="cal-it c-task${t.status === 'completed' ? ' done' : ''}${CBN.tasks.overdue(t) ? ' late' : ''}" data-tk="${esc(t.id)}" title="${esc(t.title)}">${t.status === 'completed' ? '☑' : '☐'} <span>${esc(t.title)}</span></button>`;
  function render(main, sub) {
    if (sub[0] && /^\d{4}-\d{2}-\d{2}$/.test(sub[0]) && !isNaN(pd(sub[0]))) cursor = sub[0];
    if (!cursor) cursor = today();
    const view = ['month', 'week', 'day'].includes(S.settings.calView) ? S.settings.calView : 'month', td = today(), c = pd(cursor);
    const wd = Array.from({ length: 7 }, (_, i) => new Date(2024, 0, 1 + i).toLocaleDateString(loc(), { weekday: 'short' }));
    let title, body;
    if (view === 'month') {
      title = c.toLocaleDateString(loc(), { month: 'long', year: 'numeric' });
      const first = ymd(new Date(c.getFullYear(), c.getMonth(), 1)), start = monday(first), m = c.getMonth();
      body = `<div class="cal-month" role="grid" aria-label="${esc(title)}"><div class="cal-wd" role="row">${wd.map(w => `<span role="columnheader">${esc(w)}</span>`).join('')}</div><div class="cal-cells">${Array.from({ length: 42 }, (_, i) => {
        const d = addDays(start, i), it = dayItems(d), all = it.ev.map(evBtn).concat(it.tk.map(tkBtn)), n = it.ev.length + it.tk.length;
        return `<div class="cal-cell${pd(d).getMonth() !== m ? ' out' : ''}${d === td ? ' today' : ''}" data-d="${d}" role="gridcell"><button type="button" class="cal-dn" data-day="${d}" aria-label="${esc(pd(d).toLocaleDateString(loc(), { weekday: 'long', day: 'numeric', month: 'long' }))}${n ? ', ' + n + ' ' + L('kayıt', 'items') : ''}">${pd(d).getDate()}</button><div class="cal-its">${all.slice(0, 3).join('')}${n > 3 ? `<button type="button" class="cal-more" data-day="${d}">+${n - 3}</button>` : ''}</div><div class="cal-dots" aria-hidden="true">${it.ev.slice(0, 4).map(e => `<i class="c-${cat(e)}"></i>`).join('')}${it.tk.length ? '<i class="c-task"></i>' : ''}</div></div>`;
      }).join('')}</div></div>`;
    } else {
      const days = view === 'week' ? Array.from({ length: 7 }, (_, i) => addDays(monday(cursor), i)) : [cursor];
      title = view === 'week' ? `${fmtDate(days[0])} – ${fmtDate(days[6])}` : c.toLocaleDateString(loc(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      body = `<div class="cal-${view}">${days.map(d => { const it = dayItems(d);
        return `<section class="cal-col${d === td ? ' today' : ''}" data-d="${d}"><header><button type="button" class="cal-dh" data-day="${d}"><b>${pd(d).getDate()}</b> ${esc(pd(d).toLocaleDateString(loc(), { weekday: view === 'week' ? 'short' : 'long' }))}</button><span><button type="button" class="cbn-ib" data-add="${d}" aria-label="${L('Etkinlik ekle', 'Add event')}: ${esc(fmtDate(d))}" title="${L('Etkinlik ekle', 'Add event')}">＋</button></span></header>
          <div class="cal-list">${it.ev.map(e => view === 'day' ? `<button type="button" class="cal-row c-${cat(e)}" data-ev="${esc(e.id)}"><time>${e.start ? esc(e.start) + (e.end ? '–' + esc(e.end) : '') : L('Tüm gün', 'All day')}</time><span><b>${esc(e.title)}</b>${e.location ? `<small>📍 ${esc(e.location)}</small>` : ''}${e.desc ? `<small>${esc(e.desc.slice(0, 140))}</small>` : ''}</span><em>${esc(catName(cat(e)))}</em></button>` : evBtn(e)).join('')}${view === 'day' && it.tk.length ? `<h3>${L('Bu gün biten görevler', 'Tasks due this day')}</h3><div class="cal-tasks">${it.tk.map(CBN.tasks.row).join('')}</div>` : it.tk.map(tkBtn).join('')}${!it.ev.length && !it.tk.length ? (view === 'day' ? empty('🗓️', L('Bu gün boş', 'Nothing on this day'), L('Etkinlik ya da görev ekleyebilirsin.', 'Add an event or a task.')) : `<span class="cal-none">—</span>`) : ''}</div>
          ${view === 'day' ? `<div class="cbn-actions left"><button type="button" class="cbn-btn" data-add="${d}">＋ ${L('Etkinlik', 'Event')}</button><button type="button" class="cbn-btn ghost" data-addt="${d}">＋ ${L('Görev', 'Task')}</button></div>` : ''}</section>`; }).join('')}</div>`;
    }
    const leg = [...Object.keys(CATS).map(k => [k, catName(k)]), ['tasks', L('Görevler', 'Tasks')]];
    main.innerHTML = `<header class="cbn-head"><div><h1>${esc(CBN.modName('calendar'))}</h1><p class="cbn-sub">${esc(title)}</p></div><button type="button" class="cbn-btn" data-add="${view === 'month' && !(td.slice(0, 7) === cursor.slice(0, 7)) ? cursor : (view === 'month' ? td : cursor)}">＋ ${L('Yeni etkinlik', 'New event')}</button></header>
      <div class="cal-bar"><div class="cal-nav"><button type="button" class="cbn-ib" data-go="-1" aria-label="${L('Önceki', 'Previous')}">‹</button><button type="button" class="cbn-btn ghost sm" data-go="0">${L('Bugün', 'Today')}</button><button type="button" class="cbn-ib" data-go="1" aria-label="${L('Sonraki', 'Next')}">›</button></div>
        <div class="cbn-seg sm" role="group" aria-label="${L('Takvim görünümü', 'Calendar view')}">${[['day', L('Gün', 'Day')], ['week', L('Hafta', 'Week')], ['month', L('Ay', 'Month')]].map(v => `<button type="button" data-v="${v[0]}" class="${view === v[0] ? 'on' : ''}" aria-pressed="${view === v[0]}">${v[1]}</button>`).join('')}</div></div>
      <div class="cal-leg" role="group" aria-label="${L('Kategoriler', 'Categories')}">${leg.map(l => `<button type="button" class="cal-lg c-${l[0] === 'tasks' ? 'task' : l[0]}${hide.has(l[0]) ? ' off' : ''}" data-cat="${l[0]}" aria-pressed="${!hide.has(l[0])}"><i></i>${esc(l[1])}</button>`).join('')}</div>
      ${body}
      <p class="cbn-hint">${L('Google Calendar bağlı değil — burada yalnızca CBN’ye girdiğin kayıtlar görünür.', 'Google Calendar is not connected — only records you enter in CBN appear here.')}</p>`;
    const setView = v => { S.settings.calView = v; CBN.saveSettings(); CBN.refresh(); };
    main.querySelectorAll('[data-v]').forEach(b => b.onclick = () => setView(b.dataset.v));
    main.querySelectorAll('[data-go]').forEach(b => b.onclick = () => { const k = +b.dataset.go; if (!k) cursor = td; else if (view === 'month') { const d = pd(cursor); d.setDate(1); d.setMonth(d.getMonth() + k); cursor = ymd(d); } else cursor = addDays(cursor, k * (view === 'week' ? 7 : 1)); CBN.refresh(); });
    main.querySelectorAll('[data-cat]').forEach(b => b.onclick = () => { const k = b.dataset.cat; if (hide.has(k)) hide.delete(k); else hide.add(k); CBN.refresh(); });
    main.querySelectorAll('[data-ev]').forEach(b => b.onclick = ev => { ev.stopPropagation(); const e = S.events.find(x => x.id === b.dataset.ev); if (e) form(e); });
    main.querySelectorAll('[data-tk]').forEach(b => b.onclick = ev => { ev.stopPropagation(); const t = S.tasks.find(x => x.id === b.dataset.tk); if (t) CBN.tasks.form(t); });
    main.querySelectorAll('[data-day]').forEach(b => b.onclick = ev => { ev.stopPropagation(); cursor = b.dataset.day; setView('day'); });
    main.querySelectorAll('[data-add]').forEach(b => b.onclick = ev => { ev.stopPropagation(); form({ date: b.dataset.add }); });
    main.querySelectorAll('[data-addt]').forEach(b => b.onclick = () => CBN.tasks.form({ due: b.dataset.addt, status: 'planned' }));
    main.querySelectorAll('.cal-cell').forEach(cell => cell.onclick = () => { if (matchMedia('(max-width:700px)').matches) { cursor = cell.dataset.d; setView('day'); } else form({ date: cell.dataset.d }); });
    main.querySelectorAll('.cal-tasks').forEach(CBN.tasks.bind);
  }

  CBN.calendar = { CATS, catName, cat, blank, form, providers };
  CBN.register('calendar', { render });
})();
