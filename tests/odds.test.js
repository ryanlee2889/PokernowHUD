const { HandEvaluator, MonteCarloEngine, OutsCounter, LiveHandTracker } = require('../odds');

function card(r, s) { return { r, s }; }
// ranks: 0=2 1=3 2=4 3=5 4=6 5=7 6=8 7=9 8=T 9=J 10=Q 11=K 12=A
// suits: 0=h 1=d 2=s 3=c

describe('HandEvaluator', () => {
    const ev = new HandEvaluator();

    test('high card: A-high beats K-high', () => {
        // A-K-Q-J-9 vs K-Q-J-8-6 (neither is a straight)
        const a = ev.evaluate([card(12,0), card(11,1), card(10,2), card(9,3), card(7,0)]);
        const b = ev.evaluate([card(11,0), card(10,1), card(9,2), card(6,3), card(4,1)]);
        expect(a).toBeGreaterThan(b);
    });

    test('one pair beats high card', () => {
        const pair = ev.evaluate([card(12,0), card(12,1), card(11,2), card(10,3), card(9,0)]);
        const high = ev.evaluate([card(12,0), card(11,1), card(10,2), card(9,3), card(7,0)]);
        expect(pair).toBeGreaterThan(high);
    });

    test('aces pair beats kings pair', () => {
        const aces  = ev.evaluate([card(12,0), card(12,1), card(11,2), card(10,3), card(9,0)]);
        const kings = ev.evaluate([card(11,0), card(11,1), card(12,2), card(10,3), card(9,1)]);
        expect(aces).toBeGreaterThan(kings);
    });

    test('two pair beats one pair', () => {
        const twoPair = ev.evaluate([card(12,0), card(12,1), card(11,2), card(11,3), card(10,0)]);
        const onePair = ev.evaluate([card(12,0), card(12,1), card(11,2), card(10,3), card(9,0)]);
        expect(twoPair).toBeGreaterThan(onePair);
    });

    test('trips beats two pair', () => {
        const trips   = ev.evaluate([card(12,0), card(12,1), card(12,2), card(11,3), card(10,0)]);
        const twoPair = ev.evaluate([card(12,0), card(12,1), card(11,2), card(11,3), card(10,0)]);
        expect(trips).toBeGreaterThan(twoPair);
    });

    test('straight beats trips', () => {
        const straight = ev.evaluate([card(8,0), card(7,1), card(6,2), card(5,3), card(4,0)]);
        const trips    = ev.evaluate([card(12,0), card(12,1), card(12,2), card(11,3), card(10,0)]);
        expect(straight).toBeGreaterThan(trips);
    });

    test('flush beats straight', () => {
        const flush    = ev.evaluate([card(12,0), card(10,0), card(8,0), card(6,0), card(4,0)]);
        const straight = ev.evaluate([card(8,0), card(7,1), card(6,2), card(5,3), card(4,0)]);
        expect(flush).toBeGreaterThan(straight);
    });

    test('full house beats flush', () => {
        const boat  = ev.evaluate([card(12,0), card(12,1), card(12,2), card(11,3), card(11,0)]);
        const flush = ev.evaluate([card(12,0), card(10,0), card(8,0), card(6,0), card(4,0)]);
        expect(boat).toBeGreaterThan(flush);
    });

    test('quads beats full house', () => {
        const quads = ev.evaluate([card(12,0), card(12,1), card(12,2), card(12,3), card(11,0)]);
        const boat  = ev.evaluate([card(12,0), card(12,1), card(12,2), card(11,3), card(11,0)]);
        expect(quads).toBeGreaterThan(boat);
    });

    test('straight flush beats quads', () => {
        const sf    = ev.evaluate([card(8,0), card(7,0), card(6,0), card(5,0), card(4,0)]);
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
        const score = ev.evaluate([
            card(12,0), card(12,1),
            card(12,2), card(12,3), card(11,0), card(10,1), card(9,2)
        ]);
        const quadsBaseline = ev.evaluate([card(12,0),card(12,1),card(12,2),card(12,3),card(11,0)]);
        expect(score).toBe(quadsBaseline);
    });
});

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

    test('made nut flush on river wins >90%', () => {
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

describe('LiveHandTracker', () => {
    function makeLog(msgs) {
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

describe('OutsCounter', () => {
    const counter = new OutsCounter(new HandEvaluator());

    test('returns null preflop (no board)', () => {
        const result = counter.count([card(12,0), card(11,0)], []);
        expect(result).toBeNull();
    });

    test('flush draw on flop: 9 hearts + 14 pair-making cards = 23 outs', () => {
        // A♥ K♥ on board 2♥ 7♥ Q♠ (high card currently)
        // 9 remaining hearts complete flush; A/K/Q/7/2 non-hearts make pairs
        const holeCards = [card(12,0), card(11,0)];
        const board = [card(0,0), card(5,0), card(10,2)];
        const result = counter.count(holeCards, board);
        expect(result).toBe(23);
    });

    test('open-ended straight draw: 8 straight outs + 15 pair outs = 23 total', () => {
        // 6h 7d on board 8s 9c 2h (high card currently)
        // 5/T complete straight (8 cards); all board/hole ranks pair (15 cards)
        const holeCards = [card(4,0), card(5,1)];
        const board = [card(6,2), card(7,3), card(0,0)];
        const result = counter.count(holeCards, board);
        expect(result).toBe(23);
    });

    test('made royal flush has 0 outs', () => {
        // A♥ K♥ on board Q♥ J♥ T♥ → royal flush, max category, nothing improves it
        const holeCards = [card(12,0), card(11,0)];
        const board = [card(10,0), card(9,0), card(8,0)];
        const result = counter.count(holeCards, board);
        expect(result).toBe(0);
    });

    test('counts outs on turn (4 board cards)', () => {
        // A♥ K♥ on board 2♥ 7♥ Q♠ 3♣ (high card currently)
        // 9 hearts + 16 non-heart pair cards = 25
        const holeCards = [card(12,0), card(11,0)];
        const board = [card(0,0), card(5,0), card(10,2), card(1,3)];
        const result = counter.count(holeCards, board);
        expect(result).toBe(25);
    });
});
