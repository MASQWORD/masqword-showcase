// EXAMPLE (abridged from the production Worker's protocol layer, MIT). Run: node examples/action-allowlist.mjs
//
// Every WebSocket frame is untrusted. Before the reducer sees anything, validateAction() rebuilds the action
// from scratch: only known types, only known fields, strict enums and numeric bounds. Unknown keys are dropped
// (or the whole action is rejected), so a client cannot smuggle extra payload into the rules.
// Round-scoped actions must also carry the context they were issued in (phase, round, speaker); flowMatches()
// drops anything issued for an earlier turn, so a delayed message can never mutate the next story.
import assert from 'node:assert/strict';

const ACTION_ID = /^[A-Za-z0-9:_-]{8,96}$/;
const PHASES = new Set(['lobby', 'prepare', 'narrate', 'vote', 'results']);
const REACTION_KINDS = new Set(['laugh', 'bang', 'heart']);
const LOOK_FRAMES = new Set(['glow', 'sparkle', 'circle']); // abridged: real list is longer
const ROUND_SCOPED = new Set(['SEND_REACTION', 'SET_SETTING']);
const ok = (value) => ({ ok: true, value });
const bad = (code = 'invalid_action') => ({ ok: false, code });
const oneOf = (v, set) => typeof v === 'string' && set.has(v);
const integer = (v, min, max) => Number.isInteger(v) && v >= min && v <= max;

function envelope(a) { // shared header: idempotency id + the round context the client believes it is in
  if (a === null || typeof a !== 'object' || typeof a.type !== 'string' || !ACTION_ID.test(a.actionId || '')) return null;
  const out = { type: a.type, actionId: a.actionId };
  if (ROUND_SCOPED.has(a.type)) {
    if (!oneOf(a.expectedPhase, PHASES) || !integer(a.expectedRoundIndex, 1, 10_000)) return null;
    Object.assign(out, { expectedPhase: a.expectedPhase, expectedRoundIndex: a.expectedRoundIndex });
  }
  return out;
}

export function validateAction(input) {
  const out = envelope(input);
  if (!out) return bad();
  switch (out.type) {
    case 'SEND_REACTION': { // a closed enum; any extra field rejects the whole action
      const allowed = new Set([...Object.keys(out), 'kind']);
      if (!oneOf(input.kind, REACTION_KINDS) || Object.keys(input).some((k) => !allowed.has(k))) return bad();
      return ok({ ...out, kind: input.kind });
    }
    case 'SET_LOOK': { // cosmetics are ids from an allowlist: never text, URLs or CSS; null takes the item off
      if (input.frame !== null && !oneOf(input.frame, LOOK_FRAMES)) return bad();
      return ok({ ...out, frame: input.frame });
    }
    case 'SET_SETTING': { // numeric settings carry explicit bounds
      if (input.key !== 'maxRounds' || !integer(input.value, 1, 30)) return bad();
      return ok({ ...out, key: input.key, value: input.value });
    }
    default:
      return bad('unknown_action');
  }
}

export function flowMatches(state, action) { // stale-flow check: was this issued for the turn we are in now?
  if (!ROUND_SCOPED.has(action.type)) return true;
  return action.expectedPhase === state.phase && action.expectedRoundIndex === state.round.index;
}

if (process.argv[1]?.endsWith('action-allowlist.mjs')) {
  const base = { actionId: 'act_00000001', expectedPhase: 'narrate', expectedRoundIndex: 3 };
  assert.equal(validateAction({ ...base, type: 'SEND_REACTION', kind: 'laugh' }).ok, true);
  assert.equal(validateAction({ ...base, type: 'SEND_REACTION', kind: 'laugh', word: 'glove' }).ok, false); // extra field
  assert.equal(validateAction({ ...base, type: 'SEND_REACTION', kind: '<img src=x>' }).ok, false);          // not in the enum
  assert.equal(validateAction({ actionId: 'act_00000002', type: 'SET_LOOK', frame: 'url(//evil)' }).ok, false);
  assert.equal(validateAction({ ...base, type: 'SET_SETTING', key: 'maxRounds', value: 999 }).ok, false);   // out of bounds
  assert.equal(validateAction({ ...base, type: 'DROP_TABLE' }).code, 'unknown_action');
  const state = { phase: 'vote', round: { index: 3 } };
  assert.equal(flowMatches(state, validateAction({ ...base, type: 'SEND_REACTION', kind: 'heart' }).value), false); // issued in narrate
  console.log('ok: allowlist rejects malformed, extra-field and stale actions');
}
