import { describe, expect, it } from 'vitest';
import { purgeScopeTags } from '@/lib/cache-purge';

describe('purgeScopeTags', () => {
  it('landing scope covers the shell and leaves content domains alone', () => {
    const tags = purgeScopeTags('landing');
    expect(tags).toContain('content:en');
    expect(tags).toContain('content:bn');
    expect(tags).toContain('menus:main:en');
    expect(tags).toContain('menus:footer:bn');
    expect(tags).toContain('branding');
    expect(tags).toContain('pricing');
    expect(tags).toContain('seo');
    expect(tags).not.toContain('blog');
    expect(tags).not.toContain('casestudies');
    expect(tags).not.toContain('testimonials');
    expect(tags).not.toContain('social');
  });

  it('all scope covers every tag family', () => {
    const tags = purgeScopeTags('all');
    for (const tag of [
      'content:en',
      'content:bn',
      'menus:main:en',
      'menus:footer:bn',
      'blog',
      'pricing',
      'social',
      'testimonials',
      'casestudies',
      'branding',
      'seo',
    ]) {
      expect(tags).toContain(tag);
    }
  });
});
