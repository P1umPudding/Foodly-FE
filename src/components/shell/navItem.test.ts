import { navItemClass } from './navItem'

// #219: sidebar entries keep 36 px with a mouse and grow to 40 px on touch (jsdom applies no CSS: check the tokens).
it.each([false, true])('sidebar entry is 36 px with a mouse and 40 px on touch (collapsed: %s)', (collapsed) => {
  const classes = navItemClass(false, collapsed).split(/\s+/)
  expect(classes).toEqual(expect.arrayContaining(['h-9', 'touch:h-10']))
  expect(classes).not.toContain('h-10')
})
