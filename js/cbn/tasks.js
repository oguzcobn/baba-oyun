"use strict";
/* CBN · Görevler — durumlar, tekrarlama, alt görevler, Kanban. Tamamlananlar silinmez, arşivde kalır. */
(() => {
  const { S, L, esc, uid, pad, put, del, today, addDays, pd, ymd, nowHM, fmtDate, fmtDay, fmtStamp, modal, confirmBox, toast, empty, low } = CBN;
  const PRI = [['Düşük', 'Low'], ['Normal', 'Normal'], ['Yüksek', 'High'], ['Acil', 'Urgent']];
  const STATUS = ['inbox', 'planned', 'progress', 'waiting', 'completed', 'cancelled'];
  const ST = { inbox: ['Gelen Kutusu', 'Inbox'], planned: ['Planlandı', 'Planned'], progress: ['Devam Ediyor', 'In Progress'], waiting: ['Bekliyor', 'Waiting'], completed: ['Tamamlandı', 'Completed'], cancelled: ['İptal', 'Cancelled'] };
  const REP = { none: ['Tekrarlama yok', 'No repeat'], daily: ['Her gün', 'Daily'], weekly: ['Her hafta', 'Weekly'], monthly: ['Her ay', 'Monthly'], yearly: ['Her yıl', 'Yearly'], custom: ['Özel aralık', 'Custom interval'] };
  const UNIT = { day: ['gün', 'days'], week: ['hafta', 'weeks'], month: ['ay', 'months'] };
  const stName = k => L(ST[k][0], ST[k][1]), priName = p => L(PRI[p][0], PRI[p][1]);
  const isOpen = t => t.status !== 'completed' && t.status !== 'cancelled';
  const overdue = t => isOpen(t) && !!t.due && (t.due < today() || (t.due === today() && !!t.dueTime && t.dueTime < nowHM()));
  const pri = t => Math.min(3, Math.max(0, +t.priority || 0));
  const byDue = (a, b) => ((a.due || '9999') + (a.dueTime || '99')).localeCompare((b.due || '9999') + (b.dueTime || '99')) || pri(b) - pri(a) || a.createdAt - b.createdAt;
  let q = '';

  const blank = p => Object.assign({ id: uid(), title: '', desc: '', priority: 1, status: 'inbox', start: '', due: '', dueTime: '', remindAt: null, remFired: null, rep: { type: 'none', n: 1, unit: 'day' }, tags: [], project: '', subtasks: [], checklist: [], notes: '', createdAt: Date.now(), updatedAt: Date.now(), completedAt: null }, p || {});
  function nextDate(s, rep) {
    const d = pd(s), n = Math.max(1, +rep.n || 1);
    if (rep.type === 'daily') d.setDate(d.getDate() + 1);
    else if (rep.type === 'weekly') d.setDate(d.getDate() + 7);
    else if (rep.type === 'monthly') d.setMonth(d.getMonth() + 1);
    else if (rep.type === 'yearly') d.setFullYear(d.getFullYear() + 1);
    else if (rep.type === 'custom') { if (rep.unit === 'week') d.setDate(d.getDate() + 7 * n); else if (rep.unit === 'month') d.setMonth(d.getMonth() + n); else d.setDate(d.getDate() + n); }
    else return null;
    return ymd(d);
  }
  const repLabel = r => !r || r.type === 'none' ? '' : r.type === 'custom' ? L(`${r.n} ${UNIT[r.unit][0]}de bir`, `every ${r.n} ${UNIT[r.unit][1]}`) : L(REP[r.type][0], REP[r.type][1]);

  async function setDone(t, done) {
    if (done) {
      const prev = t.status; let spawn = null;
      t.status = 'completed'; t.completedAt = Date.now(); t.updatedAt = Date.now();
      if (t.rep && t.rep.type !== 'none') {       // tekrarlayan görev: sıradaki kopyayı oluştur
        const base = t.due || today(); let nd = nextDate(base, t.rep), guard = 0;
        while (nd && nd < today() && guard++ < 500) nd = nextDate(nd, t.rep);
        if (nd) {
          const days = Math.round((pd(nd) - pd(base)) / 864e5), sh = ms => { const d = new Date(ms); d.setDate(d.getDate() + days); return d.getTime(); };
          spawn = Object.assign(JSON.parse(JSON.stringify(t)), { id: uid(), status: 'planned', due: nd, start: t.start ? addDays(t.start, days) : '', remindAt: t.remindAt ? sh(t.remindAt) : null, remFired: null, completedAt: null, createdAt: Date.now(), updatedAt: Date.now() });
          spawn.subtasks.forEach(x => x.done = false); spawn.checklist.forEach(x => x.done = false);
        }
      }
      await put('tasks', t); if (spawn) await put('tasks', spawn);
      toast(L('Görev tamamlandı', 'Task completed') + (spawn ? ' · ' + L('sıradaki: ', 'next: ') + fmtDate(spawn.due) : ''), { action: L('Geri al', 'Undo'), onAction: async () => { t.status = prev; t.completedAt = null; await put('tasks', t); if (spawn) await del('tasks', spawn.id); CBN.refresh(); } });
    } else { t.status = 'planned'; t.completedAt = null; t.updatedAt = Date.now(); await put('tasks', t); }
    CBN.refresh();
  }
  async function setStatus(t, st) {
    if (st === t.status || !ST[st]) return;
    if (st === 'completed') return setDone(t, true);
    t.status = st; t.completedAt = null; t.updatedAt = Date.now(); await put('tasks', t); CBN.refresh();
  }

  /* ---------- satır ---------- */
  function row(t) {
    const done = t.status === 'completed', late = overdue(t), sub = (t.subtasks || []).length, subDone = (t.subtasks || []).filter(x => x.done).length;
    const chips = [
      t.due ? `<span class="tk-chip ${late ? 'late' : ''}">${esc(fmtDay(t.due))}${t.dueTime ? ' ' + esc(t.dueTime) : ''}</span>` : '',
      t.status !== 'inbox' && !done ? `<span class="tk-chip">${esc(stName(t.status))}</span>` : '',
      repLabel(t.rep) ? `<span class="tk-chip">↻ ${esc(repLabel(t.rep))}</span>` : '',
      t.remindAt && isOpen(t) ? `<span class="tk-chip" title="${esc(fmtStamp(t.remindAt))}">🔔</span>` : '',
      t.project ? `<span class="tk-chip proj">${esc(t.project)}</span>` : '',
      sub ? `<span class="tk-chip">${subDone}/${sub}</span>` : '',
      ...(t.tags || []).slice(0, 3).map(x => `<span class="tk-chip tag">#${esc(x)}</span>`),
      done && t.completedAt ? `<span class="tk-chip">✓ ${esc(fmtStamp(t.completedAt))}</span>` : ''
    ].join('');
    return `<div class="tk-row${late ? ' late' : ''}${done ? ' done' : ''}${t.status === 'cancelled' ? ' off' : ''}" data-id="${esc(t.id)}">
      <button type="button" class="tk-check" role="checkbox" aria-checked="${done}" aria-label="${done ? L('Tamamlanmadı yap', 'Mark not completed') : L('Tamamla', 'Complete')}: ${esc(t.title)}"></button>
      <button type="button" class="tk-main"><span class="tk-title">${esc(t.title)}</span>${chips ? `<span class="tk-meta">${chips}</span>` : ''}</button>
      <span class="tk-pri p${pri(t)}" title="${L('Öncelik', 'Priority')}: ${esc(priName(pri(t)))}"><i></i></span></div>`;
  }
  function bind(box) {
    box.querySelectorAll('.tk-row').forEach(r => {
      const t = S.tasks.find(x => x.id === r.dataset.id); if (!t) return;
      r.querySelector('.tk-check').onclick = () => setDone(t, t.status !== 'completed');
      r.querySelector('.tk-main').onclick = () => form(t);
    });
  }

  /* ---------- form ---------- */
  function listEd(box, arr, ph) {
    const draw = focusAdd => {
      box.innerHTML = arr.map((x, i) => `<div class="le-row"><input type="checkbox" data-i="${i}" ${x.done ? 'checked' : ''} aria-label="${L('Tamamlandı', 'Done')}"><input type="text" data-i="${i}" value="${esc(x.t)}" maxlength="200" aria-label="${esc(ph)}"><button type="button" class="cbn-ib" data-rm="${i}" aria-label="${L('Kaldır', 'Remove')}">✕</button></div>`).join('') +
        `<div class="le-row add"><input type="text" data-add placeholder="${esc(ph)}" maxlength="200"><button type="button" class="cbn-ib" data-addb aria-label="${L('Ekle', 'Add')}">＋</button></div>`;
      box.querySelectorAll('input[type=checkbox]').forEach(c => c.onchange = () => arr[+c.dataset.i].done = c.checked);
      box.querySelectorAll('input[type=text][data-i]').forEach(c => { c.oninput = () => arr[+c.dataset.i].t = c.value; c.onkeydown = e => { if (e.key === 'Enter') e.preventDefault(); }; });
      box.querySelectorAll('[data-rm]').forEach(b => b.onclick = () => { arr.splice(+b.dataset.rm, 1); draw(); });
      const add = box.querySelector('[data-add]'), doAdd = () => { const v = add.value.trim(); if (!v) return; arr.push({ id: uid(), t: v, done: false }); draw(true); };
      add.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); doAdd(); } };
      box.querySelector('[data-addb]').onclick = doAdd;
      if (focusAdd) box.querySelector('[data-add]').focus();
    };
    draw();
  }
  const dtLocal = ms => { if (!ms) return ''; const d = new Date(ms); return ymd(d) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes()); };
  function form(src) {
    const isNew = !src || !S.tasks.some(x => x.id === src.id), t = JSON.parse(JSON.stringify(blank(src || {})));
    t.rep = Object.assign({ type: 'none', n: 1, unit: 'day' }, t.rep || {}); t.subtasks = t.subtasks || []; t.checklist = t.checklist || []; t.tags = t.tags || [];
    const projects = [...new Set(S.tasks.map(x => x.project).filter(Boolean))];
    const opt = (v, label, sel) => `<option value="${esc(v)}" ${sel ? 'selected' : ''}>${esc(label)}</option>`;
    modal({ title: isNew ? L('Yeni görev', 'New task') : L('Görevi düzenle', 'Edit task'), wide: true, html: `<form class="cbn-form">
      <label>${L('Başlık', 'Title')}<input name="title" value="${esc(t.title)}" maxlength="200" required autofocus></label>
      <label>${L('Açıklama', 'Description')}<textarea name="desc" rows="2" maxlength="4000">${esc(t.desc)}</textarea></label>
      <div class="cbn-fg">
        <label>${L('Durum', 'Status')}<select name="status">${STATUS.map(k => opt(k, stName(k), t.status === k)).join('')}</select></label>
        <label>${L('Öncelik', 'Priority')}<select name="priority">${PRI.map((p, i) => opt(i, priName(i), pri(t) === i)).join('')}</select></label>
        <label>${L('Başlangıç tarihi', 'Start date')}<input type="date" name="start" value="${esc(t.start)}"></label>
        <label>${L('Bitiş tarihi', 'Due date')}<input type="date" name="due" value="${esc(t.due)}"></label>
        <label>${L('Bitiş saati', 'Due time')}<input type="time" name="dueTime" value="${esc(t.dueTime)}"></label>
        <label>${L('Hatırlatma', 'Reminder')}<input type="datetime-local" name="remind" value="${dtLocal(t.remindAt)}"></label>
        <label>${L('Tekrarlama', 'Repeat')}<select name="rep">${Object.keys(REP).map(k => opt(k, L(REP[k][0], REP[k][1]), t.rep.type === k)).join('')}</select></label>
        <div class="cbn-custom" ${t.rep.type === 'custom' ? '' : 'hidden'}><label>${L('Aralık', 'Every')}<input type="number" name="repN" min="1" max="365" value="${+t.rep.n || 1}"></label><label>${L('Birim', 'Unit')}<select name="repU">${Object.keys(UNIT).map(k => opt(k, L(UNIT[k][0], UNIT[k][1]), t.rep.unit === k)).join('')}</select></label></div>
        <label>${L('Proje', 'Project')}<input name="project" value="${esc(t.project)}" maxlength="60" list="tkProj"><datalist id="tkProj">${projects.map(p => `<option value="${esc(p)}">`).join('')}</datalist></label>
        <label>${L('Etiketler (virgülle)', 'Tags (comma separated)')}<input name="tags" value="${esc(t.tags.join(', '))}" maxlength="200"></label>
      </div>
      <fieldset><legend>${L('Alt görevler', 'Subtasks')}</legend><div data-le="sub"></div></fieldset>
      <fieldset><legend>${L('Kontrol listesi', 'Checklist')}</legend><div data-le="chk"></div></fieldset>
      <label>${L('Notlar', 'Notes')}<textarea name="notes" rows="3" maxlength="8000">${esc(t.notes)}</textarea></label>
      <p class="cbn-hint">${L('Hatırlatmalar yalnızca BABA. açıkken çalışır.', 'Reminders only fire while BABA. is open.')}</p>
      <div class="cbn-actions">${isNew ? '' : `<button type="button" class="cbn-btn danger ghost" data-a="del">${L('Sil', 'Delete')}</button>`}<span class="sp"></span><button type="button" class="cbn-btn ghost" data-a="no">${L('Vazgeç', 'Cancel')}</button><button class="cbn-btn">${L('Kaydet', 'Save')}</button></div></form>`,
      onOpen(box, close) {
        const f = box.querySelector('form');
        listEd(box.querySelector('[data-le=sub]'), t.subtasks, L('Alt görev ekle…', 'Add subtask…'));
        listEd(box.querySelector('[data-le=chk]'), t.checklist, L('Madde ekle…', 'Add item…'));
        f.rep.onchange = () => box.querySelector('.cbn-custom').hidden = f.rep.value !== 'custom';
        box.querySelector('[data-a=no]').onclick = close;
        const dl = box.querySelector('[data-a=del]');
        if (dl) dl.onclick = async () => { if (!await confirmBox(L('Bu görev silinsin mi?', 'Delete this task?'), L('Sil', 'Delete'), true)) return; const orig = S.tasks.find(x => x.id === t.id); close(); await del('tasks', t.id); CBN.refresh(); toast(L('Görev silindi', 'Task deleted'), { action: L('Geri al', 'Undo'), onAction: async () => { if (orig) { await put('tasks', orig); CBN.refresh(); } } }); };
        f.onsubmit = async e => {
          e.preventDefault();
          const title = f.title.value.trim(); if (!title) return f.title.focus();
          const orig = S.tasks.find(x => x.id === t.id), was = orig ? orig.status : null, rem = f.remind.value ? new Date(f.remind.value).getTime() : null;
          const wantDone = f.status.value === 'completed' && was !== 'completed';
          Object.assign(t, { title, desc: f.desc.value.trim(), priority: +f.priority.value, status: wantDone ? (was || 'planned') : f.status.value, start: f.start.value, due: f.due.value, dueTime: f.due.value ? f.dueTime.value : '', remindAt: isNaN(rem) ? null : rem,
            rep: { type: f.rep.value, n: Math.max(1, Math.min(365, +f.repN.value || 1)), unit: f.repU.value }, project: f.project.value.trim(), tags: [...new Set(f.tags.value.split(',').map(x => x.trim().replace(/^#/, '')).filter(Boolean))].slice(0, 12), notes: f.notes.value, updatedAt: Date.now() });
          t.subtasks = t.subtasks.filter(x => x.t.trim()); t.checklist = t.checklist.filter(x => x.t.trim());
          if (!orig || orig.remindAt !== t.remindAt) t.remFired = null;
          if (t.status !== 'completed') t.completedAt = null;
          await put('tasks', t); close();
          if (wantDone) await setDone(S.tasks.find(x => x.id === t.id), true); else CBN.refresh();
          if (isNew) toast(L('Görev eklendi', 'Task added'));
        };
      } });
  }

  const addToday = async title => { await put('tasks', blank({ title: title.slice(0, 200), due: today(), status: 'planned' })); toast(L('Bugüne eklendi', 'Added to today'), S.settings.tasksView === 'today' ? {} : { action: L('Bugünü aç', 'Open today'), onAction: () => CBN.go('tasks/today') }); };

  /* ---------- görünümler ---------- */
  const match = t => { if (!q) return true; const hay = low([t.title, t.desc, t.project, t.notes, (t.tags || []).join(' ')].join(' ')); return low(q).split(/\s+/).every(w => hay.includes(w)); };
  const group = (title, list, cls) => list.length ? `<section class="tk-group ${cls || ''}"><h2>${esc(title)} <span>${list.length}</span></h2>${list.map(row).join('')}</section>` : '';
  function body(v) {
    const all = S.tasks.filter(match), open = all.filter(isOpen), td = today();
    if (v === 'today') {
      const late = open.filter(t => t.due && t.due < td).sort(byDue), now = open.filter(t => t.due === td).sort(byDue), doing = open.filter(t => t.status === 'progress' && t.due !== td && !(t.due && t.due < td)).sort(byDue), done = all.filter(t => t.status === 'completed' && t.completedAt && ymd(new Date(t.completedAt)) === td);
      return group(L('Gecikmiş', 'Overdue'), late, 'late') + group(L('Bugün', 'Today'), now) + group(L('Devam eden', 'In progress'), doing) + group(L('Bugün tamamlananlar', 'Completed today'), done) || empty('☀️', L('Bugün için görev yok', 'Nothing due today'), L('Yukarıdan hızlıca bir görev ekleyebilirsin.', 'Add a task quickly from the field above.'));
    }
    if (v === 'upcoming') {
      const fut = open.filter(t => t.due && t.due > td).sort(byDue), days = [...new Set(fut.map(t => t.due))], none = open.filter(t => !t.due).sort(byDue);
      return days.map(d => group(fmtDay(d) + ' · ' + fmtDate(d), fut.filter(t => t.due === d))).join('') + group(L('Tarihsiz', 'No date'), none) || empty('🗓️', L('Yaklaşan görev yok', 'No upcoming tasks'), '');
    }
    if (v === 'completed') {
      const done = all.filter(t => t.status === 'completed').sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));
      return group(L('Arşiv — tamamlananlar', 'Archive — completed'), done) || empty('🗂️', L('Henüz tamamlanan görev yok', 'No completed tasks yet'), L('Tamamladığın görevler silinmez, burada arşivlenir.', 'Completed tasks are archived here, never deleted.'));
    }
    if (v === 'kanban') {
      return `<div class="kb" role="list">${STATUS.map(k => { const list = all.filter(t => t.status === k).sort(k === 'completed' ? (a, b) => (b.completedAt || 0) - (a.completedAt || 0) : byDue), cap = (k === 'completed' || k === 'cancelled') ? list.slice(0, 10) : list;
        return `<section class="kb-col" data-st="${k}" role="listitem" aria-label="${esc(stName(k))}"><h2>${esc(stName(k))} <span>${list.length}</span></h2><div class="kb-list">${cap.map(t => `<article class="kb-card${overdue(t) ? ' late' : ''}" draggable="true" data-id="${esc(t.id)}"><button type="button" class="kb-t">${esc(t.title)}</button><div class="kb-m"><span class="tk-pri p${pri(t)}"><i></i></span>${t.due ? `<span class="tk-chip ${overdue(t) ? 'late' : ''}">${esc(fmtDay(t.due))}</span>` : ''}${t.project ? `<span class="tk-chip proj">${esc(t.project)}</span>` : ''}</div><select aria-label="${L('Durumu değiştir', 'Change status')}">${STATUS.map(s => `<option value="${s}" ${s === k ? 'selected' : ''}>${esc(stName(s))}</option>`).join('')}</select></article>`).join('')}${cap.length < list.length ? `<a class="kb-more" href="#cbn/tasks/completed">+${list.length - cap.length}</a>` : ''}</div></section>`; }).join('')}</div>`;
    }
    return STATUS.filter(k => k !== 'completed').map(k => group(stName(k), all.filter(t => t.status === k).sort(byDue))).join('') || empty('✅', L('Henüz görev yok', 'No tasks yet'), L('İlk görevini yukarıdan ekle.', 'Add your first task above.'));
  }
  function render(main, sub) {
    const views = [['today', L('Bugün', 'Today')], ['upcoming', L('Yaklaşan', 'Upcoming')], ['all', L('Tüm görevler', 'All Tasks')], ['kanban', 'Kanban'], ['calendar', L('Takvim', 'Calendar')], ['completed', L('Tamamlanan', 'Completed')]];
    let v = sub[0] || S.settings.tasksView; if (!views.some(x => x[0] === v) || v === 'calendar') v = 'today';
    if (v !== S.settings.tasksView) { S.settings.tasksView = v; CBN.saveSettings(); }
    const open = S.tasks.filter(isOpen), late = open.filter(overdue).length;
    main.innerHTML = `<header class="cbn-head"><div><h1>${esc(CBN.modName('tasks'))}</h1><p class="cbn-sub">${open.length} ${L('açık görev', 'open tasks')}${late ? ` · <b class="late">${late} ${L('gecikmiş', 'overdue')}</b>` : ''}</p></div><div class="cbn-actions"><button type="button" class="cbn-btn ghost" data-a="new">${L('Detaylı görev', 'Detailed task')}</button><button type="button" class="cbn-btn" data-a="today">＋ ${L('Bugüne ekle', 'Add to today')}</button></div></header>
      <nav class="cbn-seg" aria-label="${L('Görev görünümleri', 'Task views')}">${views.map(x => `<a href="#cbn/${x[0] === 'calendar' ? 'calendar' : 'tasks/' + x[0]}" class="${x[0] === v ? 'on' : ''}" ${x[0] === v ? 'aria-current="page"' : ''}>${esc(x[1])}</a>`).join('')}</nav>
      <div class="tk-bar"><form class="tk-quick"><input name="t" maxlength="200" placeholder="${L('Bugüne görev yaz ve Enter’a bas…', 'Type a task for today and press Enter…')}" aria-label="${L('Bugüne görev ekle', 'Add a task to today')}"><button class="cbn-btn sm">${L('Bugüne ekle', 'Add to today')}</button></form><input type="search" class="cbn-search" value="${esc(q)}" placeholder="${L('Görevlerde ara…', 'Search tasks…')}" aria-label="${L('Görevlerde ara', 'Search tasks')}"></div>
      <div class="tk-body"></div>`;
    const bd = main.querySelector('.tk-body');
    const draw = () => {
      bd.innerHTML = body(v); bind(bd);
      bd.querySelectorAll('.kb-card').forEach(c => {
        const t = S.tasks.find(x => x.id === c.dataset.id); if (!t) return;
        c.querySelector('.kb-t').onclick = () => form(t);
        c.querySelector('select').onchange = e => setStatus(t, e.target.value);
        c.ondragstart = e => { e.dataTransfer.setData('text/plain', t.id); e.dataTransfer.effectAllowed = 'move'; c.classList.add('drag'); };
        c.ondragend = () => c.classList.remove('drag');
      });
      bd.querySelectorAll('.kb-col').forEach(col => {
        col.ondragover = e => { e.preventDefault(); col.classList.add('over'); };
        col.ondragleave = () => col.classList.remove('over');
        col.ondrop = e => { e.preventDefault(); col.classList.remove('over'); const t = S.tasks.find(x => x.id === e.dataTransfer.getData('text/plain')); if (t) setStatus(t, col.dataset.st); };
      });
    };
    draw();
    main.querySelector('[data-a=today]').onclick = async () => { const title = await CBN.promptBox(L('Bugüne görev ekle', 'Add a task to today'), L('Görev', 'Task'), ''); if (!title) return; await addToday(title); CBN.refresh(); };
    main.querySelector('[data-a=new]').onclick = () => form(v === 'today' ? { due: today(), status: 'planned' } : null);
    main.querySelector('.cbn-search').oninput = e => { q = e.target.value.trim(); draw(); };
    const qf = main.querySelector('.tk-quick');
    qf.onsubmit = async e => { e.preventDefault(); const title = qf.t.value.trim(); if (!title) return; await addToday(title); CBN.refresh(); const i = document.querySelector('.tk-quick input'); if (i) i.focus(); };
  }

  CBN.tasks = { addToday, listEd, PRI, STATUS, isOpen, overdue, pri, byDue, blank, setDone, setStatus, form, row, bind, stName, priName };
  CBN.register('tasks', { render });
})();
