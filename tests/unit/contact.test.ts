import { describe, expect, it } from 'vitest';
import {
  buildHttpUrl,
  buildTelUrl,
  buildWhatsAppUrl,
  youtubeEmbedUrl,
  youtubeVideoId,
} from '@/lib/contact';

describe('contact endpoints (lib/contact.ts)', () => {
  it('builds wa.me links from bare numbers, passes URLs through', () => {
    expect(buildWhatsAppUrl('8801894828290')).toBe('https://wa.me/8801894828290');
    expect(buildWhatsAppUrl('+880 1894-828290')).toBe('https://wa.me/8801894828290');
    expect(buildWhatsAppUrl('https://wa.me/8801894828290?text=hi')).toBe(
      'https://wa.me/8801894828290?text=hi',
    );
    expect(buildWhatsAppUrl('')).toBeNull();
    expect(buildWhatsAppUrl('not-a-number')).toBeNull();
    expect(buildWhatsAppUrl('javascript:alert(1)')).toBeNull();
  });

  it('builds tel: links, keeps existing tel: values', () => {
    expect(buildTelUrl('+8801894828290')).toBe('tel:+8801894828290');
    expect(buildTelUrl('tel:+8801894828290')).toBe('tel:+8801894828290');
    expect(buildTelUrl('')).toBeNull();
  });

  it('only allows absolute http(s) URLs for Messenger', () => {
    expect(buildHttpUrl('https://m.me/ecomate.bd')).toBe('https://m.me/ecomate.bd');
    expect(buildHttpUrl('/relative/path')).toBeNull();
    expect(buildHttpUrl('')).toBeNull();
  });

  it('extracts YouTube ids and builds nocookie embeds', () => {
    expect(youtubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(youtubeVideoId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(youtubeVideoId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(youtubeVideoId('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(youtubeVideoId('not a url')).toBeNull();
    expect(youtubeEmbedUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0',
    );
    expect(youtubeEmbedUrl('')).toBeNull();
  });
});
