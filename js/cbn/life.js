"use strict";
/* CBN · Projects & Idea Lab + Family Hub */
(() => {
  const { S, L, esc, uid, put, today, addDays, pd, ymd, fmtDate, fmtDay, toast, empty, modal } = CBN;
  const I = k => CBN.items(k), save = o => CBN.saveItem(o);

  /* ================= PROJELER ================= */
  const PST = { active: ['Aktif', 'Active'], paused: ['Beklemede', 'Paused'], done: ['Tamamlandı', 'Done'] };
  const pst = k => L((PST[k] || PST.active)[0], (PST[k] || PST.active)[1]);
  const ptasks = p => S.tasks.filter(t => t.project === p.name && t.status !== 'cancelled');
  const prog = p => { const t = ptasks(p), ph = p.phases || [], all = t.length + ph.length; return all ? Math.round((t.filter(x => x.status === 'completed').length + ph.filter(x => x.done).length) / all * 100) : 0; };
  function pform(p) {
    const isNew = !p;
    CBN.formFor({ title: isNew ? L('Yeni proje', 'New project') : L('Projeyi düzenle', 'Edit project'), wide: true, value: p || { status: 'active' },
      fields: [{ k: 'name', label: L('Proje adı', 'Project name'), req: true, full: true, top: true }, { k: 'status', label: L('Durum', 'Status'), type: 'select', opts: Object.keys(PST).map(k => [k, pst(k)]) }, { k: 'desc', label: L('Genel açıklama', 'Overview'), type: 'textarea' }, { k: 'goals', label: L('Hedefler', 'Goals'), type: 'textarea' }, { k: 'links', label: L('Linkler (her satıra bir https:// adresi)', 'Links (one https:// URL per line)'), type: 'textarea' }],
      onSave: async v => {
        if (I('project').some(x => x.name === v.name && (!p || x.id !== p.id))) { toast(L('Bu adda bir proje zaten var', 'A project with this name already exists'), { type: 'err' }); return false; }
        if (isNew) { const n = CBN.newItem('project', Object.assign({ phases: [], ideas: [], decisions: [], noteIds: [] }, v)); await save(n); CBN.go('projects/' + n.id); }
        else { const old = p.name; Object.assign(p, v); await save(p); if (old !== p.name) { for (const t of S.tasks.filter(t => t.project === old)) { t.project = p.name; await put('tasks', t); } for (const e of S.events.filter(e => e.project === old)) { e.project = p.name; await put('events', e); } } }
      },
      onDelete: isNew ? null : async () => { if (await CBN.removeItem(p, L(`“${p.name}” projesi silinsin mi? Görevleri ve notları silinmez.`, `Delete project “${p.name}”? Its tasks and notes are kept.`))) CBN.go('projects'); } });
  }
  function projects(main, sub) {
    const all = I('project').sort((a, b) => a.createdAt - b.createdAt);
    if (sub[0] && all.some(p => p.id === sub[0])) return pdetail(main, all.find(p => p.id === sub[0]));
    const views = [['grid', L('Kart', 'Grid')], ['list', L('Liste', 'List')], ['kanban', 'Kanban'], ['timeline', L('Zaman çizelgesi', 'Timeline')]], v = views.some(x => x[0] === sub[0]) ? sub[0] : (S.settings.projView || 'grid');
    if (v !== S.settings.projView) { S.settings.projView = v; CBN.saveSettings(); }
    const card = p => { const t = ptasks(p), pr = prog(p); return `<a class="pj-card st-${esc(p.status)}" href="#cbn/projects/${p.id}"><em>${esc(pst(p.status))}</em><b>${esc(p.name)}</b><p>${esc((p.desc || '').slice(0, 120))}</p>${CBN.bar(pr)}<span>${pr}% · ${t.filter(x => x.status !== 'completed').length} ${L('açık görev', 'open tasks')} · ${(p.ideas || []).length} ${L('fikir', 'ideas')}</span></a>`; };
    let body;
    if (!all.length) body = empty('🚀', L('Henüz proje yok', 'No projects yet'), L('İlk projeni oluştur.', 'Create your first project.'));
    else if (v === 'list') body = `<div class="pj-list">${all.map(p => `<a class="pj-row" href="#cbn/projects/${p.id}"><b>${esc(p.name)}</b><span class="cbn-badge">${esc(pst(p.status))}</span>${CBN.bar(prog(p))}<i>${prog(p)}%</i></a>`).join('')}</div>`;
    else if (v === 'kanban') body = `<div class="kb">${Object.keys(PST).map(k => `<section class="kb-col"><h2>${esc(pst(k))} <span>${all.filter(p => p.status === k).length}</span></h2><div class="kb-list">${all.filter(p => p.status === k).map(p => `<article class="kb-card" data-id="${p.id}"><a class="kb-t" href="#cbn/projects/${p.id}">${esc(p.name)}</a>${CBN.bar(prog(p))}<select aria-label="${L('Durumu değiştir', 'Change status')}">${Object.keys(PST).map(s => `<option value="${s}" ${s === k ? 'selected' : ''}>${esc(pst(s))}</option>`).join('')}</select></article>`).join('')}</div></section>`).join('')}</div>`;
    else if (v === 'timeline') { const rows = all.flatMap(p => [...(p.phases || []).filter(x => x.date).map(x => ({ d: x.date, t: x.t, p, done: x.done, k: L('Aşama', 'Phase') })), ...ptasks(p).filter(t => t.due).map(t => ({ d: t.due, t: t.title, p, done: t.status === 'completed', k: L('Görev', 'Task') }))]).sort((a, b) => a.d.localeCompare(b.d)); body = rows.length ? `<div class="tl">${rows.map(r => `<div class="tl-row${r.done ? ' done' : ''}${!r.done && r.d < today() ? ' late' : ''}"><time>${esc(fmtDate(r.d))}</time><i></i><span><b>${esc(r.t)}</b><small>${esc(r.k)} · <a href="#cbn/projects/${r.p.id}">${esc(r.p.name)}</a></small></span></div>`).join('')}</div>` : empty('🗓️', L('Tarihli aşama ya da görev yok', 'No dated phases or tasks'), L('Projelere tarihli aşama ekle ya da görevlere bitiş tarihi ver.', 'Add dated phases to projects or give tasks a due date.')); }
    else body = `<div class="pj-grid">${all.map(card).join('')}</div>`;
    main.innerHTML = CBN.head('projects', `${all.filter(p => p.status === 'active').length} ${L('aktif proje', 'active projects')}`, `<button type="button" class="cbn-btn" data-a="new">＋ ${L('Yeni proje', 'New project')}</button>`) + CBN.seg('projects', views, v) + `<div class="cbn-body">${body}</div>`;
    main.querySelector('[data-a=new]').onclick = () => pform(null);
    main.querySelectorAll('.kb-card select').forEach(s => s.onchange = async () => { const p = all.find(x => x.id === s.closest('.kb-card').dataset.id); p.status = s.value; await save(p); CBN.refresh(); });
  }
  function pdetail(main, p) {
    ['phases', 'ideas', 'decisions', 'noteIds'].forEach(k => p[k] = p[k] || []);
    const t = ptasks(p).sort(CBN.tasks.byDue), pr = prog(p), links = String(p.links || '').split('\n').map(x => x.trim()).filter(x => /^https?:\/\//i.test(x));
    const notes = p.noteIds.map(i => S.notes.find(n => n.id === i && !n.deletedAt)).filter(Boolean), rest = S.notes.filter(n => !n.deletedAt && !p.noteIds.includes(n.id)).sort((a, b) => b.updatedAt - a.updatedAt);
    const files = notes.flatMap(n => (n.attachments || []).map(a => ({ a, n })));
    main.innerHTML = `<div class="pj"><div class="ne-top"><a class="cbn-btn ghost sm" href="#cbn/projects">← ${esc(CBN.modName('projects'))}</a><span class="ne-status"></span><div class="ne-acts"><select class="pj-st" aria-label="${L('Durum', 'Status')}">${Object.keys(PST).map(k => `<option value="${k}" ${p.status === k ? 'selected' : ''}>${esc(pst(k))}</option>`).join('')}</select><button type="button" class="cbn-btn ghost sm" data-a="edit">${L('Düzenle', 'Edit')}</button></div></div>
      <header class="cbn-head"><div><h1>${esc(p.name)}</h1><p class="cbn-sub">${esc(p.desc || L('Açıklama eklemek için “Düzenle”.', 'Use “Edit” to add an overview.'))}</p></div><div class="pj-pct"><b>${pr}%</b>${CBN.bar(pr)}<small>${L('görev ve aşamalardan hesaplanır', 'computed from tasks and phases')}</small></div></header>
      <div class="pj-cols">
        <section class="cbn-card"><h2>${L('Hedefler', 'Goals')}</h2>${p.goals ? `<p class="pre">${esc(p.goals)}</p>` : `<p class="muted">${L('Henüz hedef yazılmadı.', 'No goals written yet.')}</p>`}</section>
        <section class="cbn-card"><h2>${L('Aşamalar', 'Phases')}</h2><div data-ml="phases"></div></section>
        <section class="cbn-card w2"><h2>${L('Görevler', 'Tasks')} <span class="cbn-badge">${t.length}</span></h2><div class="pj-tasks">${t.map(CBN.tasks.row).join('') || `<p class="muted">${L('Bu projeye bağlı görev yok.', 'No tasks linked to this project.')}</p>`}</div><form class="tk-quick"><input name="t" maxlength="200" placeholder="${L('Bu projeye görev ekle…', 'Add a task to this project…')}" aria-label="${L('Görev ekle', 'Add task')}"><button class="cbn-btn sm">${L('Ekle', 'Add')}</button></form></section>
        <section class="cbn-card"><h2>${L('Fikir havuzu', 'Idea pool')}</h2><div data-ml="ideas"></div></section>
        <section class="cbn-card"><h2>${L('Kararlar', 'Decisions')}</h2><div data-ml="decisions"></div></section>
        <section class="cbn-card"><h2>${L('Notlar', 'Notes')}</h2><div class="ne-links">${notes.map(n => `<span class="cbn-tag link"><a href="#cbn/notes/${n.id}">${esc(CBN.notes.title(n))}</a><button type="button" data-un="${n.id}" aria-label="${L('Kaldır', 'Remove')}">✕</button></span>`).join('') || `<p class="muted">${L('Bağlı not yok.', 'No linked notes.')}</p>`}${rest.length ? `<select class="pj-addnote" aria-label="${L('Not bağla', 'Link a note')}"><option value="">＋ ${L('Not bağla…', 'Link a note…')}</option>${rest.slice(0, 200).map(n => `<option value="${n.id}">${esc(CBN.notes.title(n))}</option>`).join('')}</select>` : ''}</div>
          <h2 class="mt">${L('Dosyalar', 'Files')}</h2>${files.length ? files.map(f => `<a class="pj-file" href="#cbn/notes/${f.n.id}">📎 ${esc(f.a.name)}</a>`).join('') : `<p class="muted">${L('Dosyalar bağlı notların eklerinden gelir.', 'Files come from the attachments of linked notes.')}</p>`}</section>
        <section class="cbn-card"><h2>${L('Linkler', 'Links')}</h2>${links.length ? links.map(u => `<a class="pj-file" href="${esc(u)}" target="_blank" rel="noopener noreferrer">🔗 ${esc(u.replace(/^https?:\/\//, '').slice(0, 60))}</a>`).join('') : `<p class="muted">${L('“Düzenle” ile link ekle.', 'Add links via “Edit”.')}</p>`}</section>
      </div></div>`;
    const chg = () => save(p), $ = q => main.querySelector(q);
    CBN.miniList($('[data-ml=phases]'), p.phases, { check: true, date: true, ph: L('Aşama ekle…', 'Add phase…'), empty: L('Aşama yok.', 'No phases.') }, async () => { await chg(); const b = $('.pj-pct b'); if (b) { b.textContent = prog(p) + '%'; $('.pj-pct .cbn-bar i').style.width = prog(p) + '%'; } });
    CBN.miniList($('[data-ml=ideas]'), p.ideas, { ph: L('Fikir ekle…', 'Add idea…'), empty: L('Havuz boş.', 'Pool is empty.') }, chg);
    CBN.miniList($('[data-ml=decisions]'), p.decisions, { date: true, ph: L('Karar ekle…', 'Add decision…'), empty: L('Karar kaydı yok.', 'No decisions logged.') }, chg);
    CBN.tasks.bind($('.pj-tasks'));
    const qf = $('.tk-quick'); qf.onsubmit = async e => { e.preventDefault(); const title = qf.t.value.trim(); if (!title) return; await put('tasks', CBN.tasks.blank({ title, project: p.name, status: 'planned' })); CBN.refresh(); };
    $('.pj-st').onchange = async e => { p.status = e.target.value; await chg(); toast(L('Durum güncellendi', 'Status updated')); };
    $('[data-a=edit]').onclick = () => pform(p);
    main.querySelectorAll('[data-un]').forEach(b => b.onclick = async () => { p.noteIds = p.noteIds.filter(i => i !== b.dataset.un); await chg(); CBN.refresh(); });
    const an = $('.pj-addnote'); if (an) an.onchange = async () => { if (an.value) { p.noteIds.push(an.value); await chg(); CBN.refresh(); } };
  }
  CBN.projects = { form: pform, prog, tasksOf: ptasks };
  CBN.register('projects', { render: projects });

  /* ================= AİLE ================= */
  const AREAS0 = ['Scotland Family Visits', 'Trabzon Family Visits', 'Family Travel Plans'];
  const FN = { activity: ['Çocuk etkinliği', 'Kids’ activity'], goal: ['Aile hedefi', 'Family goal'], gift: ['Hediye fikri', 'Gift idea'], memory: ['Aile anısı', 'Family memory'] };
  const nextOcc = d => { if (!/^\d{4}-\d{2}-\d{2}$/.test(d || '')) return null; const t = pd(today()), x = pd(d); x.setFullYear(t.getFullYear()); if (x < t) x.setFullYear(t.getFullYear() + 1); return { date: ymd(x), days: Math.round((x - t) / 864e5), years: x.getFullYear() - pd(d).getFullYear() }; };
  const toCal = async (title, date, desc) => { const e = CBN.calendar.blank({ title, date, cat: 'family', desc: desc || '' }); await put('events', e); toast(L('Takvime eklendi', 'Added to calendar') + ' · ' + fmtDate(date), { action: L('Aç', 'Open'), onAction: () => CBN.go('calendar/' + date) }); return e.id; };
  function family(main, sub) {
    const AREAS = (CBN.me() && CBN.me().key) ? ['Aile ziyaretleri', 'Aile gezi planları'] : AREAS0;
    const tabs = [['genel', L('Genel', 'Overview')], ['gunler', L('Özel günler', 'Special days')], ['geziler', L('Geziler', 'Trips')], ['alisveris', L('Alışveriş', 'Shopping')], ['pano', L('Pano', 'Board')]], tab = tabs.some(x => x[0] === sub[0]) ? sub[0] : 'genel';
    const mem = I('member').sort((a, b) => a.createdAt - b.createdAt), names = mem.map(m => m.name);
    const mform = m => CBN.formFor({ title: m ? L('Profili düzenle', 'Edit profile') : L('Aile üyesi ekle', 'Add family member'), value: m, fields: [{ k: 'name', label: L('Ad', 'Name'), req: true }, { k: 'role', label: L('Rol (isteğe bağlı)', 'Role (optional)') }, { k: 'birthday', label: L('Doğum günü', 'Birthday'), type: 'date' }], onSave: v => save(m ? Object.assign(m, v) : CBN.newItem('member', v)), onDelete: m ? () => CBN.removeItem(m) : null });
    const dates = [...mem.filter(m => m.birthday).map(m => ({ t: L(`${m.name} — doğum günü`, `${m.name}’s birthday`), o: nextOcc(m.birthday), bd: true })), ...I('special').map(s => ({ t: s.title, o: s.yearly === 'no' ? (s.date >= today() ? { date: s.date, days: Math.round((pd(s.date) - pd(today())) / 864e5) } : null) : nextOcc(s.date), s }))].filter(x => x.o).sort((a, b) => a.o.days - b.o.days);
    const dateRow = x => `<div class="fm-day"><b class="fm-n">${x.o.days === 0 ? '🎉' : x.o.days}</b><span><b>${esc(x.t)}</b><small>${esc(fmtDate(x.o.date))}${x.o.days ? ' · ' + x.o.days + ' ' + L('gün kaldı', 'days left') : ' · ' + L('bugün', 'today')}${x.bd && x.o.years > 0 ? ' · ' + L(`${x.o.years}. yaş`, `turning ${x.o.years}`) : ''}</small></span><button type="button" class="cbn-btn ghost sm" data-cal="${esc(x.t)}|${x.o.date}">${L('Takvime ekle', 'Add to calendar')}</button>${x.s ? `<button type="button" class="cbn-ib" data-ed="${x.s.id}" aria-label="${L('Düzenle', 'Edit')}">✎</button>` : ''}</div>`;
    let body = '', btn = '';
    if (tab === 'genel') {
      const ev = S.events.filter(e => e.cat === 'family' && e.date >= today()).sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start)).slice(0, 8);
      btn = `<button type="button" class="cbn-btn" data-a="ev">＋ ${L('Aile etkinliği', 'Family event')}</button>`;
      body = `<div class="fm-mem">${mem.map(m => `<button type="button" class="fm-m" data-m="${m.id}"><i>${esc((m.name || '?')[0].toUpperCase())}</i><b>${esc(m.name)}</b><small>${esc(m.role || (m.birthday ? fmtDate(m.birthday) : L('profili düzenle', 'edit profile')))}</small></button>`).join('')}<button type="button" class="fm-m add" data-a="addm"><i>＋</i><b>${L('Üye ekle', 'Add member')}</b></button></div>
        <div class="pj-cols"><section class="cbn-card"><h2>${L('Aile takvimi', 'Family calendar')}</h2>${ev.map(e => `<button type="button" class="up-it" data-ev="${e.id}"><i class="c-family"></i><time>${esc(fmtDay(e.date))}</time><span>${esc(e.title)}</span></button>`).join('') || `<p class="muted">${L('Yaklaşan aile etkinliği yok.', 'No upcoming family events.')}</p>`}<a class="cbn-btn ghost sm mt" href="#cbn/calendar">${L('Takvimi aç', 'Open calendar')}</a></section>
        <section class="cbn-card"><h2>${L('Yaklaşan özel günler', 'Upcoming special days')}</h2>${dates.slice(0, 5).map(dateRow).join('') || `<p class="muted">${L('Profillere doğum günü ekle ya da özel gün oluştur.', 'Add birthdays to profiles or create a special day.')}</p>`}</section></div>`;
    } else if (tab === 'gunler') {
      btn = `<button type="button" class="cbn-btn" data-a="sp">＋ ${L('Özel gün', 'Special day')}</button>`;
      body = `<section class="cbn-card">${dates.map(dateRow).join('') || empty('🎂', L('Henüz özel gün yok', 'No special days yet'), L('Doğum günleri aile profillerinden gelir.', 'Birthdays come from the family profiles.'))}</section>`;
    } else if (tab === 'geziler') {
      btn = `<button type="button" class="cbn-btn" data-a="trip">＋ ${L('Gezi / ziyaret', 'Trip / visit')}</button>`;
      const trips = I('trip').sort((a, b) => (a.start || '9').localeCompare(b.start || '9'));
      body = `<div class="pj-cols c3">${AREAS.map(a => `<section class="cbn-card"><h2>${esc(a)}</h2>${trips.filter(t => t.area === a).map(t => `<div class="fm-trip"><button type="button" class="kb-t" data-trip="${t.id}">${esc(t.title)}</button><small>${t.start ? esc(fmtDate(t.start)) + (t.end ? ' – ' + esc(fmtDate(t.end)) : '') : L('tarih belirsiz', 'no date yet')}</small>${t.notes ? `<p>${esc(t.notes.slice(0, 160))}</p>` : ''}${t.start ? `<button type="button" class="cbn-btn ghost sm" data-cal="${esc(t.title)}|${t.start}">${L('Takvime ekle', 'Add to calendar')}</button>` : ''}</div>`).join('') || `<p class="muted">${L('Plan yok.', 'No plans.')}</p>`}</section>`).join('')}</div>`;
    } else if (tab === 'alisveris') {
      const sh = I('shop').sort((a, b) => (a.done - b.done) || a.createdAt - b.createdAt);
      body = `<section class="cbn-card fm-shop"><form class="tk-quick"><input name="t" maxlength="120" placeholder="${L('Listeye ekle…', 'Add to list…')}" aria-label="${L('Alışveriş kalemi', 'Shopping item')}"><button class="cbn-btn sm">${L('Ekle', 'Add')}</button></form>${sh.map(x => `<label class="ml-row${x.done ? ' done' : ''}"><input type="checkbox" data-sh="${x.id}" ${x.done ? 'checked' : ''}><span>${esc(x.t)}</span></label>`).join('') || `<p class="muted">${L('Liste boş.', 'The list is empty.')}</p>`}${sh.some(x => x.done) ? `<button type="button" class="cbn-btn ghost sm danger mt" data-a="clear">${L('Alınanları temizle', 'Clear bought items')}</button>` : ''}</section>`;
    } else {
      btn = `<button type="button" class="cbn-btn" data-a="fn">＋ ${L('Kayıt', 'Entry')}</button>`;
      const fn = I('famnote').sort((a, b) => b.createdAt - a.createdAt);
      body = `<div class="pj-cols">${Object.keys(FN).map(k => `<section class="cbn-card"><h2>${L(FN[k][0], FN[k][1])}</h2>${fn.filter(x => x.type === k).map(x => `<button type="button" class="fm-note" data-fn="${x.id}"><b>${esc(x.title)}</b><small>${[x.who, x.date ? fmtDate(x.date) : ''].filter(Boolean).map(esc).join(' · ')}</small>${x.text ? `<p>${esc(x.text.slice(0, 140))}</p>` : ''}</button>`).join('') || `<p class="muted">${L('Kayıt yok.', 'Nothing yet.')}</p>`}</section>`).join('')}</div>`;
    }
    main.innerHTML = CBN.head('family', mem.map(m => esc(m.name)).join(' · '), btn) + CBN.seg('family', tabs, tab) + `<div class="cbn-body">${body}</div>`;
    const on = (q, f) => main.querySelectorAll(q).forEach(b => b.onclick = () => f(b));
    const spForm = s => CBN.formFor({ title: L('Özel gün', 'Special day'), value: s || { yearly: 'yes' }, fields: [{ k: 'title', label: L('Başlık', 'Title'), req: true }, { k: 'date', label: L('Tarih', 'Date'), type: 'date', req: true }, { k: 'yearly', label: L('Her yıl tekrarla', 'Repeat yearly'), type: 'select', opts: [['yes', L('Evet', 'Yes')], ['no', L('Hayır', 'No')]] }], onSave: v => save(s ? Object.assign(s, v) : CBN.newItem('special', v)), onDelete: s ? () => CBN.removeItem(s) : null });
    const tripForm = t => CBN.formFor({ title: L('Gezi / ziyaret', 'Trip / visit'), wide: true, value: t || { area: AREAS[AREAS.length - 1] }, fields: [{ k: 'title', label: L('Başlık', 'Title'), req: true }, { k: 'area', label: L('Alan', 'Area'), type: 'select', opts: AREAS.map(a => [a, a]) }, { k: 'start', label: L('Başlangıç', 'Start'), type: 'date' }, { k: 'end', label: L('Bitiş', 'End'), type: 'date' }, { k: 'notes', label: L('Plan notları', 'Plan notes'), type: 'textarea' }], onSave: v => save(t ? Object.assign(t, v) : CBN.newItem('trip', v)), onDelete: t ? () => CBN.removeItem(t) : null });
    const fnForm = x => CBN.formFor({ title: L('Pano kaydı', 'Board entry'), value: x || { type: 'activity' }, fields: [{ k: 'title', label: L('Başlık', 'Title'), req: true }, { k: 'type', label: L('Tür', 'Type'), type: 'select', opts: Object.keys(FN).map(k => [k, L(FN[k][0], FN[k][1])]) }, { k: 'who', label: L('Kim için', 'For whom'), list: names }, { k: 'date', label: L('Tarih', 'Date'), type: 'date' }, { k: 'text', label: L('Not', 'Note'), type: 'textarea' }], onSave: v => save(x ? Object.assign(x, v) : CBN.newItem('famnote', v)), onDelete: x ? () => CBN.removeItem(x) : null });
    on('[data-m]', b => mform(mem.find(m => m.id === b.dataset.m))); on('[data-a=addm]', () => mform(null));
    on('[data-a=ev]', () => CBN.calendar.form({ cat: 'family' })); on('[data-ev]', b => CBN.calendar.form(S.events.find(e => e.id === b.dataset.ev)));
    on('[data-a=sp]', () => spForm(null)); on('[data-ed]', b => spForm(I('special').find(s => s.id === b.dataset.ed)));
    on('[data-cal]', b => { const [t, d] = b.dataset.cal.split('|'); toCal(t, d); });
    on('[data-a=trip]', () => tripForm(null)); on('[data-trip]', b => tripForm(I('trip').find(t => t.id === b.dataset.trip)));
    on('[data-a=fn]', () => fnForm(null)); on('[data-fn]', b => fnForm(I('famnote').find(x => x.id === b.dataset.fn)));
    main.querySelectorAll('[data-sh]').forEach(c => c.onchange = async () => { const x = I('shop').find(s => s.id === c.dataset.sh); x.done = c.checked; await save(x); CBN.refresh(); });
    on('[data-a=clear]', async () => { for (const x of I('shop').filter(s => s.done)) await CBN.del('items', x.id); CBN.refresh(); });
    const sf = main.querySelector('.fm-shop .tk-quick'); if (sf) sf.onsubmit = async e => { e.preventDefault(); const t = sf.t.value.trim(); if (!t) return; await save(CBN.newItem('shop', { t, done: false })); CBN.refresh(); const i = document.querySelector('.fm-shop input[name=t]'); if (i) i.focus(); };
  }
  CBN.register('family', { render: family });
})();
