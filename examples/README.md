# Examples

Short excerpts that show how MASQWORD is built. Each file starts with a header comment saying what it is and whether it is copied from production or simplified for illustration. Code in this folder is MIT-licensed (see [LICENSE](../LICENSE)).

| File | Idea | Origin |
| --- | --- | --- |
| [`reducer-and-projection.mjs`](reducer-and-projection.mjs) | Pure rules reducer `apply(state, action, ctx)` and a per-viewer projection `projectFor(state, viewerId)`: secrets are absent from other players' payloads | Simplified from our ~2,400-line reducer |
| [`action-allowlist.mjs`](action-allowlist.mjs) | Every WebSocket frame is rebuilt from an allowlist (types, fields, enums, bounds) plus a stale-turn check | Abridged from the Worker's protocol layer |
| [`host-split-routing.mjs`](host-split-routing.mjs) | One Worker serves the studio site and the game from different hostnames; off until configured | Copied from the Worker, plus a self-check |
| [`studio-site-generator.py`](studio-site-generator.py) | Studio website generated from a config: static HTML, JSON-LD, `robots.txt` that allows Claude's crawlers, `sitemap.xml`, `llms.txt` | Condensed from our generator |
| [`screenshot-pipeline.py`](screenshot-pipeline.py) | Store screenshots are produced by Playwright against a dev-only fixture, not captured by hand | Copied (not runnable without the private client) |

Run the self-checking ones with Node 22 and Python 3.12:

```bash
node examples/reducer-and-projection.mjs
node examples/action-allowlist.mjs
node examples/host-split-routing.mjs
python examples/studio-site-generator.py
```
