# Odds Calculator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a real-time Monte Carlo equity calculator overlay to PokernowHUD that shows Win %, Outs, and Pot Odds above the user's hole cards.

**Architecture:** Pure-logic classes (HandEvaluator, MonteCarloEngine, OutsCounter, LiveHandTracker) live in a new `odds.js` file with no Chrome API dependencies, making them unit-testable with Jest. OddsPanel and wiring live in `content.js`. Settings toggle added to popup.

**Tech Stack:** Vanilla JS (ES5-compatible), Jest 29 for unit tests, Chrome Extension Manifest V3.

---

## File Map

| File | Role |
|------|------|
| `odds.js` (new) | HandEvaluator, MonteCarloEngine, OutsCounter, LiveHandTracker |
| `tests/odds.test.js` (new) | Jest unit tests for all 4 classes |
| `package.json` (new) | Jest dev dependency + test script |
| `content.js` (modify) | Add OddsPanel class; wire into HUDloop + processLog; add showOdds check to Settings |
| `manifest.json` (modify) | Add `odds.js` to content_scripts before `content.js` |
| `serviceWorker.js` (modify) | Add `showOdds: true` to initial settings object |
| `popup.html` (modify) | Add "Show Odds" checkbox to Panel tab |
| `popup.js` (modify) | Save/restore/send `showOdds` setting |

---

### Task 1: Test infrastructure

**Files:**
- Create: `package.json`
- Create: `tests/odds.test.js` (placeholder)
- Create: `odds.js` (placeholder)

- [ ] **Step 1: Create package.json**

```json
{
  "name": "pokernow-hud",
  "version": "1.0.0",
  "scripts": {
    "test": "jest"
  },
  "devDependencies": {
    "jest": "^29.7.0"
  }
}
```

- [ ] **Step 2: Create placeholder odds.js**

```javascript
// odds.js — poker equity logic (no Chrome APIs)

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {};
}
```

- [ ] **Step 3: Create placeholder test file**

```javascript
// tests/odds.test.js
test('placeholder', () => { expect(1).toBe(1); });
```

- [ ] **Step 4: Install Jest and verify**

```bash
npm install
npm test
```

Expected output: `1 passed`

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json odds.js tests/odds.test.js
git commit -m "chore: add Jest test infrastructure for odds calculator"
```

---

### Task 2: HandEvaluator

**Files:**
- Modify: `odds.js`
- Modify: `tests/odds.test.js`

- [ ] **Step 1: Write failing tests**

Replace `tests/odds.test.js` with:

```javascript
const { HandEvaluator } = require('../odds');

const ev = new HandEvaluator();

function card(r, s) { return { r, s }; }
// ranks: 0=2 1=3 2=4 3=5 4=6 5=7 6=8 7=9 8=T 9=J 10=Q 11=K 12=A
// suits: 0=h 1=d 2=s 3=c

describe('HandEvaluator', () => {
    test('high card: A-high beats K-high', () => {
        const a = ev.evaluate([card(12,0), card(11,1), card(10,2), card(9,3), card(7,0)]);
        const b = ev.evaluate([card(11,0), card(10,1), card(9,2), card(8,3), card(7,1)]);
        expect(a).toBeGreaterThan(b);
    });

    test('one pair beats high card', () => {
        const pair = ev.evaluate([card(12,0), card(12,1), card(11,2), card(10,3), card(9,0)]);
        const high = ev.evaluate([card(12,0), card(11,1), card(10,2), card(9,3), card(7,0)]);
        expect(pair).toBeGreaterThan(high);
    });

    test('aces pair beats kings pair', () => {
        const aces = ev.evaluate([card(12,0), card(12,1), card(11,2), card(10,3), card(9,0)]);
        const kings = ev.evaluate([card(11,0), card(11,1), card(12,2), card(10,3), card(9,1)]);
        expect(aces).toBeGreaterThan(kings);
    });

    test('two pair beats one pair', () => {
        const twoPair = ev.evaluate([card(12,0), card(12,1), card(11,2), card(11,3), card(10,0)]);
        const onePair = ev.evaluate([card(12,0), card(12,1), card(11,2), card(10,3), card(9,0)]);
        expect(twoPair).toBeGreaterThan(onePair);
    });

    test('trips beats two pair', () => {
        const trips = ev.evaluate([card(12,0), card(12,1), card(12,2), card(11,3), card(10,0)]);
        const twoPair = ev.evaluate([card(12,0), card(12,1), card(11,2), card(11,3), card(10,0)]);
        expect(trips).toBeGreaterThan(twoPair);
    });

    test('straight beats trips', () => {
        const straight = ev.evaluate([card(8,0), card(7,1), card(6,2), card(5,3), card(4,0)]);
        const trips = ev.evaluate([card(12,0), card(12,1), card(12,2), card(11,3), card(10,0)]);
        expect(straight).toBeGreaterThan(trips);
    });

    test('flush beats straight', () => {
        const flush = ev.evaluate([card(12,0), card(10,0), card(8,0), card(6,0), card(4,0)]);
        const straight = ev.evaluate([card(8,0), card(7,1), card(6,2), card(5,3), card(4,0)]);
        expect(flush).toBeGreaterThan(straight);
    });

    test('full house beats flush', () => {
        const boat = ev.evaluate([card(12,0), card(12,1), card(12,2), card(11,3), card(11,0)]);
        const flush = ev.evaluate([card(12,0), card(10,0), card(8,0), card(6,0), card(4,0)]);
        expect(boat).toBeGreaterThan(flush);
    });

    test('quads beats full house', () => {
        const quads = ev.evaluate([card(12,0), card(12,1), card(12,2), card(12,3), card(11,0)]);
        const boat = ev.evaluate([card(12,0), card(12,1), card(12,2), card(11,3), card(11,0)]);
        expect(quads).toBeGreaterThan(boat);
    });

    test('straight flush beats quads', () => {
        const sf = ev.evaluate([card(8,0), card(7,0), card(6,0), card(5,0), card(4,0)]);
        const quads = ev.evaluate([card(12,0), card(12,1), card(12,2), card(12,3), card(11,0)]);
        expect(sf).toBeGreaterThan(quads);
    });

    test('wheel (A-2-3-4-5) is a straight', () => {
        const wheel = ev.evaluate([card(12,0), card(0,1), card(1,2), card(2,3), card(3,0)]);
        const trips = ev.evaluate([card(12,0), card(12,1), card(12,2), card(11,3), card(10,0)]);
        expect(wheel).toBeGreaterThan(trips);
    });

    test('higher straight beats lower straight', () => {
        const high = ev.evaluate([card(12,0), card(11,1), card(10,2), card(9,3), card(8,0)]);
        const low  = ev.evaluate([card(8,0),  card(7,1),  card(6,2),  card(5,3),  card(4,0)]);
        expect(high).toBeGreaterThan(low);
    });

    test('7-card evaluation picks best 5', () => {
        // Hold: A♥ A♦  Board: A♠ A♣ K♥ Q♦ J♠  → four aces
        const score = ev.evaluate([
            card(12,0), card(12,1),
            card(12,2), card(12,3), card(11,0), card(10,1), card(9,2)
        ]);
        const quadsBaseline = ev.evaluate([card(12,0),card(12,1),card(12,2),card(12,3),card(11,0)]);
        expect(score).toBe(quadsBaseline);
    });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npm test
```

Expected: `ReferenceError: HandEvaluator is not defined` or similar.

- [ ] **Step 3: Implement HandEvaluator in odds.js**

Replace `odds.js` with:

```javascript
// odds.js — poker equity logic (no Chrome APIs)

class HandEvaluator {
    evaluate(cards) {
        if (cards.length > 5) {
            var best = 0;
            var c = cards;
            for (var a = 0; a < c.length - 4; a++)
            for (var b = a+1; b < c.length - 3; b++)
            for (var d = b+1; d < c.length - 2; d++)
            for (var e = d+1; e < c.length - 1; e++)
            for (var f = e+1; f < c.length; f++)
                best = Math.max(best, this._eval5([c[a],c[b],c[d],c[e],c[f]]));
            return best;
        }
        return this._eval5(cards);
    }

    _eval5(cards) {
        var ranks = cards.map(function(c) { return c.r; }).sort(function(a,b){ return b-a; });
        var suits = cards.map(function(c) { return c.s; });
        var isFlush = suits.every(function(s){ return s === suits[0]; });
        var isStraight = this._checkStraight(ranks);
        var counts = this._rankCounts(ranks);
        var sortedCounts = Object.entries(counts).sort(function(a,b){
            return (b[1] - a[1]) || (parseInt(b[0]) - parseInt(a[0]));
        });
        var topCount = sortedCounts[0][1];
        var secondCount = sortedCounts.length > 1 ? sortedCounts[1][1] : 0;

        if (isFlush && isStraight) return 8e8 + this._straightHigh(ranks);
        if (topCount === 4)                return 7e8 + this._quadsScore(sortedCounts);
        if (topCount === 3 && secondCount === 2) return 6e8 + this._boatScore(sortedCounts);
        if (isFlush)                       return 5e8 + this._highScore(ranks);
        if (isStraight)                    return 4e8 + this._straightHigh(ranks);
        if (topCount === 3)                return 3e8 + this._tripsScore(sortedCounts);
        if (topCount === 2 && secondCount === 2) return 2e8 + this._twoPairScore(sortedCounts);
        if (topCount === 2)                return 1e8 + this._pairScore(sortedCounts);
        return this._highScore(ranks);
    }

    _checkStraight(sortedRanks) {
        if (new Set(sortedRanks).size !== 5) return false;
        if (sortedRanks[0] - sortedRanks[4] === 4) return true;
        // Wheel: A-2-3-4-5 → sorted [12,3,2,1,0]
        return sortedRanks[0] === 12 && sortedRanks[1] === 3 &&
               sortedRanks[2] === 2  && sortedRanks[3] === 1 && sortedRanks[4] === 0;
    }

    _straightHigh(sortedRanks) {
        if (sortedRanks[0] === 12 && sortedRanks[4] === 0) return 3; // wheel: high = 5 (rank 3)
        return sortedRanks[0];
    }

    _rankCounts(ranks) {
        var counts = {};
        for (var i = 0; i < ranks.length; i++) {
            counts[ranks[i]] = (counts[ranks[i]] || 0) + 1;
        }
        return counts;
    }

    _highScore(sortedRanks) {
        return sortedRanks.reduce(function(acc, r, i) {
            return acc + r * Math.pow(13, 4 - i);
        }, 0);
    }

    _quadsScore(sc) {
        return parseInt(sc[0][0]) * 13 + parseInt(sc[1][0]);
    }

    _boatScore(sc) {
        return parseInt(sc[0][0]) * 13 + parseInt(sc[1][0]);
    }

    _tripsScore(sc) {
        var trip = parseInt(sc[0][0]);
        var kickers = sc.slice(1).map(function(e){ return parseInt(e[0]); }).sort(function(a,b){ return b-a; });
        return trip * 169 + kickers[0] * 13 + kickers[1];
    }

    _twoPairScore(sc) {
        var pairs = sc.filter(function(e){ return e[1] === 2; })
                      .map(function(e){ return parseInt(e[0]); })
                      .sort(function(a,b){ return b-a; });
        var kicker = parseInt(sc.find(function(e){ return e[1] === 1; })[0]);
        return pairs[0] * 169 + pairs[1] * 13 + kicker;
    }

    _pairScore(sc) {
        var pair = parseInt(sc[0][0]);
        var kickers = sc.slice(1).map(function(e){ return parseInt(e[0]); }).sort(function(a,b){ return b-a; });
        return pair * 2197 + kickers[0] * 169 + kickers[1] * 13 + kickers[2];
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { HandEvaluator };
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npm test
```

Expected: `13 passed` (all HandEvaluator tests).

- [ ] **Step 5: Commit**

```bash
git add odds.js tests/odds.test.js
git commit -m "feat: add HandEvaluator with full 7-card hand ranking"
```

---

### Task 3: MonteCarloEngine

**Files:**
- Modify: `odds.js`
- Modify: `tests/odds.test.js`

- [ ] **Step 1: Add MonteCarloEngine tests**

First, update line 1 of `tests/odds.test.js` (the require) to:

```javascript
const { HandEvaluator, MonteCarloEngine } = require('../odds');
```

Then append to `tests/odds.test.js` (no new require line — just the describe block):

```javascript
describe('MonteCarloEngine', () => {
    const engine = new MonteCarloEngine(new HandEvaluator());

    test('AA preflop wins ~85% vs random hand', () => {
        const holeCards = [card(12, 0), card(12, 1)];
        const result = engine.run(holeCards, [], 2000);
        expect(result).toBeGreaterThan(0.78);
        expect(result).toBeLessThan(0.92);
    });

    test('72o preflop wins ~34% vs random hand', () => {
        const holeCards = [card(5, 0), card(0, 1)]; // 7h 2d
        const result = engine.run(holeCards, [], 2000);
        expect(result).toBeGreaterThan(0.26);
        expect(result).toBeLessThan(0.42);
    });

    test('made flush on river wins >95%', () => {
        // A♥ K♥ on board Q♥ J♥ 2♥ 8♣ 3♦ → nut flush
        const holeCards = [card(12,0), card(11,0)];
        const board = [card(10,0), card(9,0), card(0,0), card(6,3), card(1,1)];
        const result = engine.run(holeCards, board, 500);
        expect(result).toBeGreaterThan(0.90);
    });

    test('result is between 0 and 1', () => {
        const result = engine.run([card(0,0), card(1,1)], [], 100);
        expect(result).toBeGreaterThanOrEqual(0);
        expect(result).toBeLessThanOrEqual(1);
    });
});
```

- [ ] **Step 2: Run tests — verify new tests fail**

```bash
npm test
```

Expected: MonteCarloEngine tests fail with "MonteCarloEngine is not defined".

- [ ] **Step 3: Add MonteCarloEngine to odds.js**

Add after the HandEvaluator class (before the `module.exports` line):

```javascript
class MonteCarloEngine {
    constructor(evaluator) {
        this.evaluator = evaluator;
    }

    run(holeCards, board, sims) {
        sims = sims || 1000;
        var known = holeCards.concat(board);
        var deck = this._buildDeck(known);
        var boardNeeded = 5 - board.length;
        var wins = 0, ties = 0;

        for (var i = 0; i < sims; i++) {
            this._shuffle(deck);
            var oppHole = [deck[0], deck[1]];
            var runBoard = board.concat(deck.slice(2, 2 + boardNeeded));
            var heroScore = this.evaluator.evaluate(holeCards.concat(runBoard));
            var oppScore  = this.evaluator.evaluate(oppHole.concat(runBoard));
            if (heroScore > oppScore) wins++;
            else if (heroScore === oppScore) ties += 0.5;
        }

        return (wins + ties) / sims;
    }

    _buildDeck(exclude) {
        var deck = [];
        for (var r = 0; r < 13; r++) {
            for (var s = 0; s < 4; s++) {
                var excluded = false;
                for (var i = 0; i < exclude.length; i++) {
                    if (exclude[i].r === r && exclude[i].s === s) { excluded = true; break; }
                }
                if (!excluded) deck.push({ r: r, s: s });
            }
        }
        return deck;
    }

    _shuffle(arr) {
        for (var i = arr.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
        }
    }
}
```

Also update `module.exports`:

```javascript
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { HandEvaluator, MonteCarloEngine };
}
```

- [ ] **Step 4: Run tests — verify all pass**

```bash
npm test
```

Expected: All tests pass (HandEvaluator + MonteCarloEngine).

- [ ] **Step 5: Commit**

```bash
git add odds.js tests/odds.test.js
git commit -m "feat: add MonteCarloEngine for win equity calculation"
```

---

### Task 4: OutsCounter

**Files:**
- Modify: `odds.js`
- Modify: `tests/odds.test.js`

- [ ] **Step 1: Add OutsCounter tests**

First, update line 1 of `tests/odds.test.js` to:

```javascript
const { HandEvaluator, MonteCarloEngine, OutsCounter } = require('../odds');
```

Then append to `tests/odds.test.js` (no new require line):

```javascript
describe('OutsCounter', () => {
    const counter = new OutsCounter(new HandEvaluator());

    test('returns null preflop (no board)', () => {
        const result = counter.count([card(12,0), card(11,0)], []);
        expect(result).toBeNull();
    });

    test('flush draw on flop has 9 outs', () => {
        // A♥ K♥ on board 2♥ 7♥ Q♠ → 9 remaining hearts
        const holeCards = [card(12,0), card(11,0)];
        const board = [card(0,0), card(5,0), card(10,2)];
        const result = counter.count(holeCards, board);
        expect(result).toBe(9);
    });

    test('open-ended straight draw has 8 outs', () => {
        // 6♠ 7♣ on board 8♥ 9♦ 2♠ → need 5 or T (4+4=8 outs)
        const holeCards = [card(4,2), card(5,3)];
        const board = [card(6,0), card(7,1), card(0,2)];
        const result = counter.count(holeCards, board);
        expect(result).toBe(8);
    });

    test('made hand with no outs returns 0 (already best possible or close)', () => {
        // Royal flush — nothing improves it
        const holeCards = [card(12,0), card(11,0)];
        const board = [card(10,0), card(9,0), card(8,0)];
        const result = counter.count(holeCards, board);
        expect(result).toBe(0);
    });

    test('counts outs on turn (4 board cards)', () => {
        // Flush draw with one card to come
        const holeCards = [card(12,0), card(11,0)];
        const board = [card(0,0), card(5,0), card(10,2), card(3,3)];
        const result = counter.count(holeCards, board);
        expect(result).toBe(9);
    });
});
```

- [ ] **Step 2: Run tests — verify new tests fail**

```bash
npm test
```

Expected: OutsCounter tests fail.

- [ ] **Step 3: Add OutsCounter to odds.js**

Add after MonteCarloEngine class (before `module.exports`):

```javascript
class OutsCounter {
    constructor(evaluator) {
        this.evaluator = evaluator;
    }

    count(holeCards, board) {
        if (!board || board.length === 0) return null;

        var known = holeCards.concat(board);
        var deck = [];
        for (var r = 0; r < 13; r++) {
            for (var s = 0; s < 4; s++) {
                var excluded = false;
                for (var i = 0; i < known.length; i++) {
                    if (known[i].r === r && known[i].s === s) { excluded = true; break; }
                }
                if (!excluded) deck.push({ r: r, s: s });
            }
        }

        var currentBest = this.evaluator.evaluate(holeCards.concat(board));
        var outs = 0;

        for (var j = 0; j < deck.length; j++) {
            var newScore = this.evaluator.evaluate(holeCards.concat(board).concat([deck[j]]));
            if (newScore > currentBest) outs++;
        }

        return outs;
    }
}
```

Update `module.exports`:

```javascript
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { HandEvaluator, MonteCarloEngine, OutsCounter };
}
```

- [ ] **Step 4: Run tests — verify all pass**

```bash
npm test
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add odds.js tests/odds.test.js
git commit -m "feat: add OutsCounter for exact out enumeration"
```

---

### Task 5: LiveHandTracker

**Files:**
- Modify: `odds.js`
- Modify: `tests/odds.test.js`

- [ ] **Step 1: Add LiveHandTracker tests**

First, update line 1 of `tests/odds.test.js` to:

```javascript
const { HandEvaluator, MonteCarloEngine, OutsCounter, LiveHandTracker } = require('../odds');
```

Then append to `tests/odds.test.js` (no new require line):

```javascript
describe('LiveHandTracker', () => {
    function makeLog(msgs) {
        // pokernow returns newest-first; reverse array so index 0 = newest
        var entries = msgs.slice().reverse().map(function(m, i) {
            return { msg: m, created_at: i };
        });
        return { logs: entries };
    }

    test('_parseCard parses ace of hearts (A♥)', () => {
        var t = new LiveHandTracker();
        expect(t._parseCard('A♥')).toEqual({ r: 12, s: 0 });
    });

    test('_parseCard parses 2 of clubs (2♣)', () => {
        var t = new LiveHandTracker();
        expect(t._parseCard('2♣')).toEqual({ r: 0, s: 3 });
    });

    test('_parseCard parses 10 of diamonds (10♦)', () => {
        var t = new LiveHandTracker();
        expect(t._parseCard('10♦')).toEqual({ r: 8, s: 1 });
    });

    test('_parseCard parses king of spades (K♠)', () => {
        var t = new LiveHandTracker();
        expect(t._parseCard('K♠')).toEqual({ r: 11, s: 2 });
    });

    test('extracts hole cards from "Your hand is" message', () => {
        var t = new LiveHandTracker();
        var log = makeLog([
            '"Table" starting hand #1 (dealer: "Player1")',
            'Your hand is A♥, K♦'
        ]);
        t.update(log);
        expect(t.holeCards).toEqual([{ r: 12, s: 0 }, { r: 11, s: 1 }]);
    });

    test('extracts flop board cards', () => {
        var t = new LiveHandTracker();
        var log = makeLog([
            '"Table" starting hand #1 (dealer: "Player1")',
            'Your hand is A♥, K♦',
            'Flop: [Q♠, J♣, 2♥]'
        ]);
        t.update(log);
        expect(t.board).toEqual([{ r: 10, s: 2 }, { r: 9, s: 3 }, { r: 0, s: 0 }]);
    });

    test('clears state on new hand start', () => {
        var t = new LiveHandTracker();
        var log1 = makeLog([
            '"Table" starting hand #1 (dealer: "Player1")',
            'Your hand is A♥, K♦'
        ]);
        t.update(log1);
        expect(t.holeCards).not.toBeNull();

        var log2 = makeLog([
            '"Table" ending hand #1',
            '"Table" starting hand #2 (dealer: "Player2")'
        ]);
        t.update(log2);
        expect(t.holeCards).toBeNull();
        expect(t.board).toEqual([]);
    });

    test('clears state on hand end', () => {
        var t = new LiveHandTracker();
        var log1 = makeLog([
            '"Table" starting hand #1 (dealer: "Player1")',
            'Your hand is A♥, K♦'
        ]);
        t.update(log1);

        var log2 = makeLog(['"Table" ending hand #1']);
        t.update(log2);
        expect(t.holeCards).toBeNull();
    });

    test('hasHoleCards returns false with no cards', () => {
        var t = new LiveHandTracker();
        expect(t.hasHoleCards()).toBe(false);
    });

    test('hasHoleCards returns true after deal', () => {
        var t = new LiveHandTracker();
        var log = makeLog([
            '"Table" starting hand #1 (dealer: "Player1")',
            'Your hand is A♥, K♦'
        ]);
        t.update(log);
        expect(t.hasHoleCards()).toBe(true);
    });
});
```

- [ ] **Step 2: Run tests — verify new tests fail**

```bash
npm test
```

Expected: LiveHandTracker tests fail.

- [ ] **Step 3: Add LiveHandTracker to odds.js**

Add after OutsCounter (before `module.exports`):

```javascript
class LiveHandTracker {
    constructor() {
        this.holeCards = null;
        this.board = [];
        this.inHand = false;
    }

    update(jsonLog) {
        var logs = jsonLog.logs;
        // logs[0] = newest; process oldest-first (high index to 0)
        for (var i = logs.length - 1; i >= 0; i--) {
            this._processMsg(logs[i].msg);
        }
    }

    _processMsg(msg) {
        if (msg.includes('starting hand #')) {
            this.holeCards = null;
            this.board = [];
            this.inHand = true;
        }
        if (this.inHand) {
            if (msg.includes('Your hand is')) {
                var afterKeyword = msg.split('Your hand is ')[1];
                this.holeCards = this._parseCards(afterKeyword);
            }
            if (msg.includes('Flop: ') || msg.includes('Turn: ') || msg.includes('River: ')) {
                var match = msg.match(/\[([^\]]+)\]/);
                if (match) {
                    var self = this;
                    var cards = match[1].split(/,\s*/).map(function(s) {
                        return self._parseCard(s.trim());
                    }).filter(function(c) { return c !== null; });
                    this.board = cards;
                }
            }
        }
        if (msg.includes('ending hand #')) {
            this.holeCards = null;
            this.board = [];
            this.inHand = false;
        }
    }

    _parseCards(str) {
        var self = this;
        return str.split(/,\s*|\s+/).filter(function(s) { return s.trim().length > 0; })
                  .map(function(s) { return self._parseCard(s.trim()); })
                  .filter(function(c) { return c !== null; });
    }

    _parseCard(str) {
        if (!str || str.length < 2) return null;
        var suitMap = {'♥': 0, '♦': 1, '♠': 2, '♣': 3,
                       'h': 0, 'd': 1, 's': 2, 'c': 3};
        var rankMap = {'2':0,'3':1,'4':2,'5':3,'6':4,'7':5,'8':6,'9':7,
                       '10':8,'T':8,'J':9,'Q':10,'K':11,'A':12};
        // Last character is suit; everything before is rank
        var suitChar = str[str.length - 1];
        var rankStr  = str.slice(0, str.length - 1);
        var r = rankMap[rankStr];
        var s = suitMap[suitChar];
        if (r === undefined || s === undefined) return null;
        return { r: r, s: s };
    }

    hasHoleCards() {
        return this.holeCards !== null &&
               this.holeCards.length === 2 &&
               this.holeCards.every(function(c) { return c !== null; });
    }
}
```

Update `module.exports`:

```javascript
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { HandEvaluator, MonteCarloEngine, OutsCounter, LiveHandTracker };
}
```

- [ ] **Step 4: Run tests — verify all pass**

```bash
npm test
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add odds.js tests/odds.test.js
git commit -m "feat: add LiveHandTracker for real-time hand state parsing"
```

---

### Task 6: OddsPanel + content.js wiring

**Files:**
- Modify: `content.js`

- [ ] **Step 1: Add showOdds to Settings class**

In `content.js`, find the `Settings` constructor (line 29) and add `this.showingOdds = true;`:

```javascript
constructor(){
    var self = this;
    this.statsToShow = [];
    this.recordBox = true;
    this.showingHUD = true;
    this.showingOdds = true;   // ADD THIS LINE
    this.panelOffset = this.getPanelOffset();
    chrome.storage.local.get(['settings'], function(result) {
        self.statsToShow = result.settings.panelSettings;
        self.recordBox = result.settings.recordBox;
    });
}
```

- [ ] **Step 2: Add checkIfShowingOdds to Settings class**

Add this method to the `Settings` class after `checkIfShowingHUD()`:

```javascript
checkIfShowingOdds(){
    var self = this;
    chrome.storage.local.get(['settings'], function(result) {
        if(result.settings && result.settings.showOdds !== undefined){
            self.showingOdds = result.settings.showOdds;
        }
    });
    return this.showingOdds;
}
```

- [ ] **Step 3: Add OddsPanel class to content.js**

Add this class after the `HUD` class and before the `HandBuilder` class:

```javascript
class OddsPanel {

    constructor(tracker, engine, outsCounter) {
        this.tracker = tracker;
        this.engine = engine;
        this.outsCounter = outsCounter;
    }

    hide() {
        var el = document.getElementById('oddsPanel');
        if (el) el.remove();
    }

    update() {
        this.hide();

        if (!this.tracker.hasHoleCards()) return;

        var holeCards = this.tracker.holeCards;
        var board     = this.tracker.board;

        var winPct = this.engine.run(holeCards, board, 1000);
        var outs   = this.outsCounter.count(holeCards, board);

        var div = document.createElement('div');
        div.id = 'oddsPanel';
        div.style.cssText = [
            'position:absolute',
            'background:rgba(35,84,92,0.92)',
            'color:white',
            'padding:3px 8px',
            'border-radius:4px',
            'border:1px solid #4ecdc4',
            'font-size:12px',
            'z-index:99',
            'white-space:nowrap',
            'pointer-events:none'
        ].join(';');

        var winStr  = 'Win: ' + (winPct * 100).toFixed(1) + '%';
        var outStr  = ' · Outs: ' + (outs !== null ? outs : '--');
        var potStr  = ' · Pot: ' + this._potOddsStr(winPct);

        div.innerText = winStr + outStr + potStr;

        var youDiv   = document.querySelector('.you-player');
        var hudDiv   = document.getElementById('HUD');
        var tableDiv = document.querySelector('.table');
        if (!youDiv || !hudDiv || !tableDiv) return;

        var tableRect = tableDiv.getBoundingClientRect();
        var youRect   = youDiv.getBoundingClientRect();

        div.style.left = (youRect.left - tableRect.left + youRect.width / 2 - 90) + 'px';
        div.style.top  = (youRect.top  - tableRect.top  - 28) + 'px';

        hudDiv.appendChild(div);
    }

    _potOddsStr(winPct) {
        var pot     = null;
        var callAmt = null;

        try {
            var potEl = document.querySelector('.table-pot-size');
            if (potEl) pot = parseFloat(potEl.innerText.replace(/[^0-9.]/g, ''));
        } catch(e) {}

        try {
            var buttons = document.querySelectorAll('button');
            for (var i = 0; i < buttons.length; i++) {
                var txt = (buttons[i].innerText || '').trim().toLowerCase();
                if (txt.indexOf('call') === 0) {
                    var amt = txt.replace(/[^0-9.]/g, '');
                    if (amt) { callAmt = parseFloat(amt); break; }
                }
            }
        } catch(e) {}

        if (pot === null || callAmt === null || isNaN(pot) || isNaN(callAmt) || callAmt <= 0) {
            return '--';
        }

        var breakEven = callAmt / (pot + callAmt);
        return (winPct >= breakEven) ? '✓' : '✗';
    }
}
```

- [ ] **Step 4: Add global vars and hook OddsPanel into HUDloop**

At the bottom of `content.js`, find the block that initializes globals:

```javascript
var builder = new HandBuilder(aggregator, settings);
var hud = new HUD(aggregator, settings, builder);
var scraper = new LogScraper();
```

Replace with:

```javascript
var builder = new HandBuilder(aggregator, settings);
var hud = new HUD(aggregator, settings, builder);
var scraper = new LogScraper();

var _evaluator   = new HandEvaluator();
var _monte       = new MonteCarloEngine(_evaluator);
var _outsCounter = new OutsCounter(_evaluator);
var liveTracker  = new LiveHandTracker();
var oddsPanel    = new OddsPanel(liveTracker, _monte, _outsCounter);
```

- [ ] **Step 5: Hook OddsPanel update into HUDloop**

Find `HUD.HUDloop` and add the odds panel call after `getStats`:

```javascript
HUDloop(iteration){
    this.sleep(500).then(() => {
        if(this.settings.checkIfShowingHUD()){
            this.initializeHUD();
        }else{this.clearDisplay();}
        getStats(this.aggregator);
        if(settings.checkIfShowingOdds()){
            oddsPanel.update();
        } else {
            oddsPanel.hide();
        }
        this.HUDloop(iteration+1);
    })
}
```

- [ ] **Step 6: Hook LiveHandTracker into processLog**

Find `LogScraper.processLog` and add `liveTracker.update(jsonLog)` at the end, before the closing brace:

```javascript
processLog(text, self){
    if(Object.prototype.toString.call(text) === "[object String]"){
        var jsonLog = JSON.parse(text);
    }else if(Object.prototype.toString.call(x) === "[object Object]"){
        var jsonLog = text;
    }

    var searchDepth = 10;
    if(jsonLog.logs.length <= searchDepth){searchDepth = jsonLog.logs.length-1;}

    for(var i = searchDepth; i >= 0; i--){
        var message = jsonLog.logs[i].msg;
        if(message.includes("ending hand #")){
            self.lastCreatedAt = jsonLog.logs[i].created_at;
            var number = message.split("#")[1].split(" ")[0];
            if(number > self.lastHandNumber){
                self.lastHandNumber = number;
                builder.addHand(jsonLog);
            }
        }
    }

    liveTracker.update(jsonLog);  // ADD THIS LINE
}
```

- [ ] **Step 7: Commit**

```bash
git add content.js
git commit -m "feat: add OddsPanel class and wire into HUDloop and processLog"
```

---

### Task 7: Settings integration

**Files:**
- Modify: `serviceWorker.js`
- Modify: `popup.html`
- Modify: `popup.js`

- [ ] **Step 1: Add showOdds default to serviceWorker.js**

Find the `chrome.storage.local.set({"settings": ...})` call in `serviceWorker.js` (line 37) and add `"showOdds": true`:

```javascript
chrome.storage.local.set({"settings": {
    "panelSettings":[
        ["nH", "nVPIP", "nPFR", "nAF"],
        [],
        [],
        ["lCB", "l2B", "l3Ba", "l3B", "l4B", "lFC", "lF2B", "lF3B", "lF3", "lWTSD"]
    ],
    "recordBox": true,
    "showingHUD": true,
    "showOdds": true,
    "panelOffset":[0,0]
}}, function() {
    console.log("created stats dict");
});
```

- [ ] **Step 2: Add Show Odds checkbox to popup.html**

Find this line in `popup.html` (the Show HUD checkbox row):

```html
Panel: &nbsp &nbsp [
<input type="checkbox" id="showingHUDBox" class="show" checked>
<label for="showingHUDBox" class="show">Show HUD</label> ] 
[ <a href="help.html" target="_blank">Help</a> ]
```

Replace with:

```html
Panel: &nbsp &nbsp [
<input type="checkbox" id="showingHUDBox" class="show" checked>
<label for="showingHUDBox" class="show">Show HUD</label> ] [
<input type="checkbox" id="showOddsBox" checked>
<label for="showOddsBox">Show Odds</label> ]
[ <a href="help.html" target="_blank">Help</a> ]
```

- [ ] **Step 3: Wire showOddsBox in popup.js — watch for changes**

In the `Main` class constructor in `popup.js`, add `this.watchOddsCheckbox();` after `this.watchHUDCheckbox();`:

```javascript
constructor(){
    this.panelTab = new PanelTab();
    this.restoreLastState();
    this.loadComplete = false;
    var self = this;
    this.settings = {};

    this.watchRecordCheckbox();
    this.watchHUDCheckbox();
    this.watchOddsCheckbox();   // ADD THIS LINE
    this.watchSetOffsets();
    // ... rest of constructor unchanged
```

- [ ] **Step 4: Add watchOddsCheckbox method to Main class**

Add this method after `watchHUDCheckbox()` in `popup.js`:

```javascript
watchOddsCheckbox(){
    var self = this;
    var showOdds = document.getElementById("showOddsBox");
    showOdds.addEventListener('change', function() {
        self.saveState();
    });
}
```

- [ ] **Step 5: Add showOdds to packSettings in popup.js**

Find `packSettings()` in `popup.js` and add the showOdds line:

```javascript
packSettings(){
    var settings = {};
    var panelSettings = this.panelTab.extractPanelSettings();
    console.log(1);
    console.log(panelSettings);
    if(this.panelTab.isStableState(panelSettings)){
        settings["panelSettings"] = panelSettings;
    }else{
        settings["panelSettings"] = this.settings.panelSettings;
    }
    settings["recordBox"]  = document.getElementById("recordBox").checked;
    settings["showingHUD"] = document.getElementById("showingHUDBox").checked;
    settings["showOdds"]   = document.getElementById("showOddsBox").checked;  // ADD THIS
    var yOffset = parseInt(document.getElementById("yOffsetBox").value);
    var xOffset = parseInt(document.getElementById("xOffsetBox").value);
    settings["panelOffset"] = [xOffset,yOffset];
    console.log(settings);
    return settings;
}
```

- [ ] **Step 6: Restore showOddsBox in restoreLastState**

Find `restoreLastState()` in `popup.js` and add the restore call:

```javascript
restoreLastState(){
    var self = this;
    chrome.storage.local.get(['settings'], function(result) {
        var panelSettings = result.settings.panelSettings;
        console.log("restore");
        self.settings = result.settings;
        self.restoreRecordBox(result.settings.recordBox);
        self.restoreShowBox(result.settings.showingHUD);
        self.restoreOddsBox(result.settings.showOdds);          // ADD THIS
        self.restorePanelOffsetBoxes(result.settings.panelOffset);
        self.loadComplete = self.panelTab.restorePanelSettings(panelSettings);
    });
}
```

- [ ] **Step 7: Add restoreOddsBox method to Main class**

Add after `restoreShowBox`:

```javascript
restoreOddsBox(state){
    var box = document.getElementById("showOddsBox");
    if(box) box.checked = (state !== false);
}
```

- [ ] **Step 8: Commit**

```bash
git add serviceWorker.js popup.html popup.js
git commit -m "feat: add Show Odds toggle to popup settings"
```

---

### Task 8: Add odds.js to manifest

**Files:**
- Modify: `manifest.json`

- [ ] **Step 1: Add odds.js to content_scripts**

Find the content_scripts section in `manifest.json`:

```json
"content_scripts": [
    {
        "matches": ["https://www.pokernow.com/games/*"],
        "js": ["thirdParty/jquery.min.js", "content.js"]
    }
],
```

Replace with:

```json
"content_scripts": [
    {
        "matches": ["https://www.pokernow.com/games/*"],
        "js": ["thirdParty/jquery.min.js", "odds.js", "content.js"]
    }
],
```

- [ ] **Step 2: Commit**

```bash
git add manifest.json
git commit -m "feat: load odds.js before content.js in extension manifest"
```

---

### Task 9: Manual smoke test

- [ ] **Step 1: Run full test suite one final time**

```bash
npm test
```

Expected: All tests pass with no failures.

- [ ] **Step 2: Load extension in Chrome**

1. Open `chrome://extensions`
2. Enable Developer Mode
3. Click "Load unpacked" → select `/home/alse/Projects/PokernowHUD`
4. Verify no errors in extension error log

- [ ] **Step 3: Open a PokerNow game and verify**

1. Join a game at `https://www.pokernow.com/games/*`
2. Wait to be dealt hole cards
3. Verify odds panel appears above your cards showing `Win: XX.X% · Outs: -- · Pot: --` (preflop — outs and pot odds show `--` until flop)
4. After flop deals: verify Outs shows a number
5. When facing a bet: verify Pot shows ✓ or ✗
6. After hand ends: verify panel disappears

- [ ] **Step 4: Verify toggle works**

1. Click extension icon → uncheck "Show Odds"
2. Verify panel disappears from table
3. Re-check "Show Odds" → verify panel reappears on next hand

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: real-time odds calculator — Win%, Outs, Pot Odds overlay"
```
