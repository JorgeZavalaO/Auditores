import { isIP } from 'node:net';

const reservedSuffixes = ['localhost', 'local', 'test', 'invalid', 'example', 'internal'];
const exampleDomains = ['example.com', 'example.net', 'example.org'];

/** Keep public previews non-indexable until a deliberate launch decision. */
export function resolveSite(env = process.env) {
  const raw = (env.SITE_URL ?? '').trim();
  const launchReady = env.PUBLIC_LAUNCH_READY === 'true';
  let origin;

  if (raw) {
    let parsed;
    try {
      parsed = new URL(raw);
    } catch {
      throw new Error('SITE_URL must be a valid absolute HTTP(S) origin.');
    }
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username ||
      parsed.password || parsed.search || parsed.hash || parsed.pathname !== '/') {
      throw new Error('SITE_URL must be an HTTP(S) origin without credentials, path, query or fragment.');
    }
    const hostname = parsed.hostname;
    const unbracketedHost = hostname.replace(/^\[|\]$/g, '');
    if (hostname.endsWith('.')) {
      throw new Error('SITE_URL must use a public domain without a trailing dot.');
    }
    const labels = hostname.split('.');
    const validDnsName = hostname.length <= 253 && labels.length >= 2 &&
      labels.every((label) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label));
    const reserved = reservedSuffixes.some((suffix) => hostname === suffix || hostname.endsWith(`.${suffix}`)) ||
      exampleDomains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
    if (isIP(unbracketedHost) || !validDnsName || reserved) {
      throw new Error('SITE_URL must use a public DNS domain, not an IP address, local, reserved or example host.');
    }
    origin = parsed.origin;
  }

  if (launchReady && !origin) {
    throw new Error('A real SITE_URL is required before PUBLIC_LAUNCH_READY=true.');
  }

  return { origin, indexable: Boolean(origin && launchReady) };
}
