"""EXAMPLE (condensed from our studio-site generator, MIT). Run: python examples/studio-site-generator.py

masqword.com is generated, not hand-edited: one script turns a CONFIG dict into static, indexable HTML
(no JavaScript needed to read it), plus the machine-readable files crawlers and AI assistants look for:
JSON-LD (Organization / VideoGame), robots.txt (Claude's crawlers explicitly allowed), sitemap.xml, llms.txt.
Rule baked into the generator: anything the owner has not confirmed stays an empty CONFIG value, and empty
values are left out of the output, never invented. The production script also renders 6 pages, CSS and OG images.
"""
import json, html
from datetime import date

CONFIG = {
    'domain': 'https://masqword.com',
    'founder': 'Rostyslav Ostapenko',
    'founded': '2026',
    'same_as': [],  # real profile URLs only (GitHub org, LinkedIn, X); empty until they exist
    'games': [('MASQWORD', 'Playable on Discord'), ('Bunker (working title)', 'In development')],
}
BLURB = 'MASQWORD is an independent game studio building social multiplayer games for Discord and the web.'
e = html.escape

def org_ld():
    ld = {'@context': 'https://schema.org', '@type': 'Organization', '@id': CONFIG['domain'] + '/#organization',
          'name': 'MASQWORD', 'url': CONFIG['domain'] + '/', 'description': BLURB, 'foundingDate': CONFIG['founded']}
    if CONFIG['founder']: ld['founder'] = {'@type': 'Person', 'name': CONFIG['founder']}   # omitted when unset
    if CONFIG['same_as']: ld['sameAs'] = CONFIG['same_as']                                  # omitted when empty
    return ld

def game_ld():
    return {'@context': 'https://schema.org', '@type': 'VideoGame', 'name': 'MASQWORD', 'gamePlatform': 'Discord',
            'playMode': 'https://schema.org/MultiPlayer', 'inLanguage': ['en', 'es', 'ru'],
            'numberOfPlayers': {'@type': 'QuantitativeValue', 'minValue': 2, 'maxValue': 8},
            'publisher': {'@id': CONFIG['domain'] + '/#organization'}}

def page(path, title, body, ld=()):
    canon = CONFIG['domain'] + path
    scripts = ''.join(f'<script type="application/ld+json">{json.dumps(x, ensure_ascii=False)}</script>' for x in ld)
    return (f'<!doctype html><html lang="en"><head><meta charset="utf-8"><title>{e(title)}</title>'
            f'<meta name="description" content="{e(BLURB)}"><link rel="canonical" href="{canon}">'
            f'<meta property="og:title" content="{e(title)}">{scripts}</head><body><main>{body}</main></body></html>')

def robots():  # AI assistants and search crawlers are welcome; the game host is kept out of the index elsewhere
    agents = ['*', 'ClaudeBot', 'Claude-User', 'Claude-SearchBot']
    return ''.join(f'User-agent: {a}\nAllow: /\n\n' for a in agents) + f'Sitemap: {CONFIG["domain"]}/sitemap.xml\n'

def sitemap(paths):
    rows = ''.join(f'  <url><loc>{CONFIG["domain"]}{p}</loc><lastmod>{date.today().isoformat()}</lastmod></url>\n' for p in paths)
    return f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{rows}</urlset>\n'

def llms_txt():  # plain-language summary for LLM-based tools
    founder = f'- Founder: {CONFIG["founder"]}\n' if CONFIG['founder'] else ''
    games = ''.join(f'- {name} ({status})\n' for name, status in CONFIG['games'])
    return f'# MASQWORD\n\n> {BLURB}\n\n## Studio\n- Website: {CONFIG["domain"]}\n- Founded: {CONFIG["founded"]}\n{founder}\n## Games\n{games}'

if __name__ == '__main__':
    home = page('/', 'MASQWORD - Social Multiplayer Game Studio', f'<h1>MASQWORD</h1><p>{e(BLURB)}</p>', [org_ld(), game_ld()])
    print(home[:200] + '...\n'); print(robots()); print(sitemap(['/', '/games', '/about'])); print(llms_txt())
    assert 'sameAs' not in org_ld(), 'unset values must be omitted, not invented'
