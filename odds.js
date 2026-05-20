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
        var kicker = parseInt(sc.find(function(e){ return e[1] === 1; })[0]);
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

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { HandEvaluator, MonteCarloEngine };
}
