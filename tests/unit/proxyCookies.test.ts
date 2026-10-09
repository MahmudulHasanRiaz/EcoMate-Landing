import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, type NextMiddleware } from 'next/server';
import { auth } from '@/auth';
import { findManagedRedirect } from '@/lib/redirects';
import { proxy } from '@/proxy';

vi.mock('@/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/redirects', () => ({
  findManagedRedirect: vi.fn(),
}));

vi.mock('@/lib/content', () => ({
  getSlugByIdUncached: vi.fn(),
}));

/** The mock stands in for the middleware call signature (request, event) -> Response. */
function mockAuthFn(): {
  mockResolvedValue: (response: Response) => void;
  mockReset: () => void;
} {
  return vi.mocked(auth) as unknown as {
    mockResolvedValue: (response: Response) => void;
    mockReset: () => void;
  };
}
const mockAuth = () => mockAuthFn();
const mockRedirects = () => vi.mocked(findManagedRedirect);

type ProxyEvent = Parameters<NextMiddleware>[1];

function event(): ProxyEvent {
  return undefined as unknown as ProxyEvent;
}

function requestFor(path: string): NextRequest {
  return new NextRequest(new Request(`http://localhost${path}`));
}

/** An auth-touched response: CSRF + session cookies plus one unrelated cookie. */
function authTouchedResponse(): Response {
  const headers = new Headers();
  headers.append('set-cookie', '__Host-authjs.csrf-token=csrf123; Path=/; HttpOnly; Secure; SameSite=Lax');
  headers.append('set-cookie', '__Secure-authjs.session-token=sess456; Path=/; HttpOnly; Secure');
  headers.append('set-cookie', 'theme=dark; Path=/; Max-Age=31536000');
  return new Response('ok', { headers });
}

beforeEach(() => {
  mockAuth().mockReset();
  mockRedirects().mockReset();
  mockRedirects().mockResolvedValue(null);
});

describe('proxy auth-cookie stripping (edge-cacheable public pages)', () => {
  it('strips authjs Set-Cookie on a public path but keeps other cookies', async () => {
    mockAuth().mockResolvedValue(authTouchedResponse());
    const response = (await proxy(requestFor('/en'), event())) as Response;
    const setCookies = response.headers.getSetCookie();
    expect(setCookies.some((entry) => entry.includes('__Host-authjs.csrf-token'))).toBe(false);
    expect(setCookies.some((entry) => entry.includes('__Secure-authjs.session-token'))).toBe(false);
    expect(setCookies.some((entry) => entry.startsWith('theme=dark'))).toBe(true);
  });

  it('preserves authjs Set-Cookie on /admin/* (auth flow owns those paths)', async () => {
    mockAuth().mockResolvedValue(authTouchedResponse());
    const response = (await proxy(requestFor('/admin/cms'), event())) as Response;
    const setCookies = response.headers.getSetCookie();
    expect(setCookies.some((entry) => entry.includes('__Host-authjs.csrf-token'))).toBe(true);
    expect(setCookies.some((entry) => entry.includes('__Secure-authjs.session-token'))).toBe(true);
  });

  it('preserves authjs Set-Cookie on /api/auth/*', async () => {
    mockAuth().mockResolvedValue(authTouchedResponse());
    const response = (await proxy(requestFor('/api/auth/session'), event())) as Response;
    expect(
      response.headers.getSetCookie().some((entry) => entry.includes('__Host-authjs.csrf-token')),
    ).toBe(true);
  });

  it('leaves non-auth responses without Set-Cookie untouched on public paths', async () => {
    mockAuth().mockResolvedValue(new Response('ok'));
    const response = (await proxy(requestFor('/bn'), event())) as Response;
    expect(response.headers.getSetCookie()).toHaveLength(0);
    expect(response.headers.get('x-request-id')).not.toBeNull();
  });
});
