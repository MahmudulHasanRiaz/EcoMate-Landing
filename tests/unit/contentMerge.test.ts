import { describe, expect, it } from 'vitest';
import { landingContent } from '@/src/data/landingContent';
import { assembleLandingContent, mergeContent, type Json } from '@/lib/merge';

describe('content merge (lib/merge.ts)', () => {
  it('DB slice wins per key, the fallback fills the gaps', () => {
    const merged = mergeContent(
      { headline: 'DB headline', nested: { x: 1 } },
      { headline: 'static', nested: { x: 0, y: 2 }, extra: 'kept' },
    );
    expect(merged).toEqual({
      headline: 'DB headline',
      nested: { x: 1, y: 2 },
      extra: 'kept',
    });
  });

  it('replaces arrays wholesale, never element-merges', () => {
    expect(mergeContent({ list: ['a'] }, { list: ['a', 'b', 'c'] })).toEqual({
      list: ['a'],
    });
  });

  it('a null DB slice returns the fallback untouched', () => {
    const fallback = { a: 1, b: [1, 2] };
    expect(mergeContent(null, fallback)).toBe(fallback);
  });

  it('missing bn key falls back to en: layered bn-over-en-over-static', () => {
    // This is how a caller layers locales with the real function: the bn DB
    // slice wins where present, the en slice fills keys bn never translated,
    // and static fills the rest. No key is ever blank when en has it.
    const enSlice: Json = { heading: 'English heading', sub: 'English sub' };
    const bnSlice: Json = { heading: 'বাংলা শিরোনাম' };
    const merged = mergeContent(bnSlice, enSlice);
    expect(merged['heading']).toBe('বাংলা শিরোনাম');
    expect(merged['sub']).toBe('English sub');
  });

  it('assembled bn hero: DB headline wins, every other key falls back to static bn', () => {
    const assembled = assembleLandingContent('bn', [
      { sectionKey: 'hero', content: { headlinePart1: 'DB শিরোনাম' } },
    ]);
    const hero = assembled.hero as unknown as Record<string, unknown>;
    expect(hero['headlinePart1']).toBe('DB শিরোনাম');
    expect(hero['subtitle']).toBe(landingContent.bn.hero.subtitle);
  });

  it('sections with no DB row render the static copy, never blank', () => {
    const assembled = assembleLandingContent('bn', [
      { sectionKey: 'hero', content: { headlinePart1: 'DB শিরোনাম' } },
    ]);
    expect(assembled.pricing).toEqual(landingContent.bn.pricing);
  });

  it('unknown top-level section keys are ignored, not injected', () => {
    const assembled = assembleLandingContent('en', [
      { sectionKey: 'typo-key', content: { headline: 'oops' } },
    ]);
    expect('typo-key' in (assembled as unknown as Record<string, unknown>)).toBe(false);
  });

  it('empty sectionKey rows are skipped and null sections return the static base', () => {
    const withEmpty = assembleLandingContent('en', [{ sectionKey: '', content: { x: 1 } }]);
    expect(withEmpty).toBe(landingContent.en);
    expect(assembleLandingContent('bn', null)).toBe(landingContent.bn);
  });
});
