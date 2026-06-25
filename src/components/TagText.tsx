import { Fragment } from 'react';
import { useTags } from '../catalog/CatalogProvider';
import type { Tag } from '../api/protocol';

// {X} or {!X}; X = tag id (anything but braces). Global flag → iterate matches.
const TOKEN = /\{(!?)([^{}]+)\}/g;

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
      nodes.push(id); // forced name, or no image available → name without braces
    } else {
      // Tag has an svg. Real image loading is backend-dependent and deferred
      // (Phase 1: no tag has an svg, so this branch is unreached). Fall back to
      // the readable name rather than an empty box.
      nodes.push(id);
    }
    last = start + full.length;
  }
  if (last < value.length) nodes.push(value.slice(last));

  return <>{nodes.map((n, i) => <Fragment key={i}>{n}</Fragment>)}</>;
}
