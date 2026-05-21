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
        var topCount    = sortedCounts[0][1];
        var secondCount = sortedCounts.length > 1 ? sortedCounts[1][1] : 0;

        if (isFlush && isStraight) return 8e8 + this._straightHigh(ranks);
        if (topCount === 4)                      return 7e8 + this._quadsScore(sortedCounts);
        if (topCount === 3 && secondCount === 2) return 6e8 + this._boatScore(sortedCounts);
        if (isFlush)                             return 5e8 + this._highScore(ranks);
        if (isStraight)                          return 4e8 + this._straightHigh(ranks);
        if (topCount === 3)                      return 3e8 + this._tripsScore(sortedCounts);
        if (topCount === 2 && secondCount === 2) return 2e8 + this._twoPairScore(sortedCounts);
        if (topCount === 2)                      return 1e8 + this._pairScore(sortedCounts);
        return this._highScore(ranks);
    }

    _checkStraight(sortedRanks) {
        if (new Set(sortedRanks).size !== 5) return false;
        if (sortedRanks[0] - sortedRanks[4] === 4) return true;
        // Wheel: A-2-3-4-5 → sorted desc [12,3,2,1,0]
        return sortedRanks[0] === 12 && sortedRanks[1] === 3 &&
               sortedRanks[2] === 2  && sortedRanks[3] === 1 && sortedRanks[4] === 0;
    }

    _straightHigh(sortedRanks) {
        if (sortedRanks[0] === 12 && sortedRanks[4] === 0) return 3; // wheel high = 5 (rank 3)
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
        var kickerEntry = sc.find(function(e){ return e[1] === 1; });
        var kicker = kickerEntry ? parseInt(kickerEntry[0]) : 0;
        return pairs[0] * 169 + pairs[1] * 13 + kicker;
    }

    _pairScore(sc) {
        var pair = parseInt(sc[0][0]);
        var kickers = sc.slice(1).map(function(e){ return parseInt(e[0]); }).sort(function(a,b){ return b-a; });
        return pair * 2197 + kickers[0] * 169 + kickers[1] * 13 + kickers[2];
    }
}

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

        var currentCategory = Math.floor(this.evaluator.evaluate(holeCards.concat(board)) / 1e8);
        var outs = 0;
        for (var j = 0; j < deck.length; j++) {
            var newCategory = Math.floor(this.evaluator.evaluate(holeCards.concat(board).concat([deck[j]])) / 1e8);
            if (newCategory > currentCategory) outs++;
        }
        return outs;
    }
}

class LiveHandTracker {
    constructor() {
        this.holeCards = null;
        this.board = [];
        this.inHand = false;
        this.dealer = null;
        this.playerOrder = []; // [SB, BB, UTG, ..., CO, BTN] after rotation
    }

    update(jsonLog) {
        var logs = jsonLog.logs;
        for (var i = logs.length - 1; i >= 0; i--) {
            this._processMsg(logs[i].msg);
        }
    }

    _processMsg(msg) {
        if (msg.includes('starting hand #')) {
            this.holeCards = null;
            this.board = [];
            this.inHand = true;
            this.playerOrder = [];
            var dealerMatch = msg.match(/dealer: "([^"]+)"/);
            this.dealer = dealerMatch ? dealerMatch[1] : null;
        }
        if (this.inHand) {
            if (msg.includes('Player stacks:')) {
                var parts = msg.replace('Player stacks: ', '').split(' | ');
                var players = [];
                for (var i = 0; i < parts.length; i++) {
                    var m = parts[i].match(/"([^"]+)"/);
                    if (m) players.push(m[1]);
                }
                if (this.dealer) {
                    var guard = players.length;
                    while (guard-- > 0 && players.length > 0 &&
                           players[players.length - 1] !== this.dealer) {
                        players.push(players.shift());
                    }
                }
                this.playerOrder = players;
            }
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

class PreflopAdvisor {
    constructor() {
        this._tiers = this._buildTiers();
    }

    _buildTiers() {
        var t = {};
        var add = function(hands, tier) { hands.forEach(function(h) { t[h] = tier; }); };
        add(['AA','KK','QQ','AKs','AKo'], 1);
        add(['JJ','TT','AQs','AQo','AJs','KQs'], 2);
        add(['99','88','ATs','KJs','KTs','QJs','JTs','AJo','KQo'], 3);
        add(['77','66','55','44','33','22',
             'A9s','A8s','A7s','A6s','A5s','A4s','A3s','A2s',
             'K9s','Q9s','J9s','T9s','98s','87s','76s','65s','54s',
             'KJo','QJo'], 4);
        add(['ATo','A9o','A8o','KTo','K8s','Q8s','J8s','T8s',
             '97s','86s','75s','64s','53s','43s','QTo','JTo'], 5);
        return t;
    }

    classify(holeCards) {
        var ranks = ['2','3','4','5','6','7','8','9','T','J','Q','K','A'];
        var r1 = holeCards[0].r, r2 = holeCards[1].r;
        var s1 = holeCards[0].s, s2 = holeCards[1].s;
        if (r1 === r2) return ranks[r1] + ranks[r2];
        var hi = Math.max(r1, r2), lo = Math.min(r1, r2);
        return ranks[hi] + ranks[lo] + (s1 === s2 ? 's' : 'o');
    }

    advise(holeCards, facingRaise, position) {
        var hand = this.classify(holeCards);
        var tier = this._tiers[hand] || 6;
        var action, color;

        // Max tier to open-raise per position (higher = wider range)
        var openLimit = 3; // default: middle position
        if (position === 'BTN')              openLimit = 5;
        else if (position === 'CO')          openLimit = 4;
        else if (position === 'HJ')          openLimit = 4;
        else if (position === 'SB')          openLimit = 4;
        else if (position === 'BB')          openLimit = 6; // BB can defend wide
        else if (position === 'EP')          openLimit = 2;

        if (!facingRaise) {
            if (position === 'BB') {
                // BB already in — no raise to face, just note hand strength
                action = tier <= 2 ? 'Raise (squeeze)' : 'Check';
                color  = tier <= 2 ? '#00c853' : '#90a4ae';
            } else if (tier <= openLimit) {
                var openColors = ['#00c853','#00c853','#76ff03','#ffd600','#ff9100','#ff6d00'];
                action = 'Raise';
                color  = openColors[Math.min(tier - 1, 5)];
            } else if (tier === openLimit + 1) {
                action = 'Raise/Fold';
                color  = '#ff6d00';
            } else {
                action = 'Fold';
                color  = '#ff3d00';
            }
        } else {
            if (tier === 1) { action = '3-Bet/Call';  color = '#00c853'; }
            else if (tier === 2) { action = 'Call/3-Bet'; color = '#76ff03'; }
            else if (tier === 3) { action = position === 'BTN' || position === 'CO' ? 'Call/3-Bet' : 'Call'; color = '#ffd600'; }
            else if (tier === 4) { action = position === 'BTN' || position === 'CO' ? 'Call' : 'Call/Fold'; color = '#ff9100'; }
            else if (tier === 5) { action = position === 'BTN' ? 'Call/Fold' : 'Fold'; color = '#ff6d00'; }
            else                 { action = 'Fold'; color = '#ff3d00'; }
        }
        return { hand: hand, action: action, color: color };
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { HandEvaluator, MonteCarloEngine, OutsCounter, LiveHandTracker, PreflopAdvisor };
}
