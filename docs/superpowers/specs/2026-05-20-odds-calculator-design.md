# Odds Calculator — Design Spec
Date: 2026-05-20

## Overview

Add a real-time hand odds calculator overlay to the PokernowHUD Chrome extension. Displays win probability, outs count, and pot odds directly on the PokerNow table during live hands.

## Requirements

- **Display:** Win % · Outs · Pot Odds (✓/✗) for user's current hand
- **Position:** Above user's hole cards ("you-player" element), same absolute-positioning approach as existing HUD panels
- **Visibility:** Toggle via "Show Odds" checkbox in popup Panel tab; persists in chrome.storage.local; defaults to true
- **Calculation method:** Monte Carlo simulation, 1000 deals per update, vs one random opponent
- **Update cadence:** Every HUDloop tick (~500ms), recalculated from latest log state

## Architecture

Five new classes added to `content.js`:

### LiveHandTracker
Scans raw JSON log on each `processLog()` call to extract mid-hand state:
- Hole cards from `"Your hand is X Y"` lines
- Board cards from `"Flop:"`, `"Turn:"`, `"River:"` lines
- Pot size and call amount from action lines
- Clears state on `"ending hand #"` or when user folds

### HandEvaluator
Ranks any 5-card or 7-card poker hand. Returns a numeric score suitable for `>` comparison. Card representation: `{r: 0-12, s: 0-3}` (rank 0=2 through 12=Ace).

Checks in order: straight flush, four of a kind, full house, flush, straight, three of a kind, two pair, one pair, high card.

### MonteCarloEngine
Takes hole cards + current board + number of simulations (default 1000). For each sim:
1. Build remaining deck (52 cards minus known cards)
2. Shuffle, deal 2 to random opponent, fill board to 5 cards
3. Evaluate both 7-card hands, record win/tie/loss
Returns win percentage. Runs in ~5–20ms at 1000 sims.

### OutsCounter
Enumerates all remaining deck cards. For each, checks if adding it to hero's hand+board improves hand rank vs current best 5-card hand. Returns count. Returns `null` preflop (outs not meaningful without board).

### OddsPanel
Div element positioned above the `you-player` element using absolute coordinates. Recreated each HUDloop tick. Shows:
- `Win: 67.3%` (from Monte Carlo)
- `Outs: 9` (from OutsCounter; `--` preflop)
- `Pot odds: ✓` or `✗` (win% vs callAmt/(pot+callAmt))

Hidden when no hole cards in tracker state.

## Data Flow

```
HUDloop (500ms)
  └─ LogScraper.getLog()
       └─ processLog()
            ├─ [existing] "ending hand #" → builder.addHand()
            └─ [new] LiveHandTracker.update(jsonLog)

HUDloop (500ms, after getLog)
  └─ OddsPanel.update(liveHandTracker)
        ├─ no holeCards → hide, return
        ├─ MonteCarloEngine.run(holeCards, board, 1000)
        ├─ OutsCounter.count(holeCards, board)
        ├─ compute pot odds, profitable = winPct > potOdds
        └─ render div above you-player
```

## Error Handling

- Malformed card string → catch, clear tracker state, panel hides silently
- Monte Carlo with <2 unknown cards remaining → show `--`
- `you-player` element not found → panel not rendered (matches existing HUD behavior)
- Extension reloaded mid-hand → state resets cleanly on next poll cycle

## Files Modified

| File | Change |
|------|--------|
| `content.js` | Add `LiveHandTracker`, `HandEvaluator`, `MonteCarloEngine`, `OutsCounter`, `OddsPanel`; hook into `HUDloop` and `processLog` |
| `serviceWorker.js` | Add `showOdds: true` to initial settings object |
| `popup.html` | Add "Show Odds" checkbox to Panel tab |
| `popup.js` | Save/restore `showOdds`; send to content script on change |

## Out of Scope

- Opponent range awareness (equity vs random hands only)
- Multi-way pots (always heads-up simulation)
- Omaha or other variants
- Preflop outs display
