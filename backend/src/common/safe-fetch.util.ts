import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

// TestSphere sends real HTTP requests to whatever URL a tester enters. Without
// a guard, anyone with access to the API Testing or Performance Testing pages
// could aim those requests at the server's own network (internal services,
// cloud metadata addresses) and read the answer back. These helpers only let
// requests go to public internet addresses.
//
// Set ALLOW_PRIVATE_TEST_TARGETS=true on a self-hosted test runner that
// really must reach private addresses (for example a staging server on the
// company network). Leave it unset on the public deployment.

export class BlockedTargetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BlockedTargetError';
  }
}

function ipv4ToNumber(ip: string): number {
  return ip.split('.').reduce((acc, part) => acc * 256 + Number(part), 0);
}

function inRange(ip: number, base: string, bits: number): boolean {
  const size = 2 ** (32 - bits);
  const start = ipv4ToNumber(base);
  return ip >= start && ip < start + size;
}

function isPrivateIpv4(ip: string): boolean {
  const n = ipv4ToNumber(ip);
  return (
    inRange(n, '0.0.0.0', 8) ||
    inRange(n, '10.0.0.0', 8) ||
    inRange(n, '100.64.0.0', 10) ||
    inRange(n, '127.0.0.0', 8) ||
    inRange(n, '169.254.0.0', 16) || // link-local, cloud metadata
    inRange(n, '172.16.0.0', 12) ||
    inRange(n, '192.0.0.0', 24) ||
    inRange(n, '192.168.0.0', 16) ||
    inRange(n, '198.18.0.0', 15) ||
    n >= ipv4ToNumber('224.0.0.0') // multicast and reserved
  );
}

function isPrivateIp(address: string): boolean {
  const version = isIP(address);
  if (version === 4) return isPrivateIpv4(address);
  if (version === 6) {
    const lower = address.toLowerCase();
    if (lower === '::' || lower === '::1') return true;
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true; // unique local
    if (/^fe[89ab]/.test(lower)) return true; // link-local
    // IPv4-mapped addresses: ::ffff:127.0.0.1, or the hex form ::ffff:7f00:1
    // that URL parsing produces.
    const dotted = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (dotted) return isPrivateIpv4(dotted[1]);
    const hex = lower.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
    if (hex) {
      const high = parseInt(hex[1], 16);
      const low = parseInt(hex[2], 16);
      return isPrivateIpv4(`${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`);
    }
    return false;
  }
  return true; // not an IP at all: treat as unsafe
}

// Throws BlockedTargetError unless the URL is http(s) and every address its
// host resolves to is a public one.
export async function assertPublicHttpUrl(rawUrl: string): Promise<void> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new BlockedTargetError('The request URL is not valid.');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new BlockedTargetError('Only http:// and https:// URLs can be tested.');
  }
  if (process.env.ALLOW_PRIVATE_TEST_TARGETS === 'true') return;

  const host = url.hostname.replace(/^\[|\]$/g, '');
  const addresses = isIP(host)
    ? [host]
    : (await lookup(host, { all: true }).catch(() => [])).map((entry) => entry.address);

  if (addresses.length === 0) {
    throw new BlockedTargetError(`Could not resolve the host "${host}".`);
  }
  if (addresses.some(isPrivateIp)) {
    throw new BlockedTargetError(
      'Blocked: this address points to a private or internal network. Only public URLs can be tested from TestSphere.',
    );
  }
}

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

// fetch() that checks the target before every hop, so a public URL cannot
// redirect the request into a private network.
export async function safeFetch(
  rawUrl: string,
  init: RequestInit & { headers?: Record<string, string> } = {},
  maxRedirects = 5,
): Promise<Response> {
  let url = rawUrl;
  let method = init.method ?? 'GET';
  let body = init.body;
  let headers = { ...(init.headers ?? {}) };

  for (let hop = 0; ; hop += 1) {
    await assertPublicHttpUrl(url);
    const response = await fetch(url, { ...init, method, headers, body, redirect: 'manual' });
    const location = response.headers.get('location');
    if (!REDIRECT_STATUSES.has(response.status) || !location) return response;
    if (hop >= maxRedirects) throw new BlockedTargetError('Too many redirects.');

    const next = new URL(location, url);
    if (next.origin !== new URL(url).origin) {
      // Never forward credentials to a different site.
      headers = Object.fromEntries(
        Object.entries(headers).filter(([name]) => !['authorization', 'cookie'].includes(name.toLowerCase())),
      );
    }
    if (response.status === 303 || ((response.status === 301 || response.status === 302) && method === 'POST')) {
      method = 'GET';
      body = undefined;
    }
    url = next.toString();
  }
}
