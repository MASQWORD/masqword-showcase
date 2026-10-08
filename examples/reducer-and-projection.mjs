// EXAMPLE (simplified illustration, MIT). Run: node examples/reducer-and-projection.mjs
//
// The real reducer in our private repo is ~2,400 lines of rules; this keeps the two ideas that matter:
//
// 1. Rules are a pure reducer, apply(state, action, ctx). No Date.now() / Math.random() inside the rules:
//    time and randomness arrive through ctx, so rules are deterministic, trivially unit-testable, and the very
//    same module runs in the browser mock and inside the Cloudflare Durable Object.
// 2. The server never broadcasts state. Each socket gets projectFor(state, viewerId): a per-viewer copy in
//    which secrets are physically absent from the payload (not hidden by CSS, not trusted to the UI).
import assert from 'node:assert/strict';

export const defaultCtx = { now: () => Date.now(), rng: () => Math.random() };
export const createRoom = () => ({ phase: 'lobby', tellerId: null, secretWords: [], cards: [], players: {} });

function sample(arr, n, rng) { // deal without replacement, driven by the injected rng
  const pool = [...arr];
  const out = [];
  while (out.length < n && pool.length) out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
  return out;
}

export function apply(state, action, ctx = defaultCtx) {
  switch (action.type) {
    case 'JOIN':
      state.players[action.playerId] = { name: action.name };
      break;
    case 'START': { // deal a storyteller and three secret words
      const ids = Object.keys(state.players);
      state.tellerId = ids[Math.floor(ctx.rng() * ids.length)];
      state.secretWords = sample(action.pool, 3, ctx.rng);
      state.phase = 'narrate';
      break;
    }
    case 'THROW': // a listener puts a suspicious word on the shared table
      if (state.phase === 'narrate' && action.playerId !== state.tellerId) {
        state.cards.push({ id: `c${state.cards.length + 1}`, by: action.playerId, text: action.text });
      }
      break;
    case 'REVEAL':
      state.phase = 'results';
      break;
  }
  return state;
}

export function projectFor(state, viewerId) {
  const isTeller = viewerId === state.tellerId;
  const revealed = state.phase === 'results';
  return {
    phase: state.phase,
    tellerId: state.tellerId,
    players: state.players,
    // Secret words exist in the payload only for the people who may read them.
    secretWords: isTeller || revealed ? state.secretWords : [],
    // "Open table": listeners read thrown cards live, the storyteller stays blind (no feedback loop).
    cards: state.cards.map((c) => (isTeller && !revealed ? { id: c.id, by: c.by } : { ...c })),
  };
}

if (process.argv[1]?.endsWith('reducer-and-projection.mjs')) {
  const ctx = { now: () => 0, rng: () => 0.25 }; // deterministic: same input, same game
  const room = createRoom();
  for (const [playerId, name] of [['p1', 'Maya'], ['p2', 'Leo'], ['p3', 'Nora']]) apply(room, { type: 'JOIN', playerId, name }, ctx);
  apply(room, { type: 'START', pool: ['elevator', 'glove', 'lemon', 'compass'] }, ctx);
  const listener = Object.keys(room.players).find((id) => id !== room.tellerId);
  apply(room, { type: 'THROW', playerId: listener, text: 'compass' }, ctx); // a wrong guess

  const teller = projectFor(room, room.tellerId);
  const other = projectFor(room, listener);
  assert.equal(teller.secretWords.length, 3);          // the storyteller knows the words...
  assert.equal(teller.cards[0].text, undefined);       // ...but cannot see what listeners suspect
  assert.deepEqual(other.secretWords, []);             // listeners never receive the words
  assert.equal(other.cards[0].text, 'compass');
  for (const word of room.secretWords) assert.ok(!JSON.stringify(other).includes(word));
  console.log('teller view  :', JSON.stringify(teller));
  console.log('listener view:', JSON.stringify(other));
  console.log('ok: secrets are absent from the listener payload');
}
