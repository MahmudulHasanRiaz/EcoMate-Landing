import { describe, expect, it } from 'vitest';
import { sanitizeHtml } from '@/lib/sanitize';

// Vitest runs in plain Node (no DOMParser), so these exercise the tokenizer
// branch — the same branch that runs in production on Workers.
describe('HTML sanitizer (lib/sanitize.ts)', () => {
  it('removes <script> blocks with their contents', () => {
    const out = sanitizeHtml('<script>alert("xss")</script><p>hello</p>');
    expect(out).not.toContain('script');
    expect(out).not.toContain('alert');
    expect(out).toContain('<p>hello</p>');
  });

  it('removes <style> blocks with their contents', () => {
    const out = sanitizeHtml('<style>body{display:none}</style><p>hi</p>');
    expect(out).not.toContain('style');
    expect(out).not.toContain('display:none');
    expect(out).toContain('<p>hi</p>');
  });

  it('strips on* event-handler attributes', () => {
    const out = sanitizeHtml('<img src="/x.png" onerror="alert(1)" alt="x">');
    expect(out).not.toContain('onerror');
    expect(out).toContain('src="/x.png"');
  });

  it('drops javascript: hrefs but keeps the link text and forces rel', () => {
    const out = sanitizeHtml('<a href="javascript:alert(1)">click</a>');
    expect(out).not.toContain('javascript:');
    expect(out).toContain('rel="noopener noreferrer"');
    expect(out).toContain('click');
  });

  it('drops data: src values', () => {
    const out = sanitizeHtml('<img src="data:image/png;base64,AAA" alt="x">');
    expect(out).not.toContain('data:');
  });

  // KNOWN GAP (reported in the Task 18 report, not fixed here — Task 18 may not
  // change validation behaviour): the file header claims `//host` URLs fail, but
  // SAFE_URL (`/^(https?:|\/)/i`) accepts a leading `/`, so a protocol-relative
  // href survives. This test pins the CURRENT behaviour; a follow-up that
  // tightens the regex should flip this assertion.
  it('currently keeps protocol-relative URLs (documents a known gap)', () => {
    const out = sanitizeHtml('<a href="//evil.example/x">y</a>');
    expect(out).toContain('//evil.example/x');
  });

  it('keeps the allowlisted tags and attributes from lib/sanitize.ts', () => {
    const dirty =
      '<p>para</p><b>b</b><i>i</i><strong>s</strong><em>e</em>' +
      '<ul><li>one</li></ul><ol><li>two</li></ol>' +
      '<h2>h2</h2><h3>h3</h3><blockquote>q</blockquote>' +
      '<code>c</code><pre>pre</pre><br><hr><span class="k">span</span>' +
      '<a href="https://example.com" title="t">link</a>' +
      '<img src="/media/x.png" alt="x" width="10" height="10">';
    const out = sanitizeHtml(dirty);
    for (const kept of [
      '<p>para</p>', '<b>b</b>', '<strong>s</strong>', '<ul>', '<li>one</li>',
      '<h2>h2</h2>', '<blockquote>q</blockquote>', '<code>c</code>',
      '<span class="k">span</span>', 'href="https://example.com"',
      'rel="noopener noreferrer"', 'src="/media/x.png"', 'alt="x"',
    ]) {
      expect(out).toContain(kept);
    }
  });

  it('unwraps disallowed tags (iframe, svg, form) but keeps their text', () => {
    const out = sanitizeHtml('<iframe src="https://evil.example">inner text</iframe>');
    expect(out).not.toContain('iframe');
    expect(out).toContain('inner text');
  });

  it('drops non-allowlisted attributes (style, srcset) even on allowed tags', () => {
    const out = sanitizeHtml('<p style="color:red">x</p><img src="/x.png" srcset="/x2.png 2x">');
    expect(out).not.toContain('style=');
    expect(out).not.toContain('srcset');
  });
});
