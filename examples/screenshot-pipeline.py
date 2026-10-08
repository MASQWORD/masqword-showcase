"""EXAMPLE (copied from our repo, MIT). Not runnable here: it drives the private game client's dev server.

The store screenshots in /screenshots come out of this script, not out of manual capture. A DEV-only fixture
(?demo=table&phase=<phase>&view=<teller|listener>) seeds a full eight-seat table with fictional players, and
Playwright shoots each phase and role at a fixed size. The same pattern, at several viewport sizes, is how
Claude Code checks a UI change before we call it done: capture -> read the PNG -> measure -> fix -> capture again.
Fixture only: it is not a multiplayer, Discord or physical-phone test and never replaces human playtests.
"""
import asyncio, pathlib, sys
from playwright.async_api import async_playwright
OUT = pathlib.Path(__file__).parent / 'shots'; OUT.mkdir(exist_ok=True)
BASE = 'http://localhost:5173/'
STATES = sys.argv[1:] or ['lobby:teller', 'narrate:listener', 'narrate:teller', 'vote:listener', 'results:listener']

async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch(channel='msedge')
        for ui in ['en']:
            for st in STATES:
                phase, view = st.split(':')
                pg = await br.new_page(viewport={'width': 1280, 'height': 720}, device_scale_factor=1.5)
                errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
                await pg.goto(f'{BASE}?demo=table&phase={phase}&view={view}&ui={ui}&lang=en&looks=1'); await pg.wait_for_timeout(1500)
                await pg.screenshot(path=str(OUT / f'{ui}-{phase}-{view}.png'))
                if st == STATES[0]:
                    await pg.screenshot(path=str(OUT / 'header.png'), clip={'x': 0, 'y': 0, 'width': 420, 'height': 60})
                print(st, errs)
                await pg.close()
        pg = await br.new_page(viewport={'width': 160, 'height': 60})
        await pg.set_content(f'<body style="margin:0;background:#202124;display:flex;gap:12px;padding:12px"><img src="{BASE}favicon.svg" width="16"><img src="{BASE}favicon.svg" width="32"><img src="{BASE}favicon.svg" width="48"></body>')
        await pg.wait_for_timeout(400); await pg.screenshot(path=str(OUT / 'favicon.png'))
        await br.close()
asyncio.run(main())
