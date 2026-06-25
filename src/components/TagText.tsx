import { Fragment } from 'react';
import { useTags } from '../catalog/CatalogProvider';
import { tagImageSrc } from '../api/assets';
import type { Tag } from '../api/protocol';

// {X} or {!X}; X = tag id (anything but braces). Global flag → iterate matches.
const TOKEN = /\{(!?)([^{}]+)\}/g;

// Tag icons are sized per context (body text vs. the larger meta vs. the title),
// but always through this one component so the dimensions live in one place and
// are never hand-written inline at each call site.
const TAG_ICON_SIZE = {
  sm: 'h-[1.15em] align-[-0.22em]', // ingredients, steps, notes, chips
  md: 'h-[1.2em] align-[-0.25em]', // time, portions, section headings
  lg: 'h-[1.2em] align-[-0.28em]', // title
} as const;

export type TagSize = keyof typeof TAG_ICON_SIZE;

export function TagIcon({ hash, alt, size = 'sm' }: { hash: string; alt: string; size?: TagSize }) {
  return <img src={tagImageSrc(hash)} alt={alt} className={`inline-block w-auto ${TAG_ICON_SIZE[size]}`} />;
}

// Render a recipe-authored string, replacing {tagId}/{!tagId} tokens. Text tags
// inherit the surrounding style; image tags render via <TagIcon> at `size`.
export function TagText({ value, size = 'sm' }: { value: string; size?: TagSize }) {
  const { byId } = useTags();
  const nodes: Array<string | JSX.Element> = [];
  let last = 0;

  for (const m of value.matchAll(TOKEN)) {
    const [full, bang, id] = m;
    const start = m.index ?? 0;
    if (start > last) nodes.push(value.slice(last, start));

    const tag: Tag | undefined = byId[id];
    if (!tag) {
      nodes.push(full); // unknown tag → keep literal (incl. braces / leading !)
    } else if (bang === '!' || tag.svg === null) {
      nodes.push(id); // forced name, or no image → name without braces
    } else {
      nodes.push(<TagIcon hash={tag.svg} alt={id} size={size} />);
    }
    last = start + full.length;
  }
  if (last < value.length) nodes.push(value.slice(last));

  return <>{nodes.map((n, i) => <Fragment key={i}>{n}</Fragment>)}</>;
}
