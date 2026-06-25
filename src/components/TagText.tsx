import { Fragment } from 'react';
import { useTags } from '../catalog/CatalogProvider';
import type { Tag } from '../api/protocol';

// {X} or {!X}; X = tag id (anything but braces). Global flag → iterate matches.
const TOKEN = /\{(!?)([^{}]+)\}/g;

// Resolve a tag image hash to a URL. The real backend hash→URL scheme is still
// TBD; in dev the mock stores a filename stem served from public/tags.
function tagImageSrc(hash: string): string {
  return `/tags/${hash}.svg`;
}

export function TagText({ value }: { value: string }) {
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
      // Tag has an image → render it inline, sized to the surrounding text.
      nodes.push(
        <img src={tagImageSrc(tag.svg)} alt={id} className="inline-block h-[1em] w-auto align-[-0.15em]" />,
      );
    }
    last = start + full.length;
  }
  if (last < value.length) nodes.push(value.slice(last));

  return <>{nodes.map((n, i) => <Fragment key={i}>{n}</Fragment>)}</>;
}
