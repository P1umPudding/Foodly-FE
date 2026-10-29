/* Foodly redesign mockups. One renderer, three directions (data-dir a/b/c).
   URL: app.html?dir=a&theme=light#/list  (screens: home list detail cook editor planner shopping groups profile categories states) */
;(() => {
  const qs = new URLSearchParams(location.search)
  const DIR = qs.get('dir') || 'a'
  const THEME = qs.get('theme') || 'light'
  document.documentElement.dataset.dir = DIR
  document.documentElement.classList.toggle('dark', THEME === 'dark')
  document.body.insertAdjacentHTML('afterbegin', window.ICONS)

  const R = Object.fromEntries(RECIPES.map((r) => [r.id, r]))
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
  const icon = (n, cls = '') => `<svg class="i ${cls}"><use href="#i-${n}"/></svg>`
  const catsOf = (r) => CATEGORIES.filter((c) => c.recipes.includes(r.id))
  const primaryCat = (r) => catsOf(r)[0]
  const catAttr = (c) => (c ? `cat" style="--c:${c.color}` : '')
  const catEmoji = (c) => (c?.emoji ? `<span class="emoji">${c.emoji}</span>` : '')
  const chip = (c) => `<span class="cat-chip cat" style="--c:${c.color}">${catEmoji(c)}${esc(c.name)}</span>`
  const dotLabel = (c) => `<span class="cat-label cat" style="--c:${c.color}"><span class="cat-dot"></span>${esc(c.name)}</span>`
  const dots = (r) => `<span class="cat-dots">${catsOf(r).map((c) => `<span class="cat cat-dot" style="--c:${c.color}"></span>`).join('')}</span>`
  const mins = (m) => (m == null ? '' : m >= 60 ? `${Math.floor(m / 60)} h${m % 60 ? ' ' + (m % 60) + ' min' : ''}` : `${m} min`)
  const fmtRating = (x) => x.toFixed(1).replace('.', ',')
  const stars = (r) => `<span class="stars">${icon('star')}<span class="num">${fmtRating(r.rating)}</span></span>`
  const timeMeta = (r) => `<span>${icon('clock')}<span class="num">${mins(r.total)}</span></span>`
  const tagHtml = (t) => `<span class="tag">${TAG_ICONS[t] ? icon(TAG_ICONS[t]) : ''}${esc(t)}</span>`
  const owner = (r) => USERS[r.owner]
  const route = (p) => `#/${p}`

  function photo(r, cls = '', { emojiSize } = {}) {
    if (r.img) return `<div class="photo ${cls}"><img src="img/${r.img}.jpg" alt="" loading="lazy"></div>`
    const c = primaryCat(r)
    const inner = c?.emoji ? `<span class="emoji">${c.emoji}</span>` : icon('utensils-crossed')
    return `<div class="photo fallback ${cls} ${c ? catAttr(c) : ''}" ${emojiSize ? `style="--fallback-emoji:${emojiSize}"` : ''}>${inner}</div>`
  }

  /* ---------------- Shell ---------------- */
  const NAV = [
    ['home', 'home', 'Start'],
    ['list', 'book-open', 'Rezepte'],
    ['planner', 'calendar', 'Planer'],
    ['shopping', 'shopping-cart', 'Einkauf'],
    ['groups', 'users', 'Gruppen'],
  ]
  function shell(active, { title = '', actions = '', body = '', wide = false, mobileTitle, back } = {}) {
    const side = `
      <aside class="sidenav">
        <div class="brand"><span class="brand-mark">${icon('chef-hat')}</span>Foodly</div>
        <a class="nav-item" href="${route('editor')}" style="margin-bottom:6px">${icon('plus')}Neues Rezept</a>
        ${NAV.map(([k, i, l]) => `<a class="nav-item ${active === k ? 'active' : ''}" href="${route(k)}">${icon(i)}${l}</a>`).join('')}
        <div class="nav-label">Kategorien <a href="${route('categories')}" class="subtle">${icon('settings')}</a></div>
        ${CATEGORIES.map(
          (c) =>
            `<a class="nav-item cat" style="--c:${c.color}" href="${route('list')}"><span class="cat-dot"></span><span class="ellipsis">${esc(c.name)}</span><span class="count num">${c.recipes.length}</span></a>`,
        ).join('')}
        <div class="nav-spacer"></div>
        <a class="nav-item ${active === 'profile' ? 'active' : ''}" href="${route('profile')}"><span class="avatar" style="width:22px;height:22px;font-size:11px">K</span>Kolja</a>
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

  /* ---------------- Recipe items (direction-specific) ---------------- */
  function recipeRow(r) {
    // A: dense list row
    const cats = catsOf(r)
    return `<a class="row rrow" href="${route('detail')}">
      ${photo(r, 'thumb', { emojiSize: '20px' })}
      <div class="grow">
        <div class="t ellipsis">${esc(r.name)}</div>
        <div class="meta">${timeMeta(r)}${stars(r)}${r.owner !== ME ? `<span>${icon('users')}${owner(r).name}</span>` : ''}</div>
      </div>
      <div class="hide-m chips rr-tags">${r.tags.slice(0, 2).map(tagHtml).join('')}</div>
      ${cats.length ? dots(r) : ''}
    </a>`
  }
  function recipeCardB(r) {
    const c = primaryCat(r)
    return `<a class="bcard card" href="${route('detail')}">
      ${photo(r, 'bimg', { emojiSize: '44px' })}
      <div class="bbody">
        <div class="chips">${catsOf(r).slice(0, 2).map(chip).join('')}</div>
        <div class="bt">${esc(r.name)}</div>
        <div class="meta">${timeMeta(r)}${stars(r)}</div>
      </div>
    </a>`
  }
  function recipeCardC(r, { big = false } = {}) {
    const c = primaryCat(r)
    return `<a class="ccard ${big ? 'big' : ''}" href="${route('detail')}">
      ${photo(r, 'cimg', { emojiSize: big ? '72px' : '48px' })}
      <div class="cbody">
        ${c ? `<div class="cmeta-top">${dotLabel(c)}${catsOf(r).length > 1 ? `<span class="subtle">+${catsOf(r).length - 1}</span>` : ''}</div>` : ''}
        <div class="ct">${esc(r.name)}</div>
        <div class="meta">${timeMeta(r)}${stars(r)}${r.owner !== ME ? `<span>von ${owner(r).name}</span>` : ''}</div>
      </div>
    </a>`
  }

  /* ---------------- Screens ---------------- */
  const S = {}

  S.home = () => {
    const today = [PLAN.entries['3-0'], PLAN.entries['3-1']].map((id) => R[id])
    const recent = [14, 12, 8, 1, 6, 11].map((id) => R[id])
    const shared = RECIPES.filter((r) => r.owner !== ME).slice(0, 4)
    const planCard = (r, slot) =>
      DIR === 'c'
        ? `<a class="today-c" href="${route('detail')}">${photo(r, 'tc-img')}<div class="tc-over"><div class="tc-slot">${slot}</div><div class="tc-t">${esc(r.name)}</div><div class="tc-m">${mins(r.total)}</div></div></a>`
        : `<a class="today-row card ${DIR === 'b' && primaryCat(r) ? catAttr(primaryCat(r)) : ''}" href="${route('detail')}">${photo(r, 'thumb', { emojiSize: '20px' })}<div class="grow"><div class="subtle" style="font-size:12px;font-weight:600">${slot}</div><div class="t ellipsis">${esc(r.name)}</div></div><span class="muted num" style="font-size:13px">${mins(r.total)}</span>${icon('chevron-right', 'subtle')}</a>`
    const catTiles = CATEGORIES.map(
      (c) =>
        `<a class="cat-tile cat" style="--c:${c.color}" href="${route('list')}">${DIR === 'a' ? `<span class="cat-dot"></span>` : c.emoji ? `<span class="emoji">${c.emoji}</span>` : `<span class="cat-dot"></span>`}<span class="ct-name ellipsis">${esc(c.name)}</span><span class="ct-count num">${c.recipes.length}</span></a>`,
    ).join('')
    const recentHtml =
      DIR === 'a'
        ? `<div class="card rows divided pad-rows">${recent.slice(0, 5).map(recipeRow).join('')}</div>`
        : DIR === 'b'
          ? `<div class="grid bgrid">${recent.slice(0, 4).map(recipeCardB).join('')}</div>`
          : `<div class="grid cgrid">${recent.slice(0, 6).map((r) => recipeCardC(r)).join('')}</div>`
    const body = `
      <div class="home-head">
        <div class="subtle" style="font-size:13px;font-weight:500">Donnerstag, 29. Oktober</div>
        <h2 class="page-title">Hallo Kolja</h2>
      </div>
      <div class="home-grid">
        <section class="home-main">
          <div class="section-h"><h2>Heute geplant</h2><a href="${route('planner')}">Wochenplan</a></div>
          <div class="today ${DIR === 'c' ? 'today-grid' : 'rows-gap'}">${planCard(today[0], 'Mittag')}${planCard(today[1], 'Abend')}</div>
          <div class="section-h"><h2>Zuletzt hinzugefügt</h2><a href="${route('list')}">Alle Rezepte</a></div>
          ${recentHtml}
        </section>
        <aside class="home-side">
          <div class="section-h"><h2>Kategorien</h2><a href="${route('categories')}">Verwalten</a></div>
          <div class="cat-tiles">${catTiles}</div>
          <div class="section-h"><h2>Geteilt mit dir</h2></div>
          <div class="rows ${DIR === 'a' ? 'card divided pad-rows' : ''}">${shared
            .slice(0, 3)
            .map(
              (r) =>
                `<a class="row" href="${route('detail')}">${photo(r, 'thumb sm', { emojiSize: '16px' })}<div class="grow"><div class="t ellipsis">${esc(r.name)}</div><div class="meta"><span>von ${owner(r).name}</span></div></div></a>`,
            )
            .join('')}</div>
        </aside>
      </div>`
    return shell('home', {
      title: 'Start',
      mobileTitle: '',
      actions: `<a class="btn ghost icon" href="${route('list')}">${icon('search')}</a><a class="btn primary hide-m" href="${route('editor')}">${icon('plus')}Neues Rezept</a><a class="btn primary icon only-m" href="${route('editor')}">${icon('plus')}</a>`,
      body,
    })
  }

  S.list = () => {
    const filters = `
      <div class="toolbar">
        <label class="input search">${icon('search')}<input placeholder="Rezept oder Zutat suchen"><span class="kbd hide-m">/</span></label>
        <button class="btn">${icon('sliders-horizontal')}<span class="hide-m">Filter</span></button>
        <button class="btn hide-m">${icon('arrow-up-down')}Name</button>
        <div class="seg hide-m"><button class="${DIR === 'c' ? '' : 'on'}">${icon('list')}</button><button class="${DIR === 'c' ? 'on' : ''}">${icon('layout-grid')}</button></div>
      </div>
      <div class="scroll-x" style="margin-top:12px">
        <span class="filter-chip on">Alle <span class="num" style="opacity:.6">${RECIPES.length}</span></span>
        ${CATEGORIES.map((c, i) => `<span class="filter-chip cat ${i === -1 ? 'on' : ''}" style="--c:${c.color}">${c.emoji ? `<span class="emoji">${c.emoji}</span>` : '<span class="cat-dot"></span>'}${esc(c.name)}</span>`).join('')}
        <span class="filter-chip">Mit mir geteilt</span>
      </div>`
    let content
    if (DIR === 'c') {
      content = `<div class="grid cgrid" style="margin-top:20px">${RECIPES.map((r) => recipeCardC(r)).join('')}</div>`
    } else {
      const groups = CATEGORIES.slice(0, 4).map((c) => ({ c, items: c.recipes.map((id) => R[id]) }))
      const none = RECIPES.filter((r) => !catsOf(r).length)
      content = groups
        .map(({ c, items }) =>
          DIR === 'a'
            ? `<section class="lgroup cat" style="--c:${c.color}"><div class="lgroup-h">${icon('chevron-down', 'subtle')}<span class="cat-dot"></span><span class="lg-name">${esc(c.name)}</span><span class="subtle num">${items.length}</span></div><div class="rows lgroup-body">${items.map(recipeRow).join('')}</div></section>`
            : `<section class="bgroup cat" style="--c:${c.color}"><div class="bgroup-h">${catEmoji(c)}<span>${esc(c.name)}</span><span class="num bg-count">${items.length}</span></div><div class="grid bgrid">${items.map(recipeCardB).join('')}</div></section>`,
        )
        .join('')
      if (none.length)
        content +=
          DIR === 'a'
            ? `<section class="lgroup"><div class="lgroup-h">${icon('chevron-down', 'subtle')}<span class="lg-name muted">Ohne Kategorie</span><span class="subtle num">${none.length}</span></div><div class="rows lgroup-body">${none.map(recipeRow).join('')}</div></section>`
            : `<section class="bgroup"><div class="bgroup-h"><span>Ohne Kategorie</span><span class="num bg-count">${none.length}</span></div><div class="grid bgrid">${none.map(recipeCardB).join('')}</div></section>`
    }
    return shell('list', {
      title: `Rezepte <span class="subtle num" style="font-weight:500">${RECIPES.length}</span>`,
      mobileTitle: 'Rezepte',
      actions: `<a class="btn primary hide-m" href="${route('editor')}">${icon('plus')}Neues Rezept</a><a class="btn primary icon only-m" href="${route('editor')}">${icon('plus')}</a>`,
      body: filters + `<div class="list-content">${content}</div>`,
      wide: DIR === 'c',
    })
  }

  S.detail = () => {
    const r = R[1]
    const cats = catsOf(r)
    const c = cats[0]
    const tags = r.tags.map(tagHtml).join('')
    const sizeCtl = `<div class="portions"><button class="btn sm icon">${icon('minus')}</button><span class="num"><b>4</b> Portionen</span><button class="btn sm icon">${icon('plus')}</button></div>`
    const actions = `<button class="btn ghost icon">${icon('heart')}</button><button class="btn ghost icon hide-m">${icon('share-2')}</button><button class="btn ghost icon hide-m">${icon('copy')}</button><a class="btn hide-m" href="${route('editor')}">${icon('pencil')}Bearbeiten</a><a class="btn ghost icon only-m" href="${route('editor')}">${icon('more-horizontal')}</a>`
    const ingredients = (s) =>
      `<ul class="ings">${s.ingredients
        .map(
          (g) =>
            `<li><span class="amt num">${[g.prefix, g.amount, g.unit].filter(Boolean).join(' ')}</span><span class="ing">${esc(g.name ?? '')}${g.text ? ` <span class="muted">${esc(g.text)}</span>` : ''}</span></li>`,
        )
        .join('')}</ul>`
    const steps = (s) => `<ol class="steps">${s.steps.map((t, i) => `<li><span class="sn num">${i + 1}</span><span>${esc(t)}</span></li>`).join('')}</ol>`
    const sections = r.sections
      .map(
        (s) => `
      <section class="rsec">
        ${s.name ? `<h3 class="rsec-h">${esc(s.name)}</h3>` : ''}
        <div class="rsec-grid"><div><div class="col-h">Zutaten</div>${ingredients(s)}</div><div><div class="col-h">Zubereitung</div>${steps(s)}</div></div>
      </section>`,
      )
      .join('')
    const gallery = `<div class="gallery">${['bolognese', 'tomatensuppe', 'ofengemuese', 'kuerbissuppe'].map((g, i) => `<div class="photo g${i}"><img src="img/${g}.jpg" alt=""></div>`).join('')}</div>`
    const metaLine = `<div class="meta big-meta">${stars(r)}<span>${icon('clock')}<span class="num">${esc(r.time)}</span></span><span>${icon('users')}mit Mara</span></div>`
    let head
    if (DIR === 'a') {
      head = `
        <div class="dA">
          <div class="photo dA-img"><img src="img/${r.img}.jpg" alt=""></div>
          <div class="dA-info">
            <div class="chips">${cats.map(chip).join('')}</div>
            <h2 class="page-title" style="margin:10px 0 8px">${esc(r.name)}</h2>
            ${metaLine}
            <div class="chips" style="margin-top:12px">${tags}</div>
            <p class="note">${icon('info')}<span>${esc(r.notes[0])}</span></p>
            <div class="dA-actions">${sizeCtl}<a class="btn primary" href="${route('cook')}">${icon('chef-hat')}Kochen</a></div>
          </div>
        </div>`
    } else if (DIR === 'b') {
      head = `
        <div class="dB ${catAttr(c)}">
          <div class="dB-text">
            <div class="chips">${cats.map(chip).join('')}</div>
            <h2 class="page-title" style="margin:12px 0 10px">${esc(r.name)}</h2>
            ${metaLine}
            <div class="chips" style="margin-top:14px">${tags}</div>
            <div class="dA-actions" style="margin-top:22px">${sizeCtl}<a class="btn primary" href="${route('cook')}">${icon('chef-hat')}Kochen</a></div>
          </div>
          <div class="photo dB-img"><img src="img/${r.img}.jpg" alt=""></div>
        </div>
        <p class="note">${icon('info')}<span>${esc(r.notes[0])}</span></p>`
    } else {
      head = `
        <div class="dC">
          <div class="photo dC-img"><img src="img/${r.img}.jpg" alt=""></div>
          <div class="dC-info">
            <div class="cmeta-top">${cats.map(dotLabel).join('<span class="subtle">·</span>')}</div>
            <h2 class="page-title" style="margin:8px 0 10px">${esc(r.name)}</h2>
            ${metaLine}
            <div class="chips" style="margin-top:12px">${tags}</div>
            <p class="note">${icon('info')}<span>${esc(r.notes[0])}</span></p>
            <div class="dA-actions">${sizeCtl}<a class="btn primary" href="${route('cook')}">${icon('chef-hat')}Kochen</a></div>
          </div>
        </div>`
    }
    const body = `${head}${sections}<div class="section-h"><h2>Fotos</h2><span class="subtle" style="font-size:13px">9</span></div>${gallery}<p class="muted" style="font-size:13px;margin-top:28px">Quelle: ${esc(r.source)}</p>`
    return shell('list', { title: `<span class="subtle">Rezepte /</span> ${esc(r.name)}`, mobileTitle: '', back: 'list', actions, body })
  }

  S.cook = () => {
    const r = R[1]
    const s = r.sections[0]
    const step = 2
    const html = `
      <div class="cook">
        <header class="cook-top">
          <a class="btn ghost icon" href="${route('detail')}">${icon('x')}</a>
          <div class="grow"><div class="cook-title ellipsis">${esc(r.name)}</div><div class="subtle num" style="font-size:12px">${esc(s.name)} · Schritt ${step + 1} von ${s.steps.length + 2}</div></div>
          <button class="btn sm">${icon('timer')}<span class="num">18:42</span></button>
        </header>
        <div class="cook-progress"><span style="width:${((step + 1) / 7) * 100}%"></span></div>
        <div class="cook-body">
          <aside class="cook-ings hide-m">
            <div class="col-h">Zutaten · ${esc(s.name)}</div>
            <ul class="ings">${s.ingredients.map((g, i) => `<li class="${i === 4 ? 'hl' : ''}"><span class="amt num">${[g.prefix, g.amount, g.unit].filter(Boolean).join(' ')}</span><span class="ing">${esc(g.name ?? '')}</span></li>`).join('')}</ul>
          </aside>
          <main class="cook-main">
            <div class="cook-step-n num">${step + 1}</div>
            <p class="cook-step">${esc(s.steps[step])}</p>
            <div class="cook-need"><span class="col-h">Dafür</span><span class="tag">2 EL Tomatenmark</span></div>
            <div class="cook-timer card"><div>${icon('timer')}</div><div class="grow"><div class="t">Köcheln</div><div class="subtle" style="font-size:13px">läuft · Schritt 4</div></div><div class="num cook-timer-t">18:42</div><button class="btn sm icon">${icon('pause')}</button></div>
            <div class="cook-next subtle"><span class="col-h">Danach</span>${esc(s.steps[step + 1])}</div>
          </main>
        </div>
        <footer class="cook-nav">
          <button class="btn lg">${icon('chevron-left')}<span class="hide-m">Zurück</span></button>
          <div class="cook-dots">${Array.from({ length: 7 }, (_, i) => `<span class="${i === step ? 'on' : i < step ? 'done' : ''}"></span>`).join('')}</div>
          <button class="btn lg primary">Weiter${icon('chevron-right')}</button>
        </footer>
      </div>`
    return html
  }

  S.editor = () => {
    const r = R[1]
    const field = (label, inner, hint = '') => `<label class="field"><span class="flabel">${label}</span>${inner}${hint ? `<span class="fhint">${hint}</span>` : ''}</label>`
    const body = `
      <div class="editor">
        <div class="ed-main">
          ${field('Name', `<div class="input big-input"><input value="${esc(r.name)}"></div>`)}
          <div class="ed-row">
            ${field('Arbeitszeit', `<div class="input"><input value="20"><span class="subtle">min</span></div>`)}
            ${field('Gesamtzeit', `<div class="input"><input value="45"><span class="subtle">min</span></div>`)}
            ${field('Menge', `<div class="input"><input value="4"><span class="subtle">Portionen</span></div>`)}
          </div>
          ${field('Tags', `<div class="input" style="height:auto;min-height:38px;padding:5px 8px;flex-wrap:wrap">${r.tags.map((t) => `<span class="tag">${esc(t)} ${icon('x')}</span>`).join('')}<input placeholder="Tag hinzufügen" style="min-width:100px"></div>`)}
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
                    `<div class="ed-ing">${icon('grip-vertical', 'subtle drag')}<div class="input sm"><input value="${esc([g.prefix, g.amount].filter(Boolean).join(' '))}" placeholder="Menge"></div><div class="input sm"><input value="${esc(g.unit ?? '')}" placeholder="Einheit"></div><div class="input sm grow"><input value="${esc(g.name ?? '')}" placeholder="Zutat"></div><button class="btn ghost sm icon">${icon('x')}</button></div>`,
                )
                .join('')}
              <button class="btn ghost sm add">${icon('plus')}Zutat</button>
              <div class="col-h" style="margin-top:18px">Schritte</div>
              ${s.steps
                .slice(0, si ? 2 : 3)
                .map((t, i) => `<div class="ed-step"><span class="sn num">${i + 1}</span><div class="input grow" style="height:auto;padding:8px 12px"><textarea rows="1">${esc(t)}</textarea></div></div>`)
                .join('')}
              <button class="btn ghost sm add">${icon('plus')}Schritt</button>
            </section>`,
            )
            .join('')}
          <button class="btn" style="width:100%;border-style:dashed">${icon('plus')}Abschnitt hinzufügen</button>
        </div>
        <aside class="ed-side">
          <div class="col-h">Hauptbild</div>
          <div class="photo ed-img"><img src="img/${r.img}.jpg" alt=""><button class="btn sm ed-img-btn">${icon('image')}Ändern</button></div>
          <div class="col-h" style="margin-top:20px">Kategorien</div>
          <div class="chips">${CATEGORIES.map((c) => `<span class="filter-chip cat ${catsOf(r).includes(c) ? 'on' : ''}" style="--c:${c.color}">${c.emoji ? `<span class="emoji">${c.emoji}</span>` : '<span class="cat-dot"></span>'}${esc(c.name)}</span>`).join('')}</div>
          <div class="col-h" style="margin-top:20px">Geteilt mit</div>
          <div class="row" style="padding:6px 0"><span class="avatar">M</span><div class="grow">Mara</div><span class="subtle" style="font-size:13px">Bearbeiten</span></div>
          <button class="btn sm ghost add">${icon('user-plus')}Person hinzufügen</button>
        </aside>
      </div>`
    return shell('list', {
      title: 'Rezept bearbeiten',
      back: 'detail',
      actions: `<span class="subtle hide-m" style="font-size:13px;display:inline-flex;gap:6px;align-items:center">${icon('circle-check')}Gespeichert</span><a class="btn primary" href="${route('detail')}">Fertig</a>`,
      body,
    })
  }

  S.planner = () => {
    const cell = (d, s) => {
      const id = PLAN.entries[`${d}-${s}`]
      if (!id) return `<div class="pcell empty"><button class="btn ghost sm icon">${icon('plus')}</button></div>`
      const r = R[id]
      const c = primaryCat(r)
      return `<a class="pcell ${c ? catAttr(c) : ''}" href="${route('detail')}">${photo(r, 'pimg', { emojiSize: '18px' })}<div class="pt">${esc(r.name)}</div></a>`
    }
    const body = `
      <div class="toolbar" style="margin-bottom:16px"><div class="seg"><button class="on">Woche</button><button>Monat</button></div><div class="grow" style="flex:1"></div><button class="btn sm icon">${icon('chevron-left')}</button><span style="font-weight:600;font-size:14px">26. Okt – 1. Nov</span><button class="btn sm icon">${icon('chevron-right')}</button><button class="btn sm">${icon('shopping-cart')}<span class="hide-m">Einkaufsliste erstellen</span></button></div>
      <div class="plan hide-m">
        <div></div>${PLAN.days.map((d, i) => `<div class="pday ${i === PLAN.today ? 'today' : ''}">${d}</div>`).join('')}
        ${PLAN.slots.map((s, si) => `<div class="pslot">${s}</div>${PLAN.days.map((_, d) => cell(d, si)).join('')}`).join('')}
      </div>
      <div class="plan-m only-m">
        ${PLAN.days
          .map(
            (d, i) => `<div class="pm-day ${i === PLAN.today ? 'today' : ''}"><div class="pm-h">${d}${i === PLAN.today ? ' <span class="pm-today">Heute</span>' : ''}</div>
          ${PLAN.slots.map((s, si) => {
            const id = PLAN.entries[`${i}-${si}`]
            return id ? `<a class="row" href="${route('detail')}">${photo(R[id], 'thumb sm', { emojiSize: '16px' })}<div class="grow"><div class="subtle" style="font-size:11px;font-weight:600">${s}</div><div class="t ellipsis">${esc(R[id].name)}</div></div></a>` : `<div class="row subtle"><span class="pm-add">${icon('plus')}</span><span style="font-size:13px">${s} planen</span></div>`
          }).join('')}</div>`,
          )
          .join('')}
      </div>`
    return shell('planner', { title: 'Planer', body, wide: true, actions: '' })
  }

  S.shopping = () => {
    const L = SHOPPING
    const groups = [...new Set(L.items.map((i) => i.group))]
    const open = L.items.filter((i) => !i.done).length
    const body = `
      <div class="shop">
        <aside class="shop-lists hide-m">
          <div class="col-h" style="display:flex;justify-content:space-between">Listen <button class="btn ghost sm icon">${icon('plus')}</button></div>
          ${SHOPPING_LISTS.map((l, i) => `<a class="row ${i === 0 ? 'sel' : ''}" href="#"><div class="grow"><div class="t ellipsis">${l.name}</div><div class="subtle" style="font-size:12px">${l.range}</div></div><span class="subtle num" style="font-size:12px">${l.open ? `${l.open} offen` : 'erledigt'}</span></a>`).join('')}
        </aside>
        <div class="shop-main">
          <div class="shop-head"><div><h2 class="page-title" style="font-size:22px">${L.name}</h2><div class="muted" style="font-size:13px">${L.range} · <span class="num">${open} von ${L.items.length}</span> offen</div></div><button class="btn sm">${icon('plus')}Artikel</button></div>
          <div class="shop-bar"><span style="width:${((L.items.length - open) / L.items.length) * 100}%"></span></div>
          <div class="scroll-x" style="margin:14px 0 6px">${L.recipes.map((id) => `<span class="filter-chip">${photo(R[id], 'mini', { emojiSize: '11px' })}${esc(R[id].name)}</span>`).join('')}</div>
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
    return shell('shopping', { title: 'Einkauf', body, actions: `<button class="btn primary">${icon('plus')}<span class="hide-m">Neue Liste</span></button>` })
  }

  S.groups = () => {
    const g = GROUPS[0]
    const body = `
      <div class="shop">
        <aside class="shop-lists hide-m">
          <div class="col-h" style="display:flex;justify-content:space-between">Gruppen <button class="btn ghost sm icon">${icon('plus')}</button></div>
          ${GROUPS.map((x, i) => `<a class="row ${i === 0 ? 'sel' : ''}" href="#"><span class="avatar">${x.name[0]}</span><div class="grow"><div class="t ellipsis">${x.name}</div><div class="subtle" style="font-size:12px">${x.members.length} Mitglieder · ${x.recipes.length} Rezepte</div></div></a>`).join('')}
        </aside>
        <div class="shop-main">
          <div class="shop-head"><div style="display:flex;gap:14px;align-items:center"><span class="avatar lg">${g.name[0]}</span><div><h2 class="page-title" style="font-size:22px">${g.name}</h2><div class="muted" style="font-size:13px">${g.members.length} Mitglieder · du bist Admin</div></div></div><button class="btn sm">${icon('user-plus')}Einladen</button></div>
          <div class="section-h"><h2>Mitglieder</h2></div>
          <div class="rows ${DIR === 'a' ? 'card divided pad-rows' : ''}">${g.members.map((m) => `<div class="row"><span class="avatar">${USERS[m].initial}</span><div class="grow t">${USERS[m].name}${m === ME ? ' <span class="subtle">(du)</span>' : ''}</div><span class="subtle" style="font-size:13px">${m === g.owner ? 'Admin' : 'Mitglied'}</span></div>`).join('')}</div>
          <div class="section-h"><h2>Geteilte Rezepte</h2><span class="subtle num" style="font-size:13px">${g.recipes.length}</span></div>
          ${DIR === 'a' ? `<div class="card rows divided pad-rows">${g.recipes.map((id) => recipeRow(R[id])).join('')}</div>` : DIR === 'b' ? `<div class="grid bgrid">${g.recipes.map((id) => recipeCardB(R[id])).join('')}</div>` : `<div class="grid cgrid">${g.recipes.map((id) => recipeCardC(R[id])).join('')}</div>`}
        </div>
      </div>`
    return shell('groups', { title: 'Gruppen', body })
  }

  S.profile = () => {
    const sw = (t, d, on) => `<div class="row set"><div class="grow"><div class="t">${t}</div><div class="subtle" style="font-size:13px">${d}</div></div><span class="toggle ${on ? 'on' : ''}"></span></div>`
    const body = `
      <div class="narrow">
        <div style="display:flex;gap:16px;align-items:center;margin-bottom:24px"><span class="avatar lg">K</span><div><h2 class="page-title" style="font-size:22px">Kolja</h2><div class="muted" style="font-size:13px">42 Rezepte · 2 Gruppen</div></div></div>
        <div class="col-h">Darstellung</div>
        <div class="card set-card"><div class="row set"><div class="grow t">Design</div><div class="seg"><button>${icon('sun')}Hell</button><button>${icon('moon')}Dunkel</button><button class="on">System</button></div></div></div>
        <div class="col-h">Kochen</div>
        <div class="card set-card divided">${sw('Bildschirm wach halten', 'Im Koch-Modus geht das Display nicht aus', true)}${sw('Timer-Ton', 'Signal, wenn ein Timer abläuft', true)}</div>
        <div class="col-h">Offline</div>
        <div class="card set-card divided">${sw('Rezepte offline speichern', 'Alle eigenen und geteilten Rezepte', true)}${sw('Fotos offline speichern', 'Braucht etwa 1 GB', false)}<div class="row set"><div class="grow"><div class="t">Speicher</div><div class="subtle num" style="font-size:13px">1,4 GB von 5 GB belegt</div></div><button class="btn sm">Leeren</button></div></div>
        <div class="card set-card divided" style="margin-top:20px"><a class="row set" href="${route('categories')}"><div class="grow t">Kategorien & Tags</div>${icon('chevron-right', 'subtle')}</a><a class="row set" href="${route('states')}"><div class="grow t">Zustände (Mockup)</div>${icon('chevron-right', 'subtle')}</a><div class="row set"><div class="grow t" style="color:oklch(0.58 0.2 25)">Abmelden</div></div></div>
      </div>`
    return shell('profile', { title: 'Profil & Einstellungen', mobileTitle: 'Profil', body })
  }

  S.categories = () => {
    const swatches = ['#e11d48', '#f97316', '#f59e0b', '#fde047', '#84cc16', '#10b981', '#06b6d4', '#0ea5e9', '#1e3a8a', '#7c3aed', '#c026d3', '#000000']
    const body = `
      <div class="narrow">
        <div class="section-h" style="margin-top:0"><h2>Kategorien</h2><button class="btn sm">${icon('plus')}Neue Kategorie</button></div>
        <div class="card rows divided pad-rows">${CATEGORIES.map(
          (c, i) =>
            `<div class="row">${icon('grip-vertical', 'subtle')}<span class="cat-emoji-box cat" style="--c:${c.color}">${c.emoji ? `<span class="emoji">${c.emoji}</span>` : '<span class="cat-dot"></span>'}</span><div class="grow"><div class="t">${esc(c.name)}</div><div class="subtle num" style="font-size:12px">${c.recipes.length} Rezepte · Farbe ${c.color}</div></div>${chip(c)}<button class="btn ghost sm icon">${icon('more-horizontal')}</button></div>`,
        ).join('')}</div>
        <div class="card cat-editor cat" style="--c:#fde047">
          <div class="col-h">Kategorie bearbeiten</div>
          <div class="ce-row"><button class="cat-emoji-box ce-emoji"><span class="emoji">☀️</span></button><div class="input grow"><input value="Sommer"></div></div>
          <div class="col-h" style="margin-top:14px">Farbe</div>
          <div class="swatches">${swatches.map((s) => `<span class="sw cat ${s === '#fde047' ? 'on' : ''}" style="--c:${s}"><span></span></span>`).join('')}<span class="sw custom">${icon('plus')}</span></div>
          <div class="col-h" style="margin-top:14px">Vorschau</div>
          <div class="ce-preview"><span class="cat-chip">${'<span class="emoji">☀️</span>'}Sommer</span><span class="cat-label"><span class="cat-dot"></span>Sommer</span><span class="subtle" style="font-size:12px">gewählt: #fde047 → angepasst für Hell/Dunkel</span></div>
        </div>
        <div class="section-h"><h2>Tags</h2><span class="subtle" style="font-size:13px">für alle gleich</span></div>
        <div class="chips">${['Hauptgericht', 'Vegetarisch', 'Vegan', 'Schnell', 'Backen', 'Dessert', 'Suppe', 'Salat', 'Italienisch', 'Indisch', 'Asiatisch', 'Mexikanisch', 'Frühstück'].map(tagHtml).join('')}</div>
      </div>`
    return shell('profile', { title: 'Kategorien & Tags', back: 'profile', body })
  }

  S.states = () => {
    const skelRow = `<div class="row"><div class="skel thumb"></div><div class="grow"><div class="skel" style="height:12px;width:55%;margin-bottom:8px"></div><div class="skel" style="height:10px;width:30%"></div></div></div>`
    const body = `
      <div class="narrow">
        <div class="col-h">Offline / Verbindung verloren</div>
        <div class="banner">${icon('cloud-off')}<span class="grow">Offline. Änderungen werden gespeichert und später synchronisiert.</span></div>
        <div class="col-h" style="margin-top:28px">Laden</div>
        <div class="card rows pad-rows">${skelRow}${skelRow}${skelRow}</div>
        <div class="col-h" style="margin-top:28px">Keine Treffer</div>
        <div class="empty card"><div class="empty-ic">${icon('search')}</div><div class="t">Nichts gefunden für „Lasagne“</div><div class="muted" style="font-size:13px">Prüf die Schreibweise oder setz die Filter zurück.</div><button class="btn sm" style="margin-top:12px">Filter zurücksetzen</button></div>
        <div class="col-h" style="margin-top:28px">Leer (erstes Mal)</div>
        <div class="empty card"><div class="empty-ic">${icon('book-open')}</div><div class="t">Noch keine Rezepte</div><div class="muted" style="font-size:13px">Leg dein erstes Rezept an oder lass dir eins teilen.</div><a class="btn primary sm" style="margin-top:12px" href="${route('editor')}">${icon('plus')}Neues Rezept</a></div>
        <div class="col-h" style="margin-top:28px">Fehler</div>
        <div class="empty card"><div class="empty-ic">${icon('info')}</div><div class="t">Rezepte konnten nicht geladen werden</div><div class="muted" style="font-size:13px">Server nicht erreichbar.</div><button class="btn sm" style="margin-top:12px">${icon('rotate-ccw')}Erneut versuchen</button></div>
        <div class="col-h" style="margin-top:28px">Kategorie-Farben (Stresstest)</div>
        <div class="card" style="padding:16px;display:grid;gap:10px">${CATEGORIES.map((c) => `<div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap"><span class="num subtle" style="font-size:12px;width:64px">${c.color}</span>${chip(c)}${dotLabel(c)}<span class="cat-emoji-box cat" style="--c:${c.color}">${catEmoji(c) || '<span class="cat-dot"></span>'}</span><span class="filter-chip cat on" style="--c:${c.color}">${esc(c.name)}</span></div>`).join('')}</div>
      </div>`
    return shell('profile', { title: 'Zustände', back: 'profile', body })
  }

  function render() {
    const screen = (location.hash.replace('#/', '') || qs.get('screen') || 'home').split('?')[0]
    document.getElementById('root').innerHTML = (S[screen] || S.home)()
    window.scrollTo(0, 0)
    parent?.postMessage?.({ foodlyScreen: screen }, '*')
  }
  window.addEventListener('hashchange', render)
  render()
})()
