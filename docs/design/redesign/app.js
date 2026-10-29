/* Foodly redesign mockup – final direction "Ruhig" (Bildstark merged in as the "Kacheln" list view + Start page).
   URL: app.html?theme=light|dark&img=1|0&view=detailed|compact|tiles&sheet=<name>#/<screen>
   img=0 renders every recipe without a photo (today's backend state, B1).
   Everything is clickable: view toggles, sorting, filters, sidebar collapse, timer panel. */
;(() => {
  const qs = new URLSearchParams(window.MOCK_QS || location.search)
  const EMBED = !!window.MOCK_QS // inside the viewer (srcdoc): no real URL, so routing stays in memory
  const THEME = qs.get('theme') || 'light'
  const IMG = qs.get('img') !== '0'
  document.documentElement.dataset.dir = 'a'
  document.documentElement.classList.toggle('dark', THEME === 'dark')

  // Icons are inlined (not <use href="#…">): a fragment reference inside a srcdoc frame resolves against the
  // parent URL in some browsers and then renders nothing.
  const ICON = {}
  window.ICONS.replace(/<symbol id="i-([a-z0-9-]+)" viewBox="0 0 24 24">(.*?)<\/symbol>/gs, (_, n, inner) => (ICON[n] = inner))
  const icon = (n, cls = '') => `<svg class="i ${cls}" viewBox="0 0 24 24">${ICON[n] ?? ''}</svg>`

  const R = Object.fromEntries(RECIPES.map((r) => [r.id, r]))
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
  const route = (p) => `#/${p}`
  const hasImg = (r) => IMG && r.img
  const catsOf = (r) => CATEGORIES.filter((c) => c.recipes.includes(r.id))
  const cv = (c) => `style="--c:${c.color}"`
  const mins = (m) => (m == null ? '' : m >= 60 ? `${Math.floor(m / 60)} h${m % 60 ? ' ' + (m % 60) + ' min' : ''}` : `${m} min`)
  const fmtRating = (x) => x.toFixed(1).replace('.', ',')
  const owner = (r) => USERS[r.owner]
  const roleOf = (r) => (r.owner === ME ? 'owner' : r.editors.includes(ME) ? 'editor' : 'viewer')
  const collabOf = (r) => (r.editors.length ? 'collaborative' : r.viewers.length ? 'shared' : 'private')
  const ALL_TAGS = [...new Set(RECIPES.flatMap((r) => r.tags))].sort()
  const ALL_INGS = [...new Set(RECIPES.flatMap((r) => r.sections.flatMap((s) => s.ingredients.map((i) => i.name))))].sort()
  const UNCAT = 0
  const DUR_MAX = 180 // slider end; like today, the far right is 180 min, "no limit" is the reset

  /* ---------------- UI state (in-memory, like the real ListState) ---------------- */
  const UI = {
    view: ['detailed', 'compact', 'tiles'].includes(qs.get('view')) ? qs.get('view') : 'detailed',
    grouped: qs.get('grouped') !== '0',
    sortKey: 'name',
    sortDir: 'asc',
    sheet: qs.get('sheet') || null, // f-<facet> | view | timer | lists | ing | sort
    side: qs.get('side') === '0', // sidebar collapsed
    collapsed: new Set(['uncat']),
    lb: qs.get('lb') !== null ? Number(qs.get('lb')) : null, // lightbox photo index // "Ohne Kategorie" starts folded, as today
  }
  const F = { cats: [], tags: [], ings: [], dur: null, role: 'any', collab: 'any', q: '' }
  const presetFilters = () => Object.assign(F, { cats: [], tags: ['Vegetarisch'], ings: [], dur: 30, role: 'any', collab: 'any', q: '' })
  const clearFilters = () => Object.assign(F, { cats: [], tags: [], ings: [], dur: null, role: 'any', collab: 'any', q: '' })
  const facetCount = () => F.cats.length + F.tags.length + F.ings.length + (F.dur !== null) + (F.role !== 'any') + (F.collab !== 'any')
  const toggleIn = (arr, v) => (arr.includes(v) ? arr.splice(arr.indexOf(v), 1) : arr.push(v))

  const inCats = (r) => !F.cats.length || (F.cats.includes(UNCAT) && !catsOf(r).length) || catsOf(r).some((c) => F.cats.includes(c.id))
  const matches = (r) =>
    inCats(r) &&
    F.tags.every((t) => r.tags.includes(t)) &&
    F.ings.every((n) => r.sections.some((s) => s.ingredients.some((i) => i.name === n))) &&
    (F.dur === null || (r.work != null && r.work <= F.dur)) &&
    (F.role === 'any' || roleOf(r) === F.role) &&
    (F.collab === 'any' || collabOf(r) === F.collab) &&
    (!F.q.trim() || (r.name + ' ' + r.sections.flatMap((s) => s.ingredients.map((i) => i.name)).join(' ')).toLowerCase().includes(F.q.trim().toLowerCase()))
  const SORTS = [
    { key: 'name', label: 'Name', icon: 'type', v: (r) => r.name.toLowerCase() },
    { key: 'work', label: 'Arbeitszeit', icon: 'clock', v: (r) => r.work },
    { key: 'total', label: 'Gesamtzeit', icon: 'timer', v: (r) => r.total },
    { key: 'rating', label: 'Bewertung', icon: 'star', v: (r) => r.rating },
  ]
  const sortObj = () => SORTS.find((s) => s.key === UI.sortKey)
  const sorted = (rs) => {
    const v = sortObj().v
    const d = UI.sortDir === 'asc' ? 1 : -1
    return [...rs].sort((a, b) => (v(a) == null ? 1 : v(b) == null ? -1 : v(a) < v(b) ? -d : v(a) > v(b) ? d : 0))
  }
  const dirLabel = (k = UI.sortKey, d = UI.sortDir) =>
    k === 'name' ? (d === 'asc' ? 'A → Z' : 'Z → A') : k === 'rating' ? (d === 'asc' ? 'Schlechteste zuerst' : 'Beste zuerst') : d === 'asc' ? 'Kürzeste zuerst' : 'Längste zuerst'
  const dirIcon = () => (UI.sortKey === 'name' ? (UI.sortDir === 'asc' ? 'arrow-up-a-z' : 'arrow-down-z-a') : UI.sortDir === 'asc' ? 'arrow-up-narrow-wide' : 'arrow-down-wide-narrow')

  /* ---------------- category atoms ---------------- */
  const catGlyph = (c) => (c.icon ? `<span class="emoji">${c.icon}</span>` : `<span class="cat-initial">${esc(c.name[0])}</span>`)
  const catMark = (c, cls = '') => `<span class="cat-mark cat ${cls}" ${cv(c)}>${catGlyph(c)}</span>`
  const chip = (c) => `<span class="cat-chip cat" ${cv(c)}>${c.icon ? `<span class="emoji">${c.icon}</span>` : ''}${esc(c.name)}</span>`
  const dot = (c) => `<span class="cat cat-dot" ${cv(c)}></span>`
  const dots = (r, except) => {
    const cs = catsOf(r).filter((c) => c.id !== except)
    if (!cs.length) return ''
    return `<span class="cat-dots">${cs.slice(0, 3).map(dot).join('')}${cs.length > 3 ? `<span class="more">+${cs.length - 3}</span>` : ''}</span>`
  }
  const catLine = (r) => {
    const cs = catsOf(r)
    if (!cs.length) return ''
    return `<div class="cat-line">${cs.slice(0, 3).map(dot).join('')}<span class="ellipsis">${esc(cs[0].name)}${cs.length > 1 ? ` <span class="subtle">+${cs.length - 1}</span>` : ''}</span></div>`
  }

  /* ---------------- recipe atoms ---------------- */
  const stars = (r) => `<span class="stars">${icon('star')}<span class="num">${fmtRating(r.rating)}</span></span>`
  const timeMeta = (r) => `<span>${icon('clock')}<span class="num">${mins(r.total)}</span></span>`
  const tagHtml = (t) => `<span class="tag">${TAG_ICONS[t] ? icon(TAG_ICONS[t]) : ''}${esc(t)}</span>`
  const sharedMeta = (r) => (r.owner !== ME ? `<span>von ${owner(r).name}</span>` : '')
  // Access stays neutral grey and only appears when it says something: your own private recipe shows nothing.
  const ROLE_I = { editor: ['pencil', 'Du darfst bearbeiten'], viewer: ['eye', 'Nur ansehen'] }
  const COLLAB_I = { shared: ['share-2', 'Geteilt (nur lesen)'], collaborative: ['users', 'Kollaborativ'] }
  const access = (r) => {
    const a = [ROLE_I[roleOf(r)], COLLAB_I[collabOf(r)]].filter(Boolean)
    return a.length ? `<span class="access">${a.map(([i, t]) => `<span class="tip" data-tip="${t}">${icon(i)}</span>`).join('')}</span>` : ''
  }

  function thumb(r, cls = 'thumb') {
    if (!IMG) return ''
    if (hasImg(r)) return `<div class="photo ${cls}"><img src="img/${r.img}.jpg" alt="" loading="lazy"></div>`
    return `<div class="photo fallback ${cls}">${icon('utensils-crossed')}</div>`
  }
  function media(r, cls = 'cimg') {
    if (hasImg(r)) return `<div class="photo ${cls}"><img src="img/${r.img}.jpg" alt="" loading="lazy"></div>`
    return `<div class="photo type-tile ${cls}"><span>${esc(r.name)}</span></div>`
  }

  const recipeRow = (r, ctx = {}) => `
    <a class="row rrow" href="${route('detail')}">
      ${thumb(r)}
      <div class="grow">
        <div class="t ellipsis">${esc(r.name)}</div>
        <div class="meta">${timeMeta(r)}${stars(r)}${sharedMeta(r)}</div>
      </div>
      <div class="hide-m chips rr-tags">${r.tags.slice(0, 2).map(tagHtml).join('')}</div>
      ${access(r)}${dots(r, ctx.except)}
    </a>`
  const compactRow = (r, ctx = {}) => `
    <a class="row crow" href="${route('detail')}">
      <span class="t ellipsis">${esc(r.name)}</span>
      ${stars(r)}<span class="cr-time muted num">${mins(r.total)}</span>
      <span class="grow"></span>
      <span class="hide-m chips rr-tags">${r.tags.slice(0, 2).map(tagHtml).join('')}</span>
      ${access(r)}${dots(r, ctx.except)}
    </a>`
  const recipeCard = (r) => `
    <a class="ccard" href="${route('detail')}">
      ${media(r)}
      <div class="cbody">
        ${catLine(r)}
        <div class="ct">${esc(r.name)}</div>
        <div class="meta">${timeMeta(r)}${stars(r)}${r.owner !== ME ? `<span>von ${owner(r).name}</span>` : ''}${access(r)}</div>
      </div>
    </a>`
  const items = (rs, ctx = {}) =>
    UI.view === 'tiles'
      ? `<div class="grid cgrid">${rs.map(recipeCard).join('')}</div>`
      : `<div class="rows ${UI.view === 'compact' ? 'compact' : ''}">${rs.map((r) => (UI.view === 'compact' ? compactRow : recipeRow)(r, ctx)).join('')}</div>`

  /* ---------------- Timers (global, as today's TimerPanel) ---------------- */
  const TIMERS = [
    { label: 'Bolognese · köcheln', rem: '18:42', pct: 38, status: 'running' },
    { label: 'Nudelwasser', rem: '06:10', pct: 59, status: 'paused' },
  ]
  const timerBtn = () =>
    `<button class="btn ghost timer-btn" data-act="sheet:timer" aria-label="Timer">${icon('timer')}<span class="num">${TIMERS[0].rem}</span></button>`
  const timerPanel = () => `
    ${TIMERS.map(
      (t) => `<div class="trow ${t.status}">
        <div class="grow"><div class="t ellipsis">${t.label}</div><div class="tbar"><span style="width:${t.pct}%"></span></div></div>
        <div class="num trem">${t.rem}</div>
        <button class="btn ghost sm icon">${icon(t.status === 'running' ? 'pause' : 'play')}</button>
        <button class="btn ghost sm icon">${icon('rotate-ccw')}</button>
        <button class="btn ghost sm icon">${icon('x')}</button>
      </div>`,
    ).join('')}
    <div class="col-h" style="margin-top:18px">Neuer Timer</div>
    <div class="input" style="margin-bottom:8px"><input placeholder="Name (optional)"></div>
    <div class="tpresets">${[5, 10, 15, 30].map((m) => `<button class="btn sm">${m} min</button>`).join('')}</div>
    <div class="tnew"><div class="input num tdur"><input value="0:12:00"></div><button class="btn primary">${icon('play')}Starten</button></div>
    <p class="fhint" style="margin:10px 0 0">Timer laufen weiter, wenn du die Seite wechselst. Zeitangaben in Rezeptschritten starten direkt einen Timer.</p>`

  /* ---------------- Shell ---------------- */
  const NAV = [
    ['home', 'home', 'Start'],
    ['list', 'book-open', 'Rezepte'],
    ['planner', 'calendar', 'Planer'],
    ['shopping', 'shopping-cart', 'Einkauf'],
    ['groups', 'users', 'Gruppen'],
  ]
  const concept = `<span class="concept">Konzept</span>`
  // Breadcrumb shows where you came from (Einkauf / Spaghetti …), falling back to the logical parent.
  const LABEL = { home: 'Start', list: 'Rezepte', listf: 'Rezepte', category: 'Favoriten', planner: 'Planer', shopping: 'Einkauf', groups: 'Gruppen', profile: 'Profil', categories: 'Kategorien', detail: 'Spaghetti Bolognese', detail2: 'Caesar Salad' }
  const crumb = (fallback) => `<span class="subtle">${LABEL[HIST[HIST.length - 1]] ?? fallback} /</span> `
  const tip = (t, inner, cls = '') => `<span class="tip ${cls}" data-tip="${t}">${inner}</span>`
  // Phone: the profile sits behind the avatar at the far right of the top bar on every main page (like X/Reddit),
  // so the tab bar stays for content destinations. Desktop has it at the bottom of the side nav.
  const meBtn = `<a class="me-btn only-m" href="${route('profile')}" aria-label="Profil & Einstellungen"><span class="avatar">K</span></a>`
  function shell(active, { title = '', actions = '', body = '', wide = false, mobileTitle, back, activeCat, sheets = '' } = {}) {
    const C = UI.side
    const side = `
      <aside class="sidenav">
        <div class="brand"><span class="brand-mark">${icon('chef-hat')}</span><span class="side-l">Foodly</span>
          <button class="btn ghost sm icon side-toggle" data-act="side" aria-label="Seitenleiste ${C ? 'öffnen' : 'schließen'}" ${C ? 'data-tip="Seitenleiste öffnen"' : ''}>${icon(C ? 'panel-left-open' : 'panel-left-close')}</button></div>
        <a class="btn primary side-new" href="${route('editor')}" ${C ? 'data-tip="Neues Rezept"' : ''}>${icon('plus')}<span class="side-l">Neues Rezept</span></a>
        ${NAV.map(([k, i, l]) => `<a class="nav-item ${active === k && !activeCat ? 'active' : ''}" href="${route(k)}" ${C ? `data-tip="${l}"` : ''}>${icon(i)}<span class="side-l">${l}</span></a>`).join('')}
        <div class="nav-label"><span class="side-l">Kategorien</span><a href="${route('categories')}" class="subtle side-l">${icon('settings')}</a></div>
        ${CATEGORIES.map(
          (c) =>
            `<a class="nav-item cat-item ${activeCat === c.id ? 'active' : ''}" href="${route('category')}" ${C ? `data-tip="${esc(c.name)}"` : ''}>${dot(c)}<span class="ellipsis side-l">${esc(c.name)}</span><span class="count num side-l">${c.recipes.length}</span></a>`,
        ).join('')}
        <div class="nav-spacer"></div>
        <a class="nav-item ${active === 'profile' ? 'active' : ''}" href="${route('profile')}" ${C ? 'data-tip="Profil & Einstellungen"' : ''}><span class="avatar xs">K</span><span class="side-l">Kolja</span></a>
      </aside>`
    const tab = `<nav class="tabbar">${NAV.map(([k, i, l]) => `<a class="${active === k ? 'active' : ''}" href="${route(k)}">${icon(i)}${l}</a>`).join('')}</nav>`
    const top = `
      <header class="topbar">
        ${back ? `<button class="btn ghost icon" data-act="back:${back}" aria-label="Zurück">${icon('chevron-left')}</button>` : ''}
        <h1 class="ellipsis"><span class="hide-m">${title}</span><span class="only-m">${mobileTitle ?? title}</span></h1>
        <div class="grow"></div>${actions}${timerBtn()}${!back && active !== 'profile' ? meBtn : ''}
      </header>`
    const timer = UI.sheet === 'timer' ? sheet('Timer', timerPanel(), 'pop') : ''
    return `<div class="app ${C ? 'side-c' : ''}">${side}<main class="main">${top}<div class="page ${wide ? 'wide' : ''}">${body}</div></main>${tab}</div>${timer}${sheets}`
  }
  // Mobile: bottom sheet. Desktop: 'pop' = popover under the top bar, 'side' = drawer from the right.
  const sheet = (title, body, kind = 'side', foot = '') => `
    <div class="overlay ${kind}" data-act="close"></div>
    <div class="sheet ${kind}" role="dialog">
      <div class="sheet-grab only-m"></div>
      <div class="sheet-h"><h2>${title}</h2><button class="btn ghost sm icon" data-act="close">${icon('x')}</button></div>
      <div class="sheet-b">${body}</div>${foot ? `<div class="sheet-f">${foot}</div>` : ''}
    </div>`
  // Phone: "Neues Rezept" is a floating button bottom right above the tab bar (like X/Twitter's compose button):
  // reachable with the thumb, and the top bar stays for title, timer and page actions.
  const fab = `<a class="fab only-m" href="${route('editor')}" aria-label="Neues Rezept">${icon('plus')}</a>`
  const newBtnM = ''

  /* ---------------- List: toolbar, filters ---------------- */
  const seg = (name, cur, opts) =>
    `<div class="seg">${opts.map(([v, i, l]) => tip(l, `<button class="${cur === v ? 'on' : ''}" data-act="${name}:${v}" aria-label="${l}">${icon(i)}</button>`)).join('')}</div>`
  const viewSeg = () =>
    seg('view', UI.view, [
      ['compact', 'menu', 'Kompakt'],
      ['detailed', 'layout-list', 'Detailliert'],
      ['tiles', 'layout-grid', 'Kacheln'],
    ])
  const groupSeg = () =>
    seg('group', UI.grouped ? 'cat' : 'flat', [
      ['cat', 'list-tree', 'Nach Kategorie'],
      ['flat', 'list', 'Einfache Liste'],
    ])
  const badge = (n) => (n ? `<span class="badge num">${n}</span>` : '')
  const sortMenu = () => `
    <div class="menu-list">${SORTS.map((s) => `<button class="mi ${UI.sortKey === s.key ? 'on' : ''}" data-act="sort:${s.key}">${icon(s.icon)}<span class="grow">${s.label}</span>${UI.sortKey === s.key ? icon('check') : ''}</button>`).join('')}</div>
    <div class="menu-sep"></div>
    <div class="seg full"><button class="${UI.sortDir === 'asc' ? 'on' : ''}" data-act="dir:asc">${dirLabel(UI.sortKey, 'asc')}</button><button class="${UI.sortDir === 'desc' ? 'on' : ''}" data-act="dir:desc">${dirLabel(UI.sortKey, 'desc')}</button></div>`
  // Sort button carries the direction itself (icon + criterion); the direction is chosen inside the menu.
  const sortBtn = () => `
    <div class="sort-wrap">
      <button class="btn sm" data-act="menu:sort">${icon(dirIcon())}${sortObj().label}${icon('chevron-down', 'subtle')}</button>
      ${UI.sheet === 'sort' ? `<div class="overlay clear" data-act="close"></div><div class="popover right">${sortMenu()}</div>` : ''}
    </div>`

  /* ---- Filter bar: one button per facet, the active value lives in the button (Linear/GitHub style) ---- */
  const visibleAll = () => RECIPES.filter(matches)
  const ROLE_L = { owner: 'Besitzer', editor: 'Bearbeiter', viewer: 'Betrachter' }
  const COLLAB_L = { private: 'Privat', shared: 'Geteilt', collaborative: 'Kollaborativ' }
  const listSummary = (arr, label) => (arr.length === 1 ? label(arr[0]) : `${label(arr[0])} +${arr.length - 1}`)
  const catName = (id) => (id === UNCAT ? 'Ohne Kategorie' : CATEGORIES.find((c) => c.id === id).name)
  const FACETS = [
    { key: 'cat', label: 'Kategorie', icon: 'folder', n: () => F.cats.length, value: () => listSummary(F.cats, catName), clr: 'cats' },
    { key: 'tag', label: 'Tags', icon: 'tag', n: () => F.tags.length, value: () => listSummary(F.tags, (t) => t), clr: 'tags' },
    { key: 'ing', label: 'Zutaten', icon: 'list-checks', n: () => F.ings.length, value: () => listSummary(F.ings, (t) => t), clr: 'ings' },
    { key: 'time', label: 'Arbeitszeit', icon: 'clock', n: () => +(F.dur !== null), value: () => `≤ ${F.dur} min`, clr: 'dur' },
    { key: 'access', label: 'Zugriff', icon: 'users', n: () => (F.role !== 'any') + (F.collab !== 'any'), value: () => [ROLE_L[F.role], COLLAB_L[F.collab]].filter(Boolean).join(' · '), clr: 'access' },
  ]
  const checkRow = (on, act, label, n, lead = '', after = '') =>
    `<div class="ck-row"><button class="ck ${on ? 'on' : ''}" data-act="${act}"><span class="check ${on ? 'on' : ''}">${on ? icon('check') : ''}</span>${lead}<span class="grow ellipsis">${label}</span><span class="subtle num">${n}</span></button>${after}</div>`
  const radioRow = (on, act, label, lead = '') =>
    `<button class="ck ${on ? 'on' : ''}" data-act="${act}"><span class="radio ${on ? 'on' : ''}"></span>${lead}<span class="grow">${label}</span></button>`
  const countBy = (pred) => RECIPES.filter(pred).length
  const facetBody = (k) => {
    if (k === 'cat') {
      return `<div class="ck-list">${checkRow(F.cats.includes(UNCAT), `fcat:${UNCAT}`, 'Ohne Kategorie', countBy((r) => !catsOf(r).length), '<span class="cat-dot none"></span>')}${CATEGORIES.map((c) => checkRow(F.cats.includes(c.id), `fcat:${c.id}`, esc(c.name), c.recipes.length, dot(c))).join('')}</div>
        <p class="fhint fp-hint">Mehrere = Rezepte aus einer davon.</p>`
    }
    if (k === 'tag' || k === 'ing') {
      const all = k === 'tag' ? ALL_TAGS : ALL_INGS
      const sel = k === 'tag' ? F.tags : F.ings
      const has = (r, v) => (k === 'tag' ? r.tags.includes(v) : r.sections.some((s) => s.ingredients.some((i) => i.name === v)))
      const rest = all.filter((v) => !sel.includes(v)).sort((a, b) => countBy((r) => has(r, b)) - countBy((r) => has(r, a)))
      const rows = [...sel, ...rest].slice(0, k === 'tag' ? 40 : 9)
      return `<label class="input sm search fp-search">${icon('search')}<input placeholder="${k === 'tag' ? 'Tag' : 'Zutat'} suchen"></label>
        <div class="ck-list scroll">${rows.map((v) => checkRow(sel.includes(v), `${k === 'tag' ? 'ftag' : 'fing'}:${v}`, esc(v), '', k === 'tag' && TAG_ICONS[v] ? icon(TAG_ICONS[v], 'subtle') : '')).join('')}</div>
        ${k === 'ing' ? `<p class="fhint fp-hint">Alle weiteren über die Suche. Mehrere = Rezept enthält alle.</p>` : `<p class="fhint fp-hint">Mehrere = Rezept hat alle.</p>`}`
    }
    if (k === 'time') {
      // One value, three ways to set it: slider, field, quick picks. The quick picks only fill in slider + field.
      const v = F.dur ?? DUR_MAX
      return `<div class="dur-pop">
        <div class="dur-row"><input type="range" class="range" id="dur-range" min="0" max="${DUR_MAX}" step="5" value="${v}" style="--p:${(v / DUR_MAX) * 100}%" aria-label="Maximale Arbeitszeit">
          <div class="input sm num dur-in"><span class="subtle">≤</span><input id="dur-field" inputmode="numeric" value="${F.dur ?? ''}" placeholder="–"><span class="subtle">min</span></div></div>
        <div class="dur-quick">${[15, 30, 60].map((m) => `<button class="btn sm ${F.dur === m ? 'pressed' : ''}" data-act="dur:${m}">${m} min</button>`).join('')}</div>
        <p class="fhint fp-hint">Zählt die Arbeitszeit. Rezepte ohne Angabe fallen raus.</p></div>`
    }
    if (k === 'access')
      return `<div class="fp-sub">Meine Rolle</div><div class="ck-list">${[
        ['any', '', 'Alle'],
        ['owner', 'crown', 'Besitzer'],
        ['editor', 'pencil', 'Bearbeiter'],
        ['viewer', 'eye', 'Betrachter'],
      ]
        .map(([v, i, l]) => radioRow(F.role === v, `role:${v}`, l, i ? icon(i, 'subtle') : ''))
        .join('')}</div>
        <div class="fp-sub">Freigabe</div><div class="ck-list">${[
          ['any', '', 'Alle'],
          ['private', 'lock', 'Privat'],
          ['shared', 'share-2', 'Geteilt (nur lesen)'],
          ['collaborative', 'users', 'Kollaborativ'],
        ]
          .map(([v, i, l]) => radioRow(F.collab === v, `collab:${v}`, l, i ? icon(i, 'subtle') : ''))
          .join('')}</div>`
  }
  const facetBtn = (f) => {
    const n = f.n()
    const open = UI.sheet === 'f-' + f.key
    const pop = open
      ? `<div class="overlay fov" data-act="close"></div>
         <div class="popover fpop" role="dialog">
           <div class="fp-h only-m"><h2>${f.label}</h2><button class="btn ghost sm icon" data-act="close">${icon('x')}</button></div>
           ${facetBody(f.key)}
           <div class="fp-f">${n ? `<button class="link-btn" data-act="clr:${f.clr}">Zurücksetzen</button>` : '<span></span>'}<button class="btn sm primary only-m" data-act="close">Anzeigen</button></div>
         </div>`
      : ''
    return `<div class="fb-wrap"><span class="fbtn ${n ? 'on' : ''} ${open ? 'open' : ''}"><button class="fb-main" data-act="sheet:f-${f.key}">${n ? '' : icon(f.icon, 'subtle')}<span class="fb-l">${f.label}</span>${n ? `<span class="fb-v">${esc(f.value())}</span>` : icon('chevron-down', 'subtle')}</button>${n ? `<button class="fb-x" data-act="clr:${f.clr}" aria-label="${f.label} zurücksetzen">${icon('x')}</button>` : ''}</span>${pop}</div>`
  }

  // Row 1: search, sort, views (phone: one sort/view button). Row 2: the filter bar.
  // Row 3: result count + reset. Phone: the filter bar scrolls sideways, every facet opens a bottom sheet.
  const toolbar = ({ filters = true, count = '' } = {}) => `
    <div class="toolbar">
      <label class="input search">${icon('search')}<input id="q" placeholder="Rezept oder Zutat suchen" value="${esc(F.q)}">${F.q ? `<button class="x-btn" data-act="q-clear" aria-label="Suche leeren">${icon('x')}</button>` : ''}</label>
      <button class="btn icon only-m" data-act="sheet:view" aria-label="Sortieren und Ansicht">${icon('sliders-horizontal')}</button>
      <div class="lb-right hide-m">${sortBtn()}<span class="vsep"></span>${viewSeg()}${filters ? groupSeg() : ''}</div>
    </div>
    ${filters ? `<div class="list-bar"><div class="fbar">${FACETS.map(facetBtn).join('')}</div></div>` : ''}
    <div class="list-meta"><span class="num">${count}</span>${filters && facetCount() ? `<button class="link-btn" data-act="clr:all">Alle Filter zurücksetzen</button>` : ''}</div>`

  const viewSheet = () =>
    sheet(
      'Sortieren & Ansicht',
      `<div class="col-h">Sortieren nach</div>${sortMenu()}
       <div class="col-h" style="margin-top:20px">Ansicht</div>
       <div class="seg full">${[
         ['compact', 'menu', 'Kompakt'],
         ['detailed', 'layout-list', 'Detailliert'],
         ['tiles', 'layout-grid', 'Kacheln'],
       ]
         .map(([v, i, l]) => `<button class="${UI.view === v ? 'on' : ''}" data-act="view:${v}">${icon(i)}${l}</button>`)
         .join('')}</div>
       <div class="col-h" style="margin-top:20px">Gliederung</div>
       <div class="seg full"><button class="${UI.grouped ? 'on' : ''}" data-act="group:cat">${icon('list-tree')}Nach Kategorie</button><button class="${UI.grouped ? '' : 'on'}" data-act="group:flat">${icon('list')}Einfache Liste</button></div>`,
      'side',
    )

  /* ---------------- Screens ---------------- */
  const S = {}

  S.home = () => {
    const today = [
      [R[PLAN.entries['3-0']], 'Mittag'],
      [R[PLAN.entries['3-1']], 'Abend'],
    ]
    const recent = [14, 12, 8, 1, 6, 10].map((id) => R[id])
    const shared = RECIPES.filter((r) => r.owner !== ME).slice(0, 3)
    // Desktop: big photo cards. Phone: the same card size as "Zuletzt bearbeitet" below, so nothing shouts.
    const todayBig = ([r, slot]) =>
      `<a class="today-c ${hasImg(r) ? '' : 'noimg'}" href="${route('detail')}">${hasImg(r) ? `<div class="photo"><img src="img/${r.img}.jpg" alt=""></div>` : ''}<div class="tc-over"><div class="tc-slot">${slot}</div><div class="tc-t">${esc(r.name)}</div><div class="tc-m num">${mins(r.total)}</div></div></a>`
    const todaySmall = ([r, slot]) =>
      `<a class="ccard" href="${route('detail')}">${media(r)}<div class="cbody"><div class="slot">${slot}</div><div class="ct">${esc(r.name)}</div><div class="meta">${timeMeta(r)}</div></div></a>`
    const tiles = CATEGORIES.map(
      (c) => `<a class="cat-tile cat" ${cv(c)} href="${route('category')}">${catMark(c)}<span class="ct-name ellipsis">${esc(c.name)}</span><span class="ct-count num">${c.recipes.length}</span></a>`,
    ).join('')
    const body = `
      <div class="home-head">
        <div class="subtle" style="font-size:13px;font-weight:500">Donnerstag, 29. Oktober</div>
        <h2 class="page-title">Hallo Kolja</h2>
      </div>
      <section>
        <div class="section-h"><h2>Kategorien</h2><a href="${route('categories')}">Verwalten</a></div>
        <div class="cat-tiles">${tiles}</div>
      </section>
      <div class="home-grid">
        <section>
          <div class="section-h"><h2>Heute geplant ${concept}</h2><a href="${route('planner')}">Wochenplan</a></div>
          <div class="today-grid hide-m">${today.map(todayBig).join('')}</div>
          <div class="grid cgrid only-m">${today.map(todaySmall).join('')}</div>
          <div class="section-h"><h2>Zuletzt bearbeitet</h2><a href="${route('list')}">Alle Rezepte</a></div>
          <div class="grid cgrid">${recent.map(recipeCard).join('')}</div>
        </section>
        <aside>
          <div class="section-h"><h2>Geteilt mit dir</h2></div>
          <div class="card rows divided pad-rows">${shared
            .map((r) => `<a class="row" href="${route('detail')}">${thumb(r, 'thumb sm')}<div class="grow"><div class="t ellipsis">${esc(r.name)}</div><div class="meta"><span>von ${owner(r).name}</span></div></div></a>`)
            .join('')}</div>
          <div class="section-h"><h2>Einkauf ${concept}</h2></div>
          <a class="card shop-mini" href="${route('shopping')}"><div class="grow"><div class="t">${SHOPPING.name}</div><div class="subtle num" style="font-size:12px">${SHOPPING.range} · 9 von 12 offen</div></div>${icon('chevron-right', 'subtle')}</a>
        </aside>
      </div>`
    return shell('home', { title: 'Start', mobileTitle: `<span class="m-brand"><span class="brand-mark">${icon('chef-hat')}</span>Foodly</span>`, body, sheets: fab })
  }

  const listBody = () => {
    const vis = sorted(visibleAll())
    let content
    if (!vis.length) {
      content = `<div class="empty card"><div class="empty-ic">${icon('search')}</div><div class="t">Keine Rezepte gefunden</div><div class="muted" style="font-size:13px">Lockere die Filter oder such nach etwas anderem.</div><button class="btn sm" style="margin-top:12px" data-act="clr:all">Filter zurücksetzen</button></div>`
    } else if (!UI.grouped) {
      content = items(vis)
    } else {
      // Same rules as today: "Ohne Kategorie" first (an inbox, folded by default), a recipe shows up in every category it is in,
      // only selected categories are shown while the category filter is active.
      const groups = []
      const none = vis.filter((r) => !catsOf(r).length)
      if (none.length && (!F.cats.length || F.cats.includes(UNCAT))) groups.push({ key: 'uncat', name: 'Ohne Kategorie', rs: none })
      CATEGORIES.filter((c) => !F.cats.length || F.cats.includes(c.id)).forEach((c) => {
        const rs = vis.filter((r) => c.recipes.includes(r.id))
        if (rs.length) groups.push({ key: 'c' + c.id, c, name: c.name, rs })
      })
      content = groups
        .map((g) => {
          const shut = UI.collapsed.has(g.key)
          return `<section class="lgroup ${g.c ? 'cat' : 'nocat'} ${shut ? 'collapsed' : ''}" ${g.c ? cv(g.c) : ''}>
            <div class="lgroup-h"><button class="lg-toggle" data-act="fold:${g.key}">${icon(shut ? 'chevron-right' : 'chevron-down', 'subtle')}${g.c ? dot(g.c) : ''}<span class="lg-name">${esc(g.name)}</span><span class="subtle num">${g.rs.length}</span></button>
            ${g.c ? `<a class="lg-open" href="${route('category')}">Öffnen${icon('chevron-right')}</a>` : ''}</div>
            ${shut ? '' : `<div class="lgroup-body">${items(g.rs, { except: g.c?.id })}</div>`}</section>`
        })
        .join('')
    }
    const total = RECIPES.length
    const count = `<span class="subtle num">${vis.length === total ? total : `${vis.length} von ${total}`}</span>`
    const main = `${toolbar({ count: `${vis.length === total ? total : `${vis.length} von ${total}`} Rezepte` })}<div class="list-content">${content}</div>`
    return { body: `<div class="list-layout">${main}</div>`, count }
  }
  S.list = () => {
    const { body, count } = listBody()
    const sheets = UI.sheet === 'view' ? viewSheet() : ''
    return shell('list', { title: 'Rezepte', body, wide: true, sheets: sheets + fab })
  }
  S.listf = () => {
    if (!S.listf.done) presetFilters(), (S.listf.done = true)
    return S.list()
  }

  S.category = () => {
    const c = CATEGORIES[0]
    const rs = sorted(c.recipes.map((id) => R[id]).filter((r) => !F.q.trim() || r.name.toLowerCase().includes(F.q.toLowerCase())))
    const body = `
      <div class="cat-head cat" ${cv(c)}>
        ${catMark(c, 'xl')}
        <div class="grow"><h2 class="page-title">${esc(c.name)}</h2><div class="ch-sub num">${rs.length} Rezepte · nur für dich sichtbar</div></div>
        <button class="btn sm hide-m">${icon('pencil')}Bearbeiten</button>
      </div>
      <div style="margin-top:16px">${toolbar({ filters: false, count: `${rs.length} Rezepte` })}</div>
      <div style="margin-top:12px">${items(rs, { except: c.id })}</div>`
    const sheets = UI.sheet === 'view' ? viewSheet() : ''
    return shell('list', { title: `${crumb('Rezepte')}${esc(c.name)}`, mobileTitle: '', back: 'list', actions: `<button class="btn ghost icon">${icon('more-horizontal')}</button>`, body, activeCat: c.id, wide: UI.view === 'tiles', sheets: sheets + fab })
  }

  // "30 Minuten", "ca. 2 Stunden", "5–6 Minuten" inside a step become tap-to-start timers (no cook mode needed).
  const withTimers = (t) =>
    esc(t).replace(/(ca\. )?(\d+(?:[–-]\d+)?)\s(Minuten|Stunden)/g, (m, ca, n, u) => `<button class="t-chip" data-act="sheet:timer">${icon('timer')}${ca ?? ''}${n} ${u === 'Minuten' ? 'Min.' : 'Std.'}</button>`)

  // Main image first, then the gallery (recipe.mainImage + recipe.images).
  const photosOf = (r) => [r.img, ...['tomatensuppe', 'ofengemuese', 'kuerbissuppe', 'gulasch', 'curry', 'caesar', 'bauernsalat', 'pfannkuchen'].filter((g) => g !== r.img)]
  const lightbox = (pics) => {
    const i = Math.min(UI.lb, pics.length - 1)
    return `<div class="lb" role="dialog" aria-label="Fotos">
      <div class="lb-top"><span class="num">${i + 1} / ${pics.length}</span><button class="lb-btn" data-act="lb-close" aria-label="Schließen">${icon('x')}</button></div>
      <div class="lb-stage">
        <button class="lb-btn lb-nav prev" data-act="lb:${(i - 1 + pics.length) % pics.length}" aria-label="Vorheriges Foto">${icon('chevron-left')}</button>
        <img src="img/${pics[i]}.jpg" alt="">
        <button class="lb-btn lb-nav next" data-act="lb:${(i + 1) % pics.length}" aria-label="Nächstes Foto">${icon('chevron-right')}</button>
      </div>
      <div class="lb-thumbs">${pics.map((g, k) => `<button class="lb-th ${k === i ? 'on' : ''}" data-act="lb:${k}"><img src="img/${g}.jpg" alt=""></button>`).join('')}</div>
    </div>`
  }
  function detailBody(r) {
    const cats = catsOf(r)
    const tags = r.tags.map(tagHtml).join('')
    // Portions recipe: stepper over servings. Fixed-size recipe (sizeNumber null, e.g. a cake tin): a × factor.
    const sizeCtl = r.size
      ? `<div class="portions"><button class="btn sm icon">${icon('minus')}</button><span class="num"><b>${r.size}</b> ${esc(r.sizeText)}</span><button class="btn sm icon">${icon('plus')}</button></div>`
      : `<div class="portions"><button class="btn sm icon">${icon('minus')}</button><span class="num"><b>× 1</b> <span class="muted">${esc(r.sizeText)}</span></span><button class="btn sm icon">${icon('plus')}</button></div>`
    const catCtl = `<div class="chips cat-ctl">${cats.map(chip).join('')}<button class="add-cat">${icon('plus')}${cats.length ? '' : 'Zu Kategorie hinzufügen'}</button></div>`
    const meta = `<div class="meta big-meta">${stars(r)}<span>${icon('clock')}<span class="num">${esc(r.time ?? mins(r.total))}</span></span>${r.editors.length || r.owner !== ME ? `<span>${icon('users')}${r.owner !== ME ? 'von ' + owner(r).name : 'mit Mara'}</span>` : ''}</div>`
    // Notes: plain lines under the meta, no box. Several notes stay separate lines.
    const note = r.notes.length ? `<ul class="notes">${r.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>` : ''
    const actions = `<div class="d-actions">${sizeCtl}<a class="btn primary" href="${route('cook')}">${icon('chef-hat')}Kochen</a></div>`
    const info = `${catCtl}<h2 class="page-title d-title">${esc(r.name)}</h2>${meta}<div class="chips" style="margin-top:12px">${tags}</div>`
    const head = hasImg(r) ? `<div class="dA"><button class="photo dA-img zoom" data-act="lb:0" aria-label="Foto groß ansehen"><img src="img/${r.img}.jpg" alt=""></button><div>${info}${note}${actions}</div></div>` : `<div class="d-noimg">${info}${note}${actions}</div>`
    const ings = (s) =>
      `<ul class="ings">${s.ingredients.map((g) => `<li><span class="amt num">${[g.prefix, g.amount, g.unit].filter(Boolean).join(' ')}</span><span class="ing">${esc(g.name ?? '')}${g.text ? ` <span class="muted">${esc(g.text)}</span>` : ''}</span></li>`).join('')}</ul>`
    const steps = (s) => `<ol class="steps">${s.steps.map((t, i) => `<li><span class="sn num">${i + 1}</span><span>${withTimers(t)}</span></li>`).join('')}</ol>`
    const sections = r.sections
      .map((s) => `<section class="rsec">${s.name && r.sections.length > 1 ? `<h3 class="rsec-h">${esc(s.name)}</h3>` : ''}<div class="rsec-grid"><div><div class="col-h">Zutaten</div>${ings(s)}</div><div><div class="col-h">Zubereitung</div>${steps(s)}</div></div></section>`)
      .join('')
    const pics = photosOf(r)
    const gallery = hasImg(r)
      ? `<div class="section-h"><h2>Fotos</h2><span class="subtle num" style="font-size:13px">${pics.length}</span></div><div class="gallery">${pics
          .slice(0, 4)
          .map((g, i) => {
            // One row only: the last visible tile carries "+N" for the rest and opens the lightbox there.
            const more = i === 3 && pics.length > 4 ? pics.length - 3 : 0
            return `<button class="photo zoom ${more ? 'more' : ''} ${i === 3 ? 'g4' : ''}" data-act="lb:${i}" aria-label="${more ? `Alle ${pics.length} Fotos ansehen` : `Foto ${i + 1} groß ansehen`}"><img src="img/${g}.jpg" alt="">${more ? `<span class="more-n num">+${more}</span>` : ''}${i === 2 && pics.length > 3 ? `<span class="more-n num only-m">+${pics.length - 2}</span>` : ''}</button>`
          })
          .join('')}</div>`
      : ''
    return `${head}${sections}${gallery}${r.source ? `<p class="muted" style="font-size:13px;margin-top:28px">Quelle: ${esc(r.source)}</p>` : ''}${UI.lb !== null && hasImg(r) ? lightbox(pics) : ''}`
  }
  // Phone: icons only. Edit right → pencil; view-only → copy ("Kopie erstellen" is how a viewer gets an editable version).
  const detailActionsFor = (r) => {
    const canEdit = roleOf(r) !== 'viewer'
    const editM = canEdit ? `<a class="btn ghost icon only-m" href="${route('editor')}" aria-label="Bearbeiten">${icon('pencil')}</a>` : `<button class="btn ghost icon only-m" aria-label="Kopie erstellen">${icon('copy')}</button>`
    return `${tip('Teilen', `<button class="btn ghost icon" aria-label="Teilen">${icon('share-2')}</button>`)}${tip('Kopie erstellen', `<button class="btn ghost icon hide-m" aria-label="Kopie erstellen">${icon('copy')}</button>`)}${canEdit ? `<a class="btn hide-m" href="${route('editor')}">${icon('pencil')}Bearbeiten</a>` : ''}${editM}`
  }
  S.detail = () => shell('list', { title: `${crumb('Rezepte')}${esc(R[1].name)}`, mobileTitle: '', back: 'list', actions: detailActionsFor(R[1]), body: detailBody(R[1]) })
  S.detail2 = () => shell('list', { title: `${crumb('Rezepte')}${esc(R[10].name)}`, mobileTitle: '', back: 'list', actions: detailActionsFor(R[10]), body: detailBody(R[10]) })
  S.timer = () => {
    UI.sheet = 'timer'
    return S.detail()
  }

  S.cook = () => {
    const r = R[1]
    const s = r.sections[0]
    const step = 3
    return `
      <div class="cook">
        <header class="cook-top">
          <button class="btn ghost icon" data-act="back:detail" aria-label="Koch-Modus beenden">${icon('x')}</button>
          <div class="grow"><div class="cook-title ellipsis">${esc(r.name)}</div><div class="subtle num" style="font-size:12px">${esc(s.name)} · Schritt ${step + 1} von 7</div></div>
          <button class="btn sm only-m">${icon('list-checks')}Zutaten</button>
          ${timerBtn()}
        </header>
        <div class="cook-progress"><span style="width:${((step + 1) / 7) * 100}%"></span></div>
        <div class="cook-body">
          <aside class="cook-ings hide-m">
            <div class="col-h">Zutaten · ${esc(s.name)}</div>
            <ul class="ings">${s.ingredients.map((g, i) => `<li class="${i === 3 ? 'hl' : ''}"><span class="amt num">${[g.prefix, g.amount, g.unit].filter(Boolean).join(' ')}</span><span class="ing">${esc(g.name ?? '')}</span></li>`).join('')}</ul>
          </aside>
          <main class="cook-main">
            <div class="cook-step-n num">Schritt ${step + 1}</div>
            <p class="cook-step">${withTimers(s.steps[step])}</p>
            <div class="cook-need"><span class="tag">ca. 800 g Tomaten (gehackt)</span></div>
            <div class="cook-timer card"><div class="ct-ic">${icon('timer')}</div><div class="grow"><div class="t">Bolognese · köcheln</div><div class="subtle" style="font-size:13px">läuft · 30 Min.</div></div><div class="num cook-timer-t">${TIMERS[0].rem}</div><button class="btn sm icon">${icon('pause')}</button></div>
            <div class="cook-next"><span class="col-h">Danach</span><span class="muted">${esc(s.steps[step + 1])}</span></div>
          </main>
        </div>
        <footer class="cook-nav">
          <button class="btn lg">${icon('chevron-left')}<span class="hide-m">Zurück</span></button>
          <div class="cook-dots">${Array.from({ length: 7 }, (_, i) => `<span class="${i === step ? 'on' : i < step ? 'done' : ''}"></span>`).join('')}</div>
          <button class="btn lg primary">Weiter${icon('chevron-right')}</button>
        </footer>
      </div>${UI.sheet === 'timer' ? sheet('Timer', timerPanel(), 'pop') : ''}`
  }

  /* ---------------- Editor: every field the model has, nothing more ---------------- */
  S.editor = () => {
    const r = R[1]
    const field = (label, inner, hint = '') => `<div class="field"><span class="flabel">${label}</span>${inner}${hint ? `<span class="fhint">${hint}</span>` : ''}</div>`
    // What you type is what you see: "ca. 800" stays one plain value; prefix/amount are split on save.
    const amtView = (g) => `<input value="${esc([g.prefix, g.amount].filter(Boolean).join(' '))}" placeholder="Menge">`
    const nameView = (g) => `<input value="${esc(g.name ?? '')}" placeholder="Zutat">${icon('search', 'subtle')}`
    const ingLine = (g) => `${[g.prefix, g.amount, g.unit].filter(Boolean).join(' ')}`
    const ingRowD = (g, hl) =>
      `<div class="ed-ing ${hl ? 'hl' : ''}">${icon('grip-vertical', 'subtle drag')}<div class="input sm amt-in num">${amtView(g)}</div><div class="input sm unit-in"><input value="${esc(g.unit ?? '')}" placeholder="Einheit">${icon('chevron-down', 'subtle')}</div><div class="input sm name-in">${nameView(g)}</div><div class="input sm suf-in"><input value="${esc(g.text ?? '')}" aria-label="Zusatz"></div><button class="btn ghost sm icon">${icon('ellipsis-vertical')}</button></div>`
    const ingRowM = (g, i) =>
      `<button class="ed-ing-m" data-act="sheet:ing"><span class="amt num">${esc(ingLine(g))}</span><span class="ing grow">${esc(g.name ?? '')}${g.text ? ` <span class="muted">${esc(g.text)}</span>` : ''}</span>${icon('chevron-right', 'subtle')}</button>`
    const sec = (s, si) => `
      <section class="ed-sec card">
        <div class="ed-sec-h">${icon('grip-vertical', 'subtle hide-m')}<input class="ed-sec-name" value="${esc(s.name ?? '')}" placeholder="Abschnitt ohne Namen"><button class="btn ghost sm icon">${icon('more-horizontal')}</button></div>
        <div class="ed-ing-head hide-m"><span></span><span>Menge</span><span>Einheit</span><span>Zutat</span><span>Zusatz</span><span></span></div>
        <div class="hide-m">${s.ingredients.map((g, i) => ingRowD(g, si === 0 && i === 3)).join('')}</div>
        <div class="only-m ed-ing-list">${s.ingredients.map(ingRowM).join('')}</div>
        <div class="ed-adds"><button class="btn ghost sm add">${icon('plus')}Zutat</button><button class="btn ghost sm add">${icon('clipboard-paste')}Mehrere einfügen</button></div>
        <div class="col-h" style="margin-top:18px">Zubereitung</div>
        ${s.steps
          .map((t, i) => `<div class="ed-step"><span class="sn num">${i + 1}</span><div class="input area"><textarea rows="2">${esc(t)}</textarea></div><button class="btn ghost sm icon">${icon('ellipsis-vertical')}</button></div>`)
          .join('')}
        <button class="btn ghost sm add">${icon('plus')}Schritt</button>
        ${si === 0 ? `<p class="fhint ed-hint">Zeitangaben wie „30 Minuten“ werden im Rezept zu Timern, die man antippen kann.</p>` : ''}
      </section>`
    const images = hasImg(r)
      ? `<div class="photo ed-img"><img src="img/${r.img}.jpg" alt=""><span class="ed-main-badge">Hauptbild</span></div>
         <div class="ed-gallery">${['tomatensuppe', 'ofengemuese', 'kuerbissuppe'].map((g) => `<div class="photo"><img src="img/${g}.jpg" alt=""></div>`).join('')}<button class="ed-drop sm">${icon('plus')}</button></div>
         <p class="fhint" style="margin-top:6px">Bild antippen: als Hauptbild setzen oder entfernen.</p>`
      : `<button class="ed-drop">${icon('image')}<span>Fotos hinzufügen</span><span class="fhint">Das erste wird Hauptbild</span></button>`
    const body = `
      <div class="editor">
        <div class="ed-main">
          <div class="only-m">${images}</div>
          <div class="card ed-basics">
            ${field('Titel', `<div class="input big-input"><input value="${esc(r.name)}"></div>`)}
            <div class="ed-row">
              ${field('Arbeitszeit', `<div class="input num"><input value="${r.work}"><span class="subtle">min</span></div>`)}
              ${field('Gesamtzeit', `<div class="input num"><input value="${r.total}"><span class="subtle">min</span></div>`)}
            </div>
            ${field(
              'Größe',
              `<div class="seg"><button class="on">Portionen</button><button>Freitext</button></div>
               <div class="ed-size"><div class="input num size-n"><input value="${r.size}"></div><div class="input grow"><input value="{${esc(r.sizeText)}}"></div></div>`,
              'Portionen: Beim Kochen wählt man die Anzahl, Mengen rechnen sich um. Freitext (z. B. „26 cm {Springform}“): Man skaliert mit einem Faktor ×½, ×2 …',
            )}
            ${field('Tags', `<div class="input tags-input">${r.tags.map((t) => `<span class="tag">${esc(t)} ${icon('x')}</span>`).join('')}<input placeholder="Tag hinzufügen"></div>`)}
          </div>
          ${r.sections.map(sec).join('')}
          <button class="btn dashed">${icon('plus')}Abschnitt hinzufügen</button>
          <p class="fhint">Abschnitte nur, wenn das Rezept Teile hat (z. B. Soße und Pasta). Ein Abschnitt ohne Namen ist der Normalfall.</p>
        </div>
        <aside class="ed-side">
          <div class="hide-m"><div class="col-h">Bilder</div>${images}</div>
          <div class="col-h ed-notes-h">Notizen</div>
          ${r.notes.map((n) => `<div class="ed-note"><div class="input area"><textarea rows="2">${esc(n)}</textarea></div><button class="btn ghost sm icon">${icon('ellipsis-vertical')}</button></div>`).join('')}
          <button class="btn ghost sm add">${icon('plus')}Notiz</button>
          <div class="col-h" style="margin-top:22px">Quelle</div>
          <div class="input"><input value="${esc(r.source ?? '')}" placeholder="Omas Rezept oder https://…"></div>
          <p class="fhint" style="margin-top:22px">Kategorien setzt du im Rezept über „+“, Teilen über ${icon('share-2')} – beides gehört nicht zum Rezept selbst.</p>
        </aside>
      </div>`
    const g = r.sections[0].ingredients[3]
    const ingSheet =
      UI.sheet === 'ing'
        ? sheet(
            'Zutat bearbeiten',
            `<div class="ing-sheet">
              ${field('Menge', `<div class="input num"><input value="ca. ${g.amount}"></div>`, 'Auch „ca. 800“, „1–2“ oder „½“.')}
              ${field('Einheit', `<div class="input"><input value="${g.unit}">${icon('chevron-down', 'subtle')}</div><div class="chips" style="margin-top:6px">${['g', 'kg', 'ml', 'EL', 'TL', 'Prise', 'Stück'].map((u) => `<span class="fchip ${u === 'g' ? 'on' : ''}">${u}</span>`).join('')}</div>`)}
              ${field('Zutat', `<div class="input"><input value="${g.name}">${icon('search', 'subtle')}</div>`, 'Aus dem Zutaten-Katalog, sonst Freitext.')}
              ${field('Zusatz', `<div class="input"><input placeholder="z. B. gehackt, nach Geschmack"></div>`)}
              <div class="ing-moves"><button class="btn sm">${icon('arrow-up')}Nach oben</button><button class="btn sm">${icon('arrow-down')}Nach unten</button><button class="btn sm ghost danger">${icon('trash-2')}Entfernen</button></div>
            </div>`,
            'side',
            `<button class="btn primary grow" data-act="close">Fertig</button>`,
          )
        : ''
    return shell('list', {
      title: 'Rezept bearbeiten',
      back: 'detail',
      actions: `<span class="saved">${icon('circle-check')}<span class="hide-m">Gespeichert</span></span><button class="btn primary" data-act="back:detail">Fertig</button>`,
      body,
      sheets: ingSheet,
    })
  }

  S.planner = () => {
    const cell = (d, s) => {
      const id = PLAN.entries[`${d}-${s}`]
      if (!id) return `<div class="pcell empty"><button class="btn ghost sm icon">${icon('plus')}</button></div>`
      const r = R[id]
      return `<a class="pcell" href="${route('detail')}">${hasImg(r) ? `<div class="photo pimg"><img src="img/${r.img}.jpg" alt=""></div>` : ''}<div class="pt">${esc(r.name)}</div><div class="pm">${dots(r)}</div></a>`
    }
    const body = `
      <div class="toolbar" style="margin-bottom:16px"><div class="seg"><button class="on">Woche</button><button>Monat</button></div><div class="grow"></div><button class="btn sm icon">${icon('chevron-left')}</button><span style="font-weight:600;font-size:14px">26. Okt – 1. Nov</span><button class="btn sm icon">${icon('chevron-right')}</button><button class="btn sm">${icon('shopping-cart')}<span class="hide-m">Einkaufsliste erstellen</span></button></div>
      <div class="plan hide-m">
        <div></div>${PLAN.days.map((d, i) => `<div class="pday ${i === PLAN.today ? 'today' : ''}">${d}</div>`).join('')}
        ${PLAN.slots.map((s, si) => `<div class="pslot">${s}</div>${PLAN.days.map((_, d) => cell(d, si)).join('')}`).join('')}
      </div>
      <div class="plan-m only-m">
        ${PLAN.days
          .map(
            (d, i) => `<div class="pm-day ${i === PLAN.today ? 'today' : ''}"><div class="pm-h">${d}${i === PLAN.today ? ' <span class="pm-today">Heute</span>' : ''}</div>
          ${PLAN.slots
            .map((s, si) => {
              const id = PLAN.entries[`${i}-${si}`]
              return id
                ? `<a class="row" href="${route('detail')}">${thumb(R[id], 'thumb sm')}<div class="grow"><div class="slot">${s}</div><div class="t ellipsis">${esc(R[id].name)}</div></div>${dots(R[id])}</a>`
                : `<div class="row subtle"><span class="pm-add">${icon('plus')}</span><span style="font-size:13px">${s} planen</span></div>`
            })
            .join('')}</div>`,
          )
          .join('')}
      </div>`
    return shell('planner', { title: `Planer ${concept}`, mobileTitle: `Planer ${concept}`, body, wide: true })
  }

  S.shopping = () => {
    const L = SHOPPING
    const groups = [...new Set(L.items.map((i) => i.group))]
    const open = L.items.filter((i) => !i.done).length
    const listRows = SHOPPING_LISTS.map(
      (l, i) => `<button class="row ${i === 0 ? 'sel' : ''}" data-act="close"><div class="grow"><div class="t ellipsis">${l.name}</div><div class="subtle" style="font-size:12px">${l.range}</div></div><span class="subtle num" style="font-size:12px">${l.open ? `${l.open} offen` : 'erledigt'}</span></button>`,
    ).join('')
    const body = `
      <div class="shop">
        <aside class="shop-lists hide-m">
          <div class="col-h side-h">Listen ${tip('Neue Liste', `<button class="btn ghost sm icon">${icon('plus')}</button>`)}</div>
          <div class="rows">${listRows}</div>
        </aside>
        <div class="shop-main">
          <div class="shop-head">
            <div><h2 class="page-title hide-m" style="font-size:22px">${L.name}</h2><div class="muted" style="font-size:13px">${L.range} · <span class="num">${open} von ${L.items.length}</span> offen</div></div>
            <button class="btn sm">${icon('plus')}Artikel</button>
          </div>
          <div class="shop-bar"><span style="width:${((L.items.length - open) / L.items.length) * 100}%"></span></div>
          <div class="shop-from">
            <div class="col-h">Erstellt aus ${L.recipes.length} Rezepten <span class="subtle" style="font-weight:500">· aus dem Wochenplan</span></div>
            <div class="scroll-x">${L.recipes.map((id) => `<a class="from-chip" href="${route('detail')}">${thumb(R[id], 'thumb xs')}<span class="ellipsis">${esc(R[id].name)}</span></a>`).join('')}<button class="from-chip add">${icon('plus')}Rezept</button></div>
          </div>
          ${groups
            .map(
              (g) => `<div class="col-h" style="margin-top:20px">${g}</div><div class="rows">${L.items
                .filter((i) => i.group === g)
                .map(
                  (i) =>
                    `<div class="row sitem ${i.done ? 'done' : ''}"><span class="check ${i.done ? 'on' : ''}">${i.done ? icon('check') : ''}</span><div class="grow"><div class="t">${i.name}</div><div class="subtle s-from">für ${i.from.map((id) => esc(R[id].name)).join(', ')}</div></div><span class="muted num" style="font-size:13px">${i.amount}</span></div>`,
                )
                .join('')}</div>`,
            )
            .join('')}
        </div>
      </div>`
    // Phone: the title is the list switcher (no side column there).
    const mTitle = `<button class="title-switch" data-act="sheet:lists">${L.name}${icon('chevron-down')}</button> ${concept}`
    const sheets = UI.sheet === 'lists' ? sheet('Einkaufslisten', `<div class="rows">${listRows}</div>`, 'side', `<button class="btn grow">${icon('plus')}Neue Liste</button>`) : ''
    return shell('shopping', { title: `Einkauf ${concept}`, mobileTitle: mTitle, body, sheets })
  }

  S.groups = () => {
    const g = GROUPS[0]
    const body = `
      <div class="shop">
        <aside class="shop-lists hide-m">
          <div class="col-h side-h">Gruppen ${tip('Neue Gruppe', `<button class="btn ghost sm icon">${icon('plus')}</button>`)}</div>
          <div class="rows">${GROUPS.map((x, i) => `<a class="row ${i === 0 ? 'sel' : ''}" href="#"><span class="avatar">${x.name[0]}</span><div class="grow"><div class="t ellipsis">${x.name}</div><div class="subtle" style="font-size:12px">${x.members.length} Mitglieder · ${x.recipes.length} Rezepte</div></div></a>`).join('')}</div>
        </aside>
        <div class="shop-main">
          <div class="shop-head"><div style="display:flex;gap:14px;align-items:center"><span class="avatar lg">${g.name[0]}</span><div><h2 class="page-title" style="font-size:22px">${g.name}</h2><div class="muted" style="font-size:13px">${g.members.length} Mitglieder · du bist Admin</div></div></div><button class="btn sm">${icon('user-plus')}Einladen</button></div>
          <div class="section-h"><h2>Mitglieder</h2></div>
          <div class="card rows divided pad-rows">${g.members.map((m) => `<div class="row"><span class="avatar">${USERS[m].initial}</span><div class="grow t">${USERS[m].name}${m === ME ? ' <span class="subtle">(du)</span>' : ''}</div><span class="subtle" style="font-size:13px">${m === g.owner ? 'Admin' : 'Mitglied'}</span></div>`).join('')}</div>
          <div class="section-h"><h2>Geteilte Rezepte</h2><span class="subtle num" style="font-size:13px">${g.recipes.length}</span></div>
          <div class="card rows divided pad-rows">${g.recipes.map((id) => recipeRow(R[id])).join('')}</div>
        </div>
      </div>`
    return shell('groups', { title: `Gruppen ${concept}`, body })
  }

  S.profile = () => {
    const sw = (t, d, on) => `<div class="row set"><div class="grow"><div class="t">${t}</div><div class="subtle" style="font-size:13px">${d}</div></div><span class="toggle ${on ? 'on' : ''}"></span></div>`
    const body = `
      <div class="narrow">
        <div class="prof-head"><span class="avatar lg">K</span><div><h2 class="page-title" style="font-size:22px">Kolja</h2><div class="muted" style="font-size:13px">42 Rezepte · 2 Gruppen</div></div></div>
        <div class="col-h">Darstellung</div>
        <div class="card set-card"><div class="row set"><div class="grow t">Design</div><div class="seg"><button>${icon('sun')}Hell</button><button>${icon('moon')}Dunkel</button><button class="on">System</button></div></div></div>
        <div class="col-h">Kochen</div>
        <div class="card set-card divided">${sw('Bildschirm wach halten', 'Im Koch-Modus geht das Display nicht aus', true)}${sw('Timer-Ton', 'Signal, wenn ein Timer abläuft', true)}</div>
        <div class="col-h">Offline ${concept}</div>
        <div class="card set-card divided">${sw('Rezepte offline speichern', 'Alle eigenen und geteilten Rezepte', true)}${sw('Fotos offline speichern', 'Braucht etwa 1 GB', false)}</div>
        <div class="card set-card divided"><a class="row set" href="${route('categories')}"><div class="grow t">Kategorien</div>${icon('chevron-right', 'subtle')}</a><a class="row set" href="${route('states')}"><div class="grow t">Zustände (Mockup)</div>${icon('chevron-right', 'subtle')}</a><div class="row set"><div class="grow t danger">Abmelden</div></div></div>
      </div>`
    return shell('profile', { title: 'Profil & Einstellungen', mobileTitle: 'Profil', body })
  }

  S.categories = () => {
    const swatches = ['#e11d48', '#f97316', '#f59e0b', '#fde047', '#84cc16', '#10b981', '#06b6d4', '#0ea5e9', '#1e3a8a', '#7c3aed', '#c026d3', '#78716c']
    const edit = { name: 'Sommer', icon: '☀️', color: '#fde047' }
    const body = `
      <div class="narrow">
        <div class="section-h" style="margin-top:0"><h2>Meine Kategorien</h2><button class="btn sm">${icon('plus')}Neue Kategorie</button></div>
        <p class="muted" style="font-size:13px;margin:-4px 0 12px">Kategorien sind deine persönlichen Sammlungen. Ein Rezept kann in mehreren sein, andere sehen sie nicht.</p>
        <div class="card rows divided pad-rows">${CATEGORIES.map(
          (c) => `<div class="row">${icon('grip-vertical', 'subtle hide-m')}${catMark(c)}<div class="grow"><div class="t">${esc(c.name)}</div><div class="subtle num" style="font-size:12px">${c.recipes.length} Rezepte</div></div><button class="btn ghost sm icon">${icon('more-horizontal')}</button></div>`,
        ).join('')}</div>
        <div class="card cat-editor">
          <div class="col-h">Kategorie bearbeiten</div>
          <div class="ce-row"><button class="cat-mark cat ce-icon" ${cv(edit)}><span class="emoji">${edit.icon}</span></button><div class="input grow"><input value="${edit.name}"></div></div>
          <div class="fhint" style="margin-top:6px">Symbol kommt aus den Tag-Symbolen. Ohne Symbol zeigt Foodly den Anfangsbuchstaben.</div>
          <div class="col-h" style="margin-top:16px">Farbe</div>
          <div class="swatches">${swatches.map((s) => `<span class="sw cat ${s === edit.color ? 'on' : ''}" style="--c:${s}"><span></span></span>`).join('')}<span class="sw custom">${icon('plus')}</span></div>
          <div class="fhint" style="margin-top:6px">Du wählst eine Farbe, die Varianten für Hell und Dunkel rechnet Foodly selbst.</div>
          <div class="col-h" style="margin-top:16px">So sieht es aus</div>
          <div class="ce-preview">${chip(edit)}${catMark(edit)}<span class="cat-label cat" ${cv(edit)}>${dot(edit)}${edit.name}</span></div>
          <div class="warn">${icon('info')}<span>Ähnlich wie „Backen &amp; Süßes“. Eine andere Farbe macht die beiden leichter unterscheidbar.</span></div>
        </div>
      </div>`
    return shell('profile', { title: 'Kategorien', back: 'profile', body })
  }

  S.states = () => {
    const skelRow = `<div class="row"><div class="skel thumb"></div><div class="grow"><div class="skel" style="height:12px;width:55%;margin-bottom:8px"></div><div class="skel" style="height:10px;width:30%"></div></div></div>`
    const body = `
      <div class="narrow">
        <div class="col-h">Verbindung verloren</div>
        <div class="banner">${icon('cloud-off')}<span class="grow">Keine Verbindung. Du siehst den zuletzt geladenen Stand.</span><button class="btn sm">Erneut versuchen</button></div>
        <div class="col-h" style="margin-top:28px">Laden</div>
        <div class="card rows pad-rows">${skelRow}${skelRow}${skelRow}</div>
        <div class="col-h" style="margin-top:28px">Keine Treffer</div>
        <div class="empty card"><div class="empty-ic">${icon('search')}</div><div class="t">Nichts gefunden für „Lasagne“</div><div class="muted" style="font-size:13px">Prüf die Schreibweise oder setz die Filter zurück.</div><button class="btn sm" style="margin-top:12px">Filter zurücksetzen</button></div>
        <div class="col-h" style="margin-top:28px">Leere Kategorie</div>
        <div class="empty card"><div class="empty-ic">${icon('folder')}</div><div class="t">Noch nichts in „Sommer“</div><div class="muted" style="font-size:13px">Öffne ein Rezept und füg es über „+ Kategorie“ hinzu.</div></div>
        <div class="col-h" style="margin-top:28px">Fehler</div>
        <div class="empty card"><div class="empty-ic">${icon('info')}</div><div class="t">Rezepte konnten nicht geladen werden</div><div class="muted" style="font-size:13px">Server nicht erreichbar.</div><button class="btn sm" style="margin-top:12px">${icon('rotate-ccw')}Erneut versuchen</button></div>
        <div class="col-h" style="margin-top:28px">Kategorie-Farben, Stresstest (Navy, Blassgelb, Schwarz)</div>
        <div class="card stress">${CATEGORIES.map((c) => `<div><span class="num subtle hex">${c.color}</span>${catMark(c)}${chip(c)}<span class="cat-label cat" ${cv(c)}>${dot(c)}${esc(c.name)}</span></div>`).join('')}</div>
      </div>`
    return shell('profile', { title: 'Zustände', back: 'profile', body })
  }

  /* ---------------- Routing + interaction ---------------- */
  const HIST = []
  const ROOTS = ['home', 'list', 'planner', 'shopping', 'groups', 'profile']
  let screen = (location.hash.replace('#/', '') || qs.get('screen') || 'home').split('?')[0]
  const root = document.getElementById('root')
  function render(keepScroll) {
    const y = window.scrollY
    const a = document.activeElement
    const focusQ = a && a.id === 'q' ? a.selectionStart : null
    root.innerHTML = (S[screen] || S.home)()
    window.scrollTo(0, keepScroll ? y : 0)
    if (focusQ !== null) {
      const q = document.getElementById('q')
      q.focus()
      q.setSelectionRange(focusQ, focusQ)
    }
  }
  // Desktop: the cursor already sits in the search when the list opens (no on-screen keyboard to get in the way).
  const autofocus = () => {
    const q = document.getElementById('q')
    if (q && matchMedia('(min-width: 761px) and (pointer: fine)').matches) q.focus({ preventScroll: true })
  }
  // Back = real back: an in-app history stack. Top-level destinations (tab bar / sidebar) start a fresh stack, so
  // Einkauf → Rezept → Zurück lands on Einkauf again. Opened directly (no history): the logical parent (`back:<parent>`).
  function go(to, { push = true } = {}) {
    if (ROOTS.includes(to)) HIST.length = 0
    else if (push && to !== screen) HIST.push(screen)
    screen = to
    UI.sheet = null
    UI.lb = null
    if (!EMBED) history.replaceState(null, '', '#/' + to)
    render(false)
    autofocus()
  }
  function act(a) {
    const [k, v] = [a.slice(0, a.indexOf(':') < 0 ? a.length : a.indexOf(':')), a.includes(':') ? a.slice(a.indexOf(':') + 1) : '']
    if (k === 'view') UI.view = v
    else if (k === 'group') UI.grouped = v === 'cat'
    else if (k === 'sort') (UI.sortKey = v), (UI.sortDir = v === 'rating' ? 'desc' : 'asc')
    else if (k === 'dir') UI.sortDir = v
    else if (k === 'menu') UI.sheet = UI.sheet === v ? null : v
    else if (k === 'sheet') UI.sheet = UI.sheet === v ? null : v
    else if (k === 'close') UI.sheet = null
    else if (k === 'lb') UI.lb = Number(v)
    else if (k === 'lb-close') UI.lb = null
    else if (k === 'back') return go(HIST.length ? HIST.pop() : v, { push: false })
    else if (k === 'side') UI.side = !UI.side
    else if (k === 'fold') UI.collapsed.has(v) ? UI.collapsed.delete(v) : UI.collapsed.add(v)
    else if (k === 'fcat') toggleIn(F.cats, Number(v))
    else if (k === 'ftag') toggleIn(F.tags, v)
    else if (k === 'fing') toggleIn(F.ings, v)
    else if (k === 'dur') F.dur = v === 'none' ? null : Number(v)
    else if (k === 'role') F.role = v
    else if (k === 'collab') F.collab = v
    else if (k === 'q-clear') F.q = ''
    else if (k === 'clr') {
      if (v === 'all') clearFilters()
      else if (v === 'cats') F.cats = []
      else if (v === 'tags') F.tags = []
      else if (v === 'ings') F.ings = []
      else if (v === 'dur') F.dur = null
      else if (v === 'access') (F.role = 'any'), (F.collab = 'any')
    }
    render(true)
  }
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]')
    if (el) {
      e.preventDefault()
      act(el.dataset.act)
      return
    }
    const a = e.target.closest('a[href^="#"]')
    if (a) {
      e.preventDefault()
      const to = a.getAttribute('href').replace('#/', '')
      if (to && to !== '#') go(to)
    }
  })
  // Slider and field update each other live; the list re-renders when the drag/typing is done (change),
  // so the slider is not rebuilt under the pointer.
  const syncDur = (val) => {
    const r = document.getElementById('dur-range')
    const f = document.getElementById('dur-field')
    if (r && document.activeElement !== r) r.value = val ?? DUR_MAX
    if (r) r.style.setProperty('--p', `${((val ?? DUR_MAX) / DUR_MAX) * 100}%`)
    if (f && document.activeElement !== f) f.value = val ?? ''
  }
  document.addEventListener('change', (e) => {
    if (e.target.id === 'dur-range' || e.target.id === 'dur-field') render(true)
  })
  document.addEventListener('input', (e) => {
    if (e.target.id === 'dur-range') {
      F.dur = Number(e.target.value)
      syncDur(F.dur)
      return
    }
    if (e.target.id === 'dur-field') {
      const n = parseInt(e.target.value, 10)
      F.dur = Number.isNaN(n) ? null : Math.min(DUR_MAX, Math.max(0, n))
      syncDur(F.dur)
      return
    }
    if (e.target.id === 'q') {
      F.q = e.target.value
      render(true)
    }
  })
  document.addEventListener('keydown', (e) => {
    if (UI.lb === null) return
    const n = document.querySelectorAll('.lb-th').length
    if (e.key === 'Escape') act('lb-close')
    else if (e.key === 'ArrowRight') act(`lb:${(UI.lb + 1) % n}`)
    else if (e.key === 'ArrowLeft') act(`lb:${(UI.lb - 1 + n) % n}`)
  })
  window.addEventListener('hashchange', () => {
    if (!EMBED) (screen = location.hash.replace('#/', '') || 'home'), (UI.sheet = null), render(false)
  })
  render(false)
  autofocus()
})()