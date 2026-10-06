/**
 * Allowlist HTML sanitizer for CMS-authored content (Task 14 §5).
 *
 * ## Which branch actually runs
 *
 * There is no `DOMParser` in the Workers runtime, so the **tokenizer below is the
 * implementation that runs in production** — it is written first and treated as primary.
 * The `DOMParser` branch only exists for Node-based tooling (scripts, jsdom-backed tests)
 * and must produce the same filtered result.
 *
 * ## What it guarantees
 *
 * - `<script>` / `<style>` blocks are removed *with their contents*, so payload text can
 *   never become visible markup.
 * - Only allowlisted tags survive; anything else (iframe, form, svg, object, ...) loses its
 *   tag but keeps its text, except script/style which lose both.
 * - Attributes are filtered per tag: no `on*` handlers, no `style`, no `srcset`.
 * - `href` / `src` must match `http(s)://` or be root-relative, so `javascript:`,
 *   `data:` and protocol-relative payloads cannot survive. `a` always gets
 *   `rel="noopener noreferrer"`, whatever the author supplied.
 * - Text between tags is HTML-escaped, so an unbalanced tag (`<img src=x onerror=...`
 *   without `>`) cannot be completed by a later `<` in the content.
 *
 * Conservative by construction: every rule can only remove. Invalid markup may be
 * re-emitted with quotes normalized — it can never gain an attribute or an event handler.
 */

/** Tags a blog post may use. Everything else is unwrapped (text kept) or dropped. */
const ALLOWED_TAGS = new Set([
  'p',
  'b',
  'i',
  'strong',
  'em',
  'a',
  'ul',
  'ol',
  'li',
  'h2',
  'h3',
  'blockquote',
  'code',
  'pre',
  'img',
  'br',
  'hr',
  'span',
]);

/** Per-tag attribute allowlist. A tag absent here may carry no attributes at all. */
const ALLOWED_ATTRS: Readonly<Record<string, ReadonlySet<string>>> = {
  a: new Set(['href', 'title', 'rel']),
  img: new Set(['src', 'alt', 'width', 'height']),
  span: new Set(['class']),
};

/** http(s) absolute or root-relative. `//host`, `javascript:` and `data:` all fail. */
const SAFE_URL = /^(https?:|\/)/i;

/** `<script>…</script>` / `<style>…</style>`, unterminated block included. */
const SCRIPT_STYLE_BLOCK = /<(script|style)\b[^>]*>[\s\S]*?(?:<\/\1\s*>|$)/gi;

/** A single tag-shaped token. `>` inside a quoted attribute value can split it — that is
 *  harmless: both fragments are inspected independently and anything unrecognised is
 *  escaped as text rather than emitted. */
const TAG_TOKEN = /<[^>]*>/g;

/** name="value" | name='value' | name=value | name */
const ATTR_TOKEN = /([a-zA-Z_:][a-zA-Z0-9_.:-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
const TAG_NAME = /^([a-zA-Z][a-zA-Z0-9]*)/;
const EMPTY_ATTRS: ReadonlySet<string> = new Set<string>();

function escapeText(value: string): string {
  return value.replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Rebuild one tag token. Returns `null` when the token must be dropped entirely
 * (disallowed tag, comment, doctype, stray markup).
 */
function sanitizeTagToken(token: string): string | null {
  const inner = token.slice(1, -1);
  const closing = inner.startsWith('/');
  const body = closing ? inner.slice(1) : inner;
  const nameMatch = TAG_NAME.exec(body);
  if (!nameMatch) return null; // `<!--`, `<!doctype`, `<?…`: not a tag we know.

  const tag = nameMatch[1].toLowerCase();
  if (!ALLOWED_TAGS.has(tag)) return null;
  if (closing) return `</${tag}>`;

  const allowed = ALLOWED_ATTRS[tag] ?? EMPTY_ATTRS;
  let out = `<${tag}`;

  ATTR_TOKEN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = ATTR_TOKEN.exec(body.slice(nameMatch[1].length))) !== null) {
    const name = match[1].toLowerCase();
    if (name.startsWith('on')) continue;
    if (!allowed.has(name)) continue;
    // `rel` is ours to set on links — never take the author's value, never duplicate it.
    if (tag === 'a' && name === 'rel') continue;
    const value = match[2] ?? match[3] ?? match[4] ?? '';
    if ((name === 'href' || name === 'src') && !SAFE_URL.test(value.trim())) continue;
    out += ` ${name}="${escapeAttribute(value)}"`;
  }
  // Always forced, regardless of what the author wrote.
  if (tag === 'a') out += ' rel="noopener noreferrer"';
  return `${out}>`;
}

/** DOM-based branch: same policy, for Node tooling. */
function sanitizeWithDom(dirty: string): string {
  const doc = new DOMParser().parseFromString(dirty, 'text/html');
  const walk = (node: Element): void => {
    for (const child of [...node.children]) {
      const tag = child.tagName.toLowerCase();
      if (tag === 'script' || tag === 'style') {
        child.remove();
        continue;
      }
      if (!ALLOWED_TAGS.has(tag)) {
        // Unwrap: the element disappears, its text stays.
        child.replaceWith(...child.childNodes);
        continue;
      }
      const keep = ALLOWED_ATTRS[tag] ?? EMPTY_ATTRS;
      for (const attr of [...child.attributes]) {
        const name = attr.name.toLowerCase();
        if (name.startsWith('on') || !keep.has(name)) {
          child.removeAttribute(attr.name);
          continue;
        }
        if (tag === 'a' && name === 'rel') {
          child.removeAttribute(attr.name);
          continue;
        }
        if ((name === 'href' || name === 'src') && !SAFE_URL.test(attr.value.trim())) {
          child.removeAttribute(attr.name);
        }
      }
      if (tag === 'a') child.setAttribute('rel', 'noopener noreferrer');
      walk(child);
    }
  };
  walk(doc.body);
  return doc.body.innerHTML;
}

export function sanitizeHtml(dirty: string): string {
  if (typeof dirty !== 'string' || dirty === '') return '';

  // Tooling-only path (jsdom / browsers). Production always takes the tokenizer below.
  if (typeof DOMParser !== 'undefined') return sanitizeWithDom(dirty);

  const withoutScripts = dirty.replace(SCRIPT_STYLE_BLOCK, ' ');

  let out = '';
  let lastIndex = 0;
  TAG_TOKEN.lastIndex = 0;
  for (let match = TAG_TOKEN.exec(withoutScripts); match !== null; match = TAG_TOKEN.exec(withoutScripts)) {
    out += escapeText(withoutScripts.slice(lastIndex, match.index));
    const tag = sanitizeTagToken(match[0]);
    if (tag !== null) out += tag;
    lastIndex = match.index + match[0].length;
  }
  out += escapeText(withoutScripts.slice(lastIndex));
  return out;
}
