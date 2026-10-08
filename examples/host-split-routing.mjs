// EXAMPLE (copied from the production Worker, MIT). Run the self-check: node examples/host-split-routing.mjs
//
// One Cloudflare Worker serves two products from two hostnames:
//   masqword.com       the studio website: static, indexable pages; the game and API routes answer 404 here
//   play.masqword.com  the game itself: noindex, robots Disallow
// siteRoute() is a pure function of (URL, env) -> {asset | redirect | text | noindex | status} or null.
// It returns null until SITE_HOSTS / PLAY_HOSTS are configured, so shipping the code changes nothing until
// the domain is switched on. Unit-tested without a server; the Worker entry only interprets the result.
// Pages are static HTML in public/site (docs/brand/render/site.py); asset paths avoid ".html" because Workers
// assets redirect those to the extensionless URL.
const PAGES = { '/': '/site/', '/games': '/site/games', '/about': '/site/about', '/contact': '/site/contact', '/press': '/site/press' };
const FILES = { '/robots.txt': '/site/robots.txt', '/sitemap.xml': '/site/sitemap.xml', '/llms.txt': '/site/llms.txt', '/privacy': '/privacy', '/terms': '/terms' };
const PASS = /^\/(?:site|assets|fonts)\/[\w./-]+$|^\/favicon\.svg$/;
const hosts = (value) => String(value || '').split(',').map((h) => h.trim().toLowerCase()).filter(Boolean);

export function siteRoute(url, env = {}) {
  const host = url.hostname.toLowerCase();
  const sites = hosts(env.SITE_HOSTS);
  if (sites.some((h) => host === `www.${h}`)) return { redirect: `https://${host.slice(4)}${url.pathname}${url.search}` };
  if (sites.includes(host)) {
    if (url.protocol === 'http:') return { redirect: `https://${host}${url.pathname}${url.search}` };
    const path = url.pathname.replace(/\/+$/, '') || '/';
    if (Object.hasOwn(PAGES, path)) return { asset: PAGES[path] };
    if (Object.hasOwn(FILES, path)) return { asset: FILES[path] };
    if (PASS.test(url.pathname) && !url.pathname.includes('..')) return { asset: url.pathname };
    return { asset: '/site/404', status: 404 };
  }
  if (hosts(env.PLAY_HOSTS).includes(host)) {
    if (url.pathname === '/robots.txt') return { text: 'User-agent: *\nDisallow: /\n' };
    return { noindex: true };
  }
  return null;
}

import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const env = { SITE_HOSTS: 'masqword.com', PLAY_HOSTS: 'play.masqword.com' };
  const r = (u, e = env) => siteRoute(new URL(u), e);
  assert.equal(r('https://masqword.com/', {}), null);                                       // off until configured
  assert.deepEqual(r('https://masqword.com/about/'), { asset: '/site/about' });
  assert.deepEqual(r('https://masqword.com/api/health'), { asset: '/site/404', status: 404 }); // game API never on the site host
  assert.deepEqual(r('https://www.masqword.com/games?x=1'), { redirect: 'https://masqword.com/games?x=1' });
  assert.deepEqual(r('http://masqword.com/about'), { redirect: 'https://masqword.com/about' });
  assert.deepEqual(r('https://play.masqword.com/'), { noindex: true });
  console.log('ok: host-split routing behaves as documented');
}
