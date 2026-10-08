import { describe, expect, it } from 'vitest';
import { resolveFormat, youtubeId } from '@/src/components/TestimonialCard';

describe('testimonial format resolution (2c)', () => {
  it('passes known formats through', () => {
    expect(resolveFormat({ format: 'text' })).toBe('text');
    expect(resolveFormat({ format: 'image', imageUrl: 'https://x.test/i.jpg' })).toBe('image');
    expect(resolveFormat({ format: 'video_short', videoUrl: 'https://x.test/v.mp4' })).toBe('video_short');
    expect(resolveFormat({ format: 'video_standard', videoUrl: 'https://x.test/v' })).toBe('video_standard');
  });

  it('degrades image without a photo to text, never a broken card', () => {
    expect(resolveFormat({ format: 'image', imageUrl: '' })).toBe('text');
    expect(resolveFormat({ format: 'image' })).toBe('text');
  });

  it('maps legacy and unknown values by content, defaulting to text', () => {
    expect(resolveFormat({ format: 'video_walkthrough', videoUrl: 'https://x.test/v' })).toBe('video_standard');
    expect(resolveFormat({ format: 'hologram', videoUrl: 'https://x.test/v' })).toBe('video_standard');
    expect(resolveFormat({ format: 'hologram' })).toBe('text');
    expect(resolveFormat({})).toBe('text');
    expect(resolveFormat({ format: null, videoUrl: null, imageUrl: null })).toBe('text');
  });
});

describe('youtube id parsing (2c)', () => {
  it('extracts ids from watch, short, embed and youtu.be urls', () => {
    expect(youtubeId('https://www.youtube.com/watch?v=abc123DEF45')).toBe('abc123DEF45');
    expect(youtubeId('https://youtu.be/abc123DEF45')).toBe('abc123DEF45');
    expect(youtubeId('https://www.youtube.com/embed/abc123DEF45')).toBe('abc123DEF45');
    expect(youtubeId('https://www.youtube.com/shorts/abc123DEF45')).toBe('abc123DEF45');
  });

  it('returns null when unparseable (caller degrades to a link)', () => {
    expect(youtubeId('https://example.com/video.mp4')).toBeNull();
    expect(youtubeId('not a url')).toBeNull();
  });
});
