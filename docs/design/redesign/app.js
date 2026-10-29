/* Foodly redesign mockups – two directions on one renderer.
   URL: app.html?dir=a|c&theme=light|dark&img=1|0#/<screen>
   dir a = "Ruhig" (list-first, recommended), dir c = "Bildstark" (grid/photo-first).
   img=0 renders every recipe without a photo (today's backend state, B1). */
;(() => {
  const qs = new URLSearchParams(location.search)
  const DIR = qs.get('dir') === 'c' ? 'c' : 'a'
  const THEME = qs.get('theme') || 'light'
  const IMG = qs.get('img') !== '0'
  document.documentElement.dataset.dir = DIR
  document.documentElement.classList.toggle('dark', THEME === 'dark')
  document.body.insertAdjacentHTML('afterbegin', window.ICONS)

  const R = Object.fromEntries(RECIPES.map((r) => [r.id, r]))
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
  const icon = (n, cls = '') => `<svg class="i ${cls}"><use href="#i-${n}"/></svg>`
  const route = (p) => `#/${p}`
  const hasImg = (r) => IMG && r.img
  const catsOf = (r) => CATEGORIES.filter((c) => c.recipes.includes(r.id))
  const cv = (c) => `style="--c:${c.color}"`
  const mins = (m) => (m == null ? '' : m >= 60 ? `${Math.floor(m / 60)} h${m % 60 ? ' ' + (m % 60) + ' min' : ''}` : `${m} min`)
  const fmtRating = (x) => x.toFixed(1).replace('.', ',')
  const owner = (r) => USERS[r.owner]

  /* ---- category atoms ---- */
  // Icon slot: the category's icon (a tag icon/emoji, B11) or, until then, its initial.
  const catGlyph = (c) => (c.icon ? `<span class="emoji">${c.icon}</span>` : `<span class="cat-initial">${esc(c.name[0])}</span>`)
  const catMark = (c, cls = '') => `<span class="cat-mark cat ${cls}" ${cv(c)}>${catGlyph(c)}</span>`
  const chip = (c) => `<span class="cat-chip cat" ${cv(c)}>${c.icon ? `<span class="emoji">${c.icon}</span>` : ''}${esc(c.name)}</span>`
  const dot = (c) => `<span class="cat cat-dot" ${cv(c)}></span>`
  const dots = (r) => {
    const cs = catsOf(r)
    if (!cs.length) return ''
    return `<span class="cat-dots" title="${esc(cs.map((c) => c.name).join(', '))}">${cs.slice(0, 3).map(dot).join('')}${cs.length > 3 ? `<span class="more">+${cs.length - 3}</span>` : ''}</span>`
  }
  // C: names stay neutral (a recipe has no single colour); only the dots carry colour.
  const catLine = (r) => {
    const cs = catsOf(r)
    if (!cs.length) return ''
    return `<div class="cat-line">${cs.slice(0, 3).map(dot).join('')}<span class="ellipsis">${esc(cs[0].name)}${cs.length > 1 ? ` <span class="subtle">+${cs.length - 1}</span>` : ''}</span></div>`
  }

  /* ---- recipe atoms ---- */
  const stars = (r) => `<span class="stars">${icon('star')}<span class="num">${fmtRating(r.rating)}</span></span>`
  const timeMeta = (r) => `<span>${icon('clock')}<span class="num">${mins(r.total)}</span></span>`
  const tagHtml = (t) => `<span class="tag">${TAG_ICONS[t] ? icon(TAG_ICONS[t]) : ''}${esc(t)}</span>`
  const sharedMeta = (r) => (r.owner !== ME ? `<span>${icon('users')}${owner(r).name}</span>` : '')

  // Rule: the thumbnail column exists only while photos exist at all (IMG). Today, with no photos, rows are text-only
  // instead of a column of identical placeholders; a single photo-less recipe among photos gets a neutral placeholder.
  function thumb(r, cls = 'thumb') {
    if (!IMG) return ''
    if (hasImg(r)) return `<div class="photo ${cls}"><img src="img/${r.img}.jpg" alt="" loading="lazy"></div>`
    return `<div class="photo fallback ${cls}">${icon('utensils-crossed')}</div>`
  }
  // C grid card media: photo, or a typographic tile (no fake image, no category colour).
  function media(r, cls = 'cimg') {
    if (hasImg(r)) return `<div class="photo ${cls}"><img src="img/${r.img}.jpg" alt="" loading="lazy"></div>`
    return `<div class="photo type-tile ${cls}"><span>${esc(r.name)}</span></div>`
  }

  /* ---------------- Shell ---------------- */
  const NAV = [
    ['home', 'home', 'Start'],
    ['list', 'book-open', 'Rezepte'],
    ['planner', 'calendar', 'Planer'],
    ['shopping', 'shopping-cart', 'Einkauf'],
    ['groups', 'users', 'Gruppen'],
  ]
  const concept = `<span class="concept" title="Nicht im Plan, Konzept-Skizze">Konzept</span>`
  function shell(active, { title = '', actions = '', body = '', wide = false, mobileTitle, back, activeCat } = {}) {
    const side = `
      <aside class="sidenav">
        <div class="brand"><span class="brand-mark">${icon('chef-hat')}</span>Foodly</div>
        <a class="btn primary side-new" href="${route('editor')}">${icon('plus')}Neues Rezept</a>
        ${NAV.map(([k, i, l]) => `<a class="nav-item ${active === k && !activeCat ? 'active' : ''}" href="${route(k)}">${icon(i)}${l}</a>`).join('')}
        <div class="nav-label">Kategorien <a href="${route('categories')}" class="subtle">${icon('settings')}</a></div>
        ${CATEGORIES.map(
          (c) =>
            `<a class="nav-item ${activeCat === c.id ? 'active' : ''}" href="${route('category')}">${dot(c)}<span class="ellipsis">${esc(c.name)}</span><span class="count num">${c.recipes.length}</span></a>`,
        ).join('')}
        <div class="nav-spacer"></div>
        <a class="nav-item ${active === 'profile' ? 'active' : ''}" href="${route('profile')}"><span class="avatar xs">K</span>Kolja</a>
      </aside>`
    const tab = `<nav class="tabbar">${NAV.map(([k, i, l]) => `<a class="${active === k ? 'active' : ''}" href="${route(k)}">${icon(i)}${l}</a>`).join('')}</nav>`
    const top = `
      <header class="topbar">
        ${back ? `<a class="btn ghost icon" href="${route(back)}">${icon('chevron-left')}</a>` : ''}
        <h1 class="ellipsis"><span class="hide-m">${title}</span><span class="only-m">${mobileTitle ?? title}</span></h1>
        <div class="grow"></div>${actions}
      </header>`
    return `<div class="app">${side}<main class="main">${top}<div class="page ${wide ? 'wide' : ''}">${body}</div></main>${tab}</div>`
  }
  const newBtnM = `<a class="btn primary icon only-m" href="${route('editor')}">${icon('plus')}</a>`

  /* ---------------- Recipe items ---------------- */
  const recipeRow = (r) => `
    <a class="row rrow" href="${route('detail')}">
      ${thumb(r)}
      <div class="grow">
        <div class="t ellipsis">${esc(r.name)}</div>
        <div class="meta">${timeMeta(r)}${stars(r)}${sharedMeta(r)}</div>
      </div>
      <div class="hide-m chips rr-tags">${r.tags.slice(0, 2).map(tagHtml).join('')}</div>
      ${dots(r)}
    </a>`
  const recipeCard = (r) => `
    <a class="ccard" href="${route('detail')}">
      ${media(r)}
      <div class="cbody">
        ${catLine(r)}
        <div class="ct">${esc(r.name)}</div>
        <div class="meta">${timeMeta(r)}${stars(r)}${r.owner !== ME ? `<span>von ${owner(r).name}</span>` : ''}</div>
      </div>
    </a>`
  const items = (rs) =>
    DIR === 'a' ? `<div class="rows">${rs.map(recipeRow).join('')}</div>` : `<div class="grid cgrid">${rs.map(recipeCard).join('')}</div>`

  /* ---------------- Screens ---------------- */
  const S = {}

  S.home = () => {
    const today = [PLAN.entries['3-0'], PLAN.entries['3-1']].map((id) => R[id])
    const recent = [14, 12, 8, 1, 6, 10].map((id) => R[id])
    const shared = RECIPES.filter((r) => r.owner !== ME).slice(0, 3)
    const planItem = (r, slot) =>
      DIR === 'c'
        ? `<a class="today-c ${hasImg(r) ? '' : 'noimg'}" href="${route('detail')}">${hasImg(r) ? `<div class="photo"><img src="img/${r.img}.jpg" alt=""></div>` : ''}<div class="tc-over"><div class="tc-slot">${slot}</div><div class="tc-t">${esc(r.name)}</div><div class="tc-m">${mins(r.total)}</div></div></a>`
        : `<a class="row" href="${route('detail')}">${thumb(r)}<div class="grow"><div class="slot">${slot}</div><div class="t ellipsis">${esc(r.name)}</div></div><span class="muted num" style="font-size:13px">${mins(r.total)}</span>${icon('chevron-right', 'subtle')}</a>`
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
          <div class="${DIR === 'c' ? 'today-grid' : 'card rows divided pad-rows'}">${planItem(today[0], 'Mittag')}${planItem(today[1], 'Abend')}</div>
          <div class="section-h"><h2>Zuletzt bearbeitet</h2><a href="${route('list')}">Alle Rezepte</a></div>
          ${DIR === 'a' ? `<div class="card rows divided pad-rows">${recent.slice(0, 5).map(recipeRow).join('')}</div>` : `<div class="grid cgrid">${recent.slice(0, 6).map(recipeCard).join('')}</div>`}
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
    return shell('home', {
      title: 'Start',
      mobileTitle: '',
      actions: `<a class="btn ghost icon" href="${route('list')}">${icon('search')}</a>${newBtnM}`,
      body,
    })
  }

  const toolbar = (view) => `
    <div class="toolbar">
      <label class="input search">${icon('search')}<input placeholder="Rezept oder Zutat suchen"><span class="kbd hide-m">/</span></label>
      <button class="btn">${icon('sliders-horizontal')}<span class="hide-m">Filter</span></button>
      <button class="btn hide-m">${icon('arrow-up-down')}Name</button>
      <div class="seg hide-m"><button class="${view === 'list' ? 'on' : ''}">${icon('list')}</button><button class="${view === 'grid' ? 'on' : ''}">${icon('layout-grid')}</button></div>
    </div>`

  S.list = () => {
    const chips = `
      <div class="scroll-x" style="margin-top:12px">
        <span class="filter-chip on">Alle <span class="num" style="opacity:.6">${RECIPES.length}</span></span>
        <span class="filter-chip">Meine</span><span class="filter-chip">Mit mir geteilt</span>
        <span class="vsep"></span>
        ${CATEGORIES.map((c) => `<a class="filter-chip" href="${route('category')}">${dot(c)}${esc(c.name)}</a>`).join('')}
      </div>`
    let content
    if (DIR === 'c') {
      content = `<div class="grid cgrid" style="margin-top:20px">${RECIPES.map(recipeCard).join('')}</div>`
    } else {
      // Grouped by category; a recipe in several categories appears in each group, ungrouped ones last.
      const groups = CATEGORIES.slice(0, 3).map((c) => ({ c, rs: c.recipes.map((id) => R[id]) }))
      const none = RECIPES.filter((r) => !catsOf(r).length)
      content =
        groups
          .map(
            ({ c, rs }) =>
              `<section class="lgroup cat" ${cv(c)}><a class="lgroup-h" href="${route('category')}">${icon('chevron-down', 'subtle')}${dot(c)}<span class="lg-name">${esc(c.name)}</span><span class="subtle num">${rs.length}</span></a><div class="lgroup-body">${rs.map(recipeRow).join('')}</div></section>`,
          )
          .join('') +
        `<section class="lgroup collapsed"><div class="lgroup-h">${icon('chevron-right', 'subtle')}<span class="lg-name">4 weitere Kategorien</span></div></section>` +
        `<section class="lgroup"><div class="lgroup-h">${icon('chevron-down', 'subtle')}<span class="lg-name muted">Ohne Kategorie</span><span class="subtle num">${none.length}</span></div><div class="lgroup-body">${none.map(recipeRow).join('')}</div></section>`
    }
    return shell('list', {
      title: `Rezepte <span class="subtle num" style="font-weight:500">${RECIPES.length}</span>`,
      mobileTitle: 'Rezepte',
      actions: newBtnM,
      body: toolbar(DIR === 'c' ? 'grid' : 'list') + chips + `<div class="list-content">${content}</div>`,
      wide: DIR === 'c',
    })
  }

  // One category in focus: the only place where a whole surface is tinted.
  S.category = () => {
    const c = CATEGORIES[0]
    const rs = c.recipes.map((id) => R[id])
    const body = `
      <div class="cat-head cat" ${cv(c)}>
        ${catMark(c, 'xl')}
        <div class="grow"><h2 class="page-title">${esc(c.name)}</h2><div class="ch-sub num">${rs.length} Rezepte · nur für dich sichtbar</div></div>
        <button class="btn sm hide-m">${icon('pencil')}Bearbeiten</button>
      </div>
      <div style="margin-top:16px">${toolbar(DIR === 'c' ? 'grid' : 'list')}</div>
      <div style="margin-top:12px">${items(rs)}</div>`
    return shell('list', { title: `<span class="subtle">Kategorien /</span> ${esc(c.name)}`, mobileTitle: '', back: 'list', actions: `<button class="btn ghost icon">${icon('more-horizontal')}</button>`, body, activeCat: c.id, wide: DIR === 'c' })
  }

  function detailBody(r) {
    const cats = catsOf(r)
    const tags = r.tags.map(tagHtml).join('')
    const sizeCtl = `<div class="portions"><button class="btn sm icon">${icon('minus')}</button><span class="num"><b>${r.size ?? 1}</b> ${r.size ? 'Portionen' : 'Form'}</span><button class="btn sm icon">${icon('plus')}</button></div>`
    const catCtl = `<div class="chips cat-ctl">${cats.map(chip).join('')}<button class="add-cat">${icon('plus')}${cats.length ? '' : 'Zu Kategorie hinzufügen'}</button></div>`
    const meta = `<div class="meta big-meta">${stars(r)}<span>${icon('clock')}<span class="num">${esc(r.time ?? mins(r.total))}</span></span>${r.editors.length || r.owner !== ME ? `<span>${icon('users')}${r.owner !== ME ? 'von ' + owner(r).name : 'mit Mara'}</span>` : ''}</div>`
    const note = r.notes[0] ? `<p class="note">${icon('info')}<span>${esc(r.notes[0])}</span></p>` : ''
    const actions = `<div class="d-actions">${sizeCtl}<a class="btn primary ${DIR === 'c' ? 'lg' : ''}" href="${route('cook')}">${icon('chef-hat')}Kochen</a></div>`
    const info = `${catCtl}<h2 class="page-title d-title">${esc(r.name)}</h2>${meta}<div class="chips" style="margin-top:12px">${tags}</div>`
    let head
    if (!hasImg(r)) {
      // No photo: no placeholder hero, the text header simply takes the full width.
      head = `<div class="d-noimg">${info}${note}${actions}</div>`
    } else if (DIR === 'a') {
      head = `<div class="dA"><div class="photo dA-img"><img src="img/${r.img}.jpg" alt=""></div><div>${info}${note}${actions}</div></div>`
    } else {
      head = `<div class="dC"><div class="photo dC-img"><img src="img/${r.img}.jpg" alt=""></div><div class="dC-info"><div>${info}</div><div class="dC-box">${actions}</div></div>${note}</div>`
    }
    const ings = (s) =>
      `<ul class="ings">${s.ingredients.map((g) => `<li><span class="amt num">${[g.prefix, g.amount, g.unit].filter(Boolean).join(' ')}</span><span class="ing">${esc(g.name ?? '')}${g.text ? ` <span class="muted">${esc(g.text)}</span>` : ''}</span></li>`).join('')}</ul>`
    const steps = (s) => `<ol class="steps">${s.steps.map((t, i) => `<li><span class="sn num">${i + 1}</span><span>${esc(t)}</span></li>`).join('')}</ol>`
    const sections = r.sections
      .map((s) => `<section class="rsec">${s.name && r.sections.length > 1 ? `<h3 class="rsec-h">${esc(s.name)}</h3>` : ''}<div class="rsec-grid"><div><div class="col-h">Zutaten</div>${ings(s)}</div><div><div class="col-h">Zubereitung</div>${steps(s)}</div></div></section>`)
      .join('')
    const gallery = hasImg(r)
      ? `<div class="section-h"><h2>Fotos</h2><span class="subtle" style="font-size:13px">9</span></div><div class="gallery">${['bolognese', 'tomatensuppe', 'ofengemuese', 'kuerbissuppe'].map((g) => `<div class="photo"><img src="img/${g}.jpg" alt=""></div>`).join('')}</div>`
      : ''
    return `${head}${sections}${gallery}${r.source ? `<p class="muted" style="font-size:13px;margin-top:28px">Quelle: ${esc(r.source)}</p>` : ''}`
  }
  const detailActions = `<button class="btn ghost icon">${icon('share-2')}</button><button class="btn ghost icon hide-m">${icon('copy')}</button><a class="btn hide-m" href="${route('editor')}">${icon('pencil')}Bearbeiten</a><a class="btn ghost icon only-m" href="${route('editor')}">${icon('more-horizontal')}</a>`
  S.detail = () => shell('list', { title: `<span class="subtle">Rezepte /</span> ${esc(R[1].name)}`, mobileTitle: '', back: 'list', actions: detailActions, body: detailBody(R[1]) })
  // Edge cases the Lead asked for: no category, no photo, shared by someone else.
  S.detail2 = () => shell('list', { title: `<span class="subtle">Rezepte /</span> ${esc(R[10].name)}`, mobileTitle: '', back: 'list', actions: detailActions, body: detailBody(R[10]) })

  S.cook = () => {
    const r = R[1]
    const s = r.sections[0]
    const step = 2
    return `
      <div class="cook">
        <header class="cook-top">
          <a class="btn ghost icon" href="${route('detail')}">${icon('x')}</a>
          <div class="grow"><div class="cook-title ellipsis">${esc(r.name)}</div><div class="subtle num" style="font-size:12px">${esc(s.name)} · Schritt ${step + 1} von 7</div></div>
          <button class="btn sm only-m">${icon('list-checks')}Zutaten</button>
        </header>
        <div class="cook-progress"><span style="width:${((step + 1) / 7) * 100}%"></span></div>
        <div class="cook-body">
          <aside class="cook-ings hide-m">
            <div class="col-h">Zutaten · ${esc(s.name)}</div>
            <ul class="ings">${s.ingredients.map((g, i) => `<li class="${i === 4 ? 'hl' : ''}"><span class="amt num">${[g.prefix, g.amount, g.unit].filter(Boolean).join(' ')}</span><span class="ing">${esc(g.name ?? '')}</span></li>`).join('')}</ul>
          </aside>
          <main class="cook-main">
            <div class="cook-step-n num">Schritt ${step + 1}</div>
            <p class="cook-step">${esc(s.steps[step])}</p>
            <div class="cook-need"><span class="tag">2 EL Tomatenmark</span></div>
            <div class="cook-timer card"><div class="ct-ic">${icon('timer')}</div><div class="grow"><div class="t">Köcheln</div><div class="subtle" style="font-size:13px">Schritt 4 · läuft</div></div><div class="num cook-timer-t">18:42</div><button class="btn sm icon">${icon('pause')}</button></div>
            <div class="cook-next"><span class="col-h">Danach</span><span class="muted">${esc(s.steps[step + 1])}</span></div>
          </main>
        </div>
        <footer class="cook-nav">
          <button class="btn lg">${icon('chevron-left')}<span class="hide-m">Zurück</span></button>
          <div class="cook-dots">${Array.from({ length: 7 }, (_, i) => `<span class="${i === step ? 'on' : i < step ? 'done' : ''}"></span>`).join('')}</div>
          <button class="btn lg primary">Weiter${icon('chevron-right')}</button>
        </footer>
      </div>`
  }

  S.editor = () => {
    const r = R[1]
    const field = (label, inner) => `<label class="field"><span class="flabel">${label}</span>${inner}</label>`
    const body = `
      <div class="editor">
        <div class="ed-main">
          ${field('Name', `<div class="input big-input"><input value="${esc(r.name)}"></div>`)}
          <div class="ed-row">
            ${field('Arbeitszeit', `<div class="input"><input value="20"><span class="subtle">min</span></div>`)}
            ${field('Gesamtzeit', `<div class="input"><input value="45"><span class="subtle">min</span></div>`)}
            ${field('Menge', `<div class="input"><input value="4 Portionen"></div>`)}
          </div>
          ${field('Tags', `<div class="input tags-input">${r.tags.map((t) => `<span class="tag">${esc(t)} ${icon('x')}</span>`).join('')}<input placeholder="Tag hinzufügen"></div>`)}
          ${r.sections
            .map(
              (s, si) => `
            <section class="ed-sec card">
              <div class="ed-sec-h">${icon('grip-vertical', 'subtle')}<input class="ed-sec-name" value="${esc(s.name)}"><button class="btn ghost sm icon">${icon('more-horizontal')}</button></div>
              <div class="col-h">Zutaten</div>
              ${s.ingredients
                .slice(0, si ? 2 : 5)
                .map(
                  (g) =>
                    `<div class="ed-ing">${icon('grip-vertical', 'subtle drag')}<div class="input sm amt-in"><input value="${esc([g.prefix, g.amount].filter(Boolean).join(' '))}" placeholder="Menge"></div><div class="input sm unit-in"><input value="${esc(g.unit ?? '')}" placeholder="Einheit"></div><div class="input sm name-in"><input value="${esc(g.name ?? '')}" placeholder="Zutat"></div><button class="btn ghost sm icon del">${icon('x')}</button></div>`,
                )
                .join('')}
              <button class="btn ghost sm add">${icon('plus')}Zutat</button>
              <div class="col-h" style="margin-top:18px">Schritte</div>
              ${s.steps
                .slice(0, si ? 2 : 3)
                .map((t, i) => `<div class="ed-step"><span class="sn num">${i + 1}</span><div class="input grow" style="height:auto;padding:8px 12px"><textarea rows="2">${esc(t)}</textarea></div></div>`)
                .join('')}
              <button class="btn ghost sm add">${icon('plus')}Schritt</button>
            </section>`,
            )
            .join('')}
          <button class="btn dashed">${icon('plus')}Abschnitt hinzufügen</button>
        </div>
        <aside class="ed-side">
          <div class="col-h">Hauptbild</div>
          ${hasImg(r) ? `<div class="photo ed-img"><img src="img/${r.img}.jpg" alt=""><button class="btn sm ed-img-btn">${icon('image')}Ändern</button></div>` : `<button class="ed-drop">${icon('image')}<span>Foto hinzufügen</span></button>`}
          <div class="col-h" style="margin-top:20px">Meine Kategorien</div>
          <div class="chips">${CATEGORIES.map((c) => (catsOf(r).includes(c) ? chip(c) : `<span class="filter-chip sm">${dot(c)}${esc(c.name)}</span>`)).join('')}</div>
          <div class="col-h" style="margin-top:20px">Geteilt mit</div>
          <div class="row" style="padding:6px 0"><span class="avatar">M</span><div class="grow">Mara</div><span class="subtle" style="font-size:13px">kann bearbeiten</span></div>
          <button class="btn sm ghost add">${icon('user-plus')}Person hinzufügen</button>
        </aside>
      </div>`
    return shell('list', {
      title: 'Rezept bearbeiten',
      back: 'detail',
      actions: `<span class="saved hide-m">${icon('circle-check')}Gespeichert</span><a class="btn primary" href="${route('detail')}">Fertig</a>`,
      body,
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
    const body = `
      <div class="shop">
        <aside class="shop-lists hide-m">
          <div class="col-h side-h">Listen <button class="btn ghost sm icon">${icon('plus')}</button></div>
          ${SHOPPING_LISTS.map((l, i) => `<a class="row ${i === 0 ? 'sel' : ''}" href="#"><div class="grow"><div class="t ellipsis">${l.name}</div><div class="subtle" style="font-size:12px">${l.range}</div></div><span class="subtle num" style="font-size:12px">${l.open ? `${l.open} offen` : 'erledigt'}</span></a>`).join('')}
        </aside>
        <div class="shop-main">
          <div class="shop-head"><div><h2 class="page-title" style="font-size:22px">${L.name}</h2><div class="muted" style="font-size:13px">${L.range} · <span class="num">${open} von ${L.items.length}</span> offen</div></div><button class="btn sm">${icon('plus')}Artikel</button></div>
          <div class="shop-bar"><span style="width:${((L.items.length - open) / L.items.length) * 100}%"></span></div>
          <div class="scroll-x" style="margin:14px 0 6px">${L.recipes.map((id) => `<span class="filter-chip">${esc(R[id].name)}</span>`).join('')}</div>
          ${groups
            .map(
              (g) => `<div class="col-h" style="margin-top:20px">${g}</div><div class="rows">${L.items
                .filter((i) => i.group === g)
                .map((i) => `<div class="row sitem ${i.done ? 'done' : ''}"><span class="check ${i.done ? 'on' : ''}">${i.done ? icon('check') : ''}</span><div class="grow"><span class="t">${i.name}</span></div><span class="muted num" style="font-size:13px">${i.amount}</span></div>`)
                .join('')}</div>`,
            )
            .join('')}
        </div>
      </div>`
    return shell('shopping', { title: `Einkauf ${concept}`, body, actions: `<button class="btn">${icon('plus')}<span class="hide-m">Neue Liste</span></button>` })
  }

  S.groups = () => {
    const g = GROUPS[0]
    const body = `
      <div class="shop">
        <aside class="shop-lists hide-m">
          <div class="col-h side-h">Gruppen <button class="btn ghost sm icon">${icon('plus')}</button></div>
          ${GROUPS.map((x, i) => `<a class="row ${i === 0 ? 'sel' : ''}" href="#"><span class="avatar">${x.name[0]}</span><div class="grow"><div class="t ellipsis">${x.name}</div><div class="subtle" style="font-size:12px">${x.members.length} Mitglieder · ${x.recipes.length} Rezepte</div></div></a>`).join('')}
        </aside>
        <div class="shop-main">
          <div class="shop-head"><div style="display:flex;gap:14px;align-items:center"><span class="avatar lg">${g.name[0]}</span><div><h2 class="page-title" style="font-size:22px">${g.name}</h2><div class="muted" style="font-size:13px">${g.members.length} Mitglieder · du bist Admin</div></div></div><button class="btn sm">${icon('user-plus')}Einladen</button></div>
          <div class="section-h"><h2>Mitglieder</h2></div>
          <div class="card rows divided pad-rows">${g.members.map((m) => `<div class="row"><span class="avatar">${USERS[m].initial}</span><div class="grow t">${USERS[m].name}${m === ME ? ' <span class="subtle">(du)</span>' : ''}</div><span class="subtle" style="font-size:13px">${m === g.owner ? 'Admin' : 'Mitglied'}</span></div>`).join('')}</div>
          <div class="section-h"><h2>Geteilte Rezepte</h2><span class="subtle num" style="font-size:13px">${g.recipes.length}</span></div>
          ${DIR === 'a' ? `<div class="card rows divided pad-rows">${g.recipes.map((id) => recipeRow(R[id])).join('')}</div>` : `<div class="grid cgrid">${g.recipes.map((id) => recipeCard(R[id])).join('')}</div>`}
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
          <div class="swatches">${swatches.map((s) => `<span class="sw cat ${s === edit.color ? 'on' : ''}" style="--c:${s}"><span></span></span>`).join('')}<span class="sw custom" title="Eigene Farbe">${icon('plus')}</span></div>
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
    const skelCard = `<div class="ccard"><div class="skel cimg"></div><div class="skel" style="height:12px;width:40%"></div><div class="skel" style="height:16px;width:80%"></div></div>`
    const body = `
      <div class="narrow">
        <div class="col-h">Verbindung verloren</div>
        <div class="banner">${icon('cloud-off')}<span class="grow">Keine Verbindung. Du siehst den zuletzt geladenen Stand.</span><button class="btn sm">Erneut versuchen</button></div>
        <div class="col-h" style="margin-top:28px">Laden</div>
        ${DIR === 'a' ? `<div class="card rows pad-rows">${skelRow}${skelRow}${skelRow}</div>` : `<div class="grid cgrid">${skelCard}${skelCard}</div>`}
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

  function render() {
    const screen = (location.hash.replace('#/', '') || qs.get('screen') || 'home').split('?')[0]
    document.getElementById('root').innerHTML = (S[screen] || S.home)()
    window.scrollTo(0, 0)
  }
  window.addEventListener('hashchange', render)
  render()
})()
