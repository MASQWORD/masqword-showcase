# How we work with AI

A short, honest description of the working agreement behind MASQWORD. It is distilled from the rules file that lives in our private repository (`AGENTS.md`) and from what the git history actually shows. It is a description of a small team's practice, not a framework.

## Roles

| Role | Who | Owns |
| --- | --- | --- |
| Lead | A Claude Code session, with the founder deciding direction | Intent, architecture, integration, visual and game-feel acceptance, merges |
| Builder | A coding agent given a written packet | One well-specified slice with exact file ownership |
| Reviewer | A separate read-only agent session | Findings with severity, reproduction and the file or state involved |
| Owner | Humans | Product decisions, look and feel, anything involving money, publishing or deployment |

The Lead validates every finding and reviews every diff before it is merged. Builders and reviewers never decide what ships.

## Packets, not chat history

A builder gets a packet, not the whole conversation: exact paths and file ownership, the relevant rules, the behaviour wanted, the checks to run, and the line "decide, do not ask; list assumptions". The builder writes a report file; the Lead reads the diff. One owner per file, parallel builders only on independent scopes, never two agents editing the same file.

We measure our tools and move work accordingly. One builder model stalled on permission prompts for shell commands, so it now only gets Read/Edit/Write packets, and shell, test and browser work stays with the Lead.

## Bounded context

Every session starts from the same three things: the rules file, a short `HANDOFF.md` (current state, next work, evidence, blockers) and `git status`. Sessions do not re-read old transcripts or historical handoffs; superseded handoffs are archived. This keeps context small and stops history from silently authorising repeated actions such as a deployment.

## Done means fresh evidence

"Done" requires output from a check run in the same session, not a claim:

- unit tests (Vitest) and a production build;
- an integration run that boots the Worker locally and drives independent, authenticated clients through team, improv and shared-table flows;
- for UI changes, screenshots of the affected roles and phases at desktop and narrow sizes, read and measured, with the console checked.

Commit messages carry that evidence, for example "unit 567/567, build ok, 25-viewport sweep 0/200 issues". Mock UI, a local real-Worker run, a real Discord client, a physical phone and a human playtest are kept apart in our notes: passing one is never reported as passing another.

## Security and reliability gate

Material multiplayer or security changes get a fresh, independent review pass before they ship, by a reviewer that has not seen the author's reasoning. The reducer-and-projection design (see [`examples/`](../examples)) is what the review tries to break: does any secret reach a client that should not have it, can a forged, replayed or stale action change state, can a disconnect or kick leave the room stuck?

## Design checks with screenshots

Layout is checked on pixels, not on assumptions: Playwright captures a dev-only fixture at fixed viewports (including short landscape phone sizes, because Discord Activities run in small frames), and the screenshots are read back by the Lead. An optional image-comparison model gives an advisory second opinion on a sanitized screenshot; its probabilities never replace reading the source, looking at the pixels or human acceptance.

## What stays human

Whether a game is fun, whether a cosmetic looks good, what we charge, what we publish and when we deploy. Deployment, publishing and purchases need explicit authorisation from the owner every time; an earlier approval never carries over.
